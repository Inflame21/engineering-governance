import { describe, expect, it } from "vitest";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import governanceSchema from "../../model/governance-model.schema.json" with { type: "json" };
import examplePack from "../../model/example-governance-pack.json" with { type: "json" };

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
    expect(validateGovernancePack.errors?.some((error) => error.instancePath === "/evidence/0")).toBe(true);
  });

  it("rejects invalid control status values", () => {
    const candidate = cloneExamplePack();
    const controls = candidate["controls"] as Array<Record<string, unknown>>;
    controls[0]!["status"] = "PASSED_WITHOUT_EVIDENCE";

    expect(validateGovernancePack(candidate)).toBe(false);
  });
});
