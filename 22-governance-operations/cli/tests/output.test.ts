import { describe, expect, it } from "vitest";
import { formatHumanResult, formatJsonResult } from "../src/output.js";

const analysis = {
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
};

const evaluation = {
  controls: [],
  decision: {
    status: "GO" as const,
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
  });

  it("renders machine-readable JSON", () => {
    const output = formatJsonResult(analysis, evaluation);
    expect(JSON.parse(output).evaluation.decision.status).toBe("GO");
  });
});
