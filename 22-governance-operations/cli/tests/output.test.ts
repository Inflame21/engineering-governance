import { describe, expect, it } from "vitest";
import { formatHumanResult, formatJsonResult } from "../src/output.js";
import type { GovernanceEvaluation } from "../../engine/src/types.js";
import type { RepositoryAnalysis } from "../../analyzer/src/types.js";

const analysis: RepositoryAnalysis = {
  facts: {
    languages: ["python"],
    frameworks: ["fastapi"],
    packageManagers: ["uv"],
    buildSystems: [],
    infrastructureSystems: [],
    testSystems: ["pytest"],
  },
  signals: ["framework:fastapi", "capability:http-api"],
  evidence: [],
  findings: [],
  adapterResults: [],
};

const context = {
  signals: ["framework:fastapi"],
  analysisStatus: "COMPLETE" as const,
  unsupportedCapabilities: [],
  analyzerLimitations: [],
  evaluatedAt: "2026-10-13T00:00:00Z",
};


const evaluation: GovernanceEvaluation = {
  controls: [],
  violations: [],
  decision: {
    status: "GO",
    reason: "All applicable controls passed.",
    blockingViolations: [],
    warnings: [],
    openRisks: [],
  },
};

describe("CLI output", () => {
  it("renders a concise human result", () => {
    const output = formatHumanResult(analysis, evaluation, context);
    expect(output).toContain("Decision: GO");
    expect(output).toContain("fastapi");
    expect(output).toContain("Open risks: 0");
  });


  it("explains decision blockers and links them to supporting evidence", () => {
    const blocked: GovernanceEvaluation = {
      ...evaluation,
      decision: {
        ...evaluation.decision,
        status: "NO-GO",
        blockingViolations: [{
          controlId: "FINDING:FND-ARCH-001",
          severity: "P1",
          decision: "NO-GO",
          message: "Domain depends on infrastructure.",
          missingEvidence: [],
          missingSignals: [],
          evidenceRefs: ["EVD-ARCH-001"],
        }],
      },
    };

    const output = formatHumanResult(analysis, blocked, context);
    expect(output).toContain("Decision findings:");
    expect(output).toContain("FINDING:FND-ARCH-001");
    expect(output).toContain("Evidence: EVD-ARCH-001");
  });

  it("renders machine-readable JSON", () => {
    const output = formatJsonResult(analysis, evaluation, context);
    expect(JSON.parse(output).evaluation.decision.status).toBe("GO");
  });
});
