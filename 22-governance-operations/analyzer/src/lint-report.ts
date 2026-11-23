import type { GovernanceEvidence, GovernanceFinding, Severity, ToolResultStatus } from "../../engine/src/types.js";
import { evidenceStatusForResult } from "../../engine/src/evidence-policy.js";
import type { RepositoryAdapterResult, RepositorySnapshot } from "./types.js";
import type { ScannerAdapterOutput } from "./verification-shared.js";
import { stableId } from "./verification-shared.js";

/**
 * Lint results, read from SARIF 2.1.0 reports the project's own linter already produced.
 *
 * Nothing is executed: running a linter would run the repository's configuration and plugins, so the
 * adapter only reads reports, written under LINT_REPORT_DIRECTORY before the governance check. With no
 * reports there, it returns nothing. SARIF is the one format ruff, ESLint (with a formatter),
 * golangci-lint, Semgrep and CodeQL all write, so one reader covers every language.
 *
 * The tool's own level is taken as given: `error` raises a P2 finding and fails the result, `warning`
 * (SARIF's default when a result names no level) raises P3 and warns, `note` and `none` are counted and
 * not reported. A result a linter marked suppressed is still counted: ADR-0001 says a suppression comment
 * is not a waiver, and a waiver is an exception record. As with test reports, nothing binds the file to
 * the assessed commit, and a clean report does not say which files were linted.
 *
 * Read against real ruff 0.17.6 output (tests/fixtures/real-lint-output). Only ruff was captured.
 */

export const LINT_REPORT_DIRECTORY = ".governance/evidence/lint";

const IDENTITY = {
  tool: "sarif-lint",
  adapterId: "sarif-lint-results",
  adapterVersion: "0.1.0",
  capability: "verification:sarif-lint",
  evidenceId: "EVD-LINT-RESULTS",
  evidenceSource: "sarif-lint-adapter",
} as const;
const MAX_REPORTS = 50;
const MAX_FINDINGS = 50;

interface LintResult {
  tool: string;
  rule: string;
  level: "error" | "warning" | "note";
  message: string;
  file: string;
  line: number | undefined;
}

interface ParsedLint {
  results: LintResult[];
  runs: number;
  /** Runs that declared they did not finish, or a run with no named tool. */
  incompleteRuns: number;
  suppressed: number;
  endTimes: number[];
  runsWithoutEndTime: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function levelOf(value: unknown): LintResult["level"] {
  if (value === "error") return "error";
  if (value === "note" || value === "none") return "note";
  return "warning"; // SARIF's default when a result names no level.
}

/** Repository-relative path for a SARIF artifact uri; an absolute file uri outside the root is kept whole. */
function relativeFile(uri: string, rootPath: string): string {
  let file = uri;
  try {
    file = decodeURIComponent(uri);
  } catch {
    // keep the raw uri
  }
  file = file.replace(/^file:\/\/\/?/i, "").replaceAll("\\", "/");
  const root = rootPath.replaceAll("\\", "/").replace(/^\/+/, "").replace(/\/+$/, "");
  if (root && file.replace(/^\/+/, "").toLowerCase().startsWith(`${root.toLowerCase()}/`)) {
    return file.replace(/^\/+/, "").slice(root.length + 1);
  }
  return file.replace(/^\.\//, "");
}

/** Returns undefined when the text is not SARIF 2.1 (JSON with a `runs` array). */
export function parseSarif(text: string, rootPath = ""): ParsedLint | undefined {
  let document: unknown;
  try {
    document = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (!isRecord(document) || !Array.isArray(document.runs) || !String(document.version ?? "").startsWith("2.1")) return undefined;

  const parsed: ParsedLint = { results: [], runs: 0, incompleteRuns: 0, suppressed: 0, endTimes: [], runsWithoutEndTime: 0 };
  for (const run of document.runs) {
    if (!isRecord(run)) return undefined;
    parsed.runs += 1;
    const driver = isRecord(run.tool) && isRecord(run.tool.driver) ? run.tool.driver : undefined;
    const tool = typeof driver?.name === "string" && driver.name ? driver.name : undefined;
    const invocations = Array.isArray(run.invocations) ? run.invocations.filter(isRecord) : [];
    if (!tool || invocations.some((invocation) => invocation.executionSuccessful === false)) parsed.incompleteRuns += 1;
    const endTimes = invocations.map((invocation) => Date.parse(String(invocation.endTimeUtc ?? ""))).filter(Number.isFinite);
    if (endTimes.length > 0 && endTimes.length === invocations.length) parsed.endTimes.push(...endTimes);
    else parsed.runsWithoutEndTime += 1;

    for (const result of Array.isArray(run.results) ? run.results : []) {
      if (!isRecord(result)) return undefined;
      if (Array.isArray(result.suppressions) && result.suppressions.length > 0) parsed.suppressed += 1;
      const physical = Array.isArray(result.locations) && isRecord(result.locations[0]) && isRecord(result.locations[0].physicalLocation)
        ? result.locations[0].physicalLocation : undefined;
      const uri = isRecord(physical?.artifactLocation) && typeof physical.artifactLocation.uri === "string" ? physical.artifactLocation.uri : "";
      const line = isRecord(physical?.region) && typeof physical.region.startLine === "number" ? physical.region.startLine : undefined;
      parsed.results.push({
        tool: tool ?? "unnamed tool",
        rule: typeof result.ruleId === "string" && result.ruleId ? result.ruleId : "(no rule id)",
        level: levelOf(result.level),
        message: isRecord(result.message) && typeof result.message.text === "string" ? result.message.text : "",
        file: uri ? relativeFile(uri, rootPath) : "(unknown file)",
        line,
      });
    }
  }
  return parsed;
}

const severityFor = (level: "error" | "warning"): Severity => (level === "error" ? "P2" : "P3");

export function runLintReportAdapter(snapshot: RepositorySnapshot): ScannerAdapterOutput | undefined {
  const reportFiles = snapshot.files
    .map((file) => file.replaceAll("\\", "/"))
    .filter((file) => file.startsWith(`${LINT_REPORT_DIRECTORY}/`) && /\.sarif(\.json)?$/i.test(file))
    .sort();
  if (reportFiles.length === 0) return undefined;

  const selected = reportFiles.slice(0, MAX_REPORTS);
  const notIngested = selected.filter((file) => snapshot.fileContents?.[file] === undefined);
  const malformed: string[] = [];
  const results: Array<LintResult & { report: string }> = [];
  const endTimes: number[] = [];
  let runs = 0;
  let incompleteRuns = 0;
  let suppressed = 0;
  let missingEndTime = false;
  for (const file of selected) {
    const content = snapshot.fileContents?.[file];
    if (content === undefined) continue;
    const report = parseSarif(content, snapshot.rootPath);
    if (!report) {
      malformed.push(file);
      continue;
    }
    runs += report.runs;
    incompleteRuns += report.incompleteRuns;
    suppressed += report.suppressed;
    results.push(...report.results.map((item) => ({ ...item, report: file })));
    endTimes.push(...report.endTimes);
    if (report.runsWithoutEndTime > 0 || report.runs === 0) missingEndTime = true;
  }

  const errors = results.filter((item) => item.level === "error");
  const warnings = results.filter((item) => item.level === "warning");
  const notes = results.length - errors.length - warnings.length;
  const truncated = reportFiles.length > MAX_REPORTS;
  const limitations = [
    "Only SARIF 2.1 is read. The report is taken as supplied: nothing binds it to the commit being assessed, and it does not say which files the linter checked, so a clean report from an empty file set looks the same as a clean report from a whole repository.",
    ...(malformed.length ? [`Not a SARIF 2.1 report: ${malformed.slice(0, 10).join(", ")}.`] : []),
    ...(notIngested.length ? [`Content was not ingested for: ${notIngested.slice(0, 10).join(", ")}.`] : []),
    ...(truncated ? [`Found ${reportFiles.length} reports; only the first ${MAX_REPORTS} were read.`] : []),
    ...(incompleteRuns ? [`${incompleteRuns} run(s) named no tool or declared they did not finish, so their results may be incomplete.`] : []),
    ...(suppressed ? [`${suppressed} result(s) are marked suppressed in the report and are still counted: a suppression is not a waiver (ADR-0001).`] : []),
    ...(missingEndTime ? ["A run declared no end time, so the evidence has no generation time and fails any maximum-age limit."] : []),
  ];

  const status: ToolResultStatus = errors.length > 0 ? "FAIL"
    : malformed.length > 0 ? "ERROR"
      : runs === 0 || incompleteRuns > 0 || notIngested.length > 0 || truncated ? "UNVERIFIED"
        : warnings.length > 0 ? "WARN"
          : "PASS";
  const tool = [...new Set(results.map((item) => item.tool))];
  const tally = `${results.length} lint result(s) in ${selected.length - malformed.length - notIngested.length} report(s): ${errors.length} error, ${warnings.length} warning, ${notes} note not reported`;
  const summary = status === "ERROR"
    ? `Lint results could not be trusted: ${malformed.length} report(s) are not SARIF 2.1.`
    : status === "UNVERIFIED" && runs === 0
      ? "The lint reports contain no runs, so nothing was verified."
      : `Lint results${tool.length ? ` (${tool.join(", ")})` : ""}: ${tally}.${status === "UNVERIFIED" ? " The result is incomplete." : ""}`;

  const findings: GovernanceFinding[] = [...errors, ...warnings].slice(0, MAX_FINDINGS).map((item) => ({
    id: `FND-LINT-${stableId(`${item.file}:${item.line ?? 0}:${item.rule}:${item.message}`)}`,
    rule_id: `LINT-${item.rule}`,
    severity: severityFor(item.level as "error" | "warning"),
    category: "code-quality",
    message: `${item.tool} ${item.rule}: ${item.message}`.replace(/\s+/g, " ").trim().slice(0, 300),
    status: "OPEN",
    evidence_refs: [IDENTITY.evidenceId],
    source_location: { file: item.file, ...(item.line !== undefined ? { start_line: item.line } : {}) },
    confidence: 0.9,
    remediation: "Fix the reported code and regenerate the lint report. Disabling the rule or suppressing the result is not accepted as a fix; record a waiver as an exception.",
  }));
  if (errors.length + warnings.length > MAX_FINDINGS) {
    limitations.push(`${errors.length + warnings.length} results were reportable; findings were raised for the first ${MAX_FINDINGS}.`);
  }

  const oldest = !missingEndTime && endTimes.length > 0 ? new Date(Math.min(...endTimes)).toISOString() : undefined;
  const evidence: GovernanceEvidence = {
    id: IDENTITY.evidenceId,
    type: "E3_AUTOMATED_ANALYSIS",
    status: evidenceStatusForResult(status),
    result_status: status,
    description: summary,
    source: IDENTITY.evidenceSource,
    freshness: oldest ? "current" : "unknown",
    supports_controls: [],
    ...(oldest ? { generated_at: oldest } : {}),
    command: [`<read ${LINT_REPORT_DIRECTORY}/*.sarif>`],
  };

  const completed = status === "PASS" || status === "WARN" || status === "FAIL";
  const adapterResult: RepositoryAdapterResult = {
    adapterId: IDENTITY.adapterId,
    version: IDENTITY.adapterVersion,
    executionStatus: completed ? "SUCCESS" : status === "ERROR" ? "FAILED" : "PARTIAL",
    supportedCapabilities: completed ? [IDENTITY.capability] : [],
    unsupportedCapabilities: completed ? [] : [IDENTITY.capability],
    evidenceRefs: [IDENTITY.evidenceId],
    limitations,
  };
  return {
    result: {
      tool: IDENTITY.tool,
      status,
      command: evidence.command!,
      summary,
      evidenceId: IDENTITY.evidenceId,
      findings,
      limitations,
    },
    evidence: [evidence],
    findings,
    adapterResult,
  };
}
