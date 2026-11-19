import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { runCli } from "../src/index.js";

// CI-05: one end-to-end matrix of clean, warning, failing and unknown scenarios, run through the real CLI
// on real repositories, asserting both the decision and the exit code a pipeline would see. The pipeline
// policy for conditional results (GO WITH CONDITIONS passes or fails) is tested in
// end-to-end-workflow-script.test.ts, which runs the workflow's own script.

const run = promisify(execFile);
type Json = Record<string, unknown>;

const pack = (overrides: Json = {}, evidence: Json = {}): Json => ({
  version: "1.0.0",
  project: { id: "matrix", name: "Matrix", repository: "example/matrix", environment: "test" },
  change: { id: "CHG-MATRIX", type: "feature", title: "Scenario matrix", risk_class: "D", files: [] },
  standards: [{ id: "SEC-007", title: "Security Engineering", version: "1.0.0", source: "x" }],
  controls: [{ id: "MATRIX-001", standard: "SEC-007", title: "Matrix control", severity: "P1", required_evidence: ["EVD-MATRIX"], failure_decision: "NO-GO" }],
  evidence: [{ id: "EVD-MATRIX", type: "E3_AUTOMATED_ANALYSIS", status: "VERIFIED", description: "Evidence.", source: "x", freshness: "current", supports_controls: ["MATRIX-001"], ...evidence }],
  risks: [],
  decisions: [],
  ...overrides,
});

interface Scenario {
  name: string;
  /** The pack, or a raw string for an unreadable one, or null for none. */
  pack: Json | string | null;
  /** Verify the changed-file scope against HEAD (a clean repository has no changes). */
  base: boolean;
}

const clean: Scenario[] = [{ name: "clean: every control has verified, current evidence and the scope is verified", pack: pack(), base: true }];

const warn: Scenario[] = [{ name: "warn: a sound pack, but the changed-file scope was not requested", pack: pack(), base: false }];

const fail: Scenario[] = [
  { name: "fail: an open P1 risk", pack: pack({ risks: [{ id: "RSK-1", severity: "P1", title: "Open blocker", status: "OPEN" }] }), base: true },
  { name: "fail: the pack declares a file the diff does not contain", pack: pack({ change: { id: "CHG-MATRIX", type: "feature", title: "x", risk_class: "D", files: ["src/not-changed.ts"] } }), base: true },
];

const unknown: Scenario[] = [
  { name: "unknown: the evidence for a P1 control is unverified", pack: pack({}, { status: "UNVERIFIED" }), base: true },
  { name: "unknown: the evidence has expired", pack: pack({}, { freshness: "expired" }), base: true },
  { name: "unknown: the pack defines no controls, so nothing was assessed", pack: pack({ controls: [], evidence: [] }), base: true },
  { name: "unknown: there is no pack", pack: null, base: true },
  { name: "unknown: the pack is not valid JSON", pack: "{ this is not json", base: true },
];

describe("scenario matrix", () => {
  let base: string;
  let count = 0;

  beforeAll(async () => {
    base = await mkdtemp(path.join(os.tmpdir(), "governance-matrix-"));
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    if (base) await rm(base, { recursive: true, force: true });
  });

  async function assess(scenario: Scenario): Promise<{ exitCode: number; decision?: string; stderr: string }> {
    const dir = path.join(base, `repo-${(count += 1)}`);
    await mkdir(path.join(dir, ".governance"), { recursive: true });
    // A recognisable language and source, so the analysis is complete: without them it is PARTIAL and the
    // best possible decision is GO WITH CONDITIONS.
    await mkdir(path.join(dir, "src"), { recursive: true });
    await writeFile(path.join(dir, "package.json"), JSON.stringify({ dependencies: { react: "^19.0.0" } }));
    await writeFile(path.join(dir, "src", "main.ts"), "export const ready = true;\n");
    if (scenario.pack !== null) {
      await writeFile(path.join(dir, ".governance", "governance-pack.json"), typeof scenario.pack === "string" ? scenario.pack : JSON.stringify(scenario.pack));
    }
    for (const args of [["init", "--quiet"], ["config", "user.email", "m@example.test"], ["config", "user.name", "Matrix"], ["add", "."], ["commit", "--quiet", "-m", "fixture"]]) {
      await run("git", args, { cwd: dir });
    }
    const out: string[] = [];
    const err: string[] = [];
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => { out.push(String(chunk)); return true; });
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation((chunk: string | Uint8Array) => { err.push(String(chunk)); return true; });
    try {
      const exitCode = await runCli(["check", dir, "--json", ...(scenario.base ? ["--base", "HEAD"] : [])]);
      const text = out.join("");
      const decision = text.trim().startsWith("{") ? (JSON.parse(text) as { report: { decision: string } }).report.decision : undefined;
      return { exitCode, ...(decision ? { decision } : {}), stderr: err.join("") };
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
    }
  }

  it.each(clean)("$name", async (scenario) => {
    expect(await assess(scenario)).toMatchObject({ decision: "GO", exitCode: 0 });
  }, 60_000);

  it.each(warn)("$name", async (scenario) => {
    expect(await assess(scenario)).toMatchObject({ decision: "GO_WITH_CONDITIONS", exitCode: 1 });
  }, 60_000);

  it.each(fail)("$name", async (scenario) => {
    expect(await assess(scenario)).toMatchObject({ decision: "NO-GO", exitCode: 2 });
  }, 60_000);

  // The rule under test (GOV-022 section 10): unknown is never safe. Whatever the cause, an unknown
  // must not read as GO, and a pipeline must not pass it.
  it.each(unknown)("$name", async (scenario) => {
    const result = await assess(scenario);
    expect(result.decision).not.toBe("GO");
    expect(result.exitCode).toBeGreaterThanOrEqual(2);
    if (scenario.pack === null || typeof scenario.pack === "string") {
      expect(result).toMatchObject({ exitCode: 3 });
      expect(result.decision).toBeUndefined();
      expect(result.stderr).toContain("Governance CLI error");
    }
  }, 60_000);

  it("keeps the four outcomes distinct: no two scenario classes share a decision and exit code", async () => {
    const seen = new Map<string, string>();
    for (const [label, scenario] of [["clean", clean[0]!], ["warn", warn[0]!], ["fail", fail[0]!], ["unknown", unknown[3]!]] as const) {
      const result = await assess(scenario);
      seen.set(label, `${result.decision ?? "none"}/${result.exitCode}`);
    }
    expect(new Set(seen.values()).size).toBe(4);
  }, 120_000);
});
