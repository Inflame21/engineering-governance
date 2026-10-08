import { describe, expect, it } from "vitest";
import { evaluateGovernance } from "../src/decision.js";
import type { GovernancePack } from "../src/types.js";

const basePack: GovernancePack = {
  version: "1.0.0",
  project: { id: "test", name: "Test", repository: "example/test", environment: "production" },
  change: { id: "CHG-1", type: "feature", title: "Test change", risk_class: "B", files: ["src/example.ts"] },
  standards: [],
  controls: [{
    id: "SEC-AUTH-001",
    standard: "SEC-007",
    title: "Protected resources require authorization",
    severity: "P0",
    applies_when: ["api_endpoint", "protected_resource"],
    required_evidence: ["EVD-AUTH"],
    failure_decision: "NO-GO"
  }],
  evidence: [{
    id: "EVD-AUTH",
    type: "E3_AUTOMATED_ANALYSIS",
    status: "VERIFIED",
    description: "Authorization check verified.",
    source: "test",
    freshness: "current",
    supports_controls: ["SEC-AUTH-001"]
  }],
  risks: [],
  decisions: []
};

describe("rule and control engine", () => {
  it("evaluates one control identically for multiple implementation languages", () => {
    for (const language of ["typescript", "python", "go", "java", "rust"]) {
      const result = evaluateGovernance(basePack, {
        signals: ["api_endpoint", "protected_resource"],
        facts: { language }
      });
      expect(result.decision.status).toBe("GO");
      expect(result.controls[0]?.status).toBe("PASS");
    }
  });

  it("does not apply controls when normalized conditions are absent", () => {
    const result = evaluateGovernance(basePack, { signals: ["cli_command"] });
    expect(result.controls[0]?.status).toBe("NOT_APPLICABLE");
    expect(result.decision.status).toBe("GO");
  });

  it("blocks when required evidence is unverified", () => {
    const pack = {
      ...basePack,
      evidence: [{ ...basePack.evidence[0]!, status: "UNVERIFIED" as const }]
    };
    const result = evaluateGovernance(pack, {
      signals: ["api_endpoint", "protected_resource"]
    });
    expect(result.decision.status).toBe("NO-GO");
    expect(result.decision.blockingViolations[0]?.controlId).toBe("SEC-AUTH-001");
  });

  it("blocks on an open P1 risk even when controls pass", () => {
    const pack = {
      ...basePack,
      risks: [{ id: "RSK-1", severity: "P1" as const, title: "Duplicate data risk", status: "OPEN" as const }]
    };
    const result = evaluateGovernance(pack, {
      signals: ["api_endpoint", "protected_resource"]
    });
    expect(result.decision.status).toBe("NO-GO");
    expect(result.decision.blockingViolations[0]?.controlId).toBe("RISK:RSK-1");
  });
});
