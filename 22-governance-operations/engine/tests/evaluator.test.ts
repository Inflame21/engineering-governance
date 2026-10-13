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


  it("treats accepted risks without valid time-bounded approval as open", () => {
    const pack: GovernancePack = {
      ...basePack,
      risks: [{
        id: "RSK-ACCEPTED",
        severity: "P1",
        title: "Accepted risk without approval metadata",
        status: "ACCEPTED",
      }],
    };
    const result = evaluateGovernance(pack, {
      ...applicableContext,
      evaluatedAt: "2026-10-13T00:00:00Z",
    });

    expect(result.decision.status).toBe("NO-GO");
    expect(result.decision.openRisks[0]?.status).toBe("OPEN");
    expect(result.decision.blockingViolations[0]?.message).toContain("invalid or expired acceptance");
  });

  it("honors only current, scoped, approved exceptions for non-P0 controls", () => {
    const pack: GovernancePack = {
      ...basePack,
      controls: [{ ...basePack.controls[0]!, severity: "P1" }],
      evidence: [],
      exceptions: [{
        id: "EXC-1",
        status: "APPROVED",
        control: "SEC-AUTH-001",
        reason: "Temporary, bounded exception for a scheduled migration.",
        project_id: "test",
        change_id: "CHG-1",
        requested_by: "engineering",
        requested_at: "2026-10-10T00:00:00Z",
        approved_by: "security-owner",
        approved_at: "2026-10-11T00:00:00Z",
        expires_at: "2026-10-20T00:00:00Z",
      }],
    };
    const result = evaluateGovernance(pack, {
      ...applicableContext,
      analysisStatus: "COMPLETE",
      evaluatedAt: "2026-10-13T00:00:00Z",
    });

    expect(result.controls[0]?.status).toBe("UNVERIFIED");
    expect(result.decision.status).toBe("GO_WITH_CONDITIONS");
    expect(result.decision.blockingViolations).toHaveLength(0);
    expect(result.decision.warnings.some((item) => item.controlId === "EXCEPTION:EXC-1")).toBe(true);
  });

  it("does not apply expired or out-of-scope exceptions", () => {
    const baseException = {
      id: "EXC-2",
      status: "APPROVED" as const,
      control: "SEC-AUTH-001",
      reason: "Temporary exception.",
      project_id: "test",
      change_id: "CHG-1",
      requested_by: "engineering",
      requested_at: "2026-10-01T00:00:00Z",
      approved_by: "security-owner",
      approved_at: "2026-10-02T00:00:00Z",
      expires_at: "2026-10-10T00:00:00Z",
    };
    const expiredPack: GovernancePack = {
      ...basePack,
      controls: [{ ...basePack.controls[0]!, severity: "P1" }],
      evidence: [],
      exceptions: [baseException],
    };
    const expiredResult = evaluateGovernance(expiredPack, {
      ...applicableContext,
      evaluatedAt: "2026-10-13T00:00:00Z",
    });
    expect(expiredResult.decision.status).toBe("NO-GO");

    const outOfScopePack: GovernancePack = {
      ...expiredPack,
      exceptions: [{
        ...baseException,
        id: "EXC-3",
        project_id: "different-project",
        expires_at: "2026-10-20T00:00:00Z",
      }],
    };
    const outOfScopeResult = evaluateGovernance(outOfScopePack, {
      ...applicableContext,
      evaluatedAt: "2026-10-13T00:00:00Z",
    });
    expect(outOfScopeResult.decision.status).toBe("NO-GO");
    expect(outOfScopeResult.decision.warnings.some((item) => item.message.includes("outside the current project/change scope"))).toBe(true);
  });

  it("never lets an exception waive a P0 control", () => {
    const pack: GovernancePack = {
      ...basePack,
      evidence: [],
      exceptions: [{
        id: "EXC-P0",
        status: "APPROVED",
        control: "SEC-AUTH-001",
        reason: "Attempted P0 exception.",
        project_id: "test",
        change_id: "CHG-1",
        requested_by: "engineering",
        requested_at: "2026-10-10T00:00:00Z",
        approved_by: "security-owner",
        approved_at: "2026-10-11T00:00:00Z",
        expires_at: "2026-10-20T00:00:00Z",
      }],
    };
    const result = evaluateGovernance(pack, {
      ...applicableContext,
      evaluatedAt: "2026-10-13T00:00:00Z",
    });

    expect(result.decision.status).toBe("NO-GO");
    expect(result.decision.blockingViolations.some((item) => item.controlId === "SEC-AUTH-001")).toBe(true);
    expect(result.decision.warnings.some((item) => item.message.includes("P0 controls cannot be waived"))).toBe(true);
  });


  it("does not return unconditional GO when analysis is partial and no controls apply", () => {
    const pack: GovernancePack = {
      ...basePack,
      controls: [],
      evidence: [],
    };
    const result = evaluateGovernance(pack, {
      signals: [],
      analysisStatus: "PARTIAL",
      unsupportedCapabilities: ["language-specific-analysis:go"],
    });

    expect(result.decision.status).toBe("GO_WITH_CONDITIONS");
    expect(result.decision.warnings.some((item) => item.controlId === "ANALYSIS:COMPLETENESS")).toBe(true);
  });

  it("returns NO-GO when repository analysis failed", () => {
    const pack: GovernancePack = {
      ...basePack,
      controls: [],
      evidence: [],
    };
    const result = evaluateGovernance(pack, {
      signals: [],
      analysisStatus: "FAILED",
    });

    expect(result.decision.status).toBe("NO-GO");
    expect(result.decision.blockingViolations.some((item) => item.controlId === "ANALYSIS:COMPLETENESS")).toBe(true);
  });


  it("blocks production on unresolved P1 analyzer findings", () => {
    const result = evaluateGovernance({
      ...basePack,
      controls: [],
      evidence: [],
    }, {
      signals: [],
      analysisStatus: "COMPLETE",
      findings: [{
        id: "FND-ARCH-001",
        rule_id: "ARCH-DOMAIN-INDEPENDENCE",
        severity: "P1",
        category: "architecture-boundary",
        message: "Domain depends on infrastructure.",
        status: "OPEN",
        evidence_refs: ["EVD-ARCH-1"],
      }],
    });

    expect(result.decision.status).toBe("NO-GO");
    expect(result.decision.blockingViolations.some((item) => item.controlId === "FINDING:FND-ARCH-001")).toBe(true);
  });

  it("does not block on resolved findings", () => {
    const result = evaluateGovernance({
      ...basePack,
      controls: [],
      evidence: [],
    }, {
      signals: [],
      analysisStatus: "COMPLETE",
      findings: [{
        id: "FND-ARCH-002",
        rule_id: "ARCH-DOMAIN-INDEPENDENCE",
        severity: "P1",
        category: "architecture-boundary",
        message: "Domain dependency was removed.",
        status: "RESOLVED",
        evidence_refs: ["EVD-ARCH-2"],
      }],
    });

    expect(result.decision.status).toBe("GO");
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
