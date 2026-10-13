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


  it("rejects empty style lists and malformed component mapping keys", () => {
    const emptyStyles = { ...cleanArchitecture, styles: [] };
    expect(validateArchitectureProfile(emptyStyles).valid).toBe(false);

    const malformedMappings = {
      ...cleanArchitecture,
      componentMappings: {
        "Domain Layer": ["src/domain/**"],
      },
    };
    const result = validateArchitectureProfile(malformedMappings);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes("lowercase role identifier"))).toBe(true);
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



  it("links cross-package imports to package-level dependency edges", () => {
    const graph = buildArchitectureDependencyGraph({
      rootPath: "/repo",
      changedFiles: [],
      files: [
        "apps/web/package.json",
        "apps/web/src/App.tsx",
        "packages/shared/package.json",
        "packages/shared/src/index.ts",
      ],
      fileContents: {
        "apps/web/package.json": JSON.stringify({ dependencies: { react: "^19.0.0" } }),
        "apps/web/src/App.tsx": 'import { shared } from "../../../packages/shared/src/index.js";\\nexport const app = shared;',
        "packages/shared/package.json": JSON.stringify({ name: "@example/shared" }),
        "packages/shared/src/index.ts": "export const shared = true;",
      },
    });

    expect(graph.packageEdges).toHaveLength(1);
    expect(graph.packageEdges[0]).toMatchObject({
      sourcePackageId: "package:apps/web",
      targetPackageId: "package:packages/shared",
      sourceFile: "apps/web/src/App.tsx",
      targetFile: "packages/shared/src/index.ts",
      sourceLocation: { file: "apps/web/src/App.tsx", line: 1 },
    });
    expect(graph.packageEdges[0]?.evidenceRef).toMatch(/^EVD-ARCH-/);
  });

  it("aggregates file dependencies into role-level component edges", () => {
    const graph = buildArchitectureDependencyGraph({
      rootPath: "/repo",
      changedFiles: [],
      files: ["src/domain/user.ts", "src/infrastructure/db.ts"],
      fileContents: {
        "src/domain/user.ts": 'import { db } from "../infrastructure/db.js";',
        "src/infrastructure/db.ts": "export const db = {};",
      },
    }, cleanArchitectureExample as ArchitectureProfile);

    expect(graph.components).toContainEqual({
      id: "COMP:domain",
      role: "domain",
      files: ["src/domain/user.ts"],
    });
    expect(graph.componentEdges).toContainEqual(expect.objectContaining({
      sourceComponentId: "COMP:domain",
      targetComponentId: "COMP:infrastructure",
      sourceFile: "src/domain/user.ts",
      targetFile: "src/infrastructure/db.ts",
    }));
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


  it("does not flag dependencies explicitly allowed by the selected profile", () => {
    const allowedProfile: ArchitectureProfile = {
      ...(cleanArchitectureExample as ArchitectureProfile),
      boundaryRules: (cleanArchitectureExample as ArchitectureProfile).boundaryRules.map((rule) => ({
        ...rule,
        allowed: true,
      })),
    };
    const result = verifyArchitectureProfile({
      rootPath: "/repo",
      changedFiles: [],
      files: ["src/domain/user.ts", "src/infrastructure/db.ts"],
      fileContents: {
        "src/domain/user.ts": 'import { db } from "../infrastructure/db.js";',
        "src/infrastructure/db.ts": "export const db = {};",
      },
    }, allowedProfile);

    expect(result.status).toBe("COMPLETE");
    expect(result.findings).toEqual([]);
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

  it("computes reverse-dependency impact from a verified changed-file scope", () => {
    const result = buildArchitectureDependencyGraph({
      rootPath: "/repo",
      changedFiles: [],
      changeScope: {
        status: "VERIFIED",
        baseRef: "origin/main",
        headRef: "head-sha",
        files: ["src/infrastructure/db.ts"],
      },
      files: ["src/domain/user.ts", "src/infrastructure/db.ts"],
      fileContents: {
        "src/domain/user.ts": 'import { db } from "../infrastructure/db.js";\\nexport const user = db;',
        "src/infrastructure/db.ts": "export const db = {};",
      },
    }, cleanArchitectureExample as ArchitectureProfile);

    expect(result.changeImpact.status).toBe("VERIFIED");
    expect(result.changeImpact.changedFiles).toEqual(["src/infrastructure/db.ts"]);
    expect(result.changeImpact.changedComponents).toEqual(["COMP:infrastructure"]);
    expect(result.changeImpact.impactedFiles).toEqual([
      "src/domain/user.ts",
      "src/infrastructure/db.ts",
    ]);
    expect(result.changeImpact.impactedComponents).toEqual([
      "COMP:domain",
      "COMP:infrastructure",
    ]);
  });

  it("does not claim verified change impact when file scope is not verified", () => {
    const result = buildArchitectureDependencyGraph({
      rootPath: "/repo",
      changedFiles: ["src/infrastructure/db.ts"],
      files: ["src/domain/user.ts", "src/infrastructure/db.ts"],
      fileContents: {
        "src/domain/user.ts": 'import { db } from "../infrastructure/db.js";',
        "src/infrastructure/db.ts": "export const db = {};",
      },
    }, cleanArchitectureExample as ArchitectureProfile);

    expect(result.changeImpact.status).toBe("UNVERIFIED");
    expect(result.changeImpact.impactedFiles).toContain("src/domain/user.ts");
    expect(result.changeImpact.limitations).toContain(
      "Changed files were supplied without a verified Git change scope.",
    );
  });

  it("converts multiple architecture styles into normalized signals", () => {
    expect(architectureSignals(cleanArchitecture)).toEqual([
      "architecture-profile:clean-architecture",
      "architecture:clean-architecture",
      "architecture:layered",
    ]);
  });
});
