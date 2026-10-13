import { describe, expect, it } from "vitest";
import {
  architectureSignals,
  validateArchitectureProfile,
} from "../src/architecture.js";
import type { ArchitectureProfile } from "../src/architecture.js";
import cleanArchitectureExample from "../../model/architecture-profile-clean-architecture.json" with { type: "json" };
import microservicesExample from "../../model/architecture-profile-microservices.json" with { type: "json" };

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
  it("validates well-formed profiles", () => {
    expect(validateArchitectureProfile(cleanArchitecture).valid).toBe(true);
    expect(validateArchitectureProfile(cleanArchitectureExample).valid).toBe(true);
    expect(validateArchitectureProfile(microservicesExample).valid).toBe(true);
  });

  it("rejects profiles with missing mandatory fields", () => {
    const result = validateArchitectureProfile({ id: "bad", styles: [], boundaryRules: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects malformed boundary rules and unknown properties", () => {
    const malformed = {
      ...cleanArchitecture,
      unexpected: true,
      boundaryRules: [{
        ...cleanArchitecture.boundaryRules[0]!,
        allowed: "false",
      }],
    };
    const result = validateArchitectureProfile(malformed);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects duplicate boundary rule IDs", () => {
    const duplicate = {
      ...cleanArchitecture,
      boundaryRules: [
        ...cleanArchitecture.boundaryRules,
        { ...cleanArchitecture.boundaryRules[0]! },
      ],
    };
    const result = validateArchitectureProfile(duplicate);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes("duplicate rule id"))).toBe(true);
  });

  it("converts multiple architecture styles into normalized signals", () => {
    expect(architectureSignals(cleanArchitecture)).toEqual([
      "architecture-profile:clean-architecture",
      "architecture:clean-architecture",
      "architecture:layered",
    ]);
  });
});
