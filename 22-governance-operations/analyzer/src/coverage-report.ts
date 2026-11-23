import type { GovernanceEvidence, ToolResultStatus } from "../../engine/src/types.js";
import { evidenceStatusForResult } from "../../engine/src/evidence-policy.js";
import type { RepositoryAdapterResult, RepositorySnapshot } from "./types.js";
import type { ScannerAdapterOutput } from "./verification-shared.js";

/**
 * Test coverage, read from LCOV reports the project's own test run already produced.
 *
 * QA-008 section 24: coverage "MAY be used as diagnostic signals" and "SHALL NOT be used as the sole
 * production-quality criterion"; no threshold is set anywhere. So this adapter measures and reports and
 * never passes or fails a number it would have to invent. The best it can say is WARN (partially
 * verified: a measurement exists), so the evidence can never fully verify a control, and it raises no
 * finding. It also declares no verification capability, so a control cannot name it as its verifier:
 * under the "every linked record must be usable" rule that would make the control unsatisfiable.
 *
 * Nothing is executed. Reports are read from REPORT_DIRECTORY, and with none there the adapter returns
 * nothing, so repositories that do not opt in see no change. LCOV carries no timestamp and a report
 * cannot prove which code it measured, so the evidence has no generation time and no repository
 * fingerprint.
 *
 * Read against real Node 24 `--test-reporter=lcov` output (tests/fixtures/real-coverage-output). Only
 * the widely shared records are read: SF, DA, LF, LH, BRF, BRH, FNF, FNH and end_of_record.
 */

// Not "coverage": the CLI's file lister skips every directory with that name, so reports there are never seen.
export const COVERAGE_REPORT_DIRECTORY = ".governance/evidence/lcov";

const IDENTITY = {
  tool: "lcov-coverage",
  adapterId: "lcov-coverage",
  adapterVersion: "0.1.0",
  evidenceId: "EVD-COVERAGE-REPORT",
  evidenceSource: "lcov-report-adapter",
} as const;
const MAX_REPORTS = 50;

interface Counter { found: number; hit: number }
interface FileCoverage {
  /** Line number to the highest execution count seen, so overlapping reports are unioned, not doubled. */
  lines: Map<number, number>;
  /** Totals from a record that has no DA lines. */
  scalarLines?: Counter;
  branches: Counter;
  functions: Counter;
}

export interface ParsedLcov {
  files: Map<string, FileCoverage>;
  /** Why the text cannot be trusted as an LCOV report; absent when it can. */
  problem?: string;
}

const emptyFile = (): FileCoverage => ({ lines: new Map(), branches: { found: 0, hit: 0 }, functions: { found: 0, hit: 0 } });
const whole = (value: string): number | undefined => (/^\d+$/.test(value) ? Number(value) : undefined);
// shortcut: for branches and functions the record with the most hits stands for the file, so two reports
// of the same file are not summed; upgrade to merging BRDA and FNDA entries if exact union is needed.
const better = (a: Counter, b: Counter): Counter => (b.hit > a.hit || (b.hit === a.hit && b.found > a.found) ? b : a);

export function parseLcov(text: string, into: Map<string, FileCoverage> = new Map()): ParsedLcov {
  let current: { path: string; lines: Map<number, number>; scalar: Partial<Record<"LF" | "LH", number>>; branches: Partial<Counter>; functions: Partial<Counter> } | undefined;
  let sawRecord = false;
  const fail = (problem: string): ParsedLcov => ({ files: into, problem });

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    const key = colon < 0 ? line : line.slice(0, colon);
    const value = colon < 0 ? "" : line.slice(colon + 1);

    if (key === "SF") {
      if (current) return fail("a source record started before the previous one ended");
      if (!value) return fail("a source record has no path");
      current = { path: value.replaceAll("\\", "/"), lines: new Map(), scalar: {}, branches: {}, functions: {} };
    } else if (key === "end_of_record") {
      if (!current) return fail("end_of_record without a source record");
      sawRecord = true;
      const file = into.get(current.path) ?? emptyFile();
      for (const [number, count] of current.lines) file.lines.set(number, Math.max(file.lines.get(number) ?? 0, count));
      if (current.lines.size === 0 && current.scalar.LF !== undefined) {
        const incoming = { found: current.scalar.LF, hit: current.scalar.LH ?? 0 };
        if (incoming.hit > incoming.found) return fail(`${current.path} reports more lines hit than found`);
        file.scalarLines = file.scalarLines ? better(file.scalarLines, incoming) : incoming;
      }
      for (const [target, source] of [[file.branches, current.branches], [file.functions, current.functions]] as const) {
        const incoming = { found: source.found ?? 0, hit: source.hit ?? 0 };
        if (incoming.hit > incoming.found) return fail(`${current.path} reports more hits than items found`);
        Object.assign(target, better(target, incoming));
      }
      into.set(current.path, file);
      current = undefined;
    } else if (current) {
      if (key === "DA") {
        const [lineNumber, count] = value.split(",");
        const parsedLine = whole(lineNumber ?? "");
        const parsedCount = whole(count ?? "");
        if (parsedLine === undefined || parsedCount === undefined) return fail(`${current.path} has a malformed DA record`);
        current.lines.set(parsedLine, Math.max(current.lines.get(parsedLine) ?? 0, parsedCount));
      } else if (key === "LF" || key === "LH" || key === "BRF" || key === "BRH" || key === "FNF" || key === "FNH") {
        const parsed = whole(value);
        if (parsed === undefined) return fail(`${current.path} has a malformed ${key} record`);
        if (key === "LF" || key === "LH") current.scalar[key] = parsed;
        else if (key === "BRF") current.branches.found = parsed;
        else if (key === "BRH") current.branches.hit = parsed;
        else if (key === "FNF") current.functions.found = parsed;
        else current.functions.hit = parsed;
      }
      // TN, FN, FNDA, BRDA and any other record carry nothing this adapter uses.
    }
  }
  if (current) return fail(`${current.path} is not closed by end_of_record, so the report looks truncated`);
  if (!sawRecord) return fail("no source records were found");
  return { files: into };
}

const percent = (c: Counter): string => `${((c.hit / c.found) * 100).toFixed(1)}% (${c.hit} of ${c.found})`;

export function runCoverageReportAdapter(snapshot: RepositorySnapshot): ScannerAdapterOutput | undefined {
  const reportFiles = snapshot.files
    .map((file) => file.replaceAll("\\", "/"))
    .filter((file) => file.startsWith(`${COVERAGE_REPORT_DIRECTORY}/`) && /\.(info|lcov)$/i.test(file))
    .sort();
  if (reportFiles.length === 0) return undefined;

  const selected = reportFiles.slice(0, MAX_REPORTS);
  const notIngested = selected.filter((file) => snapshot.fileContents?.[file] === undefined);
  const malformed: string[] = [];
  const merged = new Map<string, FileCoverage>();
  for (const file of selected) {
    const content = snapshot.fileContents?.[file];
    if (content === undefined) continue;
    const parsed = parseLcov(content, merged);
    if (parsed.problem) malformed.push(`${file} (${parsed.problem})`);
  }

  let lines: Counter = { found: 0, hit: 0 };
  let branches: Counter = { found: 0, hit: 0 };
  let functions: Counter = { found: 0, hit: 0 };
  for (const file of merged.values()) {
    const found = file.lines.size > 0 ? file.lines.size : file.scalarLines?.found ?? 0;
    const hit = file.lines.size > 0 ? [...file.lines.values()].filter((count) => count > 0).length : file.scalarLines?.hit ?? 0;
    lines = { found: lines.found + found, hit: lines.hit + hit };
    branches = { found: branches.found + file.branches.found, hit: branches.hit + file.branches.hit };
    functions = { found: functions.found + file.functions.found, hit: functions.hit + file.functions.hit };
  }

  const truncated = reportFiles.length > MAX_REPORTS;
  const limitations = [
    "Coverage is a diagnostic signal, not proof of quality (QA-008 section 24). No threshold is applied, so this never passes or fails. Only LCOV is read. The report is taken as supplied and nothing binds it to the commit being assessed.",
    ...(malformed.length ? [`Not a usable LCOV report: ${malformed.slice(0, 5).join("; ")}.`] : []),
    ...(notIngested.length ? [`Content was not ingested for: ${notIngested.slice(0, 10).join(", ")}.`] : []),
    ...(truncated ? [`Found ${reportFiles.length} reports; only the first ${MAX_REPORTS} were read.`] : []),
  ];
  const status: ToolResultStatus = malformed.length > 0 ? "ERROR"
    : lines.found === 0 || notIngested.length > 0 || truncated ? "UNVERIFIED"
      : "WARN";
  const detail = [
    `lines ${lines.found ? percent(lines) : "none measured"}`,
    ...(branches.found ? [`branches ${percent(branches)}`] : []),
    ...(functions.found ? [`functions ${percent(functions)}`] : []),
  ].join(", ");
  const summary = status === "ERROR"
    ? `Coverage could not be trusted: ${malformed.length} report(s) are not usable LCOV.`
    : status === "UNVERIFIED" && lines.found === 0
      ? "The coverage reports measured no executable lines, so nothing was verified."
      : `Coverage across ${merged.size} file(s): ${detail}. Diagnostic only.${status === "UNVERIFIED" ? " Some reports were not read, so the figures are incomplete." : ""}`;

  const evidence: GovernanceEvidence = {
    id: IDENTITY.evidenceId,
    type: "E3_AUTOMATED_ANALYSIS",
    status: evidenceStatusForResult(status),
    result_status: status,
    description: summary,
    source: IDENTITY.evidenceSource,
    freshness: "unknown",
    supports_controls: [],
    command: [`<read ${COVERAGE_REPORT_DIRECTORY}/*.info>`],
  };
  const adapterResult: RepositoryAdapterResult = {
    adapterId: IDENTITY.adapterId,
    version: IDENTITY.adapterVersion,
    executionStatus: status === "ERROR" ? "FAILED" : status === "UNVERIFIED" ? "PARTIAL" : "SUCCESS",
    // Deliberately none: a control cannot be bound to a diagnostic measurement (see the header).
    supportedCapabilities: [],
    unsupportedCapabilities: [],
    evidenceRefs: [IDENTITY.evidenceId],
    limitations,
  };
  return {
    result: { tool: IDENTITY.tool, status, command: evidence.command!, summary, evidenceId: IDENTITY.evidenceId, findings: [], limitations },
    evidence: [evidence],
    findings: [],
    adapterResult,
  };
}
