import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runVerificationAdapters, type VerificationProcessResult, type VerificationToolRunner } from "../src/verification.js";

// ADP-06: the Go checks against output captured from the real tools (gofmt from Go 1.24.13, osv-scanner
// 2.7.1, semgrep 1.186.0) on a GitHub Actions runner. See fixtures/real-scanner-output/README.md.

const directory = new URL("./fixtures/real-scanner-output/", import.meta.url);
const read = (file: string): string => readFileSync(new URL(file, directory), "utf8");
const replay = (name: string): VerificationProcessResult => ({ exitCode: Number(read(`${name}.exit`).trim()), stdout: read(`${name}.stdout`), stderr: read(`${name}.stderr`) });

interface Call { tool: string; args: string[] }
function runnerFor(pick: (tool: string, args: string[]) => VerificationProcessResult, available = true): VerificationToolRunner & { calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    async isAvailable() { return available; },
    async getVersion() { return "go version go1.24.13 linux/amd64"; },
    async run(tool, args) { calls.push({ tool, args }); return pick(tool, args); },
  };
}

/** Only the tool under test exists; every other adapter reports it as unavailable and produces nothing. */
async function check(tool: string, runner: VerificationToolRunner, snapshot: { rootPath: string; files: string[]; fileContents?: Record<string, string> }) {
  const only: VerificationToolRunner = { ...runner, isAvailable: async (name, root, dir) => name === tool && runner.isAvailable(name, root, dir), run: (name, args, root, dir, timeout) => runner.run(name, args, root, dir, timeout) };
  const report = await runVerificationAdapters({ changedFiles: [], ...snapshot }, only);
  return { report, result: report.results.find((item) => item.tool === tool)! };
}

describe("gofmt (Go 1.24.13), real output", () => {
  const syntax = (scenario: string, files: string[]) => check("gofmt", runnerFor(() => replay(scenario)), { rootPath: "/repo", files });

  it("passes well-formed files, and ignores a file that is only badly formatted (exit 0, listed on stdout)", async () => {
    expect((await syntax("gofmt-ok", ["ok/main.go", "sub/util.go"])).result.status).toBe("PASS");
    expect(replay("gofmt-unformatted").exitCode).toBe(0);
    expect(replay("gofmt-unformatted").stdout.trim()).toBe("unformatted.go");
    expect((await syntax("gofmt-unformatted", ["unformatted.go", "ok/main.go"])).result.status).toBe("PASS");
  });

  it("reads real syntax errors: one finding per file, at the first error, counting the rest once duplicates are collapsed", async () => {
    const { result, report } = await syntax("gofmt-syntax-one", ["bad/broken.go", "ok/main.go"]);
    expect(result.status).toBe("FAIL");
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]).toMatchObject({
      rule_id: "GO-SYNTAX", severity: "P1", source_location: { file: "bad/broken.go", start_line: 3 },
    });
    expect(report.findings[0]!.message).toBe("expected ')', found '{' (bad/broken.go:3:14); 8 more errors in this file");
    expect(result.summary).toContain("1 of 2 Go file(s)");
  });

  it("reports each failing file once and leaves the clean ones out", async () => {
    const { report } = await syntax("gofmt-syntax-two-files", ["bad/broken.go", "bad/fine.go", "bad/second.go", "ok/main.go"]);
    expect(report.findings.map((finding) => finding.source_location?.file)).toEqual(["bad/broken.go", "bad/second.go"]);
    expect(report.findings[1]!.message).toContain("expected operand, found ')' (bad/second.go:4:9)");
  });

  it("is ERROR, never a pass or a syntax result, when gofmt could not read a file", async () => {
    expect(replay("gofmt-missing-file")).toMatchObject({ exitCode: 2 });
    expect(replay("gofmt-missing-file").stderr).toMatch(/^stat does-not-exist\.go/);
    const { result, report } = await syntax("gofmt-missing-file", ["does-not-exist.go", "ok/main.go"]);
    expect(result.status).toBe("ERROR");
    expect(report.findings).toEqual([]);
  });

  it("treats a file named like a flag as the tool failure it is, and shows why the file list follows --", async () => {
    expect(replay("gofmt-dashfile-bare").stderr).toMatch(/^flag provided but not defined: -x\.go/);
    expect((await syntax("gofmt-dashfile-bare", ["-x.go"])).result.status).toBe("ERROR");
    // With "--", real gofmt parses the file and names it without a prefix.
    const { report } = await syntax("gofmt-dashdash", ["-x.go"]);
    expect(report.findings[0]!.source_location).toMatchObject({ file: "-x.go", start_line: 3 });
  });

  it("accepts paths printed with a leading ./", async () => {
    const { report } = await syntax("gofmt-dotslash", ["bad/broken.go", "ok/main.go"]);
    expect(report.findings.map((finding) => finding.source_location?.file)).toEqual(["bad/broken.go"]);
  });

  it("calls gofmt with -e -l and the files after --, and never with -w", async () => {
    const runner = runnerFor(() => replay("gofmt-ok"));
    await check("gofmt", runner, { rootPath: "/repo", files: ["-evil.go", "ok/main.go"] });
    expect(runner.calls).toHaveLength(1);
    expect(runner.calls[0]).toEqual({ tool: "gofmt", args: ["-e", "-l", "--", "-evil.go", "ok/main.go"] });
  });

  it("is probed with -h, since gofmt has no --version: the real tool prints usage for -h and exits 2 for --version", () => {
    expect(replay("probe-gofmt-help").stderr).toMatch(/usage: gofmt/);
    expect(replay("probe-gofmt-dashdash-version")).toMatchObject({ exitCode: 2 });
    expect(replay("probe-go-version").stdout).toMatch(/^go version go1\.\d+/);
  });
});

describe("osv-scanner (2.7.1) on go.mod, real output", () => {
  const osv = (scenario: string, root: string, files: string[]) => check("osv-scanner", runnerFor(() => replay(scenario)), { rootPath: root, files });

  it("reads real Go advisories: Go-database and GitHub ids merged by alias, located by a relative path", async () => {
    const { result, report } = await osv("osv-go-nested", "/home/runner/work/_temp/fx/osv-nested", ["svc/go.mod"]);
    expect(result.status).toBe("FAIL");
    expect(report.findings).toHaveLength(3);
    expect(report.findings.map((finding) => finding.severity).sort()).toEqual(["P1", "P2", "P2"]);
    expect(report.findings.every((finding) => finding.source_location?.file === "svc/go.mod")).toBe(true);
    const high = report.findings.find((finding) => finding.severity === "P1")!;
    expect(high.message).toContain("github.com/gin-gonic/gin@1.6.3 (Go) is affected by GHSA-h395-qcrw-5vmq, GO-2021-0052");
  });

  it("passes a go.mod with no known vulnerabilities, and one with no requirements (it still counts the standard library)", async () => {
    expect((await osv("osv-go-clean", "/r", ["go.mod"])).result.status).toBe("PASS");
    expect(read("osv-go-empty.stderr")).toContain("found 1 package");
    expect((await osv("osv-go-empty", "/r", ["go.mod"])).result.status).toBe("PASS");
  });

  it("documents why call analysis is always off: by default osv-scanner runs the Go toolchain on the module", () => {
    expect(read("osv-help.stdout")).toContain("--no-call-analysis");
    const counts = read("osv-real-go-exec-counts.txt");
    expect(counts).toMatch(/osv-real-default\.strace: [1-9]\d* go execs/);
    expect(counts).toContain("osv-real-nocall.strace: 0 go execs");
    expect(counts).toContain("osv-real-nocall-all.strace: 0 go execs");
    expect(read("osv-real-go-execs.txt")).toContain('"go", "list"');
  });
});

describe("semgrep (1.186.0) on Go, real output", () => {
  const rules = ".governance/semgrep/rules.yml";
  const snapshot = { rootPath: "/repo", files: ["main.go", rules], fileContents: { [rules]: "rules: []" } };

  it("reads real Go matches: ERROR is P1, WARNING is P2, INFO is counted and not reported", async () => {
    const { result, report } = await check("semgrep", runnerFor(() => replay("semgrep-go-hit")), snapshot);
    expect(result.status).toBe("FAIL");
    expect(report.findings.map((finding) => [finding.rule_id, finding.severity, finding.source_location?.start_line])).toEqual([
      ["governance.semgrep.no-exec-command", "P1", 9],
      ["governance.semgrep.no-println", "P2", 10],
    ]);
    expect(result.summary).toContain("1 informational match");
  });

  it("passes a clean Go scan, and a Go repository counts as having source for the rule-set check", async () => {
    expect((await check("semgrep", runnerFor(() => replay("semgrep-go-clean")), snapshot)).result.status).toBe("PASS");
    const noRules = await check("semgrep", runnerFor(() => replay("semgrep-go-clean")), { rootPath: "/repo", files: ["main.go"] });
    expect(noRules.result.status).toBe("UNSUPPORTED");
  });
});
