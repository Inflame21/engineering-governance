import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../src/index.js";

// OPS-04 through the real CLI: technical debt in check, report, summarize and the JSON report.

const run = promisify(execFile);
type Json = Record<string, unknown>;
const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true })));
});

const pack = (debt?: Json[]): Json => ({
  version: "1.0.0",
  project: { id: "debt", name: "Debt", repository: "example/debt", environment: "test" },
  change: { id: "CHG-DEBT", type: "feature", title: "Debt feedback", risk_class: "D", files: [] },
  standards: [{ id: "SEC-007", title: "Security Engineering", version: "1.0.0", source: "x" }],
  controls: [{ id: "DEBT-C1", standard: "SEC-007", title: "Control", severity: "P1", required_evidence: ["EVD-DEBT"], failure_decision: "NO-GO" }],
  evidence: [{ id: "EVD-DEBT", type: "E3_AUTOMATED_ANALYSIS", status: "VERIFIED", description: "Evidence.", source: "x", freshness: "current", supports_controls: ["DEBT-C1"] }],
  risks: [], decisions: [],
  ...(debt ? { debt } : {}),
});

async function repository(packValue: Json): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "governance-debt-"));
  roots.push(dir);
  await mkdir(path.join(dir, "src"), { recursive: true });
  await mkdir(path.join(dir, ".governance"), { recursive: true });
  await writeFile(path.join(dir, "package.json"), JSON.stringify({ dependencies: { react: "^19.0.0" } }));
  await writeFile(path.join(dir, "src", "main.ts"), "export const ready = true;\n");
  await writeFile(path.join(dir, ".governance", "governance-pack.json"), JSON.stringify(packValue));
  for (const args of [["init", "--quiet"], ["config", "user.email", "d@example.test"], ["config", "user.name", "Debt"], ["add", "."], ["commit", "--quiet", "-m", "fixture"]]) await run("git", args, { cwd: dir });
  return dir;
}

async function cli(args: string[]): Promise<{ exitCode: number; out: string; err: string }> {
  const out: string[] = [];
  const err: string[] = [];
  const o = vi.spyOn(process.stdout, "write").mockImplementation((c: string | Uint8Array) => { out.push(String(c)); return true; });
  const e = vi.spyOn(process.stderr, "write").mockImplementation((c: string | Uint8Array) => { err.push(String(c)); return true; });
  try {
    return { exitCode: await runCli(args), out: out.join(""), err: err.join("") };
  } finally {
    o.mockRestore();
    e.mockRestore();
  }
}

const register = (): Json[] => [
  { id: "DEBT-1", severity: "P1", status: "OPEN", title: "Brittle auth", owner: "Rita Owner", target_date: "2020-01-01", controls: ["DEBT-C1"] },
  { id: "DEBT-2", severity: "P2", status: "ACCEPTED", title: "Slow report", owner: "Sam Owner", last_reviewed: "2026-11-01" },
  { id: "DEBT-3", severity: "P3", status: "RESOLVED", title: "Old cleanup" },
];

describe("technical debt in the reports", () => {
  it("check prints a totals line and the debt that needs a condition", async () => {
    const dir = await repository(pack(register()));
    const { exitCode, out } = await cli(["check", dir, "--base", "HEAD"]);
    expect(exitCode).toBe(1);
    expect(out).toContain("Decision: GO_WITH_CONDITIONS");
    expect(out).toContain("Technical debt: 2 unresolved (P0: 0, P1: 1, P2: 1, P3: 0), 1 accepted, 1 overdue; an owner is named on 2 of 2, a review date on 1 of 2.");
    expect(out).toMatch(/\[P1\] DEBT:DEBT-1: Debt DEBT-1 \(Brittle auth\): .*past its target date 2020-01-01/);
  });

  it("report shows a debt table with the status of the control each item is recorded against", async () => {
    const dir = await repository(pack(register()));
    const { exitCode, out } = await cli(["report", dir, "--base", "HEAD"]);
    expect(exitCode).toBe(1);
    expect(out).toContain("## Technical debt");
    expect(out).toContain("| Debt | Severity | Status | Owner | Target | Recorded against | Needs |");
    expect(out).toMatch(/\| DEBT-1 Brittle auth \| P1 \| OPEN \| Rita Owner \| 2020-01-01 \(overdue\) \| DEBT-C1 \(PASS\) \|/);
    expect(out).toMatch(/\| DEBT-2 Slow report \| P2 \| ACCEPTED \| Sam Owner \|/);
    expect(out).not.toContain("DEBT-3"); // resolved debt is counted, not listed
  });

  it("the JSON report carries the structured summary", async () => {
    const dir = await repository(pack(register()));
    const { out } = await cli(["check", dir, "--base", "HEAD", "--json"]);
    const { evaluation } = JSON.parse(out) as { evaluation: { debt: { unresolvedTotal: number; resolved: number; overdue: number; items: { id: string; linkedControls: unknown[] }[] } } };
    expect(evaluation.debt).toMatchObject({ unresolvedTotal: 2, resolved: 1, overdue: 1 });
    expect(evaluation.debt.items[0]).toMatchObject({ id: "DEBT-1", linkedControls: [{ id: "DEBT-C1", status: "PASS" }] });
  });

  it("summarize has a Technical debt section", async () => {
    const dir = await repository(pack(register()));
    const { out } = await cli(["summarize", dir]);
    expect(out).toContain("## Technical debt");
    expect(out).toContain("2 unresolved (P0: 0, P1: 1, P2: 1, P3: 0)");
    expect(out).toContain("DEBT-1 Brittle auth");
  });

  it("says nothing about debt when the pack records none", async () => {
    const dir = await repository(pack());
    const check = await cli(["check", dir, "--base", "HEAD"]);
    expect(check.exitCode).toBe(0);
    expect(check.out).not.toContain("Technical debt");
    const report = await cli(["report", dir, "--base", "HEAD"]);
    expect(report.out).not.toContain("## Technical debt");
    expect((await cli(["summarize", dir])).out).not.toContain("Technical debt");
  });
});

describe("technical debt in the decision", () => {
  it("unowned critical debt blocks: NO-GO and exit 2", async () => {
    const dir = await repository(pack([{ id: "DEBT-9", severity: "P1", status: "ACCEPTED", title: "Nobody's", last_reviewed: "2026-11-01" }]));
    const { exitCode, out } = await cli(["check", dir, "--base", "HEAD"]);
    expect(exitCode).toBe(2);
    expect(out).toContain("Decision: NO-GO");
    expect(out).toContain("1 technical debt item(s) block production (DEBT-020)");
    expect(out).toMatch(/\[P1\] DEBT:DEBT-9: .*no explicit owner/);
  });

  it("a sound register leaves a GO as GO", async () => {
    const dir = await repository(pack([{ id: "DEBT-4", severity: "P2", status: "PLANNED", title: "Later", owner: "Rita Owner", target_date: "2999-01-01" }]));
    const { exitCode, out } = await cli(["check", dir, "--base", "HEAD"]);
    expect(exitCode).toBe(0);
    expect(out).toContain("Decision: GO");
    expect(out).toContain("Technical debt: 1 unresolved");
  });
});

describe("the new debt fields are validated", () => {
  it.each([
    ["a target_date that is not a date", { id: "DEBT-5", severity: "P2", status: "OPEN", target_date: "tomorrow" }, /schema validation failed/],
    ["a last_reviewed that is not a date", { id: "DEBT-5", severity: "P2", status: "OPEN", last_reviewed: "2026-13-45" }, /schema validation failed/],
    ["a control the pack does not define", { id: "DEBT-5", severity: "P2", status: "OPEN", controls: ["NOPE"] }, /unknown control 'NOPE'/],
    ["an unknown field", { id: "DEBT-5", severity: "P2", status: "OPEN", due: "2026-12-01" }, /schema validation failed/],
  ])("rejects %s", async (_name, item, message) => {
    const dir = await repository(pack([item as Json]));
    const { exitCode, err } = await cli(["validate", dir]);
    expect(exitCode).toBe(3);
    expect(err).toMatch(message);
  });

  it("accepts a fully described debt record", async () => {
    const dir = await repository(pack([{ id: "DEBT-6", severity: "P2", status: "OPEN", title: "t", owner: "o", target_date: "2026-12-31", last_reviewed: "2026-11-19", controls: ["DEBT-C1"] }]));
    expect((await cli(["validate", dir])).exitCode).toBe(0);
  });
});
