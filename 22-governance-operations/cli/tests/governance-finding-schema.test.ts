import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import governanceSchema from "../../model/governance-model.schema.json" with { type: "json" };
import examplePack from "../../model/example-governance-pack.json" with { type: "json" };

interface SchemaError {
  instancePath: string;
  message?: string;
}

interface SchemaValidator {
  (value: unknown): boolean;
  errors: SchemaError[] | null;
}

interface AjvInstance {
  compile(schema: unknown): SchemaValidator;
}

type AjvConstructor = new (options: { allErrors: boolean; strict: boolean }) => AjvInstance;

const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020.js") as AjvConstructor;
const ajv = new Ajv2020({ allErrors: true, strict: true });
const addFormats = require("ajv-formats") as (ajv: AjvInstance) => void;
addFormats(ajv);
const validateGovernancePack = ajv.compile(governanceSchema);

function cloneExamplePack(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(examplePack)) as Record<string, unknown>;
}

describe("normalized finding contract", () => {
  it("accepts findings with source and evidence provenance", () => {
    const candidate = cloneExamplePack();
    candidate["findings"] = [{
      id: "FND-SEC-001",
      rule_id: "SEC-AUTH-001",
      severity: "P1",
      category: "security",
      message: "Authorization verification is incomplete.",
      status: "OPEN",
      evidence_refs: ["EVD-AUTH-001"],
      source_location: { file: "backend/api/employees.py", start_line: 42 },
      component_id: "employee-api",
      confidence: 0.92,
      remediation: "Add authorization enforcement and a regression test.",
    }];

    expect(validateGovernancePack(candidate)).toBe(true);
    expect(validateGovernancePack.errors).toBeNull();
  });


  it("rejects accepted risks without approval metadata and expiry", () => {
    const candidate = cloneExamplePack();
    const risks = candidate["risks"] as Array<Record<string, unknown>>;
    risks[0]!["status"] = "ACCEPTED";
    delete risks[0]!["accepted_by"];
    delete risks[0]!["accepted_at"];
    delete risks[0]!["acceptance_expires_at"];
    delete risks[0]!["acceptance_reason"];

    expect(validateGovernancePack(candidate)).toBe(false);
  });

  it("rejects approved exceptions without scope and approval provenance", () => {
    const candidate = cloneExamplePack();
    candidate["exceptions"] = [{
      id: "EXC-1",
      status: "APPROVED",
      control: "SEC-AUTH-001",
      reason: "Temporary exception.",
    }];

    expect(validateGovernancePack(candidate)).toBe(false);
  });

  it("rejects finding confidence outside the zero-to-one range", () => {
    const candidate = cloneExamplePack();
    candidate["findings"] = [{
      id: "FND-SEC-002",
      rule_id: "SEC-AUTH-001",
      severity: "P1",
      category: "security",
      message: "Authorization evidence is missing.",
      status: "UNVERIFIED",
      evidence_refs: [],
      confidence: 1.5,
    }];

    expect(validateGovernancePack(candidate)).toBe(false);
  });
});
