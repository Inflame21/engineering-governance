import { describe, expect, it } from "vitest";
import { runVerificationAdapters, type VerificationToolRunner } from "../src/verification.js";

// The fake runner follows the Gitleaks README: with `--exit-code 2`, 0 is clean, 2 is leaks, 1 is an
// error and 126 is an unknown flag. Like the real tool at `--log-level error`, it prints nothing on a
// clean run. Real captured output is replayed in real-scanner-output.test.ts.

const FAKE_SECRET = "not-a-real-secret-do-not-record-0123456789";

interface Call { tool: string; args: string[] }

function gitleaksRunner(options: {
  available?: boolean;
  tree?: number;
  history?: number;
  treeThrows?: Error;
  historyThrows?: Error;
} = {}): VerificationToolRunner & { calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    async isAvailable(tool) {
      return tool === "gitleaks" ? options.available ?? true : false;
    },
    async getVersion() {
      return "8.30.1";
    },
    async run(tool, args) {
      calls.push({ tool, args });
      const scope = args[0] === "git" ? "history" : "tree";
      const thrown = scope === "tree" ? options.treeThrows : options.historyThrows;
      if (thrown) throw thrown;
      const exitCode = scope === "tree" ? options.tree ?? 0 : options.history ?? 0;
      // Hostile output: a real secret in stdout and stderr must never reach the report.
      return exitCode === 0
        ? { exitCode, stdout: "", stderr: "" }
        : { exitCode, stdout: `[{"Secret":"${FAKE_SECRET}","Match":"${FAKE_SECRET}"}]`, stderr: `leaked ${FAKE_SECRET}` };
    },
  };
}

async function scan(runner: VerificationToolRunner, files = ["src/app.ts"]) {
  const report = await runVerificationAdapters({ rootPath: "/repo", changedFiles: [], files }, runner);
  return { report, result: report.results.find((item) => item.tool === "gitleaks") };
}

describe("Gitleaks secret scan adapter", () => {
  it("does nothing for an empty repository", async () => {
    const runner = gitleaksRunner();
    const { result } = await scan(runner, []);
    expect(result).toBeUndefined();
    expect(runner.calls).toEqual([]);
  });

  it("is UNSUPPORTED, never a pass, when gitleaks is not installed", async () => {
    const runner = gitleaksRunner({ available: false });
    const { report, result } = await scan(runner);
    expect(result?.status).toBe("UNSUPPORTED");
    expect(report.evidence.filter((item) => item.id === "EVD-GITLEAKS-SECRETS")).toEqual([]);
    expect(runner.calls).toEqual([]);
  });

  it("passes only when both the working tree and the history are clean", async () => {
    const runner = gitleaksRunner();
    const { report, result } = await scan(runner);
    expect(result).toMatchObject({ status: "PASS", exitCode: 0, toolVersion: "8.30.1", evidenceId: "EVD-GITLEAKS-SECRETS" });
    const evidence = report.evidence.find((item) => item.id === "EVD-GITLEAKS-SECRETS");
    expect(evidence).toMatchObject({ status: "VERIFIED", result_status: "PASS", supports_controls: [] });
    expect(result?.limitations.join(" ")).toContain("shallow clone");
    expect(report.findings).toEqual([]);
  });

  it("runs the documented commands with redaction and a distinct leak exit code, and requests no report", async () => {
    const runner = gitleaksRunner();
    await scan(runner);
    expect(runner.calls.map((call) => call.args[0])).toEqual(["dir", "git"]);
    for (const call of runner.calls) {
      expect(call.tool).toBe("gitleaks");
      expect(call.args).toEqual(expect.arrayContaining(["--exit-code", "2", "--redact", "--no-banner"]));
      expect(call.args.at(-1)).toBe(".");
      // No report is requested, so no file can be written into the scanned repository.
      expect(call.args.join(" ")).not.toMatch(/report/);
    }
  });

  it("fails with a P1 finding when the working tree has leaks", async () => {
    const { report, result } = await scan(gitleaksRunner({ tree: 2 }));
    expect(result?.status).toBe("FAIL");
    expect(report.evidence.find((item) => item.id === "EVD-GITLEAKS-SECRETS")).toMatchObject({ status: "UNVERIFIED", result_status: "FAIL", exit_code: 2 });
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]).toMatchObject({ rule_id: "GITLEAKS-SECRET", severity: "P1", category: "secret-exposure", status: "OPEN" });
    expect(report.findings[0]?.message).toContain("working tree");
  });

  it("fails when only the history has leaks, and records that exit code", async () => {
    const { report, result } = await scan(gitleaksRunner({ history: 2 }));
    expect(result?.status).toBe("FAIL");
    expect(report.findings[0]?.message).toContain("git history");
    expect(report.findings[0]?.remediation).toContain("rotate");
    expect(report.evidence.find((item) => item.id === "EVD-GITLEAKS-SECRETS")?.exit_code).toBe(2);
  });

  it("reports both scopes with distinct stable ids when both leak", async () => {
    const first = await scan(gitleaksRunner({ tree: 2, history: 2 }));
    const second = await scan(gitleaksRunner({ tree: 2, history: 2 }));
    expect(first.report.findings).toHaveLength(2);
    expect(new Set(first.report.findings.map((finding) => finding.id)).size).toBe(2);
    expect(first.report.findings.map((finding) => finding.id)).toEqual(second.report.findings.map((finding) => finding.id));
  });

  it("is UNVERIFIED, not a pass, when history cannot be scanned (exit 1)", async () => {
    const { report, result } = await scan(gitleaksRunner({ history: 1 }));
    expect(result?.status).toBe("UNVERIFIED");
    expect(result?.limitations.join(" ")).toContain("history could not be scanned");
    expect(report.evidence.find((item) => item.id === "EVD-GITLEAKS-SECRETS")?.status).toBe("UNVERIFIED");
  });

  it.each([
    ["an error on the working tree", { tree: 1 }],
    ["an unknown flag on the working tree", { tree: 126 }],
    ["an unlisted working-tree exit code", { tree: 7 }],
    ["an unknown flag on history", { history: 126 }],
    ["an unlisted history exit code", { history: 7 }],
    ["a history scan that cannot run", { historyThrows: new Error("spawn failed") }],
  ])("is ERROR and never PASS for %s", async (_name, options) => {
    const { report, result } = await scan(gitleaksRunner(options));
    expect(result?.status).toBe("ERROR");
    expect(report.evidence.find((item) => item.id === "EVD-GITLEAKS-SECRETS")).toMatchObject({ status: "UNVERIFIED", result_status: "ERROR" });
    expect(report.findings).toEqual([]);
  });

  it("is ERROR with no evidence, and does not scan history, when the working-tree scan cannot run", async () => {
    const runner = gitleaksRunner({ treeThrows: new Error("timed out") });
    const { report, result } = await scan(runner);
    expect(result?.status).toBe("ERROR");
    expect(result?.summary).toContain("timed out");
    expect(report.evidence.filter((item) => item.id === "EVD-GITLEAKS-SECRETS")).toEqual([]);
    expect(runner.calls).toHaveLength(1);
  });

  it("still fails on a leak when the other scope is untrustworthy", async () => {
    const { result } = await scan(gitleaksRunner({ tree: 1, history: 2 }));
    expect(result?.status).toBe("FAIL");
  });

  it.each([
    ["clean", {}],
    ["leaking", { tree: 2, history: 2 }],
    ["erroring", { tree: 1 }],
    ["history unavailable", { history: 1 }],
  ])("never records tool output: a %s scan leaves no secret in the report", async (_name, options) => {
    const { report } = await scan(gitleaksRunner(options));
    expect(JSON.stringify(report)).not.toContain(FAKE_SECRET);
  });
});
