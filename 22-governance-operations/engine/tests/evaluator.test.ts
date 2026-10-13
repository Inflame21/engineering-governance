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

const applicableContext = {
  signals: ["api_endpoint", "protected_resource"],
};

describe("rule and control engine", () => {
  it("evaluates one control identically for multiple implementation languages", () => {
    for (const language of ["typescript", "python", "go", "java", "rust"]) {
      const result = evaluateGovernance(basePack, {
        ...applicableContext,
        facts: { language }
      });
      expect(result.decision.status).toBe("GO");
      expect(result.controls[0]?.status).toBe("PASS");
    }
  });

  it("does not apply controls when normalized conditions are absent after complete analysis", () => {
    const result = evaluateGovernance(basePack, {
      signals: ["cli_command"],
      analysisStatus: "COMPLETE",
    });
    expect(result.controls[0]?.status).toBe("NOT_APPLICABLE");
    expect(result.decision.status).toBe("GO");
  });


  it("does not treat missing signals as non-applicability when analysis is partial", () => {
    const result = evaluateGovernance(basePack, {
      signals: ["api_endpoint"],
      analysisStatus: "PARTIAL",
      unsupportedCapabilities: ["python-api-path-detection"],
    });

    expect(result.controls[0]?.applicabilityStatus).toBe("UNVERIFIED");
    expect(result.controls[0]?.missingSignals).toContain("protected_resource");
    expect(result.controls[0]?.status).toBe("UNVERIFIED");
    expect(result.decision.status).toBe("NO-GO");
  });

  it("does not assume analysis is complete when no analysis status is provided", () => {
    const result = evaluateGovernance(basePack, { signals: ["cli_command"] });

    expect(result.controls[0]?.applicabilityStatus).toBe("UNVERIFIED");
    expect(result.controls[0]?.status).toBe("UNVERIFIED");
    expect(result.decision.status).toBe("NO-GO");
  });

  it("does not allow a declared PASS to override missing required evidence", () => {
    const pack: GovernancePack = {
      ...basePack,
      controls: [{ ...basePack.controls[0]!, status: "PASS" }],
      evidence: [],
    };
    const result = evaluateGovernance(pack, applicableContext);

    expect(result.controls[0]?.status).toBe("UNVERIFIED");
    expect(result.controls[0]?.missingEvidence).toContain("EVD-AUTH");
    expect(result.decision.status).toBe("NO-GO");
  });

  it.each(["UNVERIFIED", "PARTIALLY_VERIFIED", "NOT_APPLICABLE"] as const)(
    "does not accept %s evidence as proof of a required control",
    (evidenceStatus) => {
      const pack: GovernancePack = {
        ...basePack,
        controls: [{ ...basePack.controls[0]!, status: "PASS" }],
        evidence: [{ ...basePack.evidence[0]!, status: evidenceStatus }],
      };
      const result = evaluateGovernance(pack, applicableContext);

      expect(result.controls[0]?.status).toBe("UNVERIFIED");
      expect(result.decision.status).toBe("NO-GO");
    },
  );

  it("does not pass a control with no declared or linked evidence", () => {
    const pack: GovernancePack = {
      ...basePack,
      controls: [{
        ...basePack.controls[0]!,
        status: "PASS",
        required_evidence: [],
      }],
      evidence: [],
    };
    const result = evaluateGovernance(pack, applicableContext);

    expect(result.controls[0]?.status).toBe("UNVERIFIED");
    expect(result.decision.status).toBe("NO-GO");
  });

  it("blocks on an open P1 risk even when controls pass", () => {
    const pack = {
      ...basePack,
      risks: [{ id: "RSK-1", severity: "P1" as const, title: "Duplicate data risk", status: "OPEN" as const }]
    };
    const result = evaluateGovernance(pack, applicableContext);
    expect(result.decision.status).toBe("NO-GO");
    expect(result.decision.blockingViolations[0]?.controlId).toBe("RISK:RSK-1");
  });
});
