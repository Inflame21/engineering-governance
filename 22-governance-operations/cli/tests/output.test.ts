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
    const output = formatHumanResult(analysis, evaluation);
    expect(output).toContain("Decision: GO");
    expect(output).toContain("fastapi");
    expect(output).toContain("Open risks: 0");
  });

  it("renders machine-readable JSON", () => {
    const output = formatJsonResult(analysis, evaluation);
    expect(JSON.parse(output).evaluation.decision.status).toBe("GO");
  });
});
