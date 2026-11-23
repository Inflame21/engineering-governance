import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { evaluateControl } from "../../engine/src/evaluator.js";
import { LINT_REPORT_DIRECTORY, parseSarif, runLintReportAdapter } from "../src/lint-report.js";
import { runVerificationAdapters, type VerificationToolRunner } from "../src/verification.js";
import type { RepositorySnapshot } from "../src/types.js";

const real = (name: string) => readFileSync(new URL(`./fixtures/real-lint-output/${name}`, import.meta.url), "utf8");
const REPORT = `${LINT_REPORT_DIRECTORY}/ruff.sarif`;

function snapshot(contents: Record<string, string | undefined>, extraFiles: string[] = []): RepositorySnapshot {
  const present = Object.fromEntries(Object.entries(contents).filter(([, v]) => v !== undefined)) as Record<string, string>;
  return { rootPath: "/repo", files: [...Object.keys(contents), ...extraFiles], changedFiles: [], fileContents: present };
}

const sarif = (results: unknown[], run: Record<string, unknown> = {}) =>
  JSON.stringify({ version: "2.1.0", runs: [{ tool: { driver: { name: "lint" } }, results, ...run }] });
const result = (level: string | undefined, extra: Record<string, unknown> = {}) => ({
  ruleId: "R1", ...(level ? { level } : {}), message: { text: "msg" },
  locations: [{ physicalLocation: { artifactLocation: { uri: "src/a.ts" }, region: { startLine: 3 } } }], ...extra,
});

describe("SARIF lint collector", () => {
  it("returns nothing when the repository provides no lint reports", () => {
    expect(runLintReportAdapter(snapshot({}, ["src/a.ts", `${LINT_REPORT_DIRECTORY}/notes.txt`, `${LINT_REPORT_DIRECTORY}/a.xml`]))).toBeUndefined();
  });

  it("passes a clean real ruff report, records E3 evidence and binds no repository fingerprint", () => {
    const out = runLintReportAdapter(snapshot({ [REPORT]: real("ruff-clean.sarif") }))!;
    expect(out.result.status).toBe("PASS");
    expect(out.findings).toEqual([]);
    expect(out.adapterResult.supportedCapabilities).toEqual(["verification:sarif-lint"]);
    expect(out.evidence[0]).toMatchObject({
      id: "EVD-LINT-RESULTS", type: "E3_AUTOMATED_ANALYSIS", status: "VERIFIED", result_status: "PASS",
      freshness: "unknown", supports_controls: [],
    });
    expect(out.evidence[0]).not.toHaveProperty("repository_fingerprint");
    expect(out.evidence[0]).not.toHaveProperty("generated_at");
    expect(out.result.limitations.join(" ")).toContain("does not say which files");
  });

  it("fails real ruff output and raises one P2 finding per error, at a repository-relative path and line", () => {
    const out = runLintReportAdapter(snapshot({ [REPORT]: real("ruff-mixed.sarif") }))!;
    expect(out.result.status).toBe("FAIL");
    expect(out.evidence[0]).toMatchObject({ status: "UNVERIFIED", result_status: "FAIL" });
    expect(out.findings).toHaveLength(3);
    expect(out.findings.every((f) => f.severity === "P2" && f.category === "code-quality" && f.status === "OPEN")).toBe(true);
    expect(out.findings.map((f) => [f.rule_id, f.source_location])).toEqual(expect.arrayContaining([
      ["LINT-F401", { file: "sample.py", start_line: 1 }],
      ["LINT-F401", { file: "sample.py", start_line: 2 }],
      ["LINT-F841", { file: "sample.py", start_line: 6 }],
    ]));
    expect(out.findings[0]!.message).toMatch(/^ruff F\d+: /);
    expect(new Set(out.findings.map((f) => f.id)).size).toBe(3);
    expect(out.result.summary).toContain("3 error");
  });

  it("warns on a warning, and treats a result with no level as a warning because SARIF's default is warning", () => {
    for (const level of ["warning", undefined]) {
      const out = runLintReportAdapter(snapshot({ [REPORT]: sarif([result(level)]) }))!;
      expect(out.result.status).toBe("WARN");
      expect(out.findings[0]).toMatchObject({ severity: "P3" });
      expect(out.evidence[0]!.status).toBe("PARTIALLY_VERIFIED");
    }
  });

  it("counts notes without reporting them, so informational output cannot bury real findings", () => {
    const out = runLintReportAdapter(snapshot({ [REPORT]: sarif([result("note"), result("none")]) }))!;
    expect(out.result.status).toBe("PASS");
    expect(out.findings).toEqual([]);
    expect(out.result.summary).toContain("2 note not reported");
  });

  it("still counts a result the linter marked suppressed, because a suppression is not a waiver", () => {
    const out = runLintReportAdapter(snapshot({ [REPORT]: sarif([result("error", { suppressions: [{ kind: "inSource" }] })]) }))!;
    expect(out.result.status).toBe("FAIL");
    expect(out.result.limitations.join(" ")).toContain("not a waiver");
  });

  it("is UNVERIFIED when a run says it did not finish or names no tool, even with no results", () => {
    const crashed = runLintReportAdapter(snapshot({ [REPORT]: sarif([], { invocations: [{ executionSuccessful: false }] }) }))!;
    expect(crashed.result.status).toBe("UNVERIFIED");
    expect(crashed.adapterResult.executionStatus).toBe("PARTIAL");
    const unnamed = runLintReportAdapter(snapshot({ [REPORT]: JSON.stringify({ version: "2.1.0", runs: [{ results: [] }] }) }))!;
    expect(unnamed.result.status).toBe("UNVERIFIED");
  });

  it("is UNVERIFIED for a report with no runs: nothing was checked", () => {
    const out = runLintReportAdapter(snapshot({ [REPORT]: JSON.stringify({ version: "2.1.0", runs: [] }) }))!;
    expect(out.result.status).toBe("UNVERIFIED");
    expect(out.result.summary).toContain("no runs");
  });

  it("is ERROR for a file that is not SARIF 2.1, and FAIL still wins when a real error is also present", () => {
    for (const text of ["not json", "{}", JSON.stringify({ version: "2.0.0", runs: [] }), JSON.stringify({ version: "2.1.0", runs: ["x"] })]) {
      const bad = runLintReportAdapter(snapshot({ [REPORT]: text }))!;
      expect(bad.result.status).toBe("ERROR");
      expect(bad.adapterResult.executionStatus).toBe("FAILED");
      expect(bad.evidence[0]!.status).toBe("UNVERIFIED");
    }
    const both = runLintReportAdapter(snapshot({ [REPORT]: real("ruff-mixed.sarif"), [`${LINT_REPORT_DIRECTORY}/junk.sarif`]: "nope" }))!;
    expect(both.result.status).toBe("FAIL");
    expect(both.result.limitations.join(" ")).toContain("junk.sarif");
  });

  it("is UNVERIFIED, not PASS, when one report's content was not ingested", () => {
    const out = runLintReportAdapter(snapshot({ [REPORT]: real("ruff-clean.sarif"), [`${LINT_REPORT_DIRECTORY}/big.sarif.json`]: undefined }))!;
    expect(out.result.status).toBe("UNVERIFIED");
    expect(out.result.limitations.join(" ")).toContain("big.sarif.json");
  });

  it("uses the oldest run end time, and none at all when any run declares none", () => {
    const run = (end: string) => sarif([], { invocations: [{ executionSuccessful: true, endTimeUtc: end }] });
    const dated = runLintReportAdapter(snapshot({
      [`${LINT_REPORT_DIRECTORY}/a.sarif`]: run("2026-11-23T06:00:00Z"),
      [`${LINT_REPORT_DIRECTORY}/b.sarif`]: run("2026-11-01T06:00:00Z"),
    }))!;
    expect(dated.evidence[0]).toMatchObject({ freshness: "current", generated_at: "2026-11-01T06:00:00.000Z" });
    const mixed = runLintReportAdapter(snapshot({
      [`${LINT_REPORT_DIRECTORY}/a.sarif`]: run("2026-11-23T06:00:00Z"),
      [`${LINT_REPORT_DIRECTORY}/b.sarif`]: sarif([]),
    }))!;
    expect(mixed.evidence[0]).toMatchObject({ freshness: "unknown" });
    expect(mixed.evidence[0]).not.toHaveProperty("generated_at");
  });

  it("caps findings at 50 and says so", () => {
    const out = runLintReportAdapter(snapshot({ [REPORT]: sarif(Array.from({ length: 60 }, (_, i) => result("error", { message: { text: `m${i}` } }))) }))!;
    expect(out.findings).toHaveLength(50);
    expect(out.result.limitations.join(" ")).toContain("60 results were reportable");
  });

  it("makes absolute and Windows file uris repository-relative, and keeps a uri outside the root whole", () => {
    const file = (uri: string) => parseSarif(sarif([result("error", { locations: [{ physicalLocation: { artifactLocation: { uri } } }] })]), "C:\\work\\repo")!.results[0]!.file;
    expect(file("file:///C:/work/repo/src/a%20b.py")).toBe("src/a b.py");
    expect(file("file:///c:/WORK/repo/src/a.py")).toBe("src/a.py");
    expect(file("./src/a.py")).toBe("src/a.py");
    expect(file("file:///elsewhere/a.py")).toBe("elsewhere/a.py");
  });
});

describe("lint results through the verification pipeline", () => {
  const noTools: VerificationToolRunner = {
    async isAvailable() { return false; },
    async run() { throw new Error("no tool should run"); },
  };

  it("adds the evidence and findings to the report without running any command", async () => {
    const report = await runVerificationAdapters(snapshot({ [REPORT]: real("ruff-mixed.sarif") }), noTools);
    expect(report.results.map((r) => r.tool)).toContain("sarif-lint");
    expect(report.evidence.map((e) => e.id)).toContain("EVD-LINT-RESULTS");
    expect(report.findings.filter((f) => f.rule_id.startsWith("LINT-"))).toHaveLength(3);
    expect(report.adapterResults.find((a) => a.adapterId === "sarif-lint-results")?.executionStatus).toBe("SUCCESS");
  });

  it("changes nothing for a repository without lint reports", async () => {
    const report = await runVerificationAdapters(snapshot({}, ["README.md"]), noTools);
    expect(report.results.map((r) => r.tool)).not.toContain("sarif-lint");
  });

  it("cannot satisfy a control on its own, because the evidence supports no control until someone links it", async () => {
    const report = await runVerificationAdapters(snapshot({ [REPORT]: real("ruff-clean.sarif") }), noTools);
    const control = { id: "QA-LINT", standard: "QA-008", title: "Lint is clean", severity: "P1" as const, failure_decision: "NO-GO" as const, required_evidence: ["EVD-LINT-RESULTS"] };
    expect(evaluateControl(control, report.evidence, { signals: [] } as never).status).not.toBe("PASS");
    const link = (evidence: typeof report.evidence) => evidence.map((e) => ({ ...e, supports_controls: ["QA-LINT"] }));
    // Real ruff output declares no end time, so its evidence has unknown freshness and no control can use it.
    expect(evaluateControl(control, link(report.evidence), { signals: [] } as never).status).not.toBe("PASS");

    const dated = sarif([], { invocations: [{ executionSuccessful: true, endTimeUtc: "2026-11-23T06:00:00Z" }] });
    const datedReport = await runVerificationAdapters(snapshot({ [REPORT]: dated }), noTools);
    expect(evaluateControl(control, link(datedReport.evidence), { signals: [] } as never).status).toBe("PASS");
  });
});
