import { describe, expect, it } from "vitest";
import { evaluateGovernance } from "../src/decision.js";
import { evaluateDebt, hasOwner, isOverdue } from "../src/debt.js";
import type { GovernanceContext, GovernanceDebt, GovernancePack } from "../src/types.js";

// OPS-04: technical debt as feedback into the decision (DEBT-020). A sound pack gives GO; each test adds
// debt and asserts what the standard says should happen.

const NOW = "2026-11-19T12:00:00.000Z";

const pack = (debt: GovernanceDebt[] | undefined): GovernancePack => ({
  version: "1.0.0",
  project: { id: "p", name: "P", repository: "o/p", environment: "production" },
  change: { id: "CHG-1", type: "feature", title: "t", risk_class: "B", files: [] },
  standards: [{ id: "SEC-007", title: "Security", version: "1.0.0", source: "x" }],
  controls: [
    { id: "CTL-1", standard: "SEC-007", title: "Passing", severity: "P1", applies_when: ["applicable"], required_evidence: ["EVD-1"], failure_decision: "NO-GO" },
    { id: "CTL-2", standard: "SEC-007", title: "Unverified", severity: "P2", applies_when: ["applicable"], required_evidence: ["EVD-2"], failure_decision: "GO_WITH_CONDITIONS" },
  ],
  evidence: [
    { id: "EVD-1", type: "E3_AUTOMATED_ANALYSIS", status: "VERIFIED", description: "d", source: "s", freshness: "current", supports_controls: ["CTL-1"] },
    { id: "EVD-2", type: "E3_AUTOMATED_ANALYSIS", status: "VERIFIED", description: "d", source: "s", freshness: "current", supports_controls: ["CTL-2"] },
  ],
  risks: [], decisions: [],
  ...(debt ? { debt } : {}),
});

const context: GovernanceContext = { signals: ["applicable"], analysisStatus: "COMPLETE", evaluatedAt: NOW };
/** Overrides may set a field to undefined, which is how these tests express "left out". */
type Loose<T> = { [K in keyof T]?: T[K] | undefined };
const debt = (overrides: Loose<GovernanceDebt> = {}): GovernanceDebt =>
  ({ id: "DEBT-1", severity: "P2", status: "OPEN", owner: "Rita Owner", title: "Old thing", ...overrides }) as GovernanceDebt;
const decide = (items: GovernanceDebt[]) => evaluateGovernance(pack(items), context);
const message = (items: GovernanceDebt[]) => {
  const d = decide(items).decision;
  return [...d.blockingViolations, ...d.warnings].find((v) => v.controlId.startsWith("DEBT:"))?.message ?? "";
};

describe("a pack with no debt", () => {
  it("is unchanged: GO, and no debt section in the evaluation", () => {
    for (const items of [undefined, []]) {
      const result = decide(items as GovernanceDebt[]);
      expect(result.decision.status).toBe("GO");
      expect(result.debt).toBeUndefined();
    }
  });
});

describe("debt that only counts", () => {
  it.each([
    ["P2 open with an owner", debt({ severity: "P2" })],
    ["P3 open without an owner (an owner is only recommended below P1)", debt({ severity: "P3", owner: undefined })],
    ["P2 planned", debt({ severity: "P2", status: "PLANNED" })],
    ["P1 accepted, owned and reviewed", debt({ severity: "P1", status: "ACCEPTED", last_reviewed: "2026-11-01" })],
    ["P0 resolved", debt({ severity: "P0", status: "RESOLVED", owner: undefined })],
    ["P1 resolved and long overdue", debt({ severity: "P1", status: "RESOLVED", target_date: "2020-01-01" })],
  ])("does not change a GO: %s", (_name, item) => {
    expect(decide([item]).decision.status).toBe("GO");
  });
});

describe("conditions", () => {
  it.each(["OPEN", "PLANNED", "IN_PROGRESS"] as const)("P1 debt that is %s and not accepted is a condition (section 9)", (status) => {
    const result = decide([debt({ severity: "P1", status })]);
    expect(result.decision.status).toBe("GO_WITH_CONDITIONS");
    expect(result.decision.blockingViolations).toEqual([]);
    expect(message([debt({ severity: "P1", status })])).toContain("has no recorded acceptance");
  });

  it("debt past its target date is a condition at any severity, and the whole target day is allowed", () => {
    expect(decide([debt({ severity: "P3", target_date: "2026-11-18" })]).decision.status).toBe("GO_WITH_CONDITIONS");
    expect(message([debt({ severity: "P3", target_date: "2026-11-18" })])).toContain("past its target date 2026-11-18");
    expect(decide([debt({ severity: "P3", target_date: "2026-11-19" })]).decision.status).toBe("GO");
    expect(decide([debt({ severity: "P3", target_date: "2026-12-01" })]).decision.status).toBe("GO");
  });

  it("accepted debt that was never reviewed is a condition (section 18)", () => {
    expect(decide([debt({ severity: "P2", status: "ACCEPTED" })]).decision.status).toBe("GO_WITH_CONDITIONS");
    expect(message([debt({ severity: "P2", status: "ACCEPTED" })])).toContain("accepted but never reviewed");
    expect(decide([debt({ severity: "P2", status: "ACCEPTED", last_reviewed: "2026-10-01" })]).decision.status).toBe("GO");
  });

  it("one item with several reasons is one violation listing them all", () => {
    const result = decide([debt({ severity: "P1", status: "OPEN", target_date: "2026-01-01" })]);
    const violations = result.decision.warnings.filter((v) => v.controlId === "DEBT:DEBT-1");
    expect(violations).toHaveLength(1);
    expect(violations[0]!.message).toMatch(/has no recorded acceptance.*past its target date/);
    expect(violations[0]).toMatchObject({ severity: "P1", status: "WARN", decision: "GO_WITH_CONDITIONS" });
  });
});

describe("blockers (section 29)", () => {
  it.each([undefined, "", "   ", "UNASSIGNED", "unassigned"])("P1 debt with no explicit owner (%j) blocks", (owner) => {
    const result = decide([debt({ severity: "P1", status: "ACCEPTED", last_reviewed: "2026-11-01", ...(owner === undefined ? { owner: undefined } : { owner }) })]);
    expect(result.decision.status).toBe("NO-GO");
    expect(result.decision.reason).toContain("technical debt item(s) block production");
    expect(message([debt({ severity: "P1", owner: owner as string | undefined })])).toContain("no explicit owner");
  });

  it.each(["OPEN", "PLANNED", "IN_PROGRESS", "ACCEPTED"] as const)("unresolved P0 debt blocks, whatever its status (%s)", (status) => {
    expect(decide([debt({ severity: "P0", status, last_reviewed: "2026-11-01" })]).decision.status).toBe("NO-GO");
  });

  it("says that acceptance cannot bypass a production blocker", () => {
    expect(message([debt({ severity: "P0", status: "ACCEPTED" })])).toContain("acceptance cannot bypass a production blocker");
  });

  it("a blocking debt item sits among the blocking violations and never downgrades another blocker", () => {
    const result = decide([debt({ severity: "P0" })]);
    expect(result.decision.blockingViolations.map((v) => v.controlId)).toContain("DEBT:DEBT-1");
    expect(result.violations.map((v) => v.controlId)).toContain("DEBT:DEBT-1");
    const worse = evaluateGovernance({ ...pack([debt({ severity: "P2" })]), evidence: [{ ...pack([]).evidence[0]!, status: "UNVERIFIED" }, pack([]).evidence[1]!] }, context);
    expect(worse.decision.status).toBe("NO-GO");
  });

  it("P2 debt with no owner does not block (only P0 and P1 SHALL have one)", () => {
    expect(decide([debt({ severity: "P2", owner: undefined })]).decision.status).toBe("GO");
  });
});

describe("what the report gets", () => {
  it("summarises the register the way section 30 asks: counts by severity, owners, review dates, overdue", () => {
    const summary = decide([
      debt({ id: "DEBT-A", severity: "P0", status: "IN_PROGRESS", last_reviewed: "2026-11-01" }),
      debt({ id: "DEBT-B", severity: "P1", status: "ACCEPTED", owner: undefined }),
      debt({ id: "DEBT-C", severity: "P2", target_date: "2026-01-01" }),
      debt({ id: "DEBT-D", severity: "P3", status: "ACCEPTED", last_reviewed: "2026-11-02" }),
      debt({ id: "DEBT-E", severity: "P2", status: "RESOLVED" }),
    ]).debt!;
    expect(summary.unresolved).toEqual({ P0: 1, P1: 1, P2: 1, P3: 1 });
    expect(summary).toMatchObject({ unresolvedTotal: 4, accepted: 2, resolved: 1, overdue: 1, withOwner: 3, withReviewDate: 2 });
    expect(summary.items.map((item) => item.id)).toEqual(["DEBT-A", "DEBT-B", "DEBT-C", "DEBT-D"]); // most severe first
  });

  it("shows the status of each control a debt is recorded against, so debt behind a failing control stands out", () => {
    const failing = { ...pack([debt({ severity: "P2", controls: ["CTL-1", "CTL-2"] })]), evidence: [pack([]).evidence[0]!, { ...pack([]).evidence[1]!, status: "UNVERIFIED" as const }] };
    const result = evaluateGovernance(failing, context);
    expect(result.debt!.items[0]!.linkedControls).toEqual([{ id: "CTL-1", status: "PASS" }, { id: "CTL-2", status: "UNVERIFIED" }]);
    const text = [...result.decision.blockingViolations, ...result.decision.warnings].find((v) => v.controlId === "DEBT:DEBT-1");
    expect(text).toBeUndefined(); // linking alone adds no condition: it is information
  });

  it("rejects a debt that names a control the pack does not define", () => {
    expect(() => decide([debt({ controls: ["NOT-A-CONTROL"] })])).toThrow(/unknown control 'NOT-A-CONTROL'/);
  });

  it("is deterministic for the same pack and time", () => {
    const items = [debt({ severity: "P1", target_date: "2026-01-01" }), debt({ id: "DEBT-2", severity: "P0" })];
    expect(JSON.stringify(decide(items))).toBe(JSON.stringify(decide(structuredClone(items))));
  });
});

describe("helpers", () => {
  it("hasOwner ignores blanks and the UNASSIGNED placeholder", () => {
    expect(hasOwner({ owner: "Rita" })).toBe(true);
    expect(hasOwner({})).toBe(false);
    expect(["", "  ", "UNASSIGNED"].map((owner) => hasOwner({ owner }))).toEqual([false, false, false]);
  });

  it("isOverdue allows the whole target day (UTC) and ignores bad or missing dates", () => {
    expect(isOverdue("2026-11-18", NOW)).toBe(true);
    expect(isOverdue("2026-11-19", NOW)).toBe(false);
    expect(isOverdue("2026-11-19", "2026-11-20T00:00:00.000Z")).toBe(true);
    expect(isOverdue(undefined, NOW)).toBe(false);
    expect(isOverdue("not-a-date", NOW)).toBe(false);
  });

  it("evaluateDebt on an empty pack returns an empty summary", () => {
    const result = evaluateDebt(pack(undefined), [], NOW);
    expect(result.summary).toMatchObject({ unresolvedTotal: 0, resolved: 0, items: [] });
    expect([result.blocking, result.conditions]).toEqual([[], []]);
  });
});
