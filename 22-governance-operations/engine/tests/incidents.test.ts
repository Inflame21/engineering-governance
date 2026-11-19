import { describe, expect, it } from "vitest";
import { evaluateGovernance } from "../src/decision.js";
import type { GovernanceContext, GovernanceCorrectiveAction, GovernanceDebt, GovernanceIncident, GovernancePack } from "../src/types.js";

// OPS-04: incident records as feedback into the decision (INC-019). A sound pack gives GO; each test adds
// incidents and asserts what the standard says should happen. Every finding is a condition, never a block.

const NOW = "2026-11-19T12:00:00.000Z";

const base = (incidents: GovernanceIncident[] | undefined, debt?: GovernanceDebt[]): GovernancePack => ({
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
    { id: "EVD-2", type: "E3_AUTOMATED_ANALYSIS", status: "UNVERIFIED", description: "d", source: "s", freshness: "current", supports_controls: ["CTL-2"] },
  ],
  risks: [], decisions: [],
  ...(debt ? { debt } : {}),
  ...(incidents ? { incidents } : {}),
});

const context: GovernanceContext = { signals: ["applicable"], analysisStatus: "COMPLETE", evaluatedAt: NOW };

/** Overrides may set a field to undefined, which is how these tests express "left out". */
type Loose<T> = { [K in keyof T]?: T[K] | undefined };
const incident = (overrides: Loose<GovernanceIncident> = {}): GovernanceIncident => ({
  id: "INC-1", severity: "P2", status: "RESOLVED", title: "Checkout outage", owner: "Ivy Commander",
  detected_at: "2026-11-10T10:00:00.000Z", resolved_at: "2026-11-10T12:00:00.000Z",
  review: { status: "COMPLETE", completed_at: "2026-11-12T10:00:00.000Z" },
  ...overrides,
}) as GovernanceIncident;
const action = (overrides: Loose<GovernanceCorrectiveAction> = {}): GovernanceCorrectiveAction => ({
  id: "ACT-1", description: "Add a timeout", status: "OPEN", owner: "Rita Owner", due_date: "2999-01-01", validation: "Load test passes",
  ...overrides,
}) as GovernanceCorrectiveAction;

const evaluate = (items: GovernanceIncident[], debt?: GovernanceDebt[]) => evaluateGovernance(base(items, debt), context);
const reasons = (items: GovernanceIncident[], debt?: GovernanceDebt[]) =>
  evaluate(items, debt).decision.warnings.find((w) => w.controlId === `INCIDENT:${items[0]!.id}`)?.message ?? "";

// CTL-2 is UNVERIFIED so every pack here starts GO_WITH_CONDITIONS: compare against a baseline pack with that control passing.
const clean = (items: GovernanceIncident[], debt?: GovernanceDebt[]) => {
  const pack = base(items, debt);
  pack.evidence[1] = { ...pack.evidence[1]!, status: "VERIFIED" };
  return evaluateGovernance(pack, context);
};

describe("a pack with no incidents", () => {
  it("is unchanged, with no incidents section", () => {
    for (const items of [undefined, []]) {
      const result = clean(items as GovernanceIncident[]);
      expect(result.decision.status).toBe("GO");
      expect(result.incidents).toBeUndefined();
    }
  });
});

describe("incidents that only count", () => {
  it.each([
    ["a resolved, reviewed P2 incident", incident()],
    ["a resolved P2 with no review (only P0 and P1 are material)", incident({ review: undefined })],
    ["an active P2 incident that has an owner", incident({ status: "OPEN", resolved_at: undefined })],
    ["an active P3 incident with no owner", incident({ severity: "P3", status: "OPEN", resolved_at: undefined, owner: undefined })],
    ["a resolved P1 whose review is not required", incident({ severity: "P1", review: { status: "NOT_REQUIRED" } })],
    ["open corrective actions on a P3 incident, however incomplete", incident({ severity: "P3", actions: [action({ owner: undefined, due_date: "2020-01-01" })] })],
  ])("does not change a GO: %s", (_name, item) => {
    expect(clean([item]).decision.status).toBe("GO");
  });
});

describe("conditions", () => {
  it.each(["P0", "P1"] as const)("an active %s incident is a condition: a change is fine only if it is the fix", (severity) => {
    expect(clean([incident({ severity, status: "OPEN", resolved_at: undefined })]).decision.status).toBe("GO_WITH_CONDITIONS");
    expect(reasons([incident({ severity, status: "MITIGATED", resolved_at: undefined })])).toContain("only if it is the fix or an emergency change");
  });

  it("an active P0, P1 or P2 incident with no owner is a condition (section 3.3)", () => {
    expect(reasons([incident({ status: "OPEN", resolved_at: undefined, owner: undefined })])).toContain("has no owner");
    expect(reasons([incident({ status: "OPEN", resolved_at: undefined, owner: "   " })])).toContain("has no owner");
  });

  it.each([undefined, { status: "PENDING" as const }])("a resolved P1 with review %j is a condition (section 31)", (review) => {
    expect(reasons([incident({ severity: "P1", review })])).toContain("no completed post-incident review");
  });

  it("a closed P1 with no corrective action recorded is a condition (section 45), unless no review is required", () => {
    expect(reasons([incident({ severity: "P1", status: "CLOSED" })])).toContain("closed with no corrective action recorded");
    expect(reasons([incident({ severity: "P1", status: "CLOSED", actions: [action({ status: "DONE" })] })])).toBe("");
    expect(reasons([incident({ severity: "P1", status: "CLOSED", review: { status: "NOT_REQUIRED" } })])).toBe("");
  });

  it("names exactly what a corrective action lacks (section 36)", () => {
    expect(reasons([incident({ actions: [action({ owner: undefined, validation: undefined })] })])).toContain("ACT-1 lacks an owner, validation criteria");
    expect(reasons([incident({ actions: [action({ owner: undefined, due_date: undefined, validation: undefined })] })])).toContain("lacks an owner, a target date, validation criteria");
  });

  it("an open action past its target date is a condition, a done one is not (section 37)", () => {
    expect(reasons([incident({ actions: [action({ due_date: "2026-11-18" })] })])).toContain("ACT-1 is past its target date 2026-11-18");
    expect(evaluate([incident({ actions: [action({ due_date: "2026-11-19" })] })]).decision.warnings.some((w) => w.controlId.startsWith("INCIDENT:"))).toBe(false);
    expect(evaluate([incident({ actions: [action({ status: "DONE", due_date: "2020-01-01" })] })]).decision.warnings.some((w) => w.controlId.startsWith("INCIDENT:"))).toBe(false);
  });

  it("a deprioritised action needs a justification (section 37)", () => {
    expect(reasons([incident({ actions: [action({ status: "DEPRIORITIZED" })] })])).toContain("deprioritised with no justification");
    expect(evaluate([incident({ actions: [action({ status: "DEPRIORITIZED", justification: "Risk accepted by the CTO." })] })]).decision.warnings.some((w) => w.controlId.startsWith("INCIDENT:"))).toBe(false);
  });

  it("one incident with several problems is one condition listing them all, at the incident's severity", () => {
    const result = evaluate([incident({ severity: "P1", status: "OPEN", resolved_at: undefined, owner: undefined, actions: [action({ owner: undefined })] })]);
    const found = result.decision.warnings.filter((w) => w.controlId === "INCIDENT:INC-1");
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ severity: "P1", status: "WARN", decision: "GO_WITH_CONDITIONS" });
    expect(found[0]!.message).toMatch(/only if it is the fix.*no owner.*lacks an owner/);
  });
});

describe("repeat incidents (section 38)", () => {
  const first = incident({ id: "INC-1", cause: "db-pool-exhaustion", detected_at: "2026-10-01T10:00:00.000Z", resolved_at: "2026-10-01T11:00:00.000Z" });
  const second = incident({ id: "INC-2", cause: "DB-Pool-Exhaustion", detected_at: "2026-11-01T10:00:00.000Z", resolved_at: "2026-11-01T11:00:00.000Z" });

  it("flags the later incident, not the first, and says the earlier action was not enough", () => {
    const result = evaluate([first, second]);
    expect(result.decision.warnings.map((w) => w.controlId)).toContain("INCIDENT:INC-2");
    expect(result.decision.warnings.map((w) => w.controlId)).not.toContain("INCIDENT:INC-1");
    expect(result.decision.warnings.find((w) => w.controlId === "INCIDENT:INC-2")!.message).toMatch(/repeats the cause "DB-Pool-Exhaustion" of INC-1.*not enough/);
    expect(result.incidents!.repeats).toBe(1);
  });

  it("lists every earlier incident of the cause for a third one", () => {
    const third = incident({ id: "INC-3", cause: "db-pool-exhaustion", detected_at: "2026-11-10T10:00:00.000Z", resolved_at: "2026-11-10T11:00:00.000Z" });
    expect(reasons([third, first, second])).toContain("of INC-1, INC-2");
  });

  it("suggests recording technical debt unless some is already linked", () => {
    expect(evaluate([first, second]).decision.warnings.find((w) => w.controlId === "INCIDENT:INC-2")!.message).toContain("consider recording technical debt");
    const debt: GovernanceDebt[] = [{ id: "DEBT-1", severity: "P3", status: "OPEN", owner: "Rita Owner" }];
    const linked = evaluate([first, { ...second, debt: ["DEBT-1"] }], debt);
    expect(linked.decision.warnings.find((w) => w.controlId === "INCIDENT:INC-2")!.message).not.toContain("consider recording technical debt");
  });

  it("does not link incidents with different or no causes", () => {
    expect(clean([first, { ...second, cause: "bad-deploy" }]).decision.status).toBe("GO");
    expect(clean([incident({ id: "INC-1", cause: undefined }), incident({ id: "INC-2", cause: undefined, detected_at: "2026-11-11T10:00:00.000Z", resolved_at: "2026-11-11T11:00:00.000Z" })]).decision.status).toBe("GO");
  });
});

describe("linking an incident to the controls it exposed (section 51)", () => {
  it("asks for the evidence to be revisited when a P0 or P1 incident is recorded against a control that still passes", () => {
    expect(reasons([incident({ severity: "P1", controls: ["CTL-1"] })])).toContain("CTL-1, which still evaluates PASS");
    expect(evaluate([incident({ severity: "P2", controls: ["CTL-1"] })]).decision.warnings.some((w) => w.controlId.startsWith("INCIDENT:"))).toBe(false);
  });

  it("is only information when the control is already not passing, and the report shows the control's status", () => {
    const result = evaluate([incident({ severity: "P1", controls: ["CTL-2"] })]);
    expect(result.decision.warnings.some((w) => w.controlId.startsWith("INCIDENT:"))).toBe(false);
    expect(result.incidents!.items[0]!.linkedControls).toEqual([{ id: "CTL-2", status: "UNVERIFIED" }]);
  });
});

describe("incidents and technical debt (section 52)", () => {
  const debt = (severity: GovernanceDebt["severity"]): GovernanceDebt[] => [{ id: "DEBT-1", severity, status: "OPEN", owner: "Rita Owner" }];
  const two = [incident({ id: "INC-1", debt: ["DEBT-1"] }), incident({ id: "INC-2", debt: ["DEBT-1"], detected_at: "2026-11-11T10:00:00.000Z", resolved_at: "2026-11-11T11:00:00.000Z" })];

  it("lists on a debt item the incidents attributed to it", () => {
    const result = evaluate(two, debt("P2"));
    expect(result.debt!.items[0]!.incidents).toEqual(["INC-1", "INC-2"]);
  });

  it("questions the severity of P2 or P3 debt that two incidents are attributed to, but not P1 or a single incident", () => {
    const message = (items: GovernanceIncident[], severity: GovernanceDebt["severity"]) =>
      evaluate(items, debt(severity)).decision.warnings.find((w) => w.controlId === "DEBT:DEBT-1")?.message ?? "";
    expect(message(two, "P2")).toContain("linked to 2 incidents (INC-1, INC-2): its P2 severity may be understated");
    expect(message(two, "P3")).toContain("may be understated");
    expect(message(two, "P1")).not.toContain("understated");
    expect(message([two[0]!], "P2")).toBe("");
  });

  it("rejects an incident that names debt the pack does not record", () => {
    expect(() => evaluate([incident({ debt: ["DEBT-NOPE"] })], debt("P2"))).toThrow(/unknown debt 'DEBT-NOPE'/);
  });
});

describe("the summary (section 39)", () => {
  it("counts by severity, active incidents, reviews, actions, repeats and mean time to resolve", () => {
    const summary = evaluate([
      incident({ id: "INC-1", severity: "P0", cause: "x", detected_at: "2026-10-01T10:00:00.000Z", resolved_at: "2026-10-01T14:00:00.000Z", actions: [action({ id: "ACT-1", due_date: "2020-01-01" }), action({ id: "ACT-2", status: "DONE" })] }),
      incident({ id: "INC-2", severity: "P1", cause: "x", detected_at: "2026-11-01T10:00:00.000Z", resolved_at: "2026-11-01T11:00:00.000Z", review: { status: "PENDING" } }),
      incident({ id: "INC-3", severity: "P2", status: "OPEN", resolved_at: undefined, detected_at: "2026-11-18T10:00:00.000Z" }),
    ]).incidents!;
    expect(summary).toMatchObject({
      total: 3, bySeverity: { P0: 1, P1: 1, P2: 1, P3: 0 }, active: 1,
      materialResolved: 2, materialReviewed: 1, actionsOpen: 1, actionsOverdue: 1, repeats: 1, meanTimeToResolveHours: 2.5,
    });
    expect(summary.items.map((item) => item.id)).toEqual(["INC-1", "INC-2", "INC-3"]); // most severe first
  });

  it("leaves out the mean time to resolve when nothing has a resolution time", () => {
    expect(evaluate([incident({ status: "OPEN", resolved_at: undefined })]).incidents!.meanTimeToResolveHours).toBeUndefined();
  });
});

describe("incidents never block", () => {
  it("an active P0 incident with everything wrong still gives conditions, not NO-GO (the standard's blockers are about capabilities)", () => {
    const result = clean([incident({ severity: "P0", status: "OPEN", resolved_at: undefined, owner: undefined, review: undefined, actions: [action({ owner: undefined, due_date: "2020-01-01" })] })]);
    expect(result.decision.status).toBe("GO_WITH_CONDITIONS");
    expect(result.decision.blockingViolations).toEqual([]);
    expect(result.decision.reason).toContain("incident(s) need follow-up (INC-019)");
  });

  it("does not downgrade a NO-GO that something else caused", () => {
    const pack = base([incident({ severity: "P1", status: "OPEN", resolved_at: undefined })]);
    pack.evidence[0] = { ...pack.evidence[0]!, status: "UNVERIFIED" };
    expect(evaluateGovernance(pack, context).decision.status).toBe("NO-GO");
  });
});

describe("validation of incident records", () => {
  it.each([
    ["a resolved incident with no resolved_at", incident({ resolved_at: undefined }), /RESOLVED but has no resolved_at/],
    ["a closed incident with no resolved_at", incident({ status: "CLOSED", resolved_at: undefined }), /CLOSED but has no resolved_at/],
    ["an incident resolved before it was detected", incident({ resolved_at: "2026-11-01T00:00:00.000Z" }), /resolved before it was detected/],
    ["a complete review with no completion time", incident({ review: { status: "COMPLETE" } }), /COMPLETE review with no completed_at/],
    ["a control the pack does not define", incident({ controls: ["NOPE"] }), /unknown control 'NOPE'/],
  ])("rejects %s", (_name, item, message) => {
    expect(() => evaluate([item])).toThrow(message);
  });

  it("rejects duplicate incident ids and duplicate action ids within an incident", () => {
    expect(() => evaluate([incident(), incident()])).toThrow(/Duplicate|duplicate/);
    expect(() => evaluate([incident({ actions: [action(), action()] })])).toThrow(/more than one action 'ACT-1'/);
  });

  it("allows an active incident with no resolved_at", () => {
    expect(() => evaluate([incident({ status: "OPEN", resolved_at: undefined })])).not.toThrow();
  });
});

describe("determinism", () => {
  it("gives the same evaluation for the same pack and time", () => {
    const items = [incident({ id: "INC-2", cause: "a" }), incident({ id: "INC-1", cause: "a", detected_at: "2026-10-01T10:00:00.000Z", resolved_at: "2026-10-01T11:00:00.000Z" })];
    expect(JSON.stringify(evaluate(items))).toBe(JSON.stringify(evaluate(structuredClone(items))));
  });
});
