import { describe, expect, it } from "vitest";
import { verifyArchitectureProfile } from "../src/architecture.js";
import type { ArchitectureProfile } from "../src/architecture.js";
import type { RepositorySnapshot } from "../src/types.js";

const profile: ArchitectureProfile = {
  id: "clean-architecture",
  version: "1.0.0",
  name: "Clean Architecture",
  styles: ["clean-architecture"],
  boundaryRules: [{
    id: "ARCH-DOMAIN-001",
    description: "Domain code must not depend on infrastructure.",
    severity: "P1",
    sourcePattern: "domain",
    targetPattern: "infrastructure",
    allowed: false,
  }],
  requiredControls: [],
  componentMappings: {
    domain: ["apps/web/src/domain/**", "services/api/domain/**"],
    infrastructure: ["apps/web/src/infrastructure/**", "services/api/infrastructure/**"],
  },
};

const snapshot: RepositorySnapshot = {
  rootPath: "/fixture",
  changedFiles: [],
  files: [
    "apps/web/package.json",
    "apps/web/src/app.ts",
    "apps/web/src/domain/customer.ts",
    "apps/web/src/infrastructure/store.ts",
    "packages/shared/package.json",
    "packages/shared/src/index.ts",
    "services/api/pyproject.toml",
    "services/api/domain/order.py",
    "services/api/infrastructure/db.py",
  ],
  fileContents: {
    "apps/web/package.json": JSON.stringify({ dependencies: { react: "^19.0.0" } }),
    "apps/web/src/app.ts": 'import { shared } from "../../../packages/shared/src/index.js";',
    "apps/web/src/domain/customer.ts": 'import { store } from "../infrastructure/store.js"; export const customer = store;',
    "apps/web/src/infrastructure/store.ts": "export const store = {};",
    "packages/shared/package.json": JSON.stringify({ name: "@fixture/shared" }),
    "packages/shared/src/index.ts": "export const shared = true;",
    "services/api/pyproject.toml": '[project]\ndependencies = ["fastapi>=0.115"]',
    "services/api/domain/order.py": "from ..infrastructure.db import db\norder_store = db",
    "services/api/infrastructure/db.py": "db = object()",
  },
};

describe("polyglot architecture graph fixture", () => {
  it("produces traceable TypeScript/Python boundary findings and cross-package edges", () => {
    const result = verifyArchitectureProfile(snapshot, profile);

    expect(result.status).toBe("COMPLETE");
    expect(result.graph.nodes.map((node) => node.language)).toEqual(expect.arrayContaining([
      "typescript",
      "python",
    ]));
    expect(result.graph.packageEdges).toHaveLength(1);
    expect(result.graph.packageEdges[0]).toMatchObject({
      sourcePackageId: "package:apps/web",
      targetPackageId: "package:packages/shared",
    });
    expect(result.findings).toHaveLength(2);
    expect(result.findings.map((finding) => finding.source_location?.file)).toEqual([
      "apps/web/src/domain/customer.ts",
      "services/api/domain/order.py",
    ]);
    expect(result.findings.every((finding) => finding.evidence_refs.length > 0)).toBe(true);
  });
});
