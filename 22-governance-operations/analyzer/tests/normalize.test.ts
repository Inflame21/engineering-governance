import { describe, expect, it } from "vitest";
import { toGovernanceContext } from "../src/normalize.js";

describe("governance normalization", () => {
  it("converts repository facts into stable signals", () => {
    const context = toGovernanceContext({
      facts: {
        languages: ["python", "typescript"],
        frameworks: ["fastapi", "react"],
        packageManagers: ["npm"],
        buildSystems: ["docker"],
        infrastructureSystems: ["terraform"],
        testSystems: ["pytest"],
      },
      signals: ["api_endpoint"],
      evidence: [],
    });

    expect(context.signals).toEqual([
      "api_endpoint",
      "build_system:docker",
      "framework:fastapi",
      "framework:react",
      "infrastructure:terraform",
      "language:python",
      "language:typescript",
      "package_manager:npm",
      "test_system:pytest",
    ]);
  });
});
