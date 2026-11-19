import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseCliArguments, runCli } from "../src/index.js";
import {
  diffAssessments, formatDiff, formatHistory, issueLifecycles, readHistory, recordAssessment, verifyHistory,
  type AssessmentFacts, type HistoryStorePort,
} from "../src/history.js";

const run = promisify(execFile);

function memoryStore(): HistoryStorePort & { text: string } {
  const store = {
    text: "",
    async read() { return store.text === "" ? undefined : store.text; },
    async append(_root: string, line: string) { store.text += `${line}\n`; },
  };
  return store;
}

const facts = (decision: AssessmentFacts["decision"], issues: string[], evidence: Record<string, string> = {}, pack = "p1"): AssessmentFacts => ({
  decision, reason: "r", project: "app", change: "CHG-1", pack_sha256: pack, evidence,
  issues: issues.map((key) => ({ key, severity: "P1", status: "FAIL", message: `m ${key}` })),
});

async function three(store = memoryStore()) {
  const t = (n: number) => new Date(`2026-11-0${n}T10:00:00Z`);
  await recordAssessment(store, ".", facts("NO-GO", ["violation:A", "finding:F1"], { E1: "UNVERIFIED" }), t(1));
  await recordAssessment(store, ".", facts("GO_WITH_CONDITIONS", ["finding:F1"], { E1: "VERIFIED" }, "p2"), t(2));
  await recordAssessment(store, ".", facts("NO-GO", ["violation:A", "finding:F1"], { E1: "VERIFIED" }, "p2"), t(3));
  return store;
}

describe("assessment history", () => {
  it("chains records and reads them back verified", async () => {
    const store = await three();
    const records = await readHistory(store, ".");
    expect(records.map((r) => r.seq)).toEqual([1, 2, 3]);
    expect(records[1]!.prev_hash).toBe(records[0]!.hash);
  });

  it("is empty, not an error, before anything is recorded", async () => {
    expect(await readHistory(memoryStore(), ".")).toEqual([]);
    expect(formatHistory([])).toContain("No assessments recorded yet");
  });

  it("detects an edited record, a deleted record and a reordering", async () => {
    const { text } = await three();
    const lines = text.trim().split("\n");
    expect(() => verifyHistory(lines[0]!.replace("NO-GO", "GO") + "\n" + lines.slice(1).join("\n"))).toThrow(/altered/);
    expect(() => verifyHistory(lines.slice(1).join("\n"))).toThrow(/sequence|broken/);
    expect(() => verifyHistory([lines[0], lines[2], lines[1]].join("\n"))).toThrow(/sequence|broken/);
    expect(() => verifyHistory(lines[0] + "\nnot json\n")).toThrow(/not valid JSON/);
  });

  it("refuses to extend a tampered chain", async () => {
    const store = await three();
    store.text = store.text.replace("NO-GO", "GO");
    await expect(recordAssessment(store, ".", facts("GO", []))).rejects.toThrow(/altered/);
  });

  it("derives each issue's lifecycle, including reopening", async () => {
    const records = await readHistory(await three(), ".");
    const byKey = Object.fromEntries(issueLifecycles(records).map((l) => [l.key, l]));
    expect(byKey["finding:F1"]).toMatchObject({ state: "OPEN", first_seen: 1, last_seen: 3, reopened: false });
    expect(byKey["violation:A"]).toMatchObject({ state: "OPEN", first_seen: 1, last_seen: 3, reopened: true });
    const partial = issueLifecycles(records.slice(0, 2));
    expect(partial.find((l) => l.key === "violation:A")).toMatchObject({ state: "RESOLVED", resolved_at: 2 });
  });

  it("diffs two assessments: resolved, introduced, evidence and decision", async () => {
    const records = await readHistory(await three(), ".");
    const d = diffAssessments(records, 1, 2);
    expect(d.decision).toEqual({ from: "NO-GO", to: "GO_WITH_CONDITIONS" });
    expect(d.resolved.map((i) => i.key)).toEqual(["violation:A"]);
    expect(d.introduced).toEqual([]);
    expect(d.pack_changed).toBe(true);
    expect(d.evidence).toEqual([{ id: "E1", from: "UNVERIFIED", to: "VERIFIED" }]);
    expect(diffAssessments(records, 2, 3).introduced.map((i) => i.key)).toEqual(["violation:A"]);
    expect(formatDiff(d)).toContain("E1: UNVERIFIED to VERIFIED");
    expect(() => diffAssessments(records, 1, 9)).toThrow(/No assessment 9/);
  });
});

describe("history command line", () => {
  it("parses diff with and without a repository, and rejects bad numbers", () => {
    expect(parseCliArguments(["diff", "1", "2"]).diff).toEqual({ from: 1, to: 2 });
    const withRepo = parseCliArguments(["diff", "some/repo", "3", "4"]);
    expect(withRepo.diff).toEqual({ from: 3, to: 4 });
    expect(withRepo.repositoryPath).toBe(path.resolve("some/repo"));
    expect(() => parseCliArguments(["diff", "1"])).toThrow(/two assessment numbers/);
    expect(() => parseCliArguments(["diff", "a", "b"])).toThrow(/positive integers/);
    expect(() => parseCliArguments(["history", "--record"])).toThrow(/only supported by the check and report/);
    expect(parseCliArguments(["check", ".", "--record"]).record).toBe(true);
  });
});

describe("check --record", () => {
  const roots: string[] = [];
  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true })));
  });

  it("appends to .governance/history, and history and diff read it back", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "governance-history-"));
    roots.push(root);
    await run("git", ["init", "-q", "-b", "main"], { cwd: root });
    await writeFile(path.join(root, "package.json"), "{\"name\":\"app\"}\n");
    await mkdir(path.join(root, ".governance"), { recursive: true });
    await writeFile(path.join(root, ".governance", "governance-pack.json"), JSON.stringify({
      version: "1.0.0",
      project: { id: "app", name: "app", repository: "acme/app", environment: "development" },
      change: { id: "CHG-1", type: "configuration", title: "x", risk_class: "C", files: [] },
      standards: [{ id: "SEC-007", title: "Sec", version: "1.0.0", source: "x" }],
      controls: [{ id: "SEC-AUTH-001", standard: "SEC-007", title: "Auth", severity: "P1", required_evidence: ["EVD-AUTH-001"], failure_decision: "NO-GO" }],
      evidence: [{ id: "EVD-AUTH-001", type: "E2_INSPECTION", status: "UNVERIFIED", description: "d", source: "none", freshness: "current", supports_controls: ["SEC-AUTH-001"] }],
      risks: [], decisions: [], exceptions: [], debt: [],
    }));

    const out: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => { out.push(String(chunk)); return true; });
    expect(await runCli(["check", root, "--record"])).toBe(2);
    expect(await runCli(["check", root, "--record"])).toBe(2);
    expect(out.join("")).toContain("Recorded assessment #2");

    const file = await readFile(path.join(root, ".governance", "history", "assessments.jsonl"), "utf8");
    expect(file.trim().split("\n")).toHaveLength(2);
    const records = verifyHistory(file);
    expect(records[0]!.assessment).toMatchObject({ decision: "NO-GO", project: "app" });
    expect(records[0]!.assessment.pack_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(records[0]!.assessment.head).toBeUndefined(); // the repository has no commit yet

    out.length = 0;
    expect(await runCli(["history", root])).toBe(0);
    expect(out.join("")).toContain("chain verified");
    out.length = 0;
    expect(await runCli(["diff", root, "1", "2"])).toBe(0);
    expect(out.join("")).toContain("Decision: NO-GO to NO-GO (unchanged)");

    await writeFile(path.join(root, ".governance", "history", "assessments.jsonl"), file.replace("NO-GO", "GO"));
    const err: string[] = [];
    vi.spyOn(process.stderr, "write").mockImplementation((chunk: string | Uint8Array) => { err.push(String(chunk)); return true; });
    expect(await runCli(["history", root])).toBe(3);
    expect(err.join("")).toContain("altered");
  });
});
