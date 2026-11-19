import type { GovernanceFinding, ToolResultStatus } from "../../engine/src/types.js";
import type { RepositorySnapshot } from "./types.js";
import type { RepositorySnapshotFingerprint } from "./fingerprint.js";
import type { VerificationProcessResult, VerificationToolRunner } from "./verification.js";
import {
  concludeScanner,
  stableId,
  type ScannerAdapterOutput,
  type ScannerIdentity,
  type ScannerOutcome,
} from "./verification-shared.js";

/**
 * Secret scanning with Gitleaks (ADR-0001).
 *
 * The adapter decides from the exit code alone and never reads, parses or records the tool's stdout,
 * stderr or any report. Gitleaks does not document whether its JSON report redacts the `Secret` and
 * `Match` fields, so the only way to guarantee that no secret reaches evidence, findings or reports is
 * not to read them. The cost is that a finding carries no file or line; locating a leak means running
 * gitleaks locally.
 *
 * Documented contract relied on: `--exit-code N` sets the exit code used when leaks are found, the
 * default exit code 1 is shared by leaks and errors, and 126 means an unknown flag. Passing
 * `--exit-code 2` separates the cases: 0 clean, 2 leaks, 1 error.
 *
 * Checked against real output (gitleaks 8.30.1, captured 2026-11-19, tests/fixtures/real-scanner-output):
 * the exit codes above hold, and a clean run prints nothing to stderr at `--log-level error`. One thing
 * the documentation does not say: `gitleaks git` in a directory that is not a git repository logs
 * "ERR ... not a git repository" and still exits 0. An exit 0 with anything on stderr is therefore not
 * trusted as clean.
 */

const IDENTITY: ScannerIdentity = {
  tool: "gitleaks",
  adapterId: "gitleaks-secret-scan",
  adapterVersion: "0.1.0",
  capability: "verification:gitleaks-secret-scan",
  evidenceId: "EVD-GITLEAKS-SECRETS",
  evidenceSource: "gitleaks-adapter",
};
const TOOL_TIMEOUT_MS = 120_000;
const LEAK_EXIT_CODE = 2;
const COMMON_ARGS = ["--exit-code", String(LEAK_EXIT_CODE), "--redact", "--no-banner", "--no-color", "--log-level", "error"];

type Scope = "working tree" | "git history";
type ScopeResult = "clean" | "leaks" | "unavailable" | "error";

function classify(exitCode: number, scope: Scope, stderr = ""): ScopeResult {
  if (exitCode === LEAK_EXIT_CODE) return "leaks";
  if (exitCode === 0) {
    if (stderr.trim() === "") return "clean";
    // Real gitleaks reports a missing git repository on stderr and exits 0, so silence is the only clean.
    return scope === "git history" && /not a git repository/i.test(stderr) ? "unavailable" : "error";
  }
  // For history, exit 1 is most often "not a git repository"; the tool cannot say. Anything else,
  // including 126 (unknown flag), means the invocation itself is wrong.
  if (exitCode === 1 && scope === "git history") return "unavailable";
  return "error";
}

function leakFinding(scope: Scope): GovernanceFinding {
  return {
    id: `FND-SECRET-${stableId(scope)}`,
    rule_id: "GITLEAKS-SECRET",
    severity: "P1",
    category: "secret-exposure",
    message: `Gitleaks reported one or more potential secrets in the ${scope}. The location and value are deliberately not recorded.`,
    status: "OPEN",
    evidence_refs: [IDENTITY.evidenceId],
    confidence: 0.7,
    remediation: scope === "git history"
      ? "Run gitleaks locally to locate the match, treat the credential as compromised and rotate or revoke it. Removing it from history does not make it safe."
      : "Run gitleaks locally to locate the match, remove it, and rotate or revoke the credential. Treat it as compromised until proven otherwise.",
  };
}

export async function runGitleaksAdapter(
  snapshot: RepositorySnapshot,
  runner: VerificationToolRunner,
  fingerprint: RepositorySnapshotFingerprint,
): Promise<ScannerAdapterOutput | undefined> {
  if (snapshot.files.length === 0) return undefined;

  const conclude = (outcome: ScannerOutcome): ScannerAdapterOutput => concludeScanner(IDENTITY, outcome, fingerprint);
  const command = ["gitleaks", "dir", ...COMMON_ARGS, "."];

  if (!(await runner.isAvailable("gitleaks", snapshot.rootPath, "."))) {
    const limitation = "gitleaks is not installed or not on PATH.";
    return conclude({
      status: "UNSUPPORTED",
      summary: "gitleaks was not available; the repository was not scanned for secrets.",
      findings: [],
      limitations: [limitation],
      command,
    });
  }
  const version = await runner.getVersion?.("gitleaks", snapshot.rootPath, ".");

  const scan = async (scope: Scope): Promise<VerificationProcessResult> =>
    runner.run(
      "gitleaks",
      [scope === "working tree" ? "dir" : "git", ...COMMON_ARGS, "."],
      snapshot.rootPath,
      ".",
      TOOL_TIMEOUT_MS,
    );

  let tree: VerificationProcessResult;
  try {
    tree = await scan("working tree");
  } catch (error) {
    const limitation = `gitleaks failed to run: ${error instanceof Error ? error.message : String(error)}`;
    return conclude({ status: "ERROR", summary: limitation, findings: [], limitations: [limitation], command });
  }

  let history: VerificationProcessResult | undefined;
  let historyFailure: string | undefined;
  try {
    history = await scan("git history");
  } catch (error) {
    historyFailure = `gitleaks failed to run on git history: ${error instanceof Error ? error.message : String(error)}`;
  }

  const results: Record<Scope, ScopeResult> = {
    "working tree": classify(tree.exitCode, "working tree", tree.stderr),
    "git history": history ? classify(history.exitCode, "git history", history.stderr) : "error",
  };
  const findings = (["working tree", "git history"] as const)
    .filter((scope) => results[scope] === "leaks")
    .map(leakFinding);

  const limitations: string[] = [];
  if (results["working tree"] === "error") {
    limitations.push(`gitleaks exited with code ${tree.exitCode} on the working tree${tree.exitCode === 0 ? " but reported errors" : ""}; the result cannot be trusted.`);
  }
  if (results["git history"] === "unavailable") {
    limitations.push("git history could not be scanned (not a git repository, or a tool error).");
  } else if (results["git history"] === "error") {
    limitations.push(historyFailure ?? `gitleaks exited with code ${history?.exitCode} on git history${history?.exitCode === 0 ? " but reported errors" : ""}; the result cannot be trusted.`);
  } else if (results["git history"] === "clean") {
    limitations.push("Only the git history present in this clone was scanned; a shallow clone has less.");
  }

  // A leak is a failure whatever else went wrong. Otherwise an untrusted result is ERROR, an unscanned
  // history is UNVERIFIED, and only a clean working tree and clean history pass.
  const status: ToolResultStatus = findings.length > 0 ? "FAIL"
    : results["working tree"] === "error" || results["git history"] === "error" ? "ERROR"
      : results["git history"] === "unavailable" ? "UNVERIFIED"
        : "PASS";
  const summary = {
    FAIL: `Gitleaks reported potential secrets in: ${findings.length === 2 ? "the working tree and git history" : results["working tree"] === "leaks" ? "the working tree" : "git history"}.`,
    ERROR: "Gitleaks produced a result that cannot be trusted; secrets were not verified.",
    UNVERIFIED: "Gitleaks found no secrets in the working tree, but git history could not be scanned.",
    PASS: "Gitleaks found no secrets in the working tree or the available git history. This does not prove the absence of secrets the rule set does not know.",
  }[status as "FAIL" | "ERROR" | "UNVERIFIED" | "PASS"];

  return conclude({
    status,
    summary,
    findings,
    limitations,
    // Report the exit code of the scope that decided the result, with the time spent on both.
    processResult: {
      ...(results["working tree"] !== "clean" ? tree : history ?? tree),
      durationMs: (tree.durationMs ?? 0) + (history?.durationMs ?? 0),
    },
    ...(version ? { version } : {}),
    command,
  });
}
