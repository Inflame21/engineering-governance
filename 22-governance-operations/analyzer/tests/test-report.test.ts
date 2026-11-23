import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { evaluateControl } from "../../engine/src/evaluator.js";
import { parseJunit, runTestReportAdapter, TEST_REPORT_DIRECTORY } from "../src/test-report.js";
import { runVerificationAdapters, type VerificationToolRunner } from "../src/verification.js";
import type { RepositorySnapshot } from "../src/types.js";

const real = (name: string) => readFileSync(new URL(`./fixtures/real-test-output/${name}`, import.meta.url), "utf8");
const REPORT = `${TEST_REPORT_DIRECTORY}/junit.xml`;

function snapshot(contents: Record<string, string | undefined>, extraFiles: string[] = []): RepositorySnapshot {
  const present = Object.fromEntries(Object.entries(contents).filter(([, v]) => v !== undefined)) as Record<string, string>;
  return { rootPath: "/repo", files: [...Object.keys(contents), ...extraFiles], changedFiles: [], fileContents: present };
}

const suite = (body: string, timestamp = "2026-11-23T06:56:24.506Z") =>
  `<?xml version="1.0"?><testsuites><testsuite name="s" ${timestamp ? `timestamp="${timestamp}"` : ""}>${body}</testsuite></testsuites>`;

describe("JUnit test-results collector", () => {
  it("returns nothing when the repository provides no test reports", () => {
    expect(runTestReportAdapter(snapshot({}, ["src/a.ts", `${TEST_REPORT_DIRECTORY}/notes.txt`]))).toBeUndefined();
  });

  it("passes real vitest output, records E1 evidence and the suite timestamp, and binds no repository fingerprint", () => {
    const out = runTestReportAdapter(snapshot({ [REPORT]: real("vitest-pass.xml") }))!;
    expect(out.result.status).toBe("PASS");
    expect(out.result.summary).toContain("2 test(s)");
    expect(out.findings).toEqual([]);
    expect(out.adapterResult.executionStatus).toBe("SUCCESS");
    const [evidence] = out.evidence;
    expect(evidence).toMatchObject({
      id: "EVD-TEST-RESULTS", type: "E1_DIRECT_VERIFICATION", status: "VERIFIED", result_status: "PASS",
      freshness: "current", generated_at: "2026-11-23T06:56:24.506Z", supports_controls: [],
    });
    expect(evidence).not.toHaveProperty("repository_fingerprint");
    expect(out.result.limitations.join(" ")).toContain("nothing binds it to the commit");
  });

  it("fails real vitest output with one failed and one skipped test, raising a P1 finding for the failure only", () => {
    const out = runTestReportAdapter(snapshot({ [REPORT]: real("vitest-mixed.xml") }))!;
    expect(out.result.status).toBe("FAIL");
    expect(out.evidence[0]).toMatchObject({ status: "UNVERIFIED", result_status: "FAIL" });
    expect(out.findings).toHaveLength(1);
    expect(out.findings[0]).toMatchObject({ rule_id: "TEST-FAILURE", severity: "P1", category: "testing", status: "OPEN", evidence_refs: ["EVD-TEST-RESULTS"] });
    expect(out.findings[0]!.message).toContain("mixed > fails");
    expect(out.findings[0]!.message).toContain("expected 1 to be 2");
    expect(out.result.summary).toContain("3 test(s)");
    expect(out.result.summary).toContain("1 failed, 1 skipped");
  });

  it("warns, never passes, when tests were skipped and none failed", () => {
    const out = runTestReportAdapter(snapshot({ [REPORT]: suite('<testcase classname="a" name="x"/><testcase classname="a" name="y"><skipped/></testcase>') }))!;
    expect(out.result.status).toBe("WARN");
    expect(out.evidence[0]).toMatchObject({ status: "PARTIALLY_VERIFIED" });
  });

  it("treats a failure and an error element the same, whichever one the runner wrote", () => {
    const out = runTestReportAdapter(snapshot({ [REPORT]: suite('<testcase name="a"><error message="boom">trace</error></testcase><testcase name="b"><failure message="bad"/></testcase>') }))!;
    expect(out.result.status).toBe("FAIL");
    expect(out.findings.map((f) => f.message)).toEqual([expect.stringContaining("a - boom"), expect.stringContaining("b - bad")]);
  });

  it("counts a suite-level error outside any test case as a failure", () => {
    const out = runTestReportAdapter(snapshot({ [REPORT]: suite('<error message="cannot load module"/>') }))!;
    expect(out.result.status).toBe("FAIL");
    expect(out.findings[0]!.message).toContain("(suite-level error) - cannot load module");
  });

  it("is not fooled by markup inside CDATA or comments, or by nested suites", () => {
    const body = '<testcase name="a"><system-out><![CDATA[<testcase name="ghost"><failure message="fake"/></testcase>]]></system-out></testcase><!-- <failure/> -->';
    const out = runTestReportAdapter(snapshot({ [REPORT]: `<testsuites><testsuite name="outer" timestamp="2026-11-23T06:00:00Z"><testsuite name="inner" timestamp="2026-11-23T06:00:01Z">${body}</testsuite></testsuite></testsuites>` }))!;
    expect(out.result.status).toBe("PASS");
    expect(out.result.summary).toContain("1 test(s)");
    expect(out.evidence[0]!.generated_at).toBe("2026-11-23T06:00:00.000Z");
  });

  it("decodes XML entities in names and messages", () => {
    const out = runTestReportAdapter(snapshot({ [REPORT]: suite('<testcase classname="c" name="a &gt; b &amp; c"><failure message="x &lt; y"/></testcase>') }))!;
    expect(out.findings[0]!.message).toBe("Test failed: c :: a > b & c - x < y");
  });

  it("is UNVERIFIED for a report with no test cases: an empty run proves nothing", () => {
    const out = runTestReportAdapter(snapshot({ [REPORT]: suite("") }))!;
    expect(out.result.status).toBe("UNVERIFIED");
    expect(out.result.summary).toContain("no test cases");
    expect(out.evidence[0]!.status).toBe("UNVERIFIED");
  });

  it("is ERROR when a file is not a JUnit report, and FAIL still wins when a real failure is also present", () => {
    const bad = runTestReportAdapter(snapshot({ [REPORT]: "<html>not a report</html>" }))!;
    expect(bad.result.status).toBe("ERROR");
    expect(bad.adapterResult.executionStatus).toBe("FAILED");
    expect(bad.evidence[0]!.status).toBe("UNVERIFIED");
    const both = runTestReportAdapter(snapshot({ [REPORT]: real("vitest-mixed.xml"), [`${TEST_REPORT_DIRECTORY}/junk.xml`]: "nope" }))!;
    expect(both.result.status).toBe("FAIL");
    expect(both.result.limitations.join(" ")).toContain("junk.xml");
  });

  it("is UNVERIFIED, not PASS, when one report's content was not ingested", () => {
    const out = runTestReportAdapter(snapshot({ [REPORT]: real("vitest-pass.xml"), [`${TEST_REPORT_DIRECTORY}/big.xml`]: undefined }))!;
    expect(out.result.status).toBe("UNVERIFIED");
    expect(out.result.limitations.join(" ")).toContain("big.xml");
    expect(out.adapterResult.executionStatus).toBe("PARTIAL");
  });

  it("gives evidence no generation time when a suite declares none, so a maximum-age limit rejects it", () => {
    const out = runTestReportAdapter(snapshot({ [REPORT]: suite('<testcase name="a"/>', "") }))!;
    expect(out.result.status).toBe("PASS");
    expect(out.evidence[0]).toMatchObject({ freshness: "unknown" });
    expect(out.evidence[0]).not.toHaveProperty("generated_at");
  });

  it("takes the oldest timestamp across reports, so one stale report ages the whole result", () => {
    const out = runTestReportAdapter(snapshot({
      [`${TEST_REPORT_DIRECTORY}/a.xml`]: suite('<testcase name="a"/>', "2026-11-23T06:00:00Z"),
      [`${TEST_REPORT_DIRECTORY}/b.xml`]: suite('<testcase name="b"/>', "2026-11-01T06:00:00Z"),
    }))!;
    expect(out.evidence[0]!.generated_at).toBe("2026-11-01T06:00:00.000Z");
  });

  it("caps findings at 50 and says so", () => {
    const many = Array.from({ length: 60 }, (_, i) => `<testcase name="t${i}"><failure message="m"/></testcase>`).join("");
    const out = runTestReportAdapter(snapshot({ [REPORT]: suite(many) }))!;
    expect(out.findings).toHaveLength(50);
    expect(out.result.limitations.join(" ")).toContain("60 tests failed");
  });

  it("parseJunit rejects text with no testsuite element", () => {
    expect(parseJunit("<root/>")).toBeUndefined();
  });
});

describe("test results through the verification pipeline", () => {
  const noTools: VerificationToolRunner = {
    async isAvailable() { return false; },
    async run() { throw new Error("no tool should run"); },
  };

  it("adds the evidence and findings to the report without running any command", async () => {
    const report = await runVerificationAdapters(snapshot({ [REPORT]: real("vitest-mixed.xml") }), noTools);
    expect(report.results.map((r) => r.tool)).toContain("junit-test-results");
    expect(report.evidence.map((e) => e.id)).toContain("EVD-TEST-RESULTS");
    expect(report.findings.some((f) => f.rule_id === "TEST-FAILURE")).toBe(true);
    expect(report.adapterResults.find((a) => a.adapterId === "junit-test-results")?.executionStatus).toBe("SUCCESS");
  });

  it("changes nothing for a repository without reports", async () => {
    const report = await runVerificationAdapters(snapshot({}, ["README.md"]), noTools);
    expect(report.results.map((r) => r.tool)).not.toContain("junit-test-results");
  });

  it("cannot satisfy a control on its own, because the evidence supports no control until someone links it", async () => {
    const report = await runVerificationAdapters(snapshot({ [REPORT]: real("vitest-pass.xml") }), noTools);
    const control = { id: "QA-CTL", standard: "QA-008", title: "Tests pass", severity: "P1" as const, failure_decision: "NO-GO" as const, required_evidence: ["EVD-TEST-RESULTS"] };
    const unlinked = evaluateControl(control, report.evidence, { signals: [] } as never);
    expect(unlinked.status).not.toBe("PASS");
    const linked = evaluateControl(control, report.evidence.map((e) => ({ ...e, supports_controls: ["QA-CTL"] })), { signals: [] } as never);
    expect(linked.status).toBe("PASS");
  });
});
