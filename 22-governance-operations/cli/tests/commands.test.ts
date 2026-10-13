import { describe, expect, it } from "vitest";
import { runAnalyzeCommand, runGovernanceCommand } from "../src/commands.js";
import type { GovernancePack } from "../../engine/src/types.js";

const pack: GovernancePack = {
  version: "1.0.0",
  project: { id: "demo", name: "Demo", repository: "demo/repo", environment: "production" },
  change: { id: "CHG-1", type: "feature", title: "API change", risk_class: "B", files: ["main.py"] },
  standards: [],
  controls: [{
    id: "API-001",
    standard: "API-006",
    title: "API changes require API capability",
    severity: "P1",
    applies_when: ["capability:http-api"],
    required_evidence: ["EVD-API-CAPABILITY"],
    failure_decision: "NO-GO",
  }],
  evidence: [{
    id: "EVD-API-CAPABILITY",
    type: "E3_AUTOMATED_ANALYSIS",
    status: "VERIFIED",
    description: "API capability detected from the declared framework dependency.",
    source: "test",
    freshness: "current",
    supports_controls: ["API-001"],
  }],
  risks: [],
  decisions: [],
};

describe("analyze command", () => {

  it("blocks approval when a selected architecture profile requires missing governance controls", async () => {
    const result = await runGovernanceCommand({
      snapshot: {
        rootPath: "/repo",
        changedFiles: [],
        files: ["src/domain/user.ts"],
        fileContents: { "src/domain/user.ts": "export const user = true;" },
      },
      governancePack: pack,
      architectureProfile: {
        id: "clean-architecture",
        version: "1.0.0",
        name: "Clean Architecture",
        styles: ["clean-architecture"],
        boundaryRules: [],
        requiredControls: ["ARCH-REQUIRED-001"],
      },
    });

    expect(result.evaluation.decision.status).toBe("NO-GO");
    expect(result.evaluation.decision.blockingViolations.some(
      (item) => item.controlId === "PROFILE:clean-architecture:REQUIRED-CONTROL:ARCH-REQUIRED-001",
    )).toBe(true);
  });

  it("connects repository analysis to governance evaluation", async () => {
    const result = await runAnalyzeCommand({
      snapshot: {
        rootPath: "/repo",
        changedFiles: ["main.py"],
        files: ["main.py", "routers/users.py", "pyproject.toml"],
        fileContents: {
          "pyproject.toml": '[project]\ndependencies = ["fastapi>=0.115"]',
        },
      },
      governancePack: pack,
    });

    expect(result).toContain("Decision: GO");
    expect(result).toContain("fastapi");
  });
});
