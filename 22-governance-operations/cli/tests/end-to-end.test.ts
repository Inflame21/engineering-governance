import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

const temporaryRoots: string[] = [];
const cliEntrypoint = path.resolve("dist/cli/src/index.js");

async function createRoot(prefix = "governance-cli-e2e-"): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}

async function run(executable: string, args: string[], cwd: string): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    execFile(executable, args, { cwd, windowsHide: true, encoding: "utf8" }, (error, stdout, stderr) => {
      if (!error) {
        resolve({ exitCode: 0, stdout, stderr });
        return;
      }
      if (typeof error.code === "number") {
        resolve({ exitCode: error.code, stdout, stderr });
        return;
      }
      reject(error);
    });
  });
}

async function runCli(args: string[]): Promise<ProcessResult> {
  return run(process.execPath, [cliEntrypoint, ...args], process.cwd());
}

function pack(openRisk = false): Record<string, unknown> {
  return {
    version: "1.0.0",
    project: { id: "e2e", name: "CLI E2E", repository: "example/e2e", environment: "test" },
    change: { id: "CHG-E2E", type: "feature", title: "CLI contract", risk_class: "D", files: [] },
    standards: [],
    controls: [],
    evidence: [],
    risks: openRisk ? [{ id: "RSK-E2E", severity: "P1", title: "Intentional E2E blocker", status: "OPEN" }] : [],
    decisions: [],
  };
}

async function createCompleteFixture(): Promise<string> {
  const root = await createRoot();
  await mkdir(path.join(root, ".governance"), { recursive: true });
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(path.join(root, "package.json"), JSON.stringify({ dependencies: { react: "^19.0.0" } }));
  await writeFile(path.join(root, "src", "main.ts"), "export const ready = true;\n");
  await writeFile(path.join(root, ".governance", "governance-pack.json"), JSON.stringify(pack()));
  for (const args of [
    ["init", "--quiet"],
    ["config", "user.email", "governance@example.test"],
    ["config", "user.name", "Governance E2E"],
    ["add", "."],
    ["commit", "--quiet", "-m", "fixture"],
  ]) {
    const result = await run("git", args, root);
    if (result.exitCode !== 0) throw new Error(`Could not initialize CLI E2E Git fixture: ${result.stderr}`);
  }
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("built governance CLI", () => {
  it("returns documented GO, GO WITH CONDITIONS, NO-GO, and execution-error exit codes", async () => {
    const root = await createCompleteFixture();

    const go = await runCli(["check", root, "--base", "HEAD", "--json"]);
    expect(go.exitCode).toBe(0);
    expect(JSON.parse(go.stdout).evaluation.decision.status).toBe("GO");

    const conditional = await runCli(["check", root]);
    expect(conditional.exitCode).toBe(1);
    expect(conditional.stdout).toContain("Decision: GO_WITH_CONDITIONS");

    await writeFile(path.join(root, ".governance", "governance-pack.json"), JSON.stringify(pack(true)));
    const blocked = await runCli(["check", root]);
    expect(blocked.exitCode).toBe(2);
    expect(blocked.stdout).toContain("Decision: NO-GO");

    await writeFile(path.join(root, ".governance", "governance-pack.json"), "{not-json");
    const invalid = await runCli(["check", root, "--json"]);
    expect(invalid.exitCode).toBe(3);
    expect(invalid.stderr).toContain("Governance CLI error: Governance pack is not valid JSON");

    const missingRoot = await runCli(["analyze", path.join(root, "missing"), "--json"]);
    expect(missingRoot.exitCode).toBe(3);
    expect(missingRoot.stderr).toContain("Governance CLI error:");
  });

  it("reports partial analysis in JSON and exits with the documented conditional status", async () => {
    const root = await createRoot("governance-cli-partial-");
    await writeFile(path.join(root, "main.go"), "package main\nfunc main() {}\n");

    const result = await runCli(["analyze", root, "--json"]);
    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout) as { context: { analysisStatus: string; unsupportedCapabilities: string[] } };
    expect(parsed.context.analysisStatus).toBe("PARTIAL");
    expect(parsed.context.unsupportedCapabilities).toContain("language-specific-analysis:go");
  });
});
