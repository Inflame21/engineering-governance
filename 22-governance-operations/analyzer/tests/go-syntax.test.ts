import { describe, expect, it } from "vitest";
import { runVerificationAdapters, type VerificationProcessResult, type VerificationToolRunner } from "../src/verification.js";

// The Go syntax adapter's logic, including the paths real gofmt output rarely reaches: batching, caps,
// exclusions and every kind of untrusted output. Real gofmt output is replayed in real-go-output.test.ts.

interface Call { tool: string; args: string[] }

function gofmtRunner(respond: (files: string[], call: number) => VerificationProcessResult | Error, options: { available?: boolean } = {}): VerificationToolRunner & { calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    async isAvailable(tool) { return tool === "gofmt" ? options.available ?? true : false; },
    async getVersion() { return "go version go1.24.13 linux/amd64"; },
    async run(tool, args) {
      calls.push({ tool, args });
      const files = args.slice(args.indexOf("--") + 1);
      const result = respond(files, calls.length);
      if (result instanceof Error) throw result;
      return result;
    },
  };
}

const clean: VerificationProcessResult = { exitCode: 0, stdout: "", stderr: "" };
const syntaxError = (file: string, line = 3): VerificationProcessResult => ({ exitCode: 2, stdout: "", stderr: `${file}:${line}:14: expected ')', found '{'\n` });
const many = (count: number, prefix = "pkg"): string[] => Array.from({ length: count }, (_v, i) => `${prefix}/f${String(i).padStart(4, "0")}.go`);

async function run(runner: VerificationToolRunner, files: string[]) {
  const report = await runVerificationAdapters({ rootPath: "/repo", changedFiles: [], files }, runner);
  return { report, result: report.results.find((item) => item.tool === "gofmt"), evidence: report.evidence.find((item) => item.id === "EVD-GO-SYNTAX") };
}

describe("Go syntax adapter", () => {
  it("does nothing for a repository with no Go files, or only vendored and test-data ones", async () => {
    const runner = gofmtRunner(() => clean);
    expect((await run(runner, ["main.py"])).result).toBeUndefined();
    expect((await run(runner, ["vendor/x/y.go", "testdata/bad.go", "web/node_modules/a/b.go"])).result).toBeUndefined();
    expect(runner.calls).toEqual([]);
  });

  it("is UNSUPPORTED, never a pass and with no evidence, when gofmt is not installed", async () => {
    const runner = gofmtRunner(() => clean, { available: false });
    const { result, evidence } = await run(runner, ["main.go"]);
    expect(result).toMatchObject({ status: "UNSUPPORTED" });
    expect(result!.limitations.join(" ")).toContain("not installed or not on PATH");
    expect(evidence).toBeUndefined();
    expect(runner.calls).toEqual([]);
  });

  it("records PASS as verified evidence tied to the exact command, and says it checks syntax only", async () => {
    const { result, evidence } = await run(gofmtRunner(() => clean), ["main.go", "internal/a.go"]);
    expect(result).toMatchObject({ status: "PASS", toolVersion: "go version go1.24.13 linux/amd64" });
    expect(result!.limitations.join(" ")).toContain("does not compile it");
    expect(evidence).toMatchObject({ status: "VERIFIED", result_status: "PASS", exit_code: 0, command: ["gofmt", "-e", "-l", "--", "<2 Go files>"], tool_version: "go version go1.24.13 linux/amd64" });
  });

  it("excludes vendor, testdata and node_modules, and says how many it left out", async () => {
    const runner = gofmtRunner(() => clean);
    const { result } = await run(runner, ["main.go", "vendor/x/y.go", "pkg/testdata/broken.go"]);
    expect(runner.calls[0]!.args).toEqual(["-e", "-l", "--", "main.go"]);
    expect(result!.limitations.join(" ")).toContain("2 Go file(s) under vendor/, testdata/ or node_modules/ were not checked");
  });

  it("checks files in batches of 100, in sorted order, and fails if any batch has an error", async () => {
    const files = many(250);
    const runner = gofmtRunner((batch) => (batch.includes("pkg/f0150.go") ? syntaxError("pkg/f0150.go") : clean));
    const { result, report } = await run(runner, [...files].reverse());
    expect(runner.calls.map((call) => call.args.length - 3)).toEqual([100, 100, 50]);
    expect(runner.calls[0]!.args[3]).toBe("pkg/f0000.go");
    expect(result!.status).toBe("FAIL");
    expect(report.findings.map((finding) => finding.source_location?.file)).toEqual(["pkg/f0150.go"]);
  });

  it("skips, saying so, when there are too many files to check safely", async () => {
    const runner = gofmtRunner(() => clean);
    const { result } = await run(runner, many(2_001));
    expect(result).toMatchObject({ status: "SKIPPED" });
    expect(runner.calls).toEqual([]);
  });

  it.each([
    ["exit 0 with anything on stderr", { exitCode: 0, stdout: "", stderr: "warning: something" }],
    ["an exit code other than 0 or 2", { exitCode: 1, stdout: "", stderr: "" }],
    ["an exit code of 126", { exitCode: 126, stdout: "", stderr: "permission denied" }],
    ["exit 2 with no output at all", { exitCode: 2, stdout: "", stderr: "" }],
    ["exit 2 with text that is not a syntax error", { exitCode: 2, stdout: "", stderr: "stat gone.go: no such file or directory\n" }],
    ["exit 2 with an error line for a file it was not given", { exitCode: 2, stdout: "", stderr: "other/file.go:1:1: expected 'package'\n" }],
    ["exit 2 with a syntax error mixed with unrecognised lines", { exitCode: 2, stdout: "", stderr: "main.go:3:1: expected ';'\nrandom noise\n" }],
  ])("is ERROR, with no syntax findings, for %s", async (_name, output) => {
    const { result, report, evidence } = await run(gofmtRunner(() => output), ["main.go"]);
    expect(result!.status).toBe("ERROR");
    expect(report.findings.filter((finding) => finding.rule_id === "GO-SYNTAX")).toEqual([]);
    expect(evidence).toMatchObject({ status: "UNVERIFIED", result_status: "ERROR" });
  });

  it("is ERROR when gofmt cannot be run", async () => {
    const { result } = await run(gofmtRunner(() => new Error("spawn gofmt ENOENT")), ["main.go"]);
    expect(result).toMatchObject({ status: "ERROR" });
    expect(result!.limitations.join(" ")).toContain("spawn gofmt ENOENT");
  });

  it("a syntax error is a failure whatever else went wrong in another batch", async () => {
    const files = many(150);
    const runner = gofmtRunner((_batch, call) => (call === 1 ? syntaxError("pkg/f0003.go") : { exitCode: 1, stdout: "", stderr: "boom" }));
    const { result, report } = await run(runner, files);
    expect(result!.status).toBe("FAIL");
    expect(report.findings).toHaveLength(1);
    expect(result!.limitations.join(" ")).toContain("gofmt exited with code 1");
  });

  it("collapses repeated error lines and reports the first error by position", async () => {
    const output: VerificationProcessResult = {
      exitCode: 2, stdout: "",
      stderr: ["a.go:9:1: late", "a.go:2:5: early", "a.go:2:5: early", "a.go:2:5: early", "a.go:2:9: same line, later column"].join("\n"),
    };
    const { report } = await run(gofmtRunner(() => output), ["a.go"]);
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]!.message).toBe("early (a.go:2:5); 2 more errors in this file");
    expect(report.findings[0]!.source_location).toEqual({ file: "a.go", start_line: 2 });
  });

  it("lists at most 100 failing files and says how many it left out", async () => {
    const files = many(150);
    const runner = gofmtRunner((batch) => ({ exitCode: 2, stdout: "", stderr: batch.map((file) => `${file}:1:1: expected 'package'`).join("\n") }));
    const { result, report } = await run(runner, files);
    expect(report.findings.filter((finding) => finding.rule_id === "GO-SYNTAX")).toHaveLength(100);
    expect(result!.limitations.join(" ")).toContain("50 more file(s) with syntax errors are not listed");
    expect(result!.summary).toContain("150 of 150"); // the summary counts every failing file; only the listing is capped
  });

  it("gives every finding a stable id that points at the evidence", async () => {
    const first = (await run(gofmtRunner(() => syntaxError("a.go")), ["a.go"])).report.findings[0]!;
    const again = (await run(gofmtRunner(() => syntaxError("a.go")), ["a.go"])).report.findings[0]!;
    expect(first.id).toMatch(/^FND-GO-SYNTAX-[0-9A-F]{8}$/);
    expect(again.id).toBe(first.id);
    expect(first).toMatchObject({ evidence_refs: ["EVD-GO-SYNTAX"], status: "OPEN", severity: "P1", category: "static-analysis" });
  });

  it("makes the analysis partial when Go syntax could not be checked", async () => {
    const { report } = await run(gofmtRunner(() => clean, { available: false }), ["main.go"]);
    expect(report.status).toBe("PARTIAL");
  });
});
