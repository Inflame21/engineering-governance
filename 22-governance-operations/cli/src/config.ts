import { createRequire } from "node:module";
import type { GovernancePack } from "../../engine/src/types.js";
import { validateArchitectureProfile, type ArchitectureProfile } from "../../analyzer/src/architecture.js";
import { validateGovernancePackSemantics } from "../../engine/src/validation.js";
import governanceSchema from "../../model/governance-model.schema.json" with { type: "json" };
import architectureProfileSchema from "../../model/architecture-profile.schema.json" with { type: "json" };
import projectRegistrationSchema from "../../model/project-registration.schema.json" with { type: "json" };
import cleanArchitectureProfile from "../../model/architecture-profile-clean-architecture.json" with { type: "json" };
import hexagonalProfile from "../../model/architecture-profile-hexagonal.json" with { type: "json" };
import microservicesProfile from "../../model/architecture-profile-microservices.json" with { type: "json" };
import modularProfile from "../../model/architecture-profile-modular-example.json" with { type: "json" };

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
const validateArchitectureProfileSchema = ajv.compile(architectureProfileSchema);
const validateProjectRegistrationSchema = ajv.compile(projectRegistrationSchema);

// shortcut: the approved profile ids are listed here, so a new model/architecture-profile-*.json
// needs one import and one entry; upgrade to directory discovery when profiles change often.
const KNOWN_ARCHITECTURE_PROFILE_IDS: ReadonlySet<string> = new Set(
  [cleanArchitectureProfile, hexagonalProfile, microservicesProfile, modularProfile].map((profile) => profile.id),
);

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

/** Load and validate an architecture profile from a repository-relative JSON path. */
export async function loadArchitectureProfile(
  rootPath: string,
  path: string,
  fs: ConfigFileSystemPort,
): Promise<ArchitectureProfile> {
  const content = await fs.readTextFile(rootPath, path);
  if (content === undefined) throw new Error(`Architecture profile not found: ${path}`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Architecture profile is not valid JSON: ${message}`);
  }

  if (!validateArchitectureProfileSchema(parsed)) {
    throw new Error(
      `Architecture profile validation failed: ${formatSchemaErrors(validateArchitectureProfileSchema.errors ?? [])}`,
    );
  }

  const profile = parsed as ArchitectureProfile;
  const semanticValidation = validateArchitectureProfile(profile);
  if (!semanticValidation.valid) {
    throw new Error(`Architecture profile validation failed: ${semanticValidation.errors.join("; ")}`);
  }

  return profile;
}

export interface ProjectContact {
  name: string;
  handle?: string;
}

export interface ProjectRegistration {
  version: string;
  id: string;
  name: string;
  status: "ONBOARDING" | "ACTIVE" | "RETIRED";
  criticality: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  data_classification: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
  repositories: Array<{ name: string; default_branch?: string }>;
  owners: {
    technical_owner: ProjectContact;
    governance_representative: ProjectContact;
    escalation_contact: ProjectContact;
    remediation_owner?: ProjectContact;
  };
  environments: string[];
  profiles: { architecture: string; technology: string[] };
  governance_pack?: string;
  governance_baseline?: string;
}

export interface RegistryFileSystemPort extends ConfigFileSystemPort {
  listFiles(rootPath: string): Promise<string[]>;
}

/**
 * Load and validate project registration records from one `.json` file or every `.json` file
 * under a repository-relative directory. Validating nothing is an error, never a pass.
 */
export async function loadProjectRegistry(
  rootPath: string,
  path: string,
  fs: RegistryFileSystemPort,
): Promise<ProjectRegistration[]> {
  const normalized = path.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
  const files = normalized.endsWith(".json")
    ? [normalized]
    : (await fs.listFiles(rootPath))
        .map((file) => file.replaceAll("\\", "/"))
        .filter((file) => file.startsWith(`${normalized}/`) && file.endsWith(".json"))
        .sort();
  if (files.length === 0) {
    throw new Error(`No project registration records (*.json) found in ${normalized || "."}`);
  }

  const records: Array<{ file: string; record: ProjectRegistration }> = [];
  for (const file of files) {
    const content = await fs.readTextFile(rootPath, file);
    if (content === undefined) throw new Error(`Project registration not found: ${file}`);
    let parsed: unknown;
    try {
      parsed = JSON.parse(content) as unknown;
    } catch (error) {
      throw new Error(`Project registration ${file} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!validateProjectRegistrationSchema(parsed)) {
      throw new Error(`Project registration ${file} schema validation failed: ${formatSchemaErrors(validateProjectRegistrationSchema.errors ?? [])}`);
    }
    records.push({ file, record: parsed as ProjectRegistration });
  }

  const issues: string[] = [];
  const idOwner = new Map<string, string>();
  const repositoryOwner = new Map<string, string>();
  for (const { file, record } of records) {
    const earlierId = idOwner.get(record.id);
    if (earlierId) issues.push(`${file}: project id '${record.id}' is already registered in ${earlierId}`);
    else idOwner.set(record.id, file);

    for (const repository of record.repositories) {
      const key = repository.name.toLowerCase();
      const earlier = repositoryOwner.get(key);
      if (earlier && earlier !== record.id) issues.push(`${file}: repository '${repository.name}' already belongs to project '${earlier}'`);
      else repositoryOwner.set(key, record.id);
    }

    if (!KNOWN_ARCHITECTURE_PROFILE_IDS.has(record.profiles.architecture)) {
      issues.push(`${file}: unknown architecture profile '${record.profiles.architecture}' (known: ${[...KNOWN_ARCHITECTURE_PROFILE_IDS].sort().join(", ")})`);
    }
  }
  if (issues.length > 0) throw new Error(`Project registry validation failed: ${issues.join("; ")}`);

  return records.map(({ record }) => record);
}
