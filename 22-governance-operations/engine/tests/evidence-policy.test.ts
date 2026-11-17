import { describe, expect, it } from "vitest";
import { evaluateGovernance } from "../src/decision.js";
import {
  EVIDENCE_STATUS_FOR_RESULT,
  TOOL_RESULT_STATUSES,
  evidenceStatusForResult,
  overstatesToolResult,
} from "../src/evidence-policy.js";
import { validateGovernancePackSemantics } from "../src/validation.js";
import type { EvidenceStatus, GovernancePack, ToolResultStatus } from "../src/types.js";

const pack = (evidence: Partial<GovernancePack["evidence"][number]> = {}): GovernancePack => ({
  version: "1.0.0",
  project: { id: "example", name: "Example", repository: "example/repo", environment: "production" },
  change: { id: "CHG-1", type: "feature", title: "Example change", risk_class: "B", files: [] },
  standards: [{ id: "SEC-007", title: "Security", version: "1.0.0", source: "07-security/security.md" }],
  controls: [{
    id: "SEC-AUTH-001",
    standard: "SEC-007",
    title: "Protected resources require authorization",
    severity: "P1",
    required_evidence: ["EVD-AUTH"],
    failure_decision: "NO-GO",
  }],
  evidence: [{
    id: "EVD-AUTH",
    type: "E3_AUTOMATED_ANALYSIS",
    status: "VERIFIED",
    description: "Authorization was verified.",
    source: "test",
    freshness: "current",
    supports_controls: ["SEC-AUTH-001"],
    ...evidence,
  }],
  risks: [],
  decisions: [],
});

describe("tool result to evidence status policy", () => {
  // The expected table is written out here, independently of the implementation's own table.
  const expected: Array<[ToolResultStatus, EvidenceStatus]> = [
    ["PASS", "VERIFIED"],
    ["WARN", "PARTIALLY_VERIFIED"],
    ["FAIL", "UNVERIFIED"],
    ["SKIPPED", "UNVERIFIED"],
    ["UNSUPPORTED", "UNVERIFIED"],
    ["UNVERIFIED", "UNVERIFIED"],
    ["ERROR", "UNVERIFIED"],
  ];

  it.each(expected)("%s supports %s", (result, evidence) => {
    expect(evidenceStatusForResult(result)).toBe(evidence);
  });

  it("covers exactly the seven states in the blueprint", () => {
    expect([...TOOL_RESULT_STATUSES].sort()).toEqual(["ERROR", "FAIL", "PASS", "SKIPPED", "UNSUPPORTED", "UNVERIFIED", "WARN"]);
    expect(Object.keys(EVIDENCE_STATUS_FOR_RESULT).sort()).toEqual([...TOOL_RESULT_STATUSES].sort());
  });

  it("lets only PASS verify, and only PASS or WARN support anything above UNVERIFIED", () => {
    const strongerThanUnverified = TOOL_RESULT_STATUSES.filter((r) => evidenceStatusForResult(r) !== "UNVERIFIED");
    expect(strongerThanUnverified.sort()).toEqual(["PASS", "WARN"]);
    expect(TOOL_RESULT_STATUSES.filter((r) => evidenceStatusForResult(r) === "VERIFIED")).toEqual(["PASS"]);
  });

  it.each([
    ["VERIFIED", "PASS", false],
    ["PARTIALLY_VERIFIED", "PASS", false],
    ["VERIFIED", "WARN", true],
    ["PARTIALLY_VERIFIED", "WARN", false],
    ["PARTIALLY_VERIFIED", "FAIL", true],
    ["VERIFIED", "SKIPPED", true],
    ["VERIFIED", "UNSUPPORTED", true],
    ["VERIFIED", "ERROR", true],
    ["UNVERIFIED", "ERROR", false],
    ["NOT_APPLICABLE", "ERROR", false],
  ] as const)("a claimed %s for a %s result is overstated: %s", (claimed, result, overstated) => {
    expect(overstatesToolResult(claimed, result)).toBe(overstated);
  });
});

describe("evidence that records its tool result", () => {
  it("accepts evidence whose status matches or is below what its result supports", () => {
    expect(validateGovernancePackSemantics(pack({ status: "VERIFIED", result_status: "PASS" }))).toEqual([]);
    expect(validateGovernancePackSemantics(pack({ status: "UNVERIFIED", result_status: "FAIL" }))).toEqual([]);
    expect(validateGovernancePackSemantics(pack({ status: "UNVERIFIED", result_status: "PASS" }))).toEqual([]);
  });

  it("accepts evidence with no recorded result, as before", () => {
    expect(validateGovernancePackSemantics(pack({ status: "VERIFIED" }))).toEqual([]);
  });

  it.each(["WARN", "FAIL", "SKIPPED", "UNSUPPORTED", "UNVERIFIED", "ERROR"] as const)(
    "rejects VERIFIED evidence whose tool result is %s",
    (result) => {
      const issues = validateGovernancePackSemantics(pack({ status: "VERIFIED", result_status: result }));
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({ code: "EVIDENCE_STATUS_OVERSTATED", path: "/evidence/0/status" });
      expect(issues[0]?.message).toContain(`its tool result ${result} supports at most`);
    },
  );

  it("rejects PARTIALLY_VERIFIED evidence from a result that supports nothing", () => {
    const issues = validateGovernancePackSemantics(pack({ status: "PARTIALLY_VERIFIED", result_status: "ERROR" }));
    expect(issues.map((i) => i.code)).toEqual(["EVIDENCE_STATUS_OVERSTATED"]);
  });

  it("rejects an unknown result status", () => {
    const issues = validateGovernancePackSemantics(pack({ result_status: "MAYBE" as unknown as ToolResultStatus }));
    expect(issues.map((i) => i.code)).toEqual(["UNKNOWN_RESULT_STATUS"]);
  });

  it("stops evaluation: a pack that overstates its evidence is rejected, not silently passed", () => {
    expect(() => evaluateGovernance(pack({ status: "VERIFIED", result_status: "SKIPPED" }), { signals: [], analysisStatus: "COMPLETE" }))
      .toThrow("claims status VERIFIED, but its tool result SKIPPED supports at most UNVERIFIED");
  });

  it("blocks a control backed by honest FAIL, SKIPPED, UNSUPPORTED or ERROR evidence", () => {
    for (const result of ["FAIL", "SKIPPED", "UNSUPPORTED", "ERROR"] as const) {
      const decision = evaluateGovernance(
        pack({ status: evidenceStatusForResult(result), result_status: result }),
        { signals: [], analysisStatus: "COMPLETE" },
      ).decision;
      expect(decision.status, result).toBe("NO-GO");
    }
  });

  it("passes a control backed by honest PASS evidence", () => {
    const decision = evaluateGovernance(pack({ status: "VERIFIED", result_status: "PASS" }), { signals: [], analysisStatus: "COMPLETE" }).decision;
    expect(decision.status).toBe("GO");
  });
});
