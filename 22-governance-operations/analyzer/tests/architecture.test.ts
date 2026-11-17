import { describe, expect, it } from "vitest";
import { architectureSignals, validateArchitectureProfile } from "../src/architecture.js";
import type { ArchitectureProfile } from "../src/architecture.js";

const cleanArchitecture: ArchitectureProfile = {
  id: "clean-architecture",
  version: "1.0.0",
  name: "Clean Architecture",
  styles: ["clean-architecture", "layered"],
  boundaryRules: [{
    id: "ARCH-001",
    description: "Domain cannot depend on infrastructure.",
    severity: "P1",
    sourcePattern: "domain",
    targetPattern: "infrastructure",
    allowed: false,
  }],
  requiredControls: ["ARCH-DEPENDENCY-DIRECTION"],
};

describe("architecture profiles", () => {
  it("validates a well-formed profile", () => {
    expect(validateArchitectureProfile(cleanArchitecture).valid).toBe(true);
  });

  it("rejects profiles with missing mandatory fields", () => {
    const result = validateArchitectureProfile({ id: "bad", styles: [], boundaryRules: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("converts multiple architecture styles into normalized signals", () => {
    expect(architectureSignals(cleanArchitecture)).toEqual([
      "architecture-profile:clean-architecture",
      "architecture:clean-architecture",
      "architecture:layered",
    ]);
  });
});
