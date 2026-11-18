import { createHash } from "node:crypto";
import type { GovernanceFinding, Severity, ToolResultStatus } from "../../engine/src/types.js";
import type { RepositorySnapshot } from "./types.js";
import type { RepositorySnapshotFingerprint } from "./fingerprint.js";
import type { VerificationProcessResult, VerificationToolRunner } from "./verification.js";
import {
  compactOutput,
  concludeScanner,
  stableId,
  type ScannerAdapterOutput,
  type ScannerIdentity,
  type ScannerOutcome,
} from "./verification-shared.js";

/**
 * Static analysis with Semgrep Community Edition (ADR-0001).
 *
 * Rules come only from a reviewed rule set stored in the repository at RULES_DIRECTORY. The adapter
 * never passes `--config auto` or a registry name, so policy is not a remote, mutable input, and a
 * repository with source code but no rule set is UNSUPPORTED rather than passing on an empty policy.
 * The rule set's SHA-256 is recorded in the evidence.
 *
 * Relies on the documented flags (`--config`, `--json`, `--error`, `--metrics=off`,
 * `--disable-version-check`, `--exclude`), the exit codes (0 clean, 1 findings with `--error`, 2 and
 * above errors), and the top-level `results` and `errors` fields and per-result `check_id`, `path`,
 * `start.line`, `extra.message` and `extra.severity`. Written without running the tool.
 */

export const SEMGREP_RULES_DIRECTORY = ".governance/semgrep";

const IDENTITY: ScannerIdentity = {
  tool: "semgrep",
  adapterId: "semgrep-static-analysis",
  adapterVersion: "0.1.0",
  capability: "verification:semgrep-static-analysis",
  evidenceId: "EVD-SEMGREP-STATIC-ANALYSIS",
  evidenceSource: "semgrep-adapter",
};
const TOOL_TIMEOUT_MS = 300_000;
const SOURCE_FILE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|py)$/;
const RULE_FILE = /\.ya?ml$/;

const severityRank: Record<Severity, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

interface SemgrepMatch {
  checkId: string;
  path: string;
  line: number;
  message: string;
  severity: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSemgrepOutput(stdout: string): { matches: SemgrepMatch[]; scanErrors: number } {
  const parsed: unknown = JSON.parse(stdout);
  if (!isRecord(parsed) || !Array.isArray(parsed.results) || !Array.isArray(parsed.errors)) {
    throw new Error("Semgrep output has no results and errors arrays.");
  }
  const matches = (parsed.results as unknown[]).map((entry): SemgrepMatch => {
    if (!isRecord(entry) || !isRecord(entry.extra) || !isRecord(entry.start)) {
      throw new Error("Semgrep result entry is malformed.");
    }
    const { check_id: checkId, path } = entry;
    const { message, severity } = entry.extra;
    const { line } = entry.start;
    if (
      typeof checkId !== "string" || typeof path !== "string" || typeof message !== "string" ||
      typeof severity !== "string" || typeof line !== "number"
    ) {
      throw new Error("Semgrep result is missing check_id, path, line, message or severity.");
    }
    return { checkId, path, line, message, severity };
  });
  // The shape of an error entry is not documented, so only their number is used.
  return { matches, scanErrors: parsed.errors.length };
}

/**
 * ERROR is P1 and WARNING is P2. INFO is below the reporting floor: it is counted, not emitted, so
 * informational matches do not bury real conditions. Any severity this adapter does not know is P1
 * (GOV-022 section 10: unknown is not safe).
 */
function severityFor(semgrepSeverity: string): Severity | "INFO" {
  switch (semgrepSeverity.toUpperCase()) {
    case "ERROR": return "P1";
    case "WARNING": return "P2";
    case "INFO": return "INFO";
    default: return "P1";
  }
}

function toFinding(match: SemgrepMatch, severity: Severity): GovernanceFinding {
  const file = match.path.replaceAll("\\", "/");
  return {
    id: `FND-SEMGREP-${stableId(`${match.checkId}:${file}:${match.line}`)}`,
    rule_id: match.checkId.slice(0, 200),
    severity,
    category: "static-analysis",
    message: match.message.replace(/\s+/g, " ").trim().slice(0, 300),
    status: "OPEN",
    evidence_refs: [IDENTITY.evidenceId],
    source_location: { file, start_line: match.line },
    confidence: 0.8,
    remediation: "Fix the flagged code, or record an approved governance exception. A nosemgrep comment or local ignore is not accepted as a waiver.",
  };
}

function ruleSetDigest(ruleFiles: string[], contents: Record<string, string> | undefined): string | undefined {
  if (!contents || ruleFiles.some((file) => contents[file] === undefined)) return undefined;
  const hash = createHash("sha256");
  for (const file of ruleFiles) hash.update(`${file}\0${contents[file]}\n`);
  return `sha256:${hash.digest("hex")}`;
}

export async function runSemgrepAdapter(
  snapshot: RepositorySnapshot,
  runner: VerificationToolRunner,
  fingerprint: RepositorySnapshotFingerprint,
): Promise<ScannerAdapterOutput | undefined> {
  const files = snapshot.files.map((file) => file.replaceAll("\\", "/"));
  const ruleFiles = files.filter((file) => file.startsWith(`${SEMGREP_RULES_DIRECTORY}/`) && RULE_FILE.test(file)).sort();
  const sourceFiles = files.filter(
    (file) => SOURCE_FILE.test(file) && !file.split("/").includes("node_modules") && !file.startsWith(`${SEMGREP_RULES_DIRECTORY}/`),
  );
  if (sourceFiles.length === 0) return undefined;

  const conclude = (outcome: ScannerOutcome): ScannerAdapterOutput => concludeScanner(IDENTITY, outcome, fingerprint);
  const command = [
    "semgrep", "scan", "--json", "--error", "--quiet", "--metrics=off", "--disable-version-check",
    `--config=${SEMGREP_RULES_DIRECTORY}`, `--exclude=${SEMGREP_RULES_DIRECTORY}`, ".",
  ];

  if (ruleFiles.length === 0) {
    return conclude({
      status: "UNSUPPORTED",
      summary: `Source code was found, but no reviewed Semgrep rule set exists at ${SEMGREP_RULES_DIRECTORY}/; static analysis was not run.`,
      findings: [],
      limitations: [`Add reviewed rules as .yml files under ${SEMGREP_RULES_DIRECTORY}/. Registry rules are never used.`],
      command,
    });
  }
  if (!(await runner.isAvailable("semgrep", snapshot.rootPath, "."))) {
    return conclude({
      status: "UNSUPPORTED",
      summary: "semgrep was not available; static analysis was not run.",
      findings: [],
      limitations: ["semgrep is not installed or not on PATH."],
      command,
    });
  }

  const version = await runner.getVersion?.("semgrep", snapshot.rootPath, ".");
  let processResult: VerificationProcessResult;
  try {
    processResult = await runner.run("semgrep", command.slice(1), snapshot.rootPath, ".", TOOL_TIMEOUT_MS);
  } catch (error) {
    const limitation = `semgrep failed to run: ${error instanceof Error ? error.message : String(error)}`;
    return conclude({ status: "ERROR", summary: limitation, findings: [], limitations: [limitation], command });
  }

  const ran = (status: ToolResultStatus, summary: string, findings: GovernanceFinding[], limitations: string[]): ScannerAdapterOutput =>
    conclude({ status, summary, findings, limitations, processResult, command, ...(version ? { version } : {}) });
  const untrusted = (reason: string): ScannerAdapterOutput =>
    ran("ERROR", `${reason} Static analysis could not be trusted.`, [], [reason]);

  if (processResult.exitCode !== 0 && processResult.exitCode !== 1) {
    const detail = compactOutput("", processResult.stderr).slice(0, 500);
    return untrusted(`semgrep exited with code ${processResult.exitCode}${detail ? `: ${detail}` : "."}`);
  }

  let parsed: ReturnType<typeof parseSemgrepOutput>;
  try {
    parsed = parseSemgrepOutput(processResult.stdout);
  } catch (error) {
    return untrusted(`semgrep output could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
  }

  const classified = parsed.matches.map((match) => ({ match, severity: severityFor(match.severity) }));
  const findings = classified
    .filter((item): item is { match: SemgrepMatch; severity: Severity } => item.severity !== "INFO")
    .map((item) => toFinding(item.match, item.severity))
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || a.id.localeCompare(b.id));
  const infoCount = classified.length - findings.length;

  // With --error, exit 1 means findings. The exit code and the structured result must agree.
  if ((processResult.exitCode === 0 && classified.length > 0) || (processResult.exitCode === 1 && classified.length === 0)) {
    return untrusted(`semgrep exit code ${processResult.exitCode} contradicts its output (${classified.length} matches).`);
  }

  const digest = ruleSetDigest(ruleFiles, snapshot.fileContents);
  const limitations = [
    ...(digest ? [] : ["The rule set content was not ingested, so its digest could not be recorded."]),
    ...(parsed.scanErrors > 0 ? [`Semgrep reported ${parsed.scanErrors} scan error(s); some files may not have been analysed.`] : []),
    "Inline nosemgrep suppressions are not reported by Semgrep CE and cannot be counted.",
  ];
  const p1 = findings.filter((finding) => finding.severity === "P1").length;
  const tally = `${findings.length} finding(s) (P1: ${p1}, P2: ${findings.length - p1}) and ${infoCount} informational match(es) not reported`;
  const status: ToolResultStatus = p1 > 0 ? "FAIL"
    : parsed.scanErrors > 0 || !digest ? "UNVERIFIED"
      : findings.length > 0 ? "WARN"
        : "PASS";
  const summary = `Semgrep ran ${ruleFiles.length} rule file(s) (${digest ?? "digest unavailable"}) and reported ${tally}.${status === "UNVERIFIED" ? " Coverage or the rule-set record is incomplete." : ""}`;
  return ran(status, summary, findings, limitations);
}
