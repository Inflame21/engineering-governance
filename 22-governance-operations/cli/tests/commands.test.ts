import { describe, expect, it } from "vitest";
import { runAnalyzeCommand } from "../src/commands.js";
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
    required_evidence: [],
    failure_decision: "NO-GO",
  }],
  evidence: [],
  risks: [],
  decisions: [],
};

describe("analyze command", () => {
  it("connects repository analysis to governance evaluation", async () => {
    const result = await runAnalyzeCommand({
      snapshot: {
        rootPath: "/repo",
        changedFiles: ["main.py"],
        files: ["main.py", "pyproject.toml"],
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
