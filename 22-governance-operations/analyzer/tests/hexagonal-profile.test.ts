import { describe, expect, it } from "vitest";
import { validateArchitectureProfile, verifyArchitectureProfile } from "../src/architecture.js";
import type { ArchitectureProfile } from "../src/architecture.js";
import type { RepositorySnapshot } from "../src/types.js";
import hexagonalProfileJson from "../../model/architecture-profile-hexagonal.json" with { type: "json" };

const profile = hexagonalProfileJson as ArchitectureProfile;

const snapshot: RepositorySnapshot = {
  rootPath: "/repo",
  changedFiles: [],
  files: [
    "src/adapters/inbound/controller.ts",
    "src/domain/customer.ts",
    "src/infrastructure/repository.ts",
  ],
  fileContents: {
    "src/adapters/inbound/controller.ts": 'import { repository } from "../../infrastructure/repository.js";',
    "src/domain/customer.ts": 'import { repository } from "../infrastructure/repository.js";',
    "src/infrastructure/repository.ts": "export const repository = {};",
  },
};

describe("Hexagonal Architecture profile", () => {
  it("conforms to the architecture profile schema", () => {
    expect(validateArchitectureProfile(profile).valid).toBe(true);
  });

  it("flags core-to-adapter and inbound-to-outbound dependencies", () => {
    const result = verifyArchitectureProfile(snapshot, profile);

    expect(result.status).toBe("COMPLETE");
    expect(result.findings).toHaveLength(2);
    expect(result.findings.map((finding) => finding.rule_id)).toEqual(expect.arrayContaining([
      "HEX-001",
      "HEX-002",
    ]));
    expect(result.findings.every((finding) => finding.evidence_refs.length === 1)).toBe(true);
  });

  it("does not flag a port-to-domain dependency", () => {
    const allowedDirection: RepositorySnapshot = {
      rootPath: "/repo",
      changedFiles: [],
      files: [
        "src/adapters/inbound/controller.ts",
        "src/domain/customer.ts",
        "src/infrastructure/repository.ts",
        "src/ports/customer-repository.ts",
      ],
      fileContents: {
        "src/adapters/inbound/controller.ts": "export const controller = true;",
        "src/domain/customer.ts": "export interface Customer { id: string }",
        "src/infrastructure/repository.ts": "export const repository = {};",
        "src/ports/customer-repository.ts": 'import { Customer } from "../domain/customer.js"; export type CustomerPort = Customer;',
      },
    };

    const result = verifyArchitectureProfile(allowedDirection, profile);
    expect(result.findings).toEqual([]);
    expect(result.status).toBe("COMPLETE");
  });
});
