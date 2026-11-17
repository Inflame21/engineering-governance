import { describe, expect, it } from "vitest";
import { validateArchitectureProfile, verifyArchitectureProfile } from "../src/architecture.js";
import type { ArchitectureProfile } from "../src/architecture.js";
import type { RepositorySnapshot } from "../src/types.js";
import modularProfileJson from "../../model/architecture-profile-modular-example.json" with { type: "json" };

const profile = modularProfileJson as ArchitectureProfile;

const snapshot: RepositorySnapshot = {
  rootPath: "/repo",
  changedFiles: [],
  files: [
    "src/infrastructure/db.ts",
    "src/modules/billing/invoice.ts",
    "src/modules/orders/service.ts",
    "src/shared/id.ts",
  ],
  fileContents: {
    "src/infrastructure/db.ts": "export const db = {};",
    "src/modules/billing/invoice.ts": 'import { service } from "../orders/service.js"; export const invoice = service;',
    "src/modules/orders/service.ts": 'import { invoice } from "../billing/invoice.js"; import { db } from "../../infrastructure/db.js"; export const service = { invoice, db };',
    "src/shared/id.ts": 'import { service } from "../modules/orders/service.js"; export const createId = () => service;',
  },
};

describe("Modular Architecture profile example", () => {
  it("conforms to the architecture profile schema", () => {
    expect(validateArchitectureProfile(profile).valid).toBe(true);
  });

  it("detects cross-feature imports, shared-kernel coupling, and direct infrastructure dependencies", () => {
    const result = verifyArchitectureProfile(snapshot, profile);

    expect(result.status).toBe("COMPLETE");
    expect(result.findings.map((finding) => finding.rule_id)).toEqual(expect.arrayContaining([
      "MOD-001",
      "MOD-002",
      "MOD-003",
      "MOD-004",
    ]));
    expect(result.findings).toHaveLength(4);
    expect(result.findings.every((finding) => finding.source_location && finding.evidence_refs.length === 1)).toBe(true);
  });
});
