import { describe, expect, it } from "vitest";
import { formatAnalysisResult, formatHumanResult, formatJsonResult } from "../src/output.js";
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
  snapshotFingerprint: {
    algorithm: "sha256",
    digest: `sha256:${"a".repeat(64)}`,
    fileCount: 1,
    ingestedContentFileCount: 1,
    sourceFileCount: 1,
    inspectedSourceFileCount: 1,
    sourceContentStatus: "COMPLETE",
    limitations: [],
  },
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

  it("renders verified architecture change-impact details", () => {
    const withImpact: RepositoryAnalysis = {
      ...analysis,
      architecture: {
        profileId: "clean-architecture",
        status: "COMPLETE",
        graph: {
          nodes: [],
          edges: [],
          components: [],
          componentEdges: [],
          changeImpact: {
            status: "VERIFIED",
            changedFiles: ["src/infrastructure/db.ts"],
            changedComponents: ["COMP:infrastructure"],
            impactedFiles: ["src/domain/user.ts", "src/infrastructure/db.ts"],
            impactedComponents: ["COMP:domain", "COMP:infrastructure"],
            unmappedChangedFiles: [],
            unresolvedChangedFiles: [],
            limitations: [],
          },
          unresolvedRelativeImports: [],
          uninspectedSourceFiles: [],
          unsupportedLanguages: [],
        },
        evidence: [],
        findings: [],
        limitations: [],
        supportedCapabilities: [],
        unsupportedCapabilities: [],
      },
    };

    const output = formatAnalysisResult(withImpact, context);
    expect(output).toContain("Change impact: VERIFIED");
    expect(output).toContain("Changed components: COMP:infrastructure");
    expect(output).toContain("Impacted components: COMP:domain, COMP:infrastructure");
  });

  it("renders machine-readable JSON", () => {
    const output = formatJsonResult(analysis, evaluation, context);
    const parsed = JSON.parse(output) as {
      report: {
        schemaVersion: string;
        assessmentId: string;
        generatedAt: string;
        repositoryFingerprint: string;
        decision: string;
      };
      evaluation: GovernanceEvaluation;
    };
    expect(parsed.evaluation.decision.status).toBe("GO");
    expect(parsed.report.schemaVersion).toBe("1.0.0");
    expect(parsed.report.assessmentId).toMatch(/^ASM-\d{17}-[A-F0-9]{12}$/);
    expect(parsed.report.repositoryFingerprint).toBe(analysis.snapshotFingerprint?.digest);
    expect(Number.isNaN(Date.parse(parsed.report.generatedAt))).toBe(false);
    expect(parsed.report.decision).toBe("GO");
  });
});
