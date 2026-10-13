import { createRequire } from "node:module";
import type { GovernancePack } from "../../engine/src/types.js";
import { validateGovernancePackSemantics } from "../../engine/src/validation.js";
import governanceSchema from "../../model/governance-model.schema.json" with { type: "json" };

export interface GovernanceConfig {
  governancePackPath: string;
  changedFiles?: string[];
}

export interface ConfigFileSystemPort {
  readTextFile(rootPath: string, relativePath: string): Promise<string | undefined>;
}

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
const addFormats = require("ajv-formats") as (ajv: AjvInstance) => void;
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(governanceSchema);

function formatSchemaErrors(errors: readonly SchemaError[]): string {
  return errors
    .map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`)
    .join("; ");
}

export async function loadGovernancePack(
  rootPath: string,
  path: string,
  fs: ConfigFileSystemPort,
): Promise<GovernancePack> {
  const content = await fs.readTextFile(rootPath, path);
  if (content === undefined) {
    throw new Error(`Governance pack not found: ${path}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Governance pack is not valid JSON: ${message}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Governance pack must be a JSON object");
  }

  if (!validateSchema(parsed)) {
    throw new Error(`Governance pack schema validation failed: ${formatSchemaErrors(validateSchema.errors ?? [])}`);
  }

  const pack = parsed as GovernancePack;
  const semanticIssues = validateGovernancePackSemantics(pack);
  if (semanticIssues.length > 0) {
    const details = semanticIssues
      .map((issue) => `${issue.path} [${issue.code}]: ${issue.message}`)
      .join("; ");
    throw new Error(`Governance pack semantic validation failed: ${details}`);
  }

  return pack;
}
