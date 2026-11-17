import { describe, expect, it } from "vitest";
import { checkApproverAuthority } from "../src/authority.js";
import { evaluateGovernance } from "../src/decision.js";
import type { ApproverAuthority, GovernanceContext, GovernanceException, GovernancePack, GovernanceRisk, Severity } from "../src/types.js";

const SENIOR: ApproverAuthority = { role: "SENIOR_ENGINEERING_AUTHORITY", severities: ["P1", "P2", "P3"], holders: ["Sam Senior", "@samsenior"] };
const REVIEWER: ApproverAuthority = { role: "ENGINEERING_REVIEWER_OWNER", severities: ["P2", "P3"], holders: ["Riley Reviewer"] };
const AUTHORITY = [SENIOR, REVIEWER];

describe("checkApproverAuthority", () => {
  const check = (approver: string, role: string | undefined, severity: Severity, authority = AUTHORITY) =>
    checkApproverAuthority(approver, role, severity, authority);

  it("authorizes a holder of a role that covers the severity", () => {
    expect(check("Sam Senior", "SENIOR_ENGINEERING_AUTHORITY", "P1")).toMatchObject({ authorized: true });
    expect(check("Sam Senior", "SENIOR_ENGINEERING_AUTHORITY", "P3")).toMatchObject({ authorized: true });
    expect(check("Riley Reviewer", "ENGINEERING_REVIEWER_OWNER", "P2")).toMatchObject({ authorized: true });
  });

  it("recognises a holder by name or handle, ignoring case, spaces and a leading @", () => {
    expect(check("  sam senior ", "SENIOR_ENGINEERING_AUTHORITY", "P1").authorized).toBe(true);
    expect(check("samsenior", "SENIOR_ENGINEERING_AUTHORITY", "P1").authorized).toBe(true);
    expect(check("@SamSenior", "SENIOR_ENGINEERING_AUTHORITY", "P1").authorized).toBe(true);
  });

  it.each([
    ["no role named", undefined, "does not name the approver's authority role"],
    ["a blank role", "  ", "does not name the approver's authority role"],
    ["an unknown role", "CHIEF_WIZARD", "role CHIEF_WIZARD is not an approved authority role"],
  ])("rejects %s", (_name, role, reason) => {
    const result = check("Sam Senior", role, "P1");
    expect(result.authorized).toBe(false);
    expect(result.reason).toContain(reason);
  });

  it("rejects a role that does not cover the severity", () => {
    const result = check("Riley Reviewer", "ENGINEERING_REVIEWER_OWNER", "P1");
    expect(result).toMatchObject({ authorized: false });
    expect(result.reason).toContain("role ENGINEERING_REVIEWER_OWNER may not approve P1");
  });

  it("rejects an approver who does not hold the named role, even if they hold another", () => {
    const result = check("Riley Reviewer", "SENIOR_ENGINEERING_AUTHORITY", "P2");
    expect(result.authorized).toBe(false);
    expect(result.reason).toContain("'Riley Reviewer' is not a holder of role SENIOR_ENGINEERING_AUTHORITY");
  });

  it("never authorizes anyone when there are no roles", () => {
    expect(check("Sam Senior", "SENIOR_ENGINEERING_AUTHORITY", "P1", []).authorized).toBe(false);
  });
});

const NOW = "2026-11-17T00:00:00Z";
const basePack = (): GovernancePack => ({
  version: "1.0.0",
  project: { id: "demo", name: "Demo", repository: "demo/repo", environment: "production" },
  change: { id: "CHG-1", type: "feature", title: "Change", risk_class: "B", files: [] },
  standards: [{ id: "SEC-007", title: "Security", version: "1.0.0", source: "07-security/security.md" }],
  controls: [{ id: "CTL-1", standard: "SEC-007", title: "Control", severity: "P1", required_evidence: ["EVD-1"], failure_decision: "NO-GO" }],
  // Unverified evidence, so the control blocks unless something waives it.
  evidence: [{ id: "EVD-1", type: "E3_AUTOMATED_ANALYSIS", status: "UNVERIFIED", description: "d", source: "s", freshness: "current", supports_controls: ["CTL-1"] }],
  risks: [],
  decisions: [],
});

/** Overrides may set a field to undefined, which is how these tests express "left out". */
type Loose<T> = { [K in keyof T]?: T[K] | undefined };

const exception = (overrides: Loose<GovernanceException> = {}): GovernanceException => ({
  id: "EXC-1",
  status: "APPROVED",
  control: "CTL-1",
  reason: "Tracked remediation.",
  project_id: "demo",
  change_id: "CHG-1",
  requested_by: "Rita Requester",
  requested_at: "2026-01-01T00:00:00Z",
  approved_by: "Sam Senior",
  approver_role: "SENIOR_ENGINEERING_AUTHORITY",
  approved_at: "2026-01-02T00:00:00Z",
  expires_at: "2999-01-01T00:00:00Z",
  ...overrides,
}) as GovernanceException;

const evaluate = (pack: GovernancePack, extra: Partial<GovernanceContext> = {}) =>
  evaluateGovernance(pack, { signals: [], analysisStatus: "COMPLETE", evaluatedAt: NOW, ...extra });

const waiver = (severity: Severity, overrides: Loose<GovernanceException> = {}): GovernancePack => ({
  ...basePack(),
  controls: [{ ...basePack().controls[0]!, severity }],
  exceptions: [exception(overrides)],
});

describe("exception waivers by approver authority", () => {
  it("P1: refused with no authority policy, as before", () => {
    const result = evaluate(waiver("P1"));
    expect(result.decision.status).toBe("NO-GO");
    expect(result.decision.warnings.find((w) => w.controlId === "EXCEPTION:EXC-1")?.message)
      .toContain("without an approved approver-authority policy");
  });

  it("P1: refused when the policy is present but empty", () => {
    expect(evaluate(waiver("P1"), { approverAuthority: [] }).decision.status).toBe("NO-GO");
  });

  it("P1: waived when the approver holds a role that covers P1, and the condition says so", () => {
    const result = evaluate(waiver("P1"), { approverAuthority: AUTHORITY });
    expect(result.decision.status).toBe("GO_WITH_CONDITIONS");
    expect(result.decision.blockingViolations).toEqual([]);
    const message = result.decision.warnings.find((w) => w.controlId === "EXCEPTION:EXC-1")?.message ?? "";
    expect(message).toContain("is active");
    expect(message).toContain("authority role SENIOR_ENGINEERING_AUTHORITY");
    expect(message).toContain("not authenticated");
  });

  it.each([
    ["the approver is not a holder", { approved_by: "Mallory Imposter" }, "is not a holder of role SENIOR_ENGINEERING_AUTHORITY"],
    ["the role cannot approve P1", { approved_by: "Riley Reviewer", approver_role: "ENGINEERING_REVIEWER_OWNER" }, "may not approve P1"],
    ["no role is named", { approver_role: undefined }, "does not name the approver's authority role"],
    ["the role is unknown", { approver_role: "CHIEF_WIZARD" }, "is not an approved authority role"],
  ])("P1: refused when %s", (_name, overrides, reason) => {
    const result = evaluate(waiver("P1", overrides as Partial<GovernanceException>), { approverAuthority: AUTHORITY });
    expect(result.decision.status).toBe("NO-GO");
    expect(result.decision.blockingViolations.map((v) => v.controlId)).toContain("CTL-1");
    expect(result.decision.warnings.find((w) => w.controlId === "EXCEPTION:EXC-1")?.message).toContain(reason);
  });

  it("P0 is never waivable, whatever the authority", () => {
    const result = evaluate(waiver("P0"), { approverAuthority: AUTHORITY });
    expect(result.decision.status).toBe("NO-GO");
    expect(result.decision.warnings.find((w) => w.controlId === "EXCEPTION:EXC-1")?.message).toContain("emergency governance process");
  });

  it("P2: legacy behaviour without a policy, authority checking once a policy is in force", () => {
    const pack = waiver("P2", { approved_by: "Anyone Else", approver_role: undefined });
    expect(evaluate(pack).decision.status).toBe("GO_WITH_CONDITIONS");
    expect(evaluate(pack, { approverAuthority: AUTHORITY }).decision.status).toBe("NO-GO");
    const authorized = waiver("P2", { approved_by: "Riley Reviewer", approver_role: "ENGINEERING_REVIEWER_OWNER" });
    expect(evaluate(authorized, { approverAuthority: AUTHORITY }).decision.status).toBe("GO_WITH_CONDITIONS");
  });

  it("the requester still cannot approve their own exception, even as an authorized holder", () => {
    const result = evaluate(waiver("P1", { requested_by: "Sam Senior" }), { approverAuthority: AUTHORITY });
    expect(result.decision.status).toBe("NO-GO");
    expect(result.decision.warnings.find((w) => w.controlId === "EXCEPTION:EXC-1")?.message).toContain("requester cannot approve their own exception");
  });

  it("a non-exceptionable control cannot be waived even by an authorized approver", () => {
    const result = evaluate(waiver("P1"), { approverAuthority: AUTHORITY, nonExceptionableControls: ["CTL-1"] });
    expect(result.decision.status).toBe("NO-GO");
    expect(result.decision.warnings.find((w) => w.controlId === "EXCEPTION:EXC-1")?.message).toContain("non-exceptionable");
  });

  it("an expired exception is rejected outright, whoever approved it", () => {
    expect(() => evaluate(waiver("P1", { expires_at: "2026-06-01T00:00:00Z" }), { approverAuthority: AUTHORITY }))
      .toThrow("expired time window");
  });
});

describe("risk acceptance by approver authority", () => {
  const accepted = (severity: Severity, overrides: Loose<GovernanceRisk> = {}): GovernancePack => ({
    ...basePack(),
    // The control passes, so only the risk decides the outcome.
    evidence: [{ ...basePack().evidence[0]!, status: "VERIFIED" }],
    risks: [{
      id: "RSK-1",
      severity,
      title: "Accepted risk",
      status: "ACCEPTED",
      accepted_by: "Sam Senior",
      acceptance_role: "SENIOR_ENGINEERING_AUTHORITY",
      accepted_at: "2026-01-01T00:00:00Z",
      acceptance_reason: "Bounded by compensating controls.",
      acceptance_expires_at: "2999-01-01T00:00:00Z",
      ...overrides,
    } as GovernanceRisk],
  });

  it("P1: still blocks with no authority policy", () => {
    expect(evaluate(accepted("P1")).decision.status).toBe("NO-GO");
  });

  it("P1: holds when accepted by a holder of a role that covers P1, and stays visible as a condition", () => {
    const result = evaluate(accepted("P1"), { approverAuthority: AUTHORITY });
    expect(result.decision.status).toBe("GO_WITH_CONDITIONS");
    expect(result.decision.blockingViolations).toEqual([]);
    expect(result.decision.openRisks).toEqual([]);
    const warning = result.decision.warnings.find((w) => w.controlId === "RISK:RSK-1");
    expect(warning?.message).toContain("accepted under authority role SENIOR_ENGINEERING_AUTHORITY");
    expect(warning?.message).toContain("residual P1 risk remains");
    expect(warning?.message).toContain("not authenticated");
  });

  it.each([
    ["by someone who is not a holder", { accepted_by: "Mallory Imposter" }, "authority is not established"],
    ["without naming a role", { acceptance_role: undefined }, "authority is not established"],
    ["under a role that cannot approve P1", { accepted_by: "Riley Reviewer", acceptance_role: "ENGINEERING_REVIEWER_OWNER" }, "authority is not established"],
    ["after it expired", { acceptance_expires_at: "2026-06-01T00:00:00Z" }, "does not hold"],
  ])("P1: blocks when accepted %s", (_name, overrides, text) => {
    const pack = accepted("P1", overrides as Partial<GovernanceRisk>);
    // an expired acceptance makes the pack semantically invalid, which the engine rejects outright
    if (text === "does not hold") {
      expect(() => evaluate(pack, { approverAuthority: AUTHORITY })).toThrow();
      return;
    }
    const result = evaluate(pack, { approverAuthority: AUTHORITY });
    expect(result.decision.status).toBe("NO-GO");
    expect(result.decision.blockingViolations.find((v) => v.controlId === "RISK:RSK-1")?.message).toContain(text);
  });

  it("P0: is never accepted, whatever the authority", () => {
    expect(evaluate(accepted("P0"), { approverAuthority: AUTHORITY }).decision.status).toBe("NO-GO");
  });

  it("P2: legacy acceptance without a policy; needs a holder of a covering role once a policy is in force", () => {
    const pack = accepted("P2", { accepted_by: "Anyone Else", acceptance_role: undefined });
    expect(evaluate(pack).decision.status).toBe("GO");
    const underPolicy = evaluate(pack, { approverAuthority: AUTHORITY });
    expect(underPolicy.decision.status).toBe("GO_WITH_CONDITIONS");
    expect(underPolicy.decision.openRisks.map((r) => r.id)).toEqual(["RSK-1"]);
  });

  it("an unrecognised severity is never accepted", () => {
    expect(evaluate(accepted("P9" as Severity), { approverAuthority: AUTHORITY }).decision.status).toBe("NO-GO");
  });
});
