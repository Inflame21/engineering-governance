import { describe, expect, it } from "vitest";
import { evaluateGovernance } from "../src/decision.js";
import type {
  FailureDecision,
  GovernanceDecision,
  GovernancePack,
  GovernanceRisk,
  Severity,
} from "../src/types.js";

type ControlState = "PASS" | "WARN" | "UNVERIFIED" | "FAIL" | "NOT_APPLICABLE";
type Outcome = GovernanceDecision["status"];

const SIGNALS = ["applicable"];

/** Builds a one-control pack whose derived control status is exactly `state`. */
function pack(
  state: ControlState,
  severity: Severity,
  failureDecision: FailureDecision,
  risks: GovernanceRisk[] = [],
): GovernancePack {
  const evidenceStatus = {
    PASS: "VERIFIED",
    WARN: "PARTIALLY_VERIFIED",
    FAIL: "NOT_APPLICABLE",
    UNVERIFIED: "UNVERIFIED",
    NOT_APPLICABLE: "VERIFIED",
  } as const;
  return {
    version: "1.0.0",
    project: { id: "matrix", name: "Matrix", repository: "example/matrix", environment: "production" },
    change: { id: "CHG-MATRIX", type: "feature", title: "Matrix", risk_class: "B", files: [] },
    standards: [],
    controls: [{
      id: "CTL-1",
      standard: "SEC-007",
      title: "Matrix control",
      severity,
      applies_when: ["applicable"],
      required_evidence: ["EVD-1"],
      failure_decision: failureDecision,
    }],
    evidence: [{
      id: "EVD-1",
      type: "E3_AUTOMATED_ANALYSIS",
      status: evidenceStatus[state],
      description: "Matrix evidence.",
      source: "test",
      freshness: "current",
      supports_controls: ["CTL-1"],
    }],
    risks,
    decisions: [],
  };
}

const decide = (p: GovernancePack, signals: string[] = SIGNALS) =>
  evaluateGovernance(p, { signals });
const decideFor = (state: ControlState, severity: Severity, fd: FailureDecision, risks: GovernanceRisk[] = []) =>
  decide(pack(state, severity, fd, risks), state === "NOT_APPLICABLE" ? [] : SIGNALS);
const risk = (severity: Severity, status: GovernanceRisk["status"]): GovernanceRisk =>
  ({ id: `RSK-${severity}-${status}`, severity, title: "Risk", status });

describe("decision matrix: single control", () => {
  const cases: Array<[ControlState, Severity, FailureDecision, Outcome]> = [
    // Inapplicable controls never influence the decision, whatever their severity.
    ["NOT_APPLICABLE", "P0", "NO-GO", "GO"],
    // A verified control passes at every severity.
    ["PASS", "P0", "NO-GO", "GO"],
    ["PASS", "P3", "NONE", "GO"],
    // Missing or contradicted evidence blocks even when the control declares no failure decision.
    ["UNVERIFIED", "P3", "NONE", "NO-GO"],
    ["UNVERIFIED", "P2", "GO_WITH_CONDITIONS", "NO-GO"],
    ["FAIL", "P3", "NONE", "NO-GO"],
    ["FAIL", "P1", "REVIEW_REQUIRED", "NO-GO"],
    // Partial evidence is a condition unless severity is P0 or the control demands NO-GO.
    ["WARN", "P0", "GO_WITH_CONDITIONS", "NO-GO"],
    ["WARN", "P1", "NO-GO", "NO-GO"],
    ["WARN", "P1", "GO_WITH_CONDITIONS", "GO_WITH_CONDITIONS"],
    ["WARN", "P2", "REVIEW_REQUIRED", "GO_WITH_CONDITIONS"],
    ["WARN", "P3", "NONE", "GO_WITH_CONDITIONS"],
  ];

  it.each(cases)("%s / %s / %s => %s", (state, severity, failureDecision, expected) => {
    const result = decideFor(state, severity, failureDecision);
    expect(result.decision.status).toBe(expected);
    expect(result.decision.blockingViolations.length > 0).toBe(expected === "NO-GO");
    expect(result.decision.warnings.length > 0).toBe(expected === "GO_WITH_CONDITIONS");
  });
});

describe("decision matrix: risk acceptance", () => {
  const cases: Array<[Severity, GovernanceRisk["status"], Outcome]> = [
    ["P0", "OPEN", "NO-GO"],
    ["P1", "OPEN", "NO-GO"],
    // P0 is not approvable and P1 acceptance cannot be verified, so ACCEPTED still blocks.
    ["P0", "ACCEPTED", "NO-GO"],
    ["P1", "ACCEPTED", "NO-GO"],
    ["P0", "MITIGATED", "GO"],
    ["P1", "CLOSED", "GO"],
    ["P2", "OPEN", "GO"],
    ["P3", "ACCEPTED", "GO"],
  ];

  it.each(cases)("%s risk %s with a passing control => %s", (severity, status, expected) => {
    const result = decideFor("PASS", "P1", "NO-GO", [risk(severity, status)]);
    expect(result.decision.status).toBe(expected);
  });

  it("reports an unapproved accepted P1 risk as a blocking violation", () => {
    const result = decideFor("PASS", "P1", "NO-GO", [risk("P1", "ACCEPTED")]);
    expect(result.decision.blockingViolations.map((v) => v.controlId)).toEqual(["RISK:RSK-P1-ACCEPTED"]);
  });

  it("ignores approved exceptions until exceptions are evaluated (fails closed)", () => {
    const blocked = pack("UNVERIFIED", "P1", "NO-GO");
    blocked.exceptions = [{ id: "EXC-1", status: "APPROVED", control: "CTL-1", expires_at: "2999-01-01T00:00:00Z" }];
    expect(decide(blocked).decision.status).toBe("NO-GO");
  });

  it("keeps the worst outcome when a condition and a blocker coexist", () => {
    expect(decideFor("WARN", "P2", "NONE", [risk("P2", "OPEN")]).decision.status).toBe("GO_WITH_CONDITIONS");
    expect(decideFor("WARN", "P2", "NONE", [risk("P1", "OPEN")]).decision.status).toBe("NO-GO");
  });
});

describe("decision matrix: exhaustive cross-check", () => {
  const states: ControlState[] = ["PASS", "WARN", "UNVERIFIED", "FAIL", "NOT_APPLICABLE"];
  const severities: Severity[] = ["P0", "P1", "P2", "P3"];
  const failureDecisions: FailureDecision[] = ["NO-GO", "GO_WITH_CONDITIONS", "REVIEW_REQUIRED", "NONE"];
  const riskSets: GovernanceRisk[][] = [
    [],
    ...(["P0", "P1", "P2", "P3"] as const).flatMap((s) =>
      (["OPEN", "ACCEPTED", "MITIGATED", "CLOSED"] as const).map((st) => [risk(s, st)])),
  ];

  /** Independent statement of the policy, written from the rules rather than the implementation. */
  function expected(state: ControlState, severity: Severity, fd: FailureDecision, risks: GovernanceRisk[]): Outcome {
    const riskBlocks = risks.some(
      (r) => (r.status === "OPEN" || r.status === "ACCEPTED") && (r.severity === "P0" || r.severity === "P1"),
    );
    const controlBlocks =
      state === "UNVERIFIED" || state === "FAIL" ||
      (state === "WARN" && (severity === "P0" || fd === "NO-GO"));
    if (controlBlocks || riskBlocks) return "NO-GO";
    return state === "WARN" ? "GO_WITH_CONDITIONS" : "GO";
  }

  it("matches the policy for every state, severity, failure decision and risk combination", () => {
    let checked = 0;
    for (const state of states) for (const severity of severities) for (const fd of failureDecisions) {
      for (const risks of riskSets) {
        const actual = decideFor(state, severity, fd, risks).decision.status;
        expect(actual, `${state}/${severity}/${fd}/${JSON.stringify(risks)}`).toBe(
          expected(state, severity, fd, risks),
        );
        checked++;
      }
    }
    expect(checked).toBe(5 * 4 * 4 * 17);
  });

  it("is deterministic and independent of control and risk ordering", () => {
    const base = pack("WARN", "P2", "NONE", [risk("P2", "OPEN"), risk("P3", "OPEN")]);
    base.controls.push({ ...base.controls[0]!, id: "CTL-2", severity: "P1", failure_decision: "NO-GO", required_evidence: ["EVD-2"] });
    base.evidence.push({ ...base.evidence[0]!, id: "EVD-2", status: "UNVERIFIED", supports_controls: ["CTL-2"] });
    const reversed = { ...base, controls: [...base.controls].reverse(), risks: [...base.risks].reverse() };

    const a = decide(base);
    expect(decide(base)).toEqual(a);
    expect(decide(reversed).decision).toEqual(a.decision);
    expect(a.decision.status).toBe("NO-GO");
  });
});
