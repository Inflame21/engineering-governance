import type { GovernanceFinding, ToolResultStatus } from "../../engine/src/types.js";
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
 * Go syntax verification with `gofmt -e -l -- <files>`: the Go counterpart of the Python syntax check.
 * gofmt parses each file and never compiles, runs or modifies anything (no `-w`).
 *
 * Checked against real output (gofmt from Go 1.24.13, captured 2026-11-19,
 * tests/fixtures/real-scanner-output):
 *   - Syntax errors go to stderr, one per line, as `path:line:column: message`, and the exit code is 2.
 *     With `-e` every error is listed (without it, only the first ten lines per file), and the same message
 *     can repeat, so identical lines are collapsed.
 *   - A file that parses but is not gofmt-formatted is listed on stdout and the exit code is 0. That is
 *     style, not syntax, and is ignored.
 *   - Anything else on stderr (a missing file, an unknown flag) also exits 2 but has no `line:column`; it is
 *     a tool failure, never a syntax result.
 *   - A file name that begins with `-` is read as a flag, so the file list follows `--`.
 *
 * Deliberately not `go vet` or `go build`: those compile the repository, which can download modules and a
 * newer toolchain and run cgo on project sources. This checks syntax only and says so.
 */

const IDENTITY: ScannerIdentity = {
  tool: "gofmt",
  adapterId: "go-syntax",
  adapterVersion: "0.1.0",
  capability: "verification:go-syntax",
  evidenceId: "EVD-GO-SYNTAX",
  evidenceSource: "gofmt-adapter",
};

const MAX_GO_FILES = 2_000;
const BATCH_SIZE = 100;
const MAX_FINDINGS = 100;
const TOOL_TIMEOUT_MS = 120_000;
const EXCLUDED_SEGMENTS = new Set(["vendor", "testdata", "node_modules"]);
const ERROR_LINE = /^(.+?):(\d+):(\d+): (.+)$/;

interface SyntaxError {
  file: string;
  line: number;
  column: number;
  message: string;
}

const normalize = (file: string): string => file.replaceAll("\\", "/").replace(/^\.\//, "");

function chunks<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

type BatchResult = { kind: "clean" } | { kind: "syntax"; errors: SyntaxError[] } | { kind: "untrusted"; reason: string };

/** Interpret one gofmt run. Anything that is not a clean parse or a recognisable syntax error is untrusted. */
function classify(result: VerificationProcessResult, batch: ReadonlySet<string>): BatchResult {
  const stderr = result.stderr.trim();
  if (result.exitCode === 0) {
    return stderr === "" ? { kind: "clean" } : { kind: "untrusted", reason: `gofmt exited 0 but reported errors: ${compactOutput("", stderr).slice(0, 300)}` };
  }
  if (result.exitCode !== 2) {
    return { kind: "untrusted", reason: `gofmt exited with code ${result.exitCode}${stderr ? `: ${compactOutput("", stderr).slice(0, 300)}` : "."}` };
  }
  const errors = new Map<string, SyntaxError>();
  const other: string[] = [];
  for (const line of stderr.split(/\r?\n/)) {
    if (line.trim() === "") continue;
    const match = ERROR_LINE.exec(line);
    const file = match ? normalize(match[1]!) : undefined;
    if (match && file !== undefined && batch.has(file)) {
      errors.set(line, { file, line: Number(match[2]), column: Number(match[3]), message: match[4]! });
    } else {
      other.push(line);
    }
  }
  if (other.length > 0) return { kind: "untrusted", reason: `gofmt reported something other than syntax errors: ${other.slice(0, 3).join(" | ").slice(0, 300)}` };
  if (errors.size === 0) return { kind: "untrusted", reason: "gofmt exited 2 with no syntax errors in its output." };
  return { kind: "syntax", errors: [...errors.values()] };
}

function toFindings(errors: readonly SyntaxError[]): { findings: GovernanceFinding[]; files: number } {
  const byFile = new Map<string, SyntaxError[]>();
  for (const error of errors) byFile.set(error.file, [...(byFile.get(error.file) ?? []), error]);
  const findings = [...byFile.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([file, list]): GovernanceFinding => {
    const first = [...list].sort((a, b) => a.line - b.line || a.column - b.column)[0]!;
    return {
      id: `FND-GO-SYNTAX-${stableId(`${file}:${first.line}:${first.column}`)}`,
      rule_id: "GO-SYNTAX",
      severity: "P1",
      category: "static-analysis",
      message: `${first.message} (${file}:${first.line}:${first.column})${list.length > 1 ? `; ${list.length - 1} more error${list.length === 2 ? "" : "s"} in this file` : ""}`,
      status: "OPEN",
      evidence_refs: [IDENTITY.evidenceId],
      source_location: { file, start_line: first.line },
      confidence: 0.98,
      remediation: "Correct the Go syntax error and rerun syntax verification.",
    };
  });
  return { findings, files: byFile.size };
}

export async function runGoSyntaxAdapter(
  snapshot: RepositorySnapshot,
  runner: VerificationToolRunner,
  fingerprint: RepositorySnapshotFingerprint,
): Promise<ScannerAdapterOutput | undefined> {
  const all = snapshot.files.map(normalize).filter((file) => file.endsWith(".go"));
  const goFiles = all.filter((file) => !file.split("/").some((segment) => EXCLUDED_SEGMENTS.has(segment))).sort();
  if (goFiles.length === 0) return undefined;
  const excluded = all.length - goFiles.length;

  const conclude = (outcome: ScannerOutcome): ScannerAdapterOutput => concludeScanner(IDENTITY, outcome, fingerprint);
  const command = ["gofmt", "-e", "-l", "--", `<${goFiles.length} Go files>`];
  const notRun = (status: ToolResultStatus, summary: string, limitations: string[]): ScannerAdapterOutput =>
    conclude({ status, summary, findings: [], limitations, command });

  if (goFiles.length > MAX_GO_FILES) {
    return notRun("SKIPPED", `Found ${goFiles.length} Go files; the safety limit is ${MAX_GO_FILES}.`, ["Go syntax was not checked."]);
  }
  if (!(await runner.isAvailable("gofmt", snapshot.rootPath, "."))) {
    return notRun("UNSUPPORTED", "gofmt was not available; Go syntax was not checked.", ["gofmt (part of the Go toolchain) is not installed or not on PATH."]);
  }
  const version = await runner.getVersion?.("gofmt", snapshot.rootPath, ".");

  const syntaxErrors: SyntaxError[] = [];
  const untrusted: string[] = [];
  let exitCode = 0;
  let durationMs = 0;
  for (const files of chunks(goFiles, BATCH_SIZE)) {
    let result: VerificationProcessResult;
    try {
      result = await runner.run("gofmt", ["-e", "-l", "--", ...files], snapshot.rootPath, ".", TOOL_TIMEOUT_MS);
    } catch (error) {
      untrusted.push(`gofmt failed to run: ${error instanceof Error ? error.message : String(error)}`);
      exitCode = exitCode || 1;
      continue;
    }
    durationMs += result.durationMs ?? 0;
    if (result.exitCode !== 0) exitCode = result.exitCode;
    const outcome = classify(result, new Set(files));
    if (outcome.kind === "syntax") syntaxErrors.push(...outcome.errors);
    else if (outcome.kind === "untrusted") untrusted.push(outcome.reason);
  }

  const { findings: allFindings, files: failingFiles } = toFindings(syntaxErrors);
  const findings = allFindings.slice(0, MAX_FINDINGS);
  const limitations = [
    "Syntax only: gofmt parses each file but does not compile it, so type errors, missing dependencies and build constraints are not checked.",
    ...(excluded > 0 ? [`${excluded} Go file(s) under vendor/, testdata/ or node_modules/ were not checked.`] : []),
    ...(allFindings.length > MAX_FINDINGS ? [`${allFindings.length - MAX_FINDINGS} more file(s) with syntax errors are not listed.`] : []),
    ...untrusted,
  ];
  // A syntax error is a failure whatever else went wrong; otherwise an untrusted run is ERROR, and only a
  // clean parse of every file passes.
  const status: ToolResultStatus = findings.length > 0 ? "FAIL" : untrusted.length > 0 ? "ERROR" : "PASS";
  const summary = {
    FAIL: `gofmt found syntax errors in ${failingFiles} of ${goFiles.length} Go file(s).`,
    ERROR: "gofmt produced output that cannot be trusted; Go syntax was not verified.",
    PASS: `gofmt parsed ${goFiles.length} Go file(s) without syntax errors. This checks syntax only, not that the code compiles.`,
  }[status as "FAIL" | "ERROR" | "PASS"];

  return conclude({
    status,
    summary,
    findings,
    limitations,
    processResult: { exitCode, stdout: "", stderr: "", durationMs },
    ...(version ? { version } : {}),
    command,
  });
}
