import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../src/index.js";

// OPS-04 through the real CLI: incident records in check, report, summarize, the JSON report and validation.

const run = promisify(execFile);
type Json = Record<string, unknown>;
const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true })));
});

const pack = (incidents?: Json[], debt?: Json[]): Json => ({
  version: "1.0.0",
  project: { id: "inc", name: "Inc", repository: "example/inc", environment: "test" },
  change: { id: "CHG-INC", type: "feature", title: "Incident feedback", risk_class: "D", files: [] },
  standards: [{ id: "SEC-007", title: "Security Engineering", version: "1.0.0", source: "x" }],
  controls: [{ id: "INC-C1", standard: "SEC-007", title: "Control", severity: "P1", required_evidence: ["EVD-INC"], failure_decision: "NO-GO" }],
  evidence: [{ id: "EVD-INC", type: "E3_AUTOMATED_ANALYSIS", status: "VERIFIED", description: "Evidence.", source: "x", freshness: "current", supports_controls: ["INC-C1"] }],
  risks: [], decisions: [],
  ...(debt ? { debt } : {}),
  ...(incidents ? { incidents } : {}),
});

async function repository(packValue: Json): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "governance-incidents-"));
  roots.push(dir);
  await mkdir(path.join(dir, "src"), { recursive: true });
  await mkdir(path.join(dir, ".governance"), { recursive: true });
  await writeFile(path.join(dir, "package.json"), JSON.stringify({ dependencies: { react: "^19.0.0" } }));
  await writeFile(path.join(dir, "src", "main.ts"), "export const ready = true;\n");
  await writeFile(path.join(dir, ".governance", "governance-pack.json"), JSON.stringify(packValue));
  for (const args of [["init", "--quiet"], ["config", "user.email", "i@example.test"], ["config", "user.name", "Inc"], ["add", "."], ["commit", "--quiet", "-m", "fixture"]]) await run("git", args, { cwd: dir });
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

const action = (overrides: Json = {}): Json => ({ id: "ACT-1", description: "Add a timeout", status: "OPEN", owner: "Rita Owner", due_date: "2020-01-01", validation: "Load test passes", ...overrides });
const register = (): Json[] => [
  { id: "INC-1", severity: "P1", status: "RESOLVED", title: "Checkout outage", owner: "Ivy Commander", cause: "db-pool", detected_at: "2026-10-01T10:00:00Z", resolved_at: "2026-10-01T14:00:00Z",
    controls: ["INC-C1"], debt: ["DEBT-1"], review: { status: "COMPLETE", completed_at: "2026-10-03T10:00:00Z" }, actions: [action()] },
  { id: "INC-2", severity: "P2", status: "RESOLVED", title: "Slow search", owner: "Ivy Commander", cause: "db-pool", detected_at: "2026-11-05T10:00:00Z", resolved_at: "2026-11-05T11:00:00Z", debt: ["DEBT-1"] },
];
const debtRegister = (): Json[] => [{ id: "DEBT-1", severity: "P2", status: "PLANNED", title: "Pool sizing", owner: "Rita Owner" }];

describe("incidents in the reports", () => {
  it("check prints a totals line and the incidents that need follow-up, and a P1 incident gives conditions, not a block", async () => {
    const dir = await repository(pack(register(), debtRegister()));
    const { exitCode, out } = await cli(["check", dir, "--base", "HEAD"]);
    expect(exitCode).toBe(1);
    expect(out).toContain("Decision: GO_WITH_CONDITIONS");
    expect(out).toContain("Incidents: 2 recorded (P0: 0, P1: 1, P2: 1, P3: 0), 0 active; 1 of 1 resolved P0/P1 incidents have a completed review; 1 corrective action open, 1 overdue; 1 repeat; mean time to resolve 2.5 h.");
    expect(out).toMatch(/\[P1\] INCIDENT:INC-1: Incident INC-1 \(Checkout outage\): .*corrective action ACT-1 is past its target date 2020-01-01/);
    expect(out).toMatch(/\[P2\] INCIDENT:INC-2: .*repeats the cause "db-pool" of INC-1/);
  });

  it("report shows an incident table, marks repeats, and adds an Incidents column to the debt table", async () => {
    const dir = await repository(pack(register(), debtRegister()));
    const { out } = await cli(["report", dir, "--base", "HEAD"]);
    expect(out).toContain("## Incidents");
    expect(out).toContain("| Incident | Severity | Status | Owner | Review | Actions open (overdue) | Recorded against | Needs |");
    expect(out).toMatch(/\| INC-1 Checkout outage \| P1 \| RESOLVED \| Ivy Commander \| COMPLETE \| 1 \(1\) \| INC-C1 \(PASS\), DEBT-1 \|/);
    expect(out).toMatch(/\| INC-2 Slow search \(repeat\) \| P2 \| RESOLVED \|/);
    expect(out).toContain("| Debt | Severity | Status | Owner | Target | Recorded against | Incidents | Needs |");
    expect(out).toMatch(/\| DEBT-1 Pool sizing \| P2 \| PLANNED \| Rita Owner \| {2}\| {2}\| INC-1, INC-2 \|.*linked to 2 incidents/);
  });

  it("the JSON report carries the structured summary", async () => {
    const dir = await repository(pack(register(), debtRegister()));
    const { out } = await cli(["check", dir, "--base", "HEAD", "--json"]);
    const { evaluation } = JSON.parse(out) as { evaluation: { incidents: { total: number; repeats: number; items: { id: string; repeatOf: string[]; linkedControls: unknown[] }[] }; debt: { items: { incidents: string[] }[] } } };
    expect(evaluation.incidents).toMatchObject({ total: 2, repeats: 1 });
    expect(evaluation.incidents.items.find((item) => item.id === "INC-2")!.repeatOf).toEqual(["INC-1"]);
    expect(evaluation.incidents.items.find((item) => item.id === "INC-1")!.linkedControls).toEqual([{ id: "INC-C1", status: "PASS" }]);
    expect(evaluation.debt.items[0]!.incidents).toEqual(["INC-1", "INC-2"]);
  });

  it("summarize has an Incidents section", async () => {
    const dir = await repository(pack(register(), debtRegister()));
    const { out } = await cli(["summarize", dir]);
    expect(out).toContain("## Incidents");
    expect(out).toContain("2 recorded (P0: 0, P1: 1, P2: 1, P3: 0)");
  });

  it("says nothing about incidents when the pack records none", async () => {
    const dir = await repository(pack());
    const check = await cli(["check", dir, "--base", "HEAD"]);
    expect(check.exitCode).toBe(0);
    expect(check.out).not.toContain("Incidents");
    expect((await cli(["report", dir, "--base", "HEAD"])).out).not.toContain("## Incidents");
    expect((await cli(["summarize", dir])).out).not.toContain("Incidents");
  });

  it("an active P0 incident is a condition and exit 1, never a block", async () => {
    const dir = await repository(pack([{ id: "INC-9", severity: "P0", status: "OPEN", title: "Total outage", detected_at: "2026-11-19T08:00:00Z" }]));
    const { exitCode, out } = await cli(["check", dir, "--base", "HEAD"]);
    expect(exitCode).toBe(1);
    expect(out).toContain("Decision: GO_WITH_CONDITIONS");
    expect(out).toMatch(/\[P0\] INCIDENT:INC-9: .*only if it is the fix or an emergency change.*has no owner/);
  });
});

describe("the incident fields are validated", () => {
  const valid = (): Json => ({ id: "INC-5", severity: "P2", status: "OPEN", title: "t", detected_at: "2026-11-19T08:00:00Z" });
  it.each([
    ["an id that is not INC-...", { ...valid(), id: "incident-5" }, /schema validation failed/],
    ["an unknown severity", { ...valid(), severity: "P9" }, /schema validation failed/],
    ["a cause that is not a slug", { ...valid(), cause: "Has Spaces" }, /schema validation failed/],
    ["a missing title", (() => { const v = valid(); delete v.title; return v; })(), /schema validation failed/],
    ["an action id that is not ACT-...", { ...valid(), actions: [{ id: "A1", description: "d", status: "OPEN" }] }, /schema validation failed/],
    ["an action due date that is not a date", { ...valid(), actions: [action({ due_date: "soon" })] }, /schema validation failed/],
    ["an unknown field", { ...valid(), notes: "x" }, /schema validation failed/],
    ["a resolved incident with no resolved_at", { ...valid(), status: "RESOLVED" }, /RESOLVED but has no resolved_at/],
    ["debt the pack does not record", { ...valid(), debt: ["DEBT-NOPE"] }, /unknown debt 'DEBT-NOPE'/],
    ["a control the pack does not define", { ...valid(), controls: ["NOPE"] }, /unknown control 'NOPE'/],
  ])("rejects %s", async (_name, item, message) => {
    const dir = await repository(pack([item as Json]));
    const { exitCode, err } = await cli(["validate", dir]);
    expect(exitCode).toBe(3);
    expect(err).toMatch(message);
  });

  it("accepts a fully described incident", async () => {
    const dir = await repository(pack(register(), debtRegister()));
    expect((await cli(["validate", dir])).exitCode).toBe(0);
  });
});
