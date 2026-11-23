import type { GovernanceEvidence, GovernanceFinding, ToolResultStatus } from "../../engine/src/types.js";
import { evidenceStatusForResult } from "../../engine/src/evidence-policy.js";
import type { RepositoryAdapterResult, RepositorySnapshot } from "./types.js";
import type { ScannerAdapterOutput } from "./verification-shared.js";
import { stableId } from "./verification-shared.js";

/**
 * Test results, read from JUnit XML reports the project's own test run already produced.
 *
 * Nothing is executed: running a repository's test command would run its code, so the adapter only
 * reads reports. CI (or the engineer) writes them under REPORT_DIRECTORY before the governance check.
 * With no reports there, the adapter returns nothing, so repositories that do not opt in see no change.
 *
 * The evidence is deliberately not bound to the assessed commit (no repository fingerprint): a report
 * file cannot prove which code it ran against. It carries the oldest `timestamp` the suites declare as
 * its generation time, so a control's maximum evidence age can still reject a stale report; a report
 * with no timestamp has no age and fails any such limit.
 *
 * Read against real vitest 5.0.4 output (tests/fixtures/real-test-output). JUnit has no formal schema,
 * so only the widely shared parts are read: `testsuite` `timestamp`, `testcase` `classname` and `name`,
 * and a `failure`, `error` or `skipped` child inside a `testcase`.
 */

export const TEST_REPORT_DIRECTORY = ".governance/evidence/tests";

const IDENTITY = {
  tool: "junit-test-results",
  adapterId: "junit-test-results",
  adapterVersion: "0.1.0",
  capability: "verification:junit-test-results",
  evidenceId: "EVD-TEST-RESULTS",
  evidenceSource: "junit-report-adapter",
} as const;
const MAX_REPORTS = 50;
const MAX_FINDINGS = 50;

interface FailedTest {
  name: string;
  message: string;
}

interface ParsedReport {
  tests: number;
  skipped: number;
  failed: FailedTest[];
  timestamps: number[];
  hasSuiteTimestampGap: boolean;
}

const decode = (value: string): string =>
  value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

function attributes(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of raw.matchAll(/([A-Za-z_][\w:.-]*)\s*=\s*"([^"]*)"/g)) result[match[1]!] = decode(match[2]!);
  return result;
}

/** Returns undefined when the text is not a JUnit report at all (no testsuite or testsuites element). */
export function parseJunit(xml: string): ParsedReport | undefined {
  // CDATA and comments can hold anything, including text that looks like markup.
  const text = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  if (!/<testsuites?\b/.test(text)) return undefined;

  const report: ParsedReport = { tests: 0, skipped: 0, failed: [], timestamps: [], hasSuiteTimestampGap: false };
  let current: { name: string; failed: boolean; message: string; skipped: boolean } | undefined;
  const finish = () => {
    if (!current) return;
    if (current.failed) report.failed.push({ name: current.name, message: current.message });
    else if (current.skipped) report.skipped += 1;
    current = undefined;
  };

  for (const match of text.matchAll(/<(\/?)(testsuite|testcase|failure|error|skipped)\b([^>]*?)(\/?)>/g)) {
    const [, closing, tag, rawAttributes, selfClosing] = match;
    if (closing) {
      if (tag === "testcase") finish();
      continue;
    }
    const attrs = attributes(rawAttributes ?? "");
    if (tag === "testsuite") {
      const parsed = attrs.timestamp ? Date.parse(attrs.timestamp) : Number.NaN;
      if (Number.isFinite(parsed)) report.timestamps.push(parsed);
      else report.hasSuiteTimestampGap = true;
    } else if (tag === "testcase") {
      finish();
      report.tests += 1;
      current = { name: [attrs.classname, attrs.name].filter(Boolean).join(" :: ") || "(unnamed test)", failed: false, message: "", skipped: false };
      if (selfClosing) finish();
    } else if (tag === "skipped") {
      if (current) current.skipped = true;
    } else if (current) {
      current.failed = true;
      current.message ||= attrs.message ?? "";
    } else {
      // A failure or error outside any test case is a suite-level fault, for example a crash while loading.
      report.failed.push({ name: "(suite-level error)", message: attrs.message ?? "" });
    }
  }
  finish();
  return report;
}

export function runTestReportAdapter(snapshot: RepositorySnapshot): ScannerAdapterOutput | undefined {
  const reportFiles = snapshot.files
    .map((file) => file.replaceAll("\\", "/"))
    .filter((file) => file.startsWith(`${TEST_REPORT_DIRECTORY}/`) && file.toLowerCase().endsWith(".xml"))
    .sort();
  if (reportFiles.length === 0) return undefined;

  const selected = reportFiles.slice(0, MAX_REPORTS);
  const notIngested = selected.filter((file) => snapshot.fileContents?.[file] === undefined);
  const malformed: string[] = [];
  const failed: Array<FailedTest & { file: string }> = [];
  const timestamps: number[] = [];
  let tests = 0;
  let skipped = 0;
  let missingTimestamp = false;
  for (const file of selected) {
    const content = snapshot.fileContents?.[file];
    if (content === undefined) continue;
    const report = parseJunit(content);
    if (!report) {
      malformed.push(file);
      continue;
    }
    tests += report.tests;
    skipped += report.skipped;
    failed.push(...report.failed.map((item) => ({ ...item, file })));
    timestamps.push(...report.timestamps);
    if (report.hasSuiteTimestampGap || report.timestamps.length === 0) missingTimestamp = true;
  }

  const truncated = reportFiles.length > MAX_REPORTS;
  const limitations = [
    "Only JUnit XML is read. The report is taken as supplied: nothing binds it to the commit being assessed, so it shows that a test run happened, not that it ran against this code.",
    ...(malformed.length ? [`Not a JUnit report: ${malformed.slice(0, 10).join(", ")}.`] : []),
    ...(notIngested.length ? [`Content was not ingested for: ${notIngested.slice(0, 10).join(", ")}.`] : []),
    ...(truncated ? [`Found ${reportFiles.length} reports; only the first ${MAX_REPORTS} were read.`] : []),
    ...(missingTimestamp ? ["A suite declared no valid timestamp, so the evidence has no generation time and fails any maximum-age limit."] : []),
  ];

  const status: ToolResultStatus = failed.length > 0 ? "FAIL"
    : malformed.length > 0 ? "ERROR"
      : tests === 0 || notIngested.length > 0 || truncated ? "UNVERIFIED"
        : skipped > 0 ? "WARN"
          : "PASS";
  const tally = `${tests} test(s) in ${selected.length - malformed.length - notIngested.length} report(s): ${failed.length} failed, ${skipped} skipped`;
  const summary = status === "ERROR"
    ? `Test results could not be trusted: ${malformed.length} report(s) are not JUnit XML.`
    : status === "UNVERIFIED" && tests === 0
      ? "The test reports contain no test cases, so nothing was verified."
      : `JUnit test results: ${tally}.${status === "UNVERIFIED" ? " Some reports were not read, so the result is incomplete." : ""}`;

  const findings: GovernanceFinding[] = failed.slice(0, MAX_FINDINGS).map((item) => ({
    id: `FND-TEST-${stableId(`${item.file}:${item.name}`)}`,
    rule_id: "TEST-FAILURE",
    severity: "P1",
    category: "testing",
    message: `Test failed: ${item.name}${item.message ? ` - ${item.message}` : ""}`.replace(/\s+/g, " ").trim().slice(0, 300),
    status: "OPEN",
    evidence_refs: [IDENTITY.evidenceId],
    source_location: { file: item.file },
    confidence: 0.95,
    remediation: "Fix the failing test or the code it covers and regenerate the test report. A skipped or deleted test is not accepted as a fix.",
  }));
  if (failed.length > MAX_FINDINGS) limitations.push(`${failed.length} tests failed; findings were raised for the first ${MAX_FINDINGS}.`);

  const oldest = !missingTimestamp && timestamps.length > 0 ? new Date(Math.min(...timestamps)).toISOString() : undefined;
  const evidence: GovernanceEvidence = {
    id: IDENTITY.evidenceId,
    type: "E1_DIRECT_VERIFICATION",
    status: evidenceStatusForResult(status),
    result_status: status,
    description: summary,
    source: IDENTITY.evidenceSource,
    freshness: oldest ? "current" : "unknown",
    supports_controls: [],
    ...(oldest ? { generated_at: oldest } : {}),
    command: [`<read ${TEST_REPORT_DIRECTORY}/*.xml>`],
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
