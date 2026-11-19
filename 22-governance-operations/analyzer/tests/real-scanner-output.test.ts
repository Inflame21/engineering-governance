import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runVerificationAdapters, type VerificationProcessResult, type VerificationToolRunner } from "../src/verification.js";

// The adapters against output captured from the real tools (see fixtures/real-scanner-output/README.md),
// replacing the hand-written fixtures DEBT-GOV-010 was about.

const directory = new URL("./fixtures/real-scanner-output/", import.meta.url);
const read = (file: string): string => readFileSync(new URL(file, directory), "utf8");

function replay(name: string, transform: (stdout: string) => string = (stdout) => stdout): VerificationProcessResult {
  return { exitCode: Number(read(`${name}.exit`).trim()), stdout: transform(read(`${name}.stdout`)), stderr: read(`${name}.stderr`) };
}

function runnerFor(pick: (tool: string, args: string[]) => VerificationProcessResult): VerificationToolRunner {
  return {
    async isAvailable() { return true; },
    async run(tool, args) { return pick(tool, args); },
  };
}

async function scan(tool: "osv-scanner" | "gitleaks" | "semgrep", runner: VerificationToolRunner, snapshot: { rootPath: string; files: string[]; fileContents?: Record<string, string> }) {
  const report = await runVerificationAdapters({ changedFiles: [], ...snapshot }, runner);
  return { report, result: report.results.find((item) => item.tool === tool)! };
}

const osvRoot = "/home/runner/work/_temp/fx/osv-vuln";
const osvSnapshot = { rootPath: osvRoot, files: ["package-lock.json"] };

describe("osv-scanner 2.7.1, real output", () => {
  it("reads the real advisories: 7 in two packages, 4 at P1 and 3 at P2, located by a relative path", async () => {
    const { report, result } = await scan("osv-scanner", runnerFor(() => replay("osv-vuln")), osvSnapshot);
    expect(result.status).toBe("FAIL");
    expect(report.findings).toHaveLength(7);
    const severities = report.findings.map((finding) => finding.severity);
    expect(severities.filter((s) => s === "P1")).toHaveLength(4);
    expect(severities.filter((s) => s === "P2")).toHaveLength(3);
    expect(report.findings.every((finding) => finding.source_location?.file === "package-lock.json")).toBe(true);
    expect(report.findings.map((finding) => finding.message).join("\n")).toMatch(/minimist@1\.2\.0 \(npm\) is affected by GHSA-xvch-5gv4-984h/);
    expect(report.findings.some((finding) => finding.message.includes("could not be established"))).toBe(false);
  });

  it("derives the same severities from the CVSS score alone when the advisory labels are absent", async () => {
    const withoutLabels = (stdout: string): string => {
      const parsed = JSON.parse(stdout);
      for (const entry of parsed.results) for (const pkg of entry.packages) for (const vulnerability of pkg.vulnerabilities) delete vulnerability.database_specific;
      return JSON.stringify(parsed);
    };
    const { report } = await scan("osv-scanner", runnerFor(() => replay("osv-vuln", withoutLabels)), osvSnapshot);
    const severities = report.findings.map((finding) => finding.severity);
    expect(severities.filter((s) => s === "P1")).toHaveLength(4); // 7.2, 7.4, 8.1 and 9.8
    expect(severities.filter((s) => s === "P2")).toHaveLength(3); // 5.3, 6.9 and 5.6
    expect(report.findings.some((finding) => finding.message.includes("could not be established"))).toBe(false);
  });

  it("falls back to P1, saying so, when neither a label nor a score is present", async () => {
    const bare = (stdout: string): string => {
      const parsed = JSON.parse(stdout);
      for (const entry of parsed.results) for (const pkg of entry.packages) {
        for (const vulnerability of pkg.vulnerabilities) delete vulnerability.database_specific;
        for (const group of pkg.groups) delete group.max_severity;
      }
      return JSON.stringify(parsed);
    };
    const { report } = await scan("osv-scanner", runnerFor(() => replay("osv-vuln", bare)), osvSnapshot);
    expect(report.findings).toHaveLength(7);
    expect(report.findings.every((finding) => finding.severity === "P1" && finding.message.includes("could not be established"))).toBe(true);
  });

  it("passes a lockfile with no known vulnerabilities", async () => {
    const { result } = await scan("osv-scanner", runnerFor(() => replay("osv-clean")), { rootPath: "/home/runner/work/_temp/fx/osv-clean", files: ["package-lock.json"] });
    expect(result.status).toBe("PASS");
  });

  it("does not pass an empty lockfile (exit 128), and does not pass a missing one (exit 127)", async () => {
    const empty = await scan("osv-scanner", runnerFor(() => replay("osv-empty")), { rootPath: "/r", files: ["package-lock.json"] });
    expect(empty.result.status).toBe("UNVERIFIED");
    const missing = await scan("osv-scanner", runnerFor(() => replay("osv-missing")), { rootPath: "/r", files: ["package-lock.json"] });
    expect(missing.result.status).toBe("ERROR");
    expect(missing.result.limitations?.join(" ") ?? "").toMatch(/127/);
  });
});

describe("gitleaks 8.30.1, real output", () => {
  const byScope = (scenario: "leak" | "clean" | "nogit") => runnerFor((_tool, args) => replay(`gitleaks-${args[0] === "git" ? "git" : "dir"}-${scenario}`));
  const snapshot = { rootPath: "/repo", files: ["config.txt"] };

  it("reports a leak in both scopes as FAIL without recording where or what", async () => {
    const { result, report } = await scan("gitleaks", byScope("leak"), snapshot);
    expect(result.status).toBe("FAIL");
    expect(report.findings).toHaveLength(2);
    expect(JSON.stringify(report)).not.toMatch(/ghp_/);
  });

  it("passes only when both scopes are clean, which for the real tool means silence on stderr", async () => {
    const { result } = await scan("gitleaks", byScope("clean"), snapshot);
    expect(result.status).toBe("PASS");
  });

  it("does not call a directory that is not a git repository clean: the real tool exits 0 and logs the error", async () => {
    expect(replay("gitleaks-git-nogit")).toMatchObject({ exitCode: 0 });
    expect(replay("gitleaks-git-nogit").stderr).toMatch(/not a git repository/);
    const { result } = await scan("gitleaks", byScope("nogit"), snapshot);
    expect(result.status).toBe("UNVERIFIED");
    expect(result.limitations?.join(" ") ?? "").toMatch(/git history could not be scanned/);
  });

  it("treats a clean exit with any other error text on stderr as untrusted", async () => {
    const runner = runnerFor((_tool, _args) => ({ exitCode: 0, stdout: "", stderr: "ERR something else failed" }));
    const { result } = await scan("gitleaks", runner, snapshot);
    expect(result.status).toBe("ERROR");
  });
});

describe("semgrep 1.186.0, real output", () => {
  const rules = ".governance/semgrep/rules.yml";
  const snapshot = { rootPath: "/repo", files: ["src/app.js", rules], fileContents: { [rules]: "rules: []" } };

  it("reads real matches: ERROR is P1, WARNING is P2, INFO is counted and not reported", async () => {
    const { result, report } = await scan("semgrep", runnerFor(() => replay("semgrep-hit")), snapshot);
    expect(result.status).toBe("FAIL");
    expect(report.findings.map((finding) => [finding.rule_id, finding.severity, finding.source_location?.file, finding.source_location?.start_line])).toEqual([
      ["governance.semgrep.no-eval", "P1", "src/app.js", 2],
      ["governance.semgrep.no-console-log", "P2", "src/app.js", 3],
    ]);
    expect(result.summary).toContain("1 informational match");
  });

  it("passes a clean scan", async () => {
    const { result } = await scan("semgrep", runnerFor(() => replay("semgrep-clean")), snapshot);
    expect(result.status).toBe("PASS");
  });

  it("does not pass when the rule file is invalid (real exit 7 with an error list)", async () => {
    const real = replay("semgrep-badrule");
    expect(real.exitCode).toBe(7);
    expect(JSON.parse(real.stdout).errors.length).toBeGreaterThan(0);
    const { result } = await scan("semgrep", runnerFor(() => real), snapshot);
    expect(result.status).toBe("ERROR");
  });
});

describe("the --version probes the runner relies on", () => {
  it("all exit 0 with a version on the first line", () => {
    for (const probe of ["probe-osv", "probe-gitleaks", "probe-semgrep"]) {
      expect(Number(read(`${probe}.exit`).trim()), probe).toBe(0);
      expect(read(`${probe}.stdout`).split("\n")[0]!.trim(), probe).not.toBe("");
    }
    expect(read("probe-osv.stdout").split("\n").length).toBeGreaterThan(1); // four lines of build information
  });
});
