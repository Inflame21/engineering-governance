import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import type { FormatsPlugin } from "ajv-formats";
import { evaluateGovernance } from "../src/decision.js";
import type { GovernancePack } from "../src/types.js";

const read = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../model/${name}`, import.meta.url), "utf8"));

// Under NodeNext the CJS default export is typed as the module object; unwrap the plugin function.
const addFormats = (addFormatsModule as unknown as { default?: FormatsPlugin }).default ??
  (addFormatsModule as unknown as FormatsPlugin);
const ajv = new Ajv2020({ strict: true, allErrors: true });
addFormats(ajv);
const schema = read("governance-model.schema.json") as object;
const validate = ajv.compile(schema);

const examplePack = () => structuredClone(read("example-governance-pack.json")) as GovernancePack;
const errorsFor = (value: unknown) =>
  validate(value) ? [] : (validate.errors ?? []).map((e) => `${e.instancePath} ${e.message}`);
const setEvidence = (pack: GovernancePack, field: string, value: unknown) => {
  (pack.evidence[0] as unknown as Record<string, unknown>)[field] = value;
};

describe("governance model schema", () => {
  it("is a valid JSON Schema 2020-12 document", () => {
    expect(ajv.validateSchema(schema)).toBe(true);
  });

  it("accepts the canonical example pack", () => {
    expect(errorsFor(examplePack())).toEqual([]);
  });

  it("accepts a control the way the engine consumes it: string applies_when, no declared status", () => {
    const pack = examplePack();
    const { status: _declared, ...control } = pack.controls[0]!;
    pack.controls[0] = { ...control, applies_when: "api_endpoint" } as GovernancePack["controls"][number];
    expect(errorsFor(pack)).toEqual([]);
  });

  it.each(["id", "type", "status", "description", "source", "freshness", "supports_controls"])(
    "rejects evidence missing required field '%s'",
    (field) => {
      const pack = examplePack();
      delete (pack.evidence[0] as unknown as Record<string, unknown>)[field];
      expect(errorsFor(pack).join("\n")).toContain(`must have required property '${field}'`);
    },
  );

  it.each([
    ["status", "TRUSTED"],
    ["type", "E9_GUESS"],
    ["id", "AUTH-001"],
    ["source", "   "],
    ["freshness", ""],
    ["supports_controls", "SEC-AUTH-001"],
    ["verified_by_ai", true],
  ])("rejects malformed evidence field %s = %j", (field, value) => {
    const pack = examplePack();
    setEvidence(pack, field, value);
    expect(errorsFor(pack)).not.toEqual([]);
  });

  it("rejects invalid risk, exception and decision values", () => {
    const badRisk = examplePack();
    (badRisk.risks[0] as unknown as Record<string, unknown>).status = "WAIVED";
    expect(errorsFor(badRisk)).not.toEqual([]);

    const badException = { ...examplePack(), exceptions: [{ id: "EXC-1", status: "APPROVED", expires_at: "tomorrow" }] };
    expect(errorsFor(badException)).not.toEqual([]);

    const badDecision = { ...examplePack(), decisions: [{ id: "DEC-1", type: "PRODUCTION", status: "SHIP_IT" }] };
    expect(errorsFor(badDecision)).not.toEqual([]);
  });

  it("keeps schema-valid evidence usable by the engine (freshness 'current' is fresh)", () => {
    const result = evaluateGovernance(examplePack(), { signals: ["api_endpoint", "protected_resource"] });
    expect(result.controls.find((c) => c.controlId === "SEC-AUTH-001")?.status).toBe("PASS");
  });
});
