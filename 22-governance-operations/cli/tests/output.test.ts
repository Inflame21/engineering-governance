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

  it("renders package-scoped facts for monorepos", () => {
    const monorepo: RepositoryAnalysis = {
      ...analysis,
      facts: {
        ...analysis.facts,
        packages: [{
          id: "package:services/api",
          root: "services/api",
          manifestPaths: ["services/api/pyproject.toml"],
          sourceFiles: ["services/api/main.py"],
          languages: ["python"],
          frameworks: ["fastapi"],
          packageManagers: ["uv"],
          buildSystems: [],
          infrastructureSystems: [],
          testSystems: ["pytest"],
        }],
      },
    };

    const output = formatAnalysisResult(monorepo, context);
    expect(output).toContain("Packages/workspaces: 1");
    expect(output).toContain("services/api | languages: python | frameworks: fastapi | package managers: uv");
  });

  it("renders typed system relationship graph counts and limitations", () => {
    const withSystemGraph: RepositoryAnalysis = {
      ...analysis,
      systemGraph: {
        status: "PARTIAL",
        nodes: [
          { id: "REPO:ROOT", type: "REPOSITORY", name: "repository", confidence: 1, evidenceRefs: [] },
          { id: "API:1", type: "API_ENDPOINT", name: "GET /users", confidence: 0.95, evidenceRefs: ["EVD-SYSTEM-API-1"] },
          { id: "DATABASE:1", type: "DATABASE", name: "postgresql", confidence: 0.95, evidenceRefs: ["EVD-SYSTEM-DB-1"] },
          { id: "EVENT:1", type: "EVENT", name: "user.created", confidence: 0.65, evidenceRefs: ["EVD-SYSTEM-EVENT-1"] },
        ],
        edges: [
          { id: "EDGE-1", type: "EXPOSES_API", sourceId: "package:api", targetId: "API:1", confidence: 0.95, evidenceRefs: ["EVD-SYSTEM-API-1"] },
          { id: "EDGE-2", type: "USES_DATABASE", sourceId: "package:api", targetId: "DATABASE:1", confidence: 0.95, evidenceRefs: ["EVD-SYSTEM-DB-1"] },
          { id: "EDGE-3", type: "PUBLISHES_EVENT", sourceId: "package:api", targetId: "EVENT:1", confidence: 0.65, evidenceRefs: ["EVD-SYSTEM-EVENT-1"] },
        ],
        evidence: [],
        limitations: ["A dynamic route was not inspected."],
      },
    };

    const output = formatAnalysisResult(withSystemGraph, context);
    expect(output).toContain("System relationship graph: PARTIAL");
    expect(output).toContain("API endpoints: 1");
    expect(output).toContain("Databases: 1");
    expect(output).toContain("Publishes events: 1");
    expect(output).toContain("System-graph limitation: A dynamic route was not inspected.");
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
          packageEdges: [],
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
