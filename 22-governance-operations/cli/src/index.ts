#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  assertPackMatchesRegistration,
  getRegisteredArchitectureProfile,
  loadArchitectureProfile,
  loadAuthorityPolicy,
  loadControlCatalog,
  loadGovernancePack,
  loadProjectRegistry,
  selectProjectRegistration,
  type ProjectRegistration,
} from "./config.js";
import { runRepositoryAnalysisCommand, runGovernanceCommand } from "./commands.js";
import { loadRepositorySnapshot, nodeFileSystem } from "./filesystem.js";
import { nodeVerificationToolRunner } from "./verification-runner.js";
import { formatInitResult, initializeGovernancePack } from "./init.js";
import { loadGitChangeScope } from "./git-scope.js";

export { formatHumanResult, formatJsonResult, formatAnalysisResult } from "./output.js";
export { loadArchitectureProfile, loadAuthorityPolicy, loadControlCatalog, loadGovernancePack, loadProjectRegistry } from "./config.js";
export { loadRepositorySnapshot, nodeFileSystem } from "./filesystem.js";
export { loadGitChangeScope, nodeGitCommandRunner } from "./git-scope.js";
export { runAnalyzeCommand, runGovernanceCommand, runRepositoryAnalysisCommand } from "./commands.js";

const VERSION = "0.2.0";
const DEFAULT_PACK_PATH = ".governance/governance-pack.json";

interface ParsedArguments {
  command: "check" | "validate" | "report" | "analyze" | "init" | "help" | "version";
  repositoryPath: string;
  packPath: string;
  profilePath?: string;
  registryPath?: string;
  catalogPath?: string;
  authorityPath?: string;
  projectId?: string;
  packExplicit: boolean;
  baseRef?: string;
  runTools: boolean;
  json: boolean;
  format?: "markdown" | "json";
  /** init only: values for the generated pack's project record. */
  init?: { id?: string; name?: string; repository?: string; environment?: string };
}

function usage(): string {
  return [
    "Engineering Governance CLI",
    "",
    "Usage:",
    "  governance check <repository> [--pack <relative-path>] [--profile <relative-path>] [--registry <relative-path>] [--catalog <relative-path>] [--authority <relative-path>] [--project <id>] [--base <git-ref>] [--run-tools] [--json]",
    "  governance validate <repository> [--pack <relative-path>] [--profile <relative-path>] [--registry <relative-path>] [--catalog <relative-path>] [--authority <relative-path>]",
    "  governance report <repository> [--pack <relative-path>] [--profile <relative-path>] [--registry <relative-path>] [--catalog <relative-path>] [--authority <relative-path>] [--project <id>] [--base <git-ref>] [--run-tools] [--format markdown|json]",
    "  governance analyze <repository> [--profile <relative-path>] [--base <git-ref>] [--run-tools] [--json]",
    "  governance init <repository> [--pack <relative-path>] [--id <slug>] [--name <text>] [--repo <owner/name>] [--environment <name>]",
    "  governance --help",
    "  governance --version",
    "",
    "Commands:",
    "  check     Analyze a repository, validate its governance pack, and derive a decision.",
    "  validate  Validate the governance pack, architecture profile and/or project registry; no analysis.",
    "  report    Same assessment and exit codes as check, rendered as a Markdown (default) or JSON report.",
    "  analyze   Inspect repository languages, frameworks, and analyzer coverage without a pack.",
    "  init      Create a governance pack that asserts nothing, never overwriting an existing file. check returns NO-GO until controls are added.",
    "",
    "Options:",
    `  --pack    Governance pack JSON path relative to the repository root (default: ${DEFAULT_PACK_PATH})`,
    "  --registry Project registration file or directory of .json records. validate: alone, skips the pack check.",
    "             check/report: supplies the project's pack path and architecture profile (explicit --pack/--profile win),",
    "             requires the pack to belong to the project, rejects RETIRED projects and reports unassigned owners as conditions.",
    "  --catalog  Control catalog JSON file. validate: checks it (alone, skips the pack check). check/report: the pack must",
    "             define every mandatory catalog control and may not weaken it; APPROVED controls block, DRAFT controls are conditions.",
    "  --authority Approver-authority policy JSON file. validate: checks it (alone, skips the pack check). check/report: only APPROVED",
    "             roles with a named holder confer authority; they let a P1 exception waiver or P1 risk acceptance hold. Without any,",
    "             P1 waivers and acceptances never hold.",
    "  --project  Registered project id for check/report with --registry (required when the registry holds several projects).",
    "  --profile Apply and verify an architecture profile JSON file relative to the repository root.",
    "  --base    Verify changed-file scope against a Git base revision (for example, origin/main).",
    "  --run-tools Execute installed local checks: the TypeScript compiler, Python syntax, and the osv-scanner, gitleaks and semgrep scanners (never installs anything).",
    "  --id, --name, --repo, --environment  init only: the generated pack's project id (lowercase slug), name, repository and environment.",
    "  --json    Emit machine-readable JSON.",
    "  --format  Report format for the report command: markdown (default) or json.",
    "  -h, --help",
    "  -v, --version",
    "",
    "Exit codes:",
    "  0  GO / complete analysis / pack created by init",
    "  1  GO WITH CONDITIONS / incomplete analysis",
    "  2  NO-GO",
    "  3  Invalid arguments or execution error",
  ].join("\n");
}

export function parseCliArguments(argv: string[]): ParsedArguments {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    return { command: "help", repositoryPath: ".", packPath: DEFAULT_PACK_PATH, packExplicit: false, runTools: false, json: false };
  }
  if (argv.includes("--version") || argv.includes("-v")) {
    return { command: "version", repositoryPath: ".", packPath: DEFAULT_PACK_PATH, packExplicit: false, runTools: false, json: false };
  }

  const [rawCommand, ...rest] = argv;
  if (rawCommand !== "check" && rawCommand !== "analyze" && rawCommand !== "validate" && rawCommand !== "report" && rawCommand !== "init") {
    throw new Error(`Unknown command: ${rawCommand ?? "(empty)"}\n\n${usage()}`);
  }

  let repositoryPath = ".";
  let packPath = DEFAULT_PACK_PATH;
  let profilePath: string | undefined;
  let registryPath: string | undefined;
  let catalogPath: string | undefined;
  let authorityPath: string | undefined;
  let projectId: string | undefined;
  let packExplicit = false;
  let baseRef: string | undefined;
  let runTools = false;
  let json = false;
  let format: "markdown" | "json" | undefined;
  let repositoryProvided = false;
  const initOptions: NonNullable<ParsedArguments["init"]> = {};

  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index]!;
    if (argument === "--json") {
      json = true;
      continue;
    }
    if (argument === "--run-tools") {
      runTools = true;
      continue;
    }
    if (argument === "--format") {
      const value = rest[index + 1];
      if (rawCommand !== "report") throw new Error("--format is only supported by the report command.");
      if (value !== "markdown" && value !== "json") throw new Error("--format must be markdown or json.");
      format = value;
      index += 1;
      continue;
    }
    if (argument === "--pack" || argument === "--profile" || argument === "--base" || argument === "--registry" || argument === "--catalog" || argument === "--authority" || argument === "--project") {
      const value = rest[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a relative path.`);
      if (argument === "--catalog" && rawCommand === "analyze") throw new Error("--catalog is only supported by the validate, check and report commands.");
      if (argument === "--authority" && rawCommand === "analyze") throw new Error("--authority is only supported by the validate, check and report commands.");
      if (argument === "--registry" && rawCommand === "analyze") throw new Error("--registry is only supported by the validate, check and report commands.");
      if (argument === "--project" && rawCommand !== "check" && rawCommand !== "report") throw new Error("--project is only supported by the check and report commands.");
      if (argument === "--pack") {
        packPath = value;
        packExplicit = true;
      } else if (argument === "--profile") profilePath = value;
      else if (argument === "--registry") registryPath = value;
      else if (argument === "--catalog") catalogPath = value;
      else if (argument === "--authority") authorityPath = value;
      else if (argument === "--project") projectId = value;
      else baseRef = value;
      index += 1;
      continue;
    }
    if (argument === "--id" || argument === "--name" || argument === "--repo" || argument === "--environment") {
      const value = rest[index + 1];
      if (rawCommand !== "init") throw new Error(`${argument} is only supported by the init command.`);
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
      if (argument === "--id") initOptions.id = value;
      else if (argument === "--name") initOptions.name = value;
      else if (argument === "--repo") initOptions.repository = value;
      else initOptions.environment = value;
      index += 1;
      continue;
    }
    if (argument.startsWith("-")) throw new Error(`Unknown option: ${argument}`);
    if (repositoryProvided) throw new Error(`Unexpected argument: ${argument}`);
    repositoryPath = argument;
    repositoryProvided = true;
  }

  if (projectId !== undefined && registryPath === undefined) throw new Error("--project requires --registry.");
  if (rawCommand === "init") {
    const unsupported = [
      profilePath && "--profile", baseRef && "--base", registryPath && "--registry", catalogPath && "--catalog",
      authorityPath && "--authority", projectId && "--project", runTools && "--run-tools", json && "--json", format && "--format",
    ].filter(Boolean);
    if (unsupported.length > 0) throw new Error(`${unsupported.join(", ")} not supported by the init command.`);
  }

  return {
    command: rawCommand,
    repositoryPath: path.resolve(repositoryPath),
    packPath,
    packExplicit,
    ...(registryPath ? { registryPath } : {}),
    ...(catalogPath ? { catalogPath } : {}),
    ...(authorityPath ? { authorityPath } : {}),
    ...(projectId ? { projectId } : {}),
    ...(profilePath ? { profilePath } : {}),
    ...(baseRef ? { baseRef } : {}),
    runTools,
    json,
    ...(format ? { format } : {}),
    ...(rawCommand === "init" ? { init: initOptions } : {}),
  };
}

export async function runCli(argv: string[]): Promise<number> {
  let args: ParsedArguments;
  try {
    args = parseCliArguments(argv);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 3;
  }

  if (args.command === "help") {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }
  if (args.command === "version") {
    process.stdout.write(`engineering-governance ${VERSION}\n`);
    return 0;
  }

  try {
    if (args.command === "init") {
      const result = await initializeGovernancePack({
        repositoryPath: args.repositoryPath,
        packPath: args.packPath,
        ...args.init,
      });
      process.stdout.write(`${formatInitResult(result)}
`);
      return 0;
    }

    if (args.command === "validate") {
      // Validate what was named: the pack by default, or only the registry when --registry is given alone.
      const validated: string[] = [];
      if (args.packExplicit || (!args.registryPath && !args.catalogPath && !args.authorityPath)) {
        await loadGovernancePack(args.repositoryPath, args.packPath, nodeFileSystem);
        validated.push(args.packPath);
      }
      if (args.profilePath) {
        await loadArchitectureProfile(args.repositoryPath, args.profilePath, nodeFileSystem);
        validated.push(args.profilePath);
      }
      if (args.authorityPath) {
        const authority = await loadAuthorityPolicy(args.repositoryPath, args.authorityPath, nodeFileSystem);
        const approved = authority.roles.filter((role) => role.status === "APPROVED").length;
        validated.push(`authority policy ${authority.policy_id} ${authority.policy_version} (${authority.roles.length} roles, ${approved} approved)`);
      }
      if (args.catalogPath) {
        const catalog = await loadControlCatalog(args.repositoryPath, args.catalogPath, nodeFileSystem);
        validated.push(`catalog ${catalog.catalog_id} ${catalog.catalog_version} (${catalog.controls.length} controls)`);
      }
      if (args.registryPath) {
        const records = await loadProjectRegistry(args.repositoryPath, args.registryPath, nodeFileSystem);
        validated.push(`${records.length} project registration${records.length === 1 ? "" : "s"} in ${args.registryPath}`);
      }
      process.stdout.write(`Valid: ${validated.join(" and ")}
`);
      return 0;
    }

    const changeScope = args.baseRef
      ? await loadGitChangeScope(args.repositoryPath, args.baseRef)
      : undefined;
    const snapshot = await loadRepositorySnapshot(
      args.repositoryPath,
      nodeFileSystem,
      changeScope?.files ?? [],
      changeScope,
    );

    if (args.command === "analyze") {
      const architectureProfile = args.profilePath
        ? await loadArchitectureProfile(args.repositoryPath, args.profilePath, nodeFileSystem)
        : undefined;
      const result = await runRepositoryAnalysisCommand(
        snapshot,
        args.json,
        architectureProfile,
        args.runTools ? nodeVerificationToolRunner : undefined,
      );
      process.stdout.write(`${result.output}\n`);
      return result.context.analysisStatus === "COMPLETE" ? 0 : 1;
    }

    // With a registry, the registered project decides which pack and profile apply (unless a flag
    // names them explicitly), and the pack must actually belong to that project.
    let registration: ProjectRegistration | undefined;
    if (args.registryPath) {
      const records = await loadProjectRegistry(args.repositoryPath, args.registryPath, nodeFileSystem);
      registration = selectProjectRegistration(records, args.projectId);
    }
    const packPath = args.packExplicit ? args.packPath : registration?.governance_pack ?? args.packPath;
    const governancePack = await loadGovernancePack(args.repositoryPath, packPath, nodeFileSystem);
    if (registration) assertPackMatchesRegistration(governancePack, registration);
    const architectureProfile = args.profilePath
      ? await loadArchitectureProfile(args.repositoryPath, args.profilePath, nodeFileSystem)
      : registration
        ? getRegisteredArchitectureProfile(registration.profiles.architecture)
        : undefined;
    const authorityPolicy = args.authorityPath
      ? await loadAuthorityPolicy(args.repositoryPath, args.authorityPath, nodeFileSystem)
      : undefined;
    const controlCatalog = args.catalogPath
      ? await loadControlCatalog(args.repositoryPath, args.catalogPath, nodeFileSystem)
      : undefined;
    const result = await runGovernanceCommand({
      snapshot,
      governancePack,
      ...(controlCatalog ? { controlCatalog } : {}),
      ...(authorityPolicy ? { authorityPolicy } : {}),
      ...(registration ? { registration } : {}),
      ...(args.json || (args.command === "report" && args.format === "json") ? { json: true } : {}),
      ...(args.command === "report" && args.format !== "json" ? { markdown: true } : {}),
      ...(architectureProfile ? { architectureProfile } : {}),
      ...(args.runTools ? { verificationRunner: nodeVerificationToolRunner } : {}),
    });
    process.stdout.write(`${result.output}\n`);

    if (result.evaluation.decision.status === "NO-GO") return 2;
    if (result.evaluation.decision.status === "GO_WITH_CONDITIONS") return 1;
    return 0;
  } catch (error) {
    process.stderr.write(`Governance CLI error: ${error instanceof Error ? error.message : String(error)}\n`);
    return 3;
  }
}

const entrypoint = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : undefined;
if (entrypoint === import.meta.url) {
  process.exitCode = await runCli(process.argv.slice(2));
}
