import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fingerprintRepositorySnapshot } from "../../analyzer/src/fingerprint.js";
import type { RepositorySnapshot } from "../../analyzer/src/types.js";
import { runCli } from "../src/index.js";
import { verifyHistory } from "../src/history.js";

// EVD-05, whole-tool side: the repository fingerprint is stable and sensitive, a decision can be reproduced
// from the same inputs, and evidence produced against old code stops counting once the code changes.

const run = promisify(execFile);
const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true })));
});

const snapshot = (files: Record<string, string>, extra: Partial<RepositorySnapshot> = {}): RepositorySnapshot => ({
  rootPath: "/anywhere", files: Object.keys(files), changedFiles: [], fileContents: files, ...extra,
});

describe("repository fingerprint", () => {
  const base = { "src/a.ts": "export const a = 1;\n", "src/b.ts": "export const b = 2;\n", "package.json": "{}\n" };
  const digest = (files: Record<string, string>, extra: Partial<RepositorySnapshot> = {}) => fingerprintRepositorySnapshot(snapshot(files, extra)).digest;

  it("is identical for the same content wherever the repository lives and however the files are listed", () => {
    const reordered = Object.fromEntries(Object.entries(base).reverse());
    expect(digest(reordered)).toBe(digest(base));
    expect(fingerprintRepositorySnapshot(snapshot(base, { rootPath: "C:\\somewhere\\else" })).digest).toBe(digest(base));
    expect(digest(base)).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("treats Windows and POSIX path spellings as the same file", () => {
    expect(digest({ "src\\a.ts": "x" })).toBe(digest({ "src/a.ts": "x" }));
  });

  it.each([
    ["a file's content changes", { ...base, "src/a.ts": "export const a = 2;\n" }],
    ["a file is added", { ...base, "src/c.ts": "" }],
    ["a file is removed", { "src/a.ts": base["src/a.ts"], "package.json": base["package.json"] }],
    ["a file is renamed", { "src/z.ts": base["src/a.ts"], "src/b.ts": base["src/b.ts"], "package.json": base["package.json"] }],
    ["a manifest changes", { ...base, "package.json": "{\"name\":\"x\"}\n" }],
    ["a single character changes", { ...base, "src/b.ts": "export const b = 3;\n" }],
  ])("changes when %s", (_name, changed) => {
    expect(digest(changed)).not.toBe(digest(base));
  });

  it("ignores the files the tool itself writes (history, saved reports) but not other governance files", () => {
    expect(digest({ ...base, ".governance/history/assessments.jsonl": "{}", ".governance/reports/summary-2026-11-19.md": "x" })).toBe(digest(base));
    expect(digest({ ...base, ".governance/governance-pack.json": "{}" })).not.toBe(digest(base));
    expect(digest({ ...base, ".governance/approvals/EXC-1.asc": "sig" })).not.toBe(digest(base));
  });

  it("cannot be confused by moving content between files", () => {
    expect(digest({ "a.ts": "xy", "b.ts": "" })).not.toBe(digest({ "a.ts": "x", "b.ts": "y" }));
    expect(digest({ "a.ts": "x\0b.ts\0y" })).not.toBe(digest({ "a.ts": "x", "b.ts": "y" }));
  });

  it("discloses skipped content instead of pretending the fingerprint is complete", () => {
    const partial = fingerprintRepositorySnapshot({ rootPath: "/r", files: ["src/a.ts", "src/b.ts"], changedFiles: [], fileContents: { "src/a.ts": "x" } });
    expect(partial.sourceContentStatus).toBe("PARTIAL");
    expect(partial.limitations.length).toBeGreaterThan(0);
    expect(partial.digest).not.toBe(digest({ "src/a.ts": "x", "src/b.ts": "" }));
  });
});

type Json = Record<string, unknown>;

const pack = (fingerprint?: string): Json => ({
  version: "1.0.0",
  project: { id: "repro", name: "Repro", repository: "example/repro", environment: "test" },
  change: { id: "CHG-REPRO", type: "feature", title: "Reproducibility", risk_class: "D", files: [] },
  standards: [{ id: "SEC-007", title: "Security Engineering", version: "1.0.0", source: "x" }],
  controls: [{ id: "REPRO-001", standard: "SEC-007", title: "Control", severity: "P1", required_evidence: ["EVD-REPRO"], failure_decision: "NO-GO" }],
  evidence: [{
    id: "EVD-REPRO", type: "E3_AUTOMATED_ANALYSIS", status: "VERIFIED", description: "Evidence.", source: "x", freshness: "current",
    supports_controls: ["REPRO-001"], ...(fingerprint ? { repository_fingerprint: fingerprint } : {}),
  }],
  risks: [], decisions: [],
});

async function repository(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "governance-repro-"));
  roots.push(dir);
  await mkdir(path.join(dir, "src"), { recursive: true });
  await mkdir(path.join(dir, ".governance"), { recursive: true });
  await writeFile(path.join(dir, "package.json"), JSON.stringify({ dependencies: { react: "^19.0.0" } }));
  await writeFile(path.join(dir, "src", "main.ts"), "export const ready = true;\n");
  await writeFile(path.join(dir, ".governance", "governance-pack.json"), JSON.stringify(pack()));
  for (const args of [["init", "--quiet"], ["config", "user.email", "r@example.test"], ["config", "user.name", "Repro"]]) await run("git", args, { cwd: dir });
  await commit(dir, "fixture");
  return dir;
}

async function commit(dir: string, message: string): Promise<void> {
  await run("git", ["add", "."], { cwd: dir });
  await run("git", ["commit", "--quiet", "--allow-empty", "-m", message], { cwd: dir });
}

async function check(dir: string, extra: string[] = []): Promise<{ exitCode: number; json: any }> {
  const out: string[] = [];
  const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => { out.push(String(chunk)); return true; });
  try {
    const exitCode = await runCli(["check", dir, "--base", "HEAD", "--json", ...extra]);
    const text = out.join("");
    return { exitCode, json: JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) };
  } finally {
    spy.mockRestore();
  }
}

/** Drop what legitimately differs between two runs: wall-clock times, ids derived from them, durations. */
function stable(value: unknown): unknown {
  const volatile = new Set(["generatedAt", "assessmentId", "evaluatedAt", "generated_at", "duration_ms"]);
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json).filter(([key]) => !volatile.has(key)).map(([key, v]) => [key, stable(v)]));
  }
  return value;
}

describe("reproducibility through the CLI", () => {
  it("assesses the same repository twice with identical results, apart from the clock", async () => {
    const dir = await repository();
    const first = await check(dir);
    const second = await check(dir);
    expect(first.exitCode).toBe(0);
    expect(first.json.report.decision).toBe("GO");
    expect(stable(second.json)).toEqual(stable(first.json));
    expect(first.json.report.repositoryFingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
  }, 60_000);

  it("gives two separate checkouts of the same content the same fingerprint and decision", async () => {
    const one = await repository();
    const two = await repository();
    const a = await check(one);
    const b = await check(two);
    expect(b.json.report.repositoryFingerprint).toBe(a.json.report.repositoryFingerprint);
    expect(b.json.report.decision).toBe(a.json.report.decision);
  }, 60_000);

  it("evidence bound to the current fingerprint counts, and stops counting when the code changes", async () => {
    const dir = await repository();
    const packFile = path.join(dir, ".governance", "governance-pack.json");
    const { json: before } = await check(dir);
    const bound = before.report.repositoryFingerprint as string;

    await writeFile(packFile, JSON.stringify(pack(bound)));
    await commit(dir, "bind evidence");
    const fresh = await check(dir);
    expect(fresh.json.report.repositoryFingerprint).toBe(bound); // the pack is not part of the fingerprinted content
    expect(fresh).toMatchObject({ exitCode: 0 });
    expect(fresh.json.report.decision).toBe("GO");

    await writeFile(path.join(dir, "src", "main.ts"), "export const ready = false;\n");
    await commit(dir, "change the code");
    const stale = await check(dir);
    expect(stale.json.report.repositoryFingerprint).not.toBe(bound);
    expect(stale.json.report.decision).toBe("NO-GO");
    expect(stale.exitCode).toBe(2);
    expect(stale.json.evaluation.controls[0]).toMatchObject({ status: "UNVERIFIED", missingEvidence: ["EVD-REPRO"] });
  }, 90_000);

  it("records the fingerprint in the assessment history, so a recorded decision can be reproduced", async () => {
    const dir = await repository();
    await check(dir, ["--record"]);
    await check(dir, ["--record"]);
    await writeFile(path.join(dir, "src", "main.ts"), "export const ready = 'changed';\n");
    await commit(dir, "change");
    await check(dir, ["--record"]);

    const records = verifyHistory(await readFile(path.join(dir, ".governance", "history", "assessments.jsonl"), "utf8"));
    const [one, two, three] = records.map((record) => record.assessment.repository_fingerprint);
    expect(one).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(two).toBe(one);
    expect(three).not.toBe(one);
    expect(records[0]!.assessment.head).toBe(records[1]!.assessment.head);
    expect(records[2]!.assessment.head).not.toBe(records[0]!.assessment.head);
  }, 90_000);
});
