import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Tests .github/scripts/governance-check.sh, which the reusable workflow runs, against the built CLI.
// It needs bash: it runs on Linux CI, and on Windows only when GOVERNANCE_TEST_BASH names a bash
// (for example Git Bash), because a bare "bash" on Windows can be the WSL launcher.
const bash = process.env.GOVERNANCE_TEST_BASH ?? "bash";
const runnable = process.platform !== "win32" || process.env.GOVERNANCE_TEST_BASH !== undefined;
const repoRoot = path.resolve("../..");
const script = path.join(repoRoot, ".github", "scripts", "governance-check.sh");
const cli = path.resolve("dist/cli/src/index.js");
const posix = (p: string) => p.split(path.sep).join("/");

interface Result {
  exitCode: number;
  log: string;
  summary: string;
  outputs: string;
  reportJson: string;
}

function pack(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: "1.0.0",
    project: { id: "e2e", name: "CLI E2E", repository: "example/e2e", environment: "test" },
    change: { id: "CHG-E2E", type: "feature", title: "CLI contract", risk_class: "D", files: [] },
    standards: [{ id: "SEC-007", title: "Security Engineering", version: "1.0.0", source: "x" }],
    controls: [{ id: "E2E-001", standard: "SEC-007", title: "E2E control", severity: "P1", required_evidence: ["EVD-E2E"], failure_decision: "NO-GO" }],
    evidence: [{ id: "EVD-E2E", type: "E3_AUTOMATED_ANALYSIS", status: "VERIFIED", description: "E2E evidence.", source: "x", freshness: "current", supports_controls: ["E2E-001"] }],
    risks: [],
    decisions: [],
    ...overrides,
  };
}

function exec(file: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { ...options, encoding: "utf8", windowsHide: true }, (error, stdout, stderr) => {
      if (!error) return resolve({ exitCode: 0, stdout, stderr });
      if (typeof error.code === "number") return resolve({ exitCode: error.code, stdout, stderr });
      reject(error);
    });
  });
}

describe.skipIf(!runnable)("reusable workflow script", () => {
  let base: string;
  const fixtures: Record<string, string> = {};

  async function repo(name: string, packValue: Record<string, unknown> | null): Promise<void> {
    const dir = path.join(base, name);
    await mkdir(path.join(dir, ".governance"), { recursive: true });
    await mkdir(path.join(dir, "src"), { recursive: true });
    await writeFile(path.join(dir, "package.json"), JSON.stringify({ dependencies: { react: "^19.0.0" } }));
    await writeFile(path.join(dir, "src", "main.ts"), "export const ready = true;\n");
    if (packValue) await writeFile(path.join(dir, ".governance", "governance-pack.json"), JSON.stringify(packValue));
    for (const args of [["init", "--quiet"], ["config", "user.email", "governance@example.test"], ["config", "user.name", "Governance Test"], ["add", "."], ["commit", "--quiet", "-m", "fixture"]]) {
      const result = await exec("git", args, { cwd: dir });
      if (result.exitCode !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
    }
    fixtures[name] = posix(dir);
  }

  beforeAll(async () => {
    base = await mkdtemp(path.join(os.tmpdir(), "governance-script-"));
    await repo("complete", pack());
    await repo("blocked", pack({ risks: [{ id: "RSK-1", severity: "P1", title: "Intentional blocker", status: "OPEN" }] }));
    await repo("no-pack", null);
    // Hostile text that tries to forge GitHub workflow commands through the report.
    await repo("hostile", pack({
      risks: [{ id: "RSK-2", severity: "P1", title: "::error title=forged::injected command\n::set-output name=pwned::true", status: "OPEN" }],
    }));
  }, 60_000);

  afterAll(async () => {
    if (base) await rm(base, { recursive: true, force: true });
  });

  async function run(env: Record<string, string>): Promise<Result> {
    const out = await mkdtemp(path.join(base, "out-"));
    const summaryFile = path.join(out, "summary.md");
    const outputFile = path.join(out, "output.txt");
    await writeFile(summaryFile, "");
    await writeFile(outputFile, "");
    const result = await exec(bash, [posix(script)], {
      env: {
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? os.homedir(),
        GOVERNANCE_CLI: posix(cli),
        OUT_DIR: posix(path.join(out, "report")),
        SUMMARY_FILE: posix(summaryFile),
        OUTPUT_FILE: posix(outputFile),
        ...env,
      },
    });
    const read = async (file: string) => readFile(file, "utf8").catch(() => "");
    return {
      exitCode: result.exitCode,
      log: result.stdout + result.stderr,
      summary: await read(summaryFile),
      outputs: await read(outputFile),
      reportJson: await read(path.join(out, "report", "report.json")),
    };
  }

  const decisionOf = (r: Result) => /^decision=(.*)$/m.exec(r.outputs)?.[1] ?? "";

  it.each([
    ["GO when the pack matches the diff", { dir: "complete", env: { CONDITIONS: "fail", BASE_REF: "HEAD" } }, 0, "GO"],
    ["conditions pass when the pipeline allows them", { dir: "complete", env: { CONDITIONS: "pass" } }, 0, "GO_WITH_CONDITIONS"],
    ["conditions fail when the pipeline does not allow them", { dir: "complete", env: { CONDITIONS: "fail" } }, 1, "GO_WITH_CONDITIONS"],
    ["NO-GO always fails", { dir: "blocked", env: { CONDITIONS: "pass", BASE_REF: "HEAD" } }, 1, "NO-GO"],
    ["a missing pack is an ERROR that fails", { dir: "no-pack", env: { CONDITIONS: "pass" } }, 1, "ERROR"],
  ] as const)("%s", async (_name, scenario, exitCode, decision) => {
    const result = await run({ TARGET_DIR: fixtures[scenario.dir]!, ...scenario.env });
    expect(result.exitCode).toBe(exitCode);
    expect(decisionOf(result)).toBe(decision);
    expect(result.outputs).toMatch(/^exit_code=\d$/m);
    expect(result.summary).toContain(`## Governance check: ${decision}`);
  }, 60_000);

  it("writes a machine-readable report and a Markdown summary", async () => {
    const result = await run({ TARGET_DIR: fixtures.complete!, CONDITIONS: "fail", BASE_REF: "HEAD" });
    expect(JSON.parse(result.reportJson).report.decision).toBe("GO");
    expect(result.summary).toContain("# Governance report");
    expect(result.summary).toContain("Pipeline outcome: passed");
  }, 60_000);

  it("shows the error and no decision body when the CLI cannot produce a report", async () => {
    const result = await run({ TARGET_DIR: fixtures["no-pack"]!, CONDITIONS: "pass" });
    expect(result.summary).toContain("could not produce a report");
    expect(result.summary).toContain("Governance pack not found");
    expect(result.log).toContain("::error title=Governance check::");
  }, 60_000);

  it("never lets repository text forge workflow commands: they are printed with command processing stopped", async () => {
    const result = await run({ TARGET_DIR: fixtures.hostile!, CONDITIONS: "pass", BASE_REF: "HEAD" });
    const lines = result.log.split(/\r?\n/);
    const stop = lines.findIndex((l) => l.startsWith("::stop-commands::"));
    const resume = lines.findIndex((l) => /^::[0-9a-f]{32}::$/.test(l));
    const forged = lines.findIndex((l) => l.includes("::set-output name=pwned"));
    expect(stop).toBeGreaterThanOrEqual(0);
    expect(forged).toBeGreaterThan(stop);
    expect(resume).toBeGreaterThan(forged);
    expect(result.outputs).not.toContain("pwned");
    expect(decisionOf(result)).toBe("NO-GO");
  }, 60_000);

  const invalid: Array<[string, Record<string, string>]> = [
    ["conditions that are neither pass nor fail", { CONDITIONS: "maybe" }],
    ["a pack path that climbs out with ..", { CONDITIONS: "pass", PACK_PATH: "../secrets.json" }],
    ["an absolute pack path", { CONDITIONS: "pass", PACK_PATH: "/etc/passwd" }],
    ["a pack path that looks like an option", { CONDITIONS: "pass", PACK_PATH: "--json" }],
    ["shell metacharacters in a path", { CONDITIONS: "pass", PACK_PATH: "$(touch pwned)" }],
    ["backticks in a path", { CONDITIONS: "pass", REGISTRY_PATH: "`id`" }],
    ["a base ref with a semicolon", { CONDITIONS: "pass", BASE_REF: "main;rm -rf /" }],
    ["a project id without a registry", { CONDITIONS: "pass", PROJECT_ID: "e2e" }],
    ["a malformed project id", { CONDITIONS: "pass", REGISTRY_PATH: "r.json", PROJECT_ID: "E2E!" }],
    ["a run_tools value that is not true or false", { CONDITIONS: "pass", RUN_TOOLS: "yes" }],
  ];
  it.each(invalid)("rejects %s before the CLI runs (exit 2, no decision)", async (_name, env) => {
    const result = await run({ TARGET_DIR: fixtures.complete!, ...env });
    expect(result.exitCode).toBe(2);
    expect(result.log).toContain("governance-check: invalid input");
    expect(decisionOf(result)).toBe("");
    expect(result.reportJson).toBe("");
  }, 60_000);

  it("rejects a missing target directory and a missing CLI", async () => {
    expect((await run({ TARGET_DIR: posix(path.join(base, "nope")), CONDITIONS: "pass" })).exitCode).toBe(2);
    expect((await run({ TARGET_DIR: fixtures.complete!, CONDITIONS: "pass", GOVERNANCE_CLI: posix(path.join(base, "no-cli.js")) })).exitCode).toBe(2);
  }, 60_000);

  it("runs nothing from injected values", async () => {
    await run({ TARGET_DIR: fixtures.complete!, CONDITIONS: "pass", PACK_PATH: "$(touch pwned)", BASE_REF: "x;touch pwned" });
    for (const dir of [fixtures.complete!, repoRoot, process.cwd()]) {
      await expect(readFile(path.join(dir, "pwned"), "utf8")).rejects.toThrow();
    }
  }, 60_000);
});
