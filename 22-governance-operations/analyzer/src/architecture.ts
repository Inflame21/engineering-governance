import { createRequire } from "node:module";
import architectureProfileSchema from "../../model/architecture-profile.schema.json" with { type: "json" };

export interface ArchitectureBoundaryRule {
  id: string;
  description: string;
  severity: "P0" | "P1" | "P2" | "P3";
  sourcePattern?: string;
  targetPattern?: string;
  allowed?: boolean;
}

export interface ArchitectureProfile {
  id: string;
  version: string;
  name: string;
  description?: string;
  styles: string[];
  boundaryRules: ArchitectureBoundaryRule[];
  requiredControls: string[];
  capabilities?: string[];
  metadata?: Record<string, unknown>;
}

export interface ArchitectureProfileValidation {
  valid: boolean;
  errors: string[];
}

interface SchemaError {
  instancePath?: string;
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
const validateSchema = ajv.compile(architectureProfileSchema);

export function validateArchitectureProfile(
  value: unknown,
): ArchitectureProfileValidation {
  if (!validateSchema(value)) {
    const errors = (validateSchema.errors ?? []).map((error) => {
      const location = error.instancePath || "/";
      return `${location} ${error.message ?? "is invalid"}`;
    });
    return { valid: false, errors };
  }

  const profile = value as ArchitectureProfile;
  const ruleIds = new Set<string>();
  const errors: string[] = [];

  for (const rule of profile.boundaryRules) {
    if (ruleIds.has(rule.id)) {
      errors.push(`/boundaryRules contains duplicate rule id '${rule.id}'.`);
    }
    ruleIds.add(rule.id);
  }

  return { valid: errors.length === 0, errors };
}

export function architectureSignals(profile: ArchitectureProfile): string[] {
  return [
    ...new Set([
      ...profile.styles.map((style) => `architecture:${style}`),
      `architecture-profile:${profile.id}`,
    ]),
  ].sort();
}
