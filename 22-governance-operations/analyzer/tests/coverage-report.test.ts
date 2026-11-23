import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COVERAGE_REPORT_DIRECTORY, parseLcov, runCoverageReportAdapter } from "../src/coverage-report.js";
import { runVerificationAdapters, type VerificationToolRunner } from "../src/verification.js";
import type { RepositorySnapshot } from "../src/types.js";

const real = readFileSync(new URL("./fixtures/real-coverage-output/node-lcov.info", import.meta.url), "utf8");
const REPORT = `${COVERAGE_REPORT_DIRECTORY}/lcov.info`;

function snapshot(contents: Record<string, string | undefined>, extraFiles: string[] = []): RepositorySnapshot {
  const present = Object.fromEntries(Object.entries(contents).filter(([, v]) => v !== undefined)) as Record<string, string>;
  return { rootPath: "/repo", files: [...Object.keys(contents), ...extraFiles], changedFiles: [], fileContents: present };
}
const record = (path: string, da: Array<[number, number]>, extra = "") =>
  `SF:${path}\n${da.map(([l, c]) => `DA:${l},${c}`).join("\n")}\n${extra}end_of_record\n`;

describe("LCOV coverage collector", () => {
  it("returns nothing when the repository provides no coverage reports", () => {
    expect(runCoverageReportAdapter(snapshot({}, ["src/a.ts", `${COVERAGE_REPORT_DIRECTORY}/notes.txt`]))).toBeUndefined();
  });

  it("measures real Node lcov output and reports it as diagnostic only: WARN, partially verified, no finding", () => {
    const out = runCoverageReportAdapter(snapshot({ [REPORT]: real }))!;
    expect(out.result.status).toBe("WARN");
    expect(out.result.summary).toContain("lines 71.4% (5 of 7)");
    expect(out.result.summary).toContain("branches 75.0% (3 of 4)");
    expect(out.result.summary).toContain("functions 66.7% (2 of 3)");
    expect(out.result.summary).toContain("Diagnostic only");
    expect(out.findings).toEqual([]);
    expect(out.evidence[0]).toMatchObject({ id: "EVD-COVERAGE-REPORT", status: "PARTIALLY_VERIFIED", result_status: "WARN", supports_controls: [], freshness: "unknown" });
    expect(out.evidence[0]).not.toHaveProperty("generated_at");
    expect(out.evidence[0]).not.toHaveProperty("repository_fingerprint");
    expect(out.result.limitations.join(" ")).toContain("never passes or fails");
  });

  it("never passes, however high the coverage: full coverage is still only a measurement", () => {
    const out = runCoverageReportAdapter(snapshot({ [REPORT]: record("a.ts", [[1, 9], [2, 3]]) }))!;
    expect(out.result.summary).toContain("lines 100.0% (2 of 2)");
    expect(out.result.status).toBe("WARN");
    expect(out.evidence[0]!.status).not.toBe("VERIFIED");
  });

  it("never fails, however low the coverage: no threshold exists in the standards", () => {
    const out = runCoverageReportAdapter(snapshot({ [REPORT]: record("a.ts", [[1, 0], [2, 0]]) }))!;
    expect(out.result.status).toBe("WARN");
    expect(out.result.summary).toContain("lines 0.0% (0 of 2)");
    expect(out.findings).toEqual([]);
  });

  it("declares no verification capability, so a control cannot name coverage as its verifier", () => {
    const out = runCoverageReportAdapter(snapshot({ [REPORT]: real }))!;
    expect(out.adapterResult).toMatchObject({ executionStatus: "SUCCESS", supportedCapabilities: [], unsupportedCapabilities: [], evidenceRefs: ["EVD-COVERAGE-REPORT"] });
  });

  it("unions overlapping reports per line instead of double counting a file measured twice", () => {
    const out = runCoverageReportAdapter(snapshot({
      [`${COVERAGE_REPORT_DIRECTORY}/unit.info`]: record("a.ts", [[1, 1], [2, 0], [3, 0]]),
      [`${COVERAGE_REPORT_DIRECTORY}/integration.info`]: record("a.ts", [[1, 0], [2, 4], [3, 0]]),
    }))!;
    expect(out.result.summary).toContain("1 file(s)");
    expect(out.result.summary).toContain("lines 66.7% (2 of 3)");
  });

  it("counts separate files separately and normalises Windows separators", () => {
    const out = runCoverageReportAdapter(snapshot({ [REPORT]: record("src\\a.ts", [[1, 1]]) + record("src/b.ts", [[1, 0], [2, 0]]) }))!;
    expect(out.result.summary).toContain("2 file(s)");
    expect(out.result.summary).toContain("lines 33.3% (1 of 3)");
    const same = runCoverageReportAdapter(snapshot({ [REPORT]: record("src\\a.ts", [[1, 1]]) + record("src/a.ts", [[2, 1]]) }))!;
    expect(same.result.summary).toContain("1 file(s)");
  });

  it("falls back to LF and LH for a record without line data", () => {
    const out = runCoverageReportAdapter(snapshot({ [REPORT]: "SF:a.ts\nLF:10\nLH:4\nend_of_record\n" }))!;
    expect(out.result.summary).toContain("lines 40.0% (4 of 10)");
  });

  it("is UNVERIFIED for a report that measured no executable lines: an empty measurement proves nothing", () => {
    const out = runCoverageReportAdapter(snapshot({ [REPORT]: "SF:a.ts\nLF:0\nLH:0\nend_of_record\n" }))!;
    expect(out.result.status).toBe("UNVERIFIED");
    expect(out.result.summary).toContain("no executable lines");
    expect(out.evidence[0]!.status).toBe("UNVERIFIED");
  });

  it.each([
    ["text that is not LCOV", "<html>nope</html>"],
    ["a truncated report", "SF:a.ts\nDA:1,1\nLF:1\nLH:1\n"],
    ["a record that never starts", "DA:1,1\nend_of_record\n"],
    ["a record nested in another", "SF:a.ts\nSF:b.ts\nend_of_record\n"],
    ["more lines hit than found", "SF:a.ts\nLF:2\nLH:5\nend_of_record\n"],
    ["a malformed DA record", "SF:a.ts\nDA:one,two\nend_of_record\n"],
    ["a malformed count", "SF:a.ts\nLF:ten\nend_of_record\n"],
    ["more branches hit than found", "SF:a.ts\nDA:1,1\nBRF:1\nBRH:3\nend_of_record\n"],
  ])("is ERROR for %s, never a measurement", (_name, content) => {
    const out = runCoverageReportAdapter(snapshot({ [REPORT]: content }))!;
    expect(out.result.status).toBe("ERROR");
    expect(out.adapterResult.executionStatus).toBe("FAILED");
    expect(out.evidence[0]!.status).toBe("UNVERIFIED");
  });

  it("is UNVERIFIED, not WARN, when one report's content was not ingested", () => {
    const out = runCoverageReportAdapter(snapshot({ [REPORT]: real, [`${COVERAGE_REPORT_DIRECTORY}/big.info`]: undefined }))!;
    expect(out.result.status).toBe("UNVERIFIED");
    expect(out.result.limitations.join(" ")).toContain("big.info");
    expect(out.adapterResult.executionStatus).toBe("PARTIAL");
  });

  it("reads .lcov files too, and ignores other extensions", () => {
    expect(runCoverageReportAdapter(snapshot({ [`${COVERAGE_REPORT_DIRECTORY}/x.lcov`]: real }))!.result.status).toBe("WARN");
    expect(runCoverageReportAdapter(snapshot({ [`${COVERAGE_REPORT_DIRECTORY}/x.json`]: real }))).toBeUndefined();
  });

  it("parseLcov ignores records it does not use", () => {
    const parsed = parseLcov("TN:\nSF:a.ts\nFN:1,f\nFNDA:1,f\nBRDA:1,0,0,1\nDA:1,1\nend_of_record\n");
    expect(parsed.problem).toBeUndefined();
    expect([...parsed.files.keys()]).toEqual(["a.ts"]);
  });
});

describe("coverage through the verification pipeline", () => {
  const noTools: VerificationToolRunner = {
    async isAvailable() { return false; },
    async run() { throw new Error("no tool should run"); },
  };

  it("adds diagnostic evidence without running anything and without findings", async () => {
    const report = await runVerificationAdapters(snapshot({ [REPORT]: real }), noTools);
    expect(report.results.map((r) => r.tool)).toContain("lcov-coverage");
    expect(report.evidence.map((e) => e.id)).toContain("EVD-COVERAGE-REPORT");
    expect(report.findings.filter((f) => f.evidence_refs.includes("EVD-COVERAGE-REPORT"))).toEqual([]);
  });

  it("changes nothing for a repository without coverage reports", async () => {
    const report = await runVerificationAdapters(snapshot({}, ["README.md"]), noTools);
    expect(report.results.map((r) => r.tool)).not.toContain("lcov-coverage");
  });
});
