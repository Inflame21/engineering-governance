import { describe, expect, it } from "vitest";
import { verifyArchitectureProfile } from "../src/architecture.js";
import type { ArchitectureProfile } from "../src/architecture.js";
import type { RepositorySnapshot } from "../src/types.js";

const profile: ArchitectureProfile = {
  id: "allowed-edge-test",
  version: "1.0.0",
  name: "Allowed Edge Test",
  styles: ["layered"],
  boundaryRules: [
    {
      id: "ARCH-001",
      description: "Domain must not depend on infrastructure.",
      severity: "P1",
      sourcePattern: "domain",
      targetPattern: "infrastructure",
      allowed: false,
    },
    {
      id: "ARCH-ALLOW-001",
      description: "Domain may use the approved repository port adapter.",
      severity: "P1",
      sourcePattern: "domain",
      targetPattern: "approved-infrastructure",
      allowed: true,
    },
  ],
  requiredControls: [],
  componentMappings: {
    domain: ["src/domain/**"],
    infrastructure: ["src/infrastructure/**"],
    "approved-infrastructure": ["src/infrastructure/approved/**"],
  },
};

const snapshot: RepositorySnapshot = {
  rootPath: "/repo",
  changedFiles: [],
  files: [
    "src/domain/service.ts",
    "src/infrastructure/approved/repository.ts",
    "src/infrastructure/unsafe/repository.ts",
  ],
  fileContents: {
    "src/domain/service.ts": [
      'import { approved } from "../infrastructure/approved/repository.js";',
      'import { unsafe } from "../infrastructure/unsafe/repository.js";',
      "export const service = { approved, unsafe };",
    ].join("\n"),
    "src/infrastructure/approved/repository.ts": "export const approved = {};",
    "src/infrastructure/unsafe/repository.ts": "export const unsafe = {};",
  },
};

describe("allowed architecture dependencies", () => {
  it("suppresses only the explicitly allowed edge and keeps other violations", () => {
    const result = verifyArchitectureProfile(snapshot, profile);

    expect(result.status).toBe("COMPLETE");
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.rule_id).toBe("ARCH-001");
    expect(result.findings[0]?.message).toContain("src/infrastructure/unsafe/repository.ts");
  });
});
