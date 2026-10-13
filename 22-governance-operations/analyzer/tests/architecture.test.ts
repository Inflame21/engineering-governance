import { describe, expect, it } from "vitest";
import {
  architectureSignals,
  buildArchitectureDependencyGraph,
  validateArchitectureProfile,
  verifyArchitectureProfile,
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


  it("builds a provenance-bearing dependency graph from relative TypeScript imports", () => {
    const snapshot = {
      rootPath: "/repo",
      changedFiles: ["src/domain/user.ts"],
      files: ["src/domain/user.ts", "src/infrastructure/db.ts"],
      fileContents: {
        "src/domain/user.ts": 'import { db } from "../infrastructure/db.js";\\nexport const user = db;',
        "src/infrastructure/db.ts": "export const db = {};",
      },
    };
    const graph = buildArchitectureDependencyGraph(snapshot, cleanArchitecture);

    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toMatchObject({
      sourceId: "FILE:src/domain/user.ts",
      targetId: "FILE:src/infrastructure/db.ts",
      sourceLocation: { file: "src/domain/user.ts", line: 1 },
    });
    expect(graph.edges[0]?.evidenceRef).toMatch(/^EVD-ARCH-/);
  });


  it("builds Python relative-import edges with source provenance", () => {
    const graph = buildArchitectureDependencyGraph({
      rootPath: "/repo",
      changedFiles: [],
      files: ["src/domain/user.py", "src/infrastructure/db.py"],
      fileContents: {
        "src/domain/user.py": "from ..infrastructure.db import get_db\\nuser = get_db()",
        "src/infrastructure/db.py": "def get_db():\\n    return None",
      },
    }, cleanArchitectureExample as ArchitectureProfile);

    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toMatchObject({
      sourceId: "FILE:src/domain/user.py",
      targetId: "FILE:src/infrastructure/db.py",
      importSpecifier: "..infrastructure.db",
      sourceLocation: { file: "src/domain/user.py", line: 1 },
    });
  });

  it("finds a real forbidden dependency across mapped Clean Architecture roles", () => {
    const snapshot = {
      rootPath: "/repo",
      changedFiles: ["src/domain/user.ts"],
      files: ["src/domain/user.ts", "src/infrastructure/db.ts"],
      fileContents: {
        "src/domain/user.ts": 'import { db } from "../infrastructure/db.js";\\nexport const user = db;',
        "src/infrastructure/db.ts": "export const db = {};",
      },
    };
    const result = verifyArchitectureProfile(snapshot, cleanArchitectureExample as ArchitectureProfile);

    expect(result.status).toBe("PARTIAL");
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      rule_id: "ARCH-DOMAIN-INDEPENDENCE",
      category: "architecture-boundary",
      source_location: { file: "src/domain/user.ts", start_line: 1 },
    });
    expect(result.evidence.some((item) => item.id === result.findings[0]?.evidence_refs[0])).toBe(true);
  });


  it("does not silently treat unresolved path aliases as external imports", () => {
    const result = verifyArchitectureProfile({
      rootPath: "/repo",
      changedFiles: [],
      files: ["src/domain/user.ts", "src/infrastructure/db.ts"],
      fileContents: {
        "src/domain/user.ts": 'import { db } from "@/infrastructure/db";',
        "src/infrastructure/db.ts": "export const db = {};",
      },
    }, cleanArchitectureExample as ArchitectureProfile);

    expect(result.status).toBe("PARTIAL");
    expect(result.graph.unresolvedRelativeImports).toContainEqual({
      file: "src/domain/user.ts",
      line: 1,
      specifier: "@/infrastructure/db",
    });
    expect(result.unsupportedCapabilities).toContain("architecture:resolve-local-imports");
  });

  it("keeps architecture verification partial when role mappings are absent", () => {
    const profile: ArchitectureProfile = { ...cleanArchitecture };
    const result = verifyArchitectureProfile({
      rootPath: "/repo",
      changedFiles: [],
      files: ["src/domain/user.ts", "src/infrastructure/db.ts"],
      fileContents: {
        "src/domain/user.ts": 'import { db } from "../infrastructure/db";',
        "src/infrastructure/db.ts": "export const db = {};",
      },
    }, profile);

    expect(result.status).toBe("PARTIAL");
    expect(result.findings).toHaveLength(0);
    expect(result.unsupportedCapabilities).toContain("architecture:component-role-mapping");
  });

  it("converts multiple architecture styles into normalized signals", () => {
    expect(architectureSignals(cleanArchitecture)).toEqual([
      "architecture-profile:clean-architecture",
      "architecture:clean-architecture",
      "architecture:layered",
    ]);
  });
});
