import { describe, expect, it } from "vitest";
import { runVerificationAdapters, type VerificationToolRunner } from "../src/verification.js";

// Fixtures follow the Semgrep JSON reference (top-level `results` and `errors`; per result `check_id`,
// `path`, `start.line`, `extra.message`, `extra.severity`) and exit codes (0 clean, 1 findings with
// --error, 2 fatal). They are hand-written, not captured from the tool.

interface Call { tool: string; args: string[] }

function semgrepRunner(options: {
  available?: boolean;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  throws?: Error;
} = {}): VerificationToolRunner & { calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    async isAvailable(tool) {
      return tool === "semgrep" ? options.available ?? true : false;
    },
    async getVersion() {
      return "1.140.0";
    },
    async run(tool, args) {
      calls.push({ tool, args });
      if (options.throws) throw options.throws;
      return { exitCode: options.exitCode ?? 0, stdout: options.stdout ?? '{"results":[],"errors":[]}', stderr: options.stderr ?? "" };
    },
  };
}

function match(severity: string, extra: { id?: string; path?: string; line?: number; message?: string } = {}) {
  return {
    check_id: extra.id ?? "rules.no-eval",
    path: extra.path ?? "src/app.ts",
    start: { line: extra.line ?? 3, col: 1, offset: 10 },
    end: { line: extra.line ?? 3, col: 9, offset: 18 },
    extra: { message: extra.message ?? "Avoid eval", severity, metadata: {} },
  };
}

const output = (results: unknown[], errors: unknown[] = []) => JSON.stringify({ version: "1.140.0", results, errors, paths: { scanned: [] } });

const RULES = [".governance/semgrep/security.yml"];
const SOURCES = ["src/app.ts", ...RULES];
const CONTENTS = { ".governance/semgrep/security.yml": "rules:\n  - id: no-eval\n" };

async function scan(runner: VerificationToolRunner, files = SOURCES, fileContents: Record<string, string> = CONTENTS) {
  const report = await runVerificationAdapters({ rootPath: "/repo", changedFiles: [], files, fileContents }, runner);
  return { report, result: report.results.find((item) => item.tool === "semgrep") };
}

describe("Semgrep static analysis adapter", () => {
  it("does nothing when there is no source code", async () => {
    const runner = semgrepRunner();
    const { result } = await scan(runner, ["README.md", ...RULES]);
    expect(result).toBeUndefined();
    expect(runner.calls).toEqual([]);
  });

  it("is UNSUPPORTED, never a pass on an empty policy, when source exists but no rule set does", async () => {
    const runner = semgrepRunner();
    const { report, result } = await scan(runner, ["src/app.ts"]);
    expect(result?.status).toBe("UNSUPPORTED");
    expect(result?.summary).toContain(".governance/semgrep");
    expect(report.evidence.filter((item) => item.id === "EVD-SEMGREP-STATIC-ANALYSIS")).toEqual([]);
    expect(runner.calls).toEqual([]);
  });

  it("is UNSUPPORTED when semgrep is not installed", async () => {
    const runner = semgrepRunner({ available: false });
    const { result } = await scan(runner);
    expect(result?.status).toBe("UNSUPPORTED");
    expect(runner.calls).toEqual([]);
  });

  it("passes when the reviewed rules ran and matched nothing, recording the rule-set digest", async () => {
    const { report, result } = await scan(semgrepRunner());
    expect(result).toMatchObject({ status: "PASS", exitCode: 0, toolVersion: "1.140.0", evidenceId: "EVD-SEMGREP-STATIC-ANALYSIS" });
    const evidence = report.evidence.find((item) => item.id === "EVD-SEMGREP-STATIC-ANALYSIS");
    expect(evidence).toMatchObject({ status: "VERIFIED", result_status: "PASS", supports_controls: [] });
    expect(evidence?.description).toMatch(/sha256:[0-9a-f]{64}/);
    expect(result?.limitations.join(" ")).toContain("nosemgrep");
  });

  it("uses only the repository's rule set, with metrics and version check off and no registry", async () => {
    const runner = semgrepRunner();
    await scan(runner);
    expect(runner.calls).toHaveLength(1);
    const args = runner.calls[0]!.args;
    expect(args).toEqual(expect.arrayContaining(["scan", "--json", "--error", "--metrics=off", "--disable-version-check", "--config=.governance/semgrep"]));
    expect(args.filter((arg) => arg.startsWith("--config"))).toEqual(["--config=.governance/semgrep"]);
    expect(args.join(" ")).not.toMatch(/auto|p\/|semgrep\.dev/);
    expect(args.at(-1)).toBe(".");
  });

  it("changes the rule-set digest when a rule changes, and is stable otherwise", async () => {
    const digest = async (contents: Record<string, string>) =>
      (await scan(semgrepRunner(), SOURCES, contents)).report.evidence[0]?.description.match(/sha256:[0-9a-f]{64}/)?.[0];
    const original = await digest(CONTENTS);
    expect(await digest(CONTENTS)).toBe(original);
    expect(await digest({ ".governance/semgrep/security.yml": "rules: []\n" })).not.toBe(original);
  });

  it("is UNVERIFIED, not a pass, when the rule-set content was not ingested", async () => {
    const { report, result } = await scan(semgrepRunner(), SOURCES, {});
    expect(result?.status).toBe("UNVERIFIED");
    expect(result?.limitations.join(" ")).toContain("digest");
    expect(report.evidence[0]?.status).toBe("UNVERIFIED");
  });

  it("fails with a blocking P1 finding for an ERROR-severity match", async () => {
    const { report, result } = await scan(semgrepRunner({ exitCode: 1, stdout: output([match("ERROR")]) }));
    expect(result?.status).toBe("FAIL");
    expect(report.evidence[0]).toMatchObject({ status: "UNVERIFIED", result_status: "FAIL" });
    expect(report.findings[0]).toMatchObject({
      rule_id: "rules.no-eval",
      severity: "P1",
      category: "static-analysis",
      status: "OPEN",
      source_location: { file: "src/app.ts", start_line: 3 },
    });
  });

  it("produces WARN with P2 findings and only partial evidence for WARNING-severity matches", async () => {
    const { report, result } = await scan(semgrepRunner({ exitCode: 1, stdout: output([match("WARNING")]) }));
    expect(result?.status).toBe("WARN");
    expect(report.evidence[0]).toMatchObject({ status: "PARTIALLY_VERIFIED", result_status: "WARN" });
    expect(report.findings.map((finding) => finding.severity)).toEqual(["P2"]);
  });

  it("counts INFO matches without emitting findings, and still passes", async () => {
    const { report, result } = await scan(semgrepRunner({ exitCode: 1, stdout: output([match("INFO"), match("INFO", { line: 9 })]) }));
    expect(result?.status).toBe("PASS");
    expect(report.findings).toEqual([]);
    expect(report.evidence[0]?.description).toContain("2 informational");
  });

  it("fails closed on a severity it does not know", async () => {
    const { report, result } = await scan(semgrepRunner({ exitCode: 1, stdout: output([match("CRITICAL")]) }));
    expect(result?.status).toBe("FAIL");
    expect(report.findings[0]?.severity).toBe("P1");
  });

  it("keeps lower-severity findings visible next to a blocking one, worst first", async () => {
    const { report, result } = await scan(semgrepRunner({ exitCode: 1, stdout: output([match("WARNING", { line: 1 }), match("ERROR", { line: 2 })]) }));
    expect(result?.status).toBe("FAIL");
    expect(report.findings.map((finding) => finding.severity)).toEqual(["P1", "P2"]);
  });

  it("is UNVERIFIED when Semgrep reports scan errors, even with no findings", async () => {
    const { result } = await scan(semgrepRunner({ stdout: output([], [{ anything: "undocumented shape" }]) }));
    expect(result?.status).toBe("UNVERIFIED");
    expect(result?.limitations.join(" ")).toContain("1 scan error");
  });

  it("normalises Windows paths and message whitespace in findings", async () => {
    const { report } = await scan(semgrepRunner({ exitCode: 1, stdout: output([match("ERROR", { path: "src\\a.ts", message: "line one\n  line two" })]) }));
    expect(report.findings[0]?.source_location?.file).toBe("src/a.ts");
    expect(report.findings[0]?.message).toBe("line one line two");
  });

  it("gives identical matches identical finding ids", async () => {
    const run = async () => (await scan(semgrepRunner({ exitCode: 1, stdout: output([match("ERROR")]) }))).report.findings[0]?.id;
    expect(await run()).toBe(await run());
    expect(await run()).toMatch(/^FND-SEMGREP-[0-9A-F]{8}$/);
  });

  it.each([
    ["a fatal exit code", { exitCode: 2, stdout: "", stderr: "fatal" }],
    ["an unlisted exit code", { exitCode: 7, stdout: "{}", stderr: "" }],
    ["invalid JSON", { exitCode: 0, stdout: "nope", stderr: "" }],
    ["a missing errors array", { exitCode: 0, stdout: '{"results":[]}', stderr: "" }],
    ["a result without a line", { exitCode: 1, stdout: JSON.stringify({ results: [{ check_id: "a", path: "p", start: {}, extra: { message: "m", severity: "ERROR" } }], errors: [] }), stderr: "" }],
    ["exit 0 with matches present", { exitCode: 0, stdout: output([match("ERROR")]), stderr: "" }],
    ["exit 1 with no matches", { exitCode: 1, stdout: output([]), stderr: "" }],
  ])("is ERROR and never PASS for %s", async (_name, options) => {
    const { report, result } = await scan(semgrepRunner(options));
    expect(result?.status).toBe("ERROR");
    expect(report.evidence[0]).toMatchObject({ status: "UNVERIFIED", result_status: "ERROR" });
    expect(report.findings).toEqual([]);
  });

  it("is ERROR with no evidence when the runner throws, for example on timeout", async () => {
    const { report, result } = await scan(semgrepRunner({ throws: new Error("timed out") }));
    expect(result?.status).toBe("ERROR");
    expect(result?.summary).toContain("timed out");
    expect(report.evidence.filter((item) => item.id === "EVD-SEMGREP-STATIC-ANALYSIS")).toEqual([]);
  });
});
