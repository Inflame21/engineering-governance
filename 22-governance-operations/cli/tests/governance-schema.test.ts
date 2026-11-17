import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import governanceSchema from "../../model/governance-model.schema.json" with { type: "json" };
import examplePack from "../../model/example-governance-pack.json" with { type: "json" };

interface SchemaValidationError {
  instancePath: string;
  message?: string;
}

interface SchemaValidator {
  (data: unknown): boolean;
  errors: SchemaValidationError[] | null;
}

interface AjvInstance {
  compile(schema: unknown): SchemaValidator;
}

type AjvConstructor = new (options: { allErrors: boolean; strict: boolean }) => AjvInstance;

const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020.js") as AjvConstructor;
const addFormats = require("ajv-formats") as (ajv: AjvInstance) => void;
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateGovernancePack = ajv.compile(governanceSchema);

function cloneExamplePack(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(examplePack)) as Record<string, unknown>;
}

describe("governance model schema", () => {
  it("accepts the canonical example governance pack", () => {
    expect(validateGovernancePack(examplePack)).toBe(true);
    expect(validateGovernancePack.errors).toBeNull();
  });

  it("allows evidence-derived control status and string applicability conditions", () => {
    const candidate = cloneExamplePack();
    const controls = candidate["controls"] as Array<Record<string, unknown>>;
    delete controls[0]!["status"];
    controls[0]!["applies_when"] = "api_endpoint";

    expect(validateGovernancePack(candidate)).toBe(true);
    expect(validateGovernancePack.errors).toBeNull();
  });

  it("rejects evidence without provenance fields", () => {
    const candidate = cloneExamplePack();
    const evidence = candidate["evidence"] as Array<Record<string, unknown>>;
    delete evidence[0]!["source"];

    expect(validateGovernancePack(candidate)).toBe(false);
    expect(validateGovernancePack.errors?.some((error: SchemaValidationError) => error.instancePath === "/evidence/0")).toBe(true);
  });

  it("rejects invalid control status values", () => {
    const candidate = cloneExamplePack();
    const controls = candidate["controls"] as Array<Record<string, unknown>>;
    controls[0]!["status"] = "PASSED_WITHOUT_EVIDENCE";

    expect(validateGovernancePack(candidate)).toBe(false);
  });
});
