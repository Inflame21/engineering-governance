#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  assertPackMatchesRegistration,
  getRegisteredArchitectureProfile,
  loadArchitectureProfile,
  loadGovernancePack,
  loadProjectRegistry,
  selectProjectRegistration,
  type ProjectRegistration,
} from "./config.js";
import { runRepositoryAnalysisCommand, runGovernanceCommand } from "./commands.js";
import { loadRepositorySnapshot, nodeFileSystem } from "./filesystem.js";
import { nodeVerificationToolRunner } from "./verification-runner.js";
import { loadGitChangeScope } from "./git-scope.js";

export { formatHumanResult, formatJsonResult, formatAnalysisResult } from "./output.js";
export { loadArchitectureProfile, loadGovernancePack, loadProjectRegistry } from "./config.js";
export { loadRepositorySnapshot, nodeFileSystem } from "./filesystem.js";
export { loadGitChangeScope, nodeGitCommandRunner } from "./git-scope.js";
export { runAnalyzeCommand, runGovernanceCommand, runRepositoryAnalysisCommand } from "./commands.js";

const VERSION = "0.1.0";
const DEFAULT_PACK_PATH = ".governance/governance-pack.json";

interface ParsedArguments {
  command: "check" | "validate" | "report" | "analyze" | "help" | "version";
  repositoryPath: string;
  packPath: string;
  profilePath?: string;
  registryPath?: string;
  projectId?: string;
  packExplicit: boolean;
  baseRef?: string;
  runTools: boolean;
  json: boolean;
  format?: "markdown" | "json";
}

function usage(): string {
  return [
    "Engineering Governance CLI",
    "",
    "Usage:",
    "  governance check <repository> [--pack <relative-path>] [--profile <relative-path>] [--registry <relative-path>] [--project <id>] [--base <git-ref>] [--run-tools] [--json]",
    "  governance validate <repository> [--pack <relative-path>] [--profile <relative-path>] [--registry <relative-path>]",
    "  governance report <repository> [--pack <relative-path>] [--profile <relative-path>] [--registry <relative-path>] [--project <id>] [--base <git-ref>] [--run-tools] [--format markdown|json]",
    "  governance analyze <repository> [--profile <relative-path>] [--base <git-ref>] [--run-tools] [--json]",
    "  governance --help",
    "  governance --version",
    "",
    "Commands:",
    "  check     Analyze a repository, validate its governance pack, and derive a decision.",
    "  validate  Validate the governance pack, architecture profile and/or project registry; no analysis.",
    "  report    Same assessment and exit codes as check, rendered as a Markdown (default) or JSON report.",
    "  analyze   Inspect repository languages, frameworks, and analyzer coverage without a pack.",
    "",
    "Options:",
    `  --pack    Governance pack JSON path relative to the repository root (default: ${DEFAULT_PACK_PATH})`,
    "  --registry Project registration file or directory of .json records. validate: alone, skips the pack check.",
    "             check/report: supplies the project's pack path and architecture profile (explicit --pack/--profile win),",
    "             requires the pack to belong to the project, rejects RETIRED projects and reports unassigned owners as conditions.",
    "  --project  Registered project id for check/report with --registry (required when the registry holds several projects).",
    "  --profile Apply and verify an architecture profile JSON file relative to the repository root.",
    "  --base    Verify changed-file scope against a Git base revision (for example, origin/main).",
    "  --run-tools Execute installed local TypeScript/Python checks (never installs dependencies).",
    "  --json    Emit machine-readable JSON.",
    "  --format  Report format for the report command: markdown (default) or json.",
    "  -h, --help",
    "  -v, --version",
    "",
    "Exit codes:",
    "  0  GO / complete analysis",
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
  if (rawCommand !== "check" && rawCommand !== "analyze" && rawCommand !== "validate" && rawCommand !== "report") {
    throw new Error(`Unknown command: ${rawCommand ?? "(empty)"}\n\n${usage()}`);
  }

  let repositoryPath = ".";
  let packPath = DEFAULT_PACK_PATH;
  let profilePath: string | undefined;
  let registryPath: string | undefined;
  let projectId: string | undefined;
  let packExplicit = false;
  let baseRef: string | undefined;
  let runTools = false;
  let json = false;
  let format: "markdown" | "json" | undefined;
  let repositoryProvided = false;

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
    if (argument === "--pack" || argument === "--profile" || argument === "--base" || argument === "--registry" || argument === "--project") {
      const value = rest[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a relative path.`);
      if (argument === "--registry" && rawCommand === "analyze") throw new Error("--registry is only supported by the validate, check and report commands.");
      if (argument === "--project" && rawCommand !== "check" && rawCommand !== "report") throw new Error("--project is only supported by the check and report commands.");
      if (argument === "--pack") {
        packPath = value;
        packExplicit = true;
      } else if (argument === "--profile") profilePath = value;
      else if (argument === "--registry") registryPath = value;
      else if (argument === "--project") projectId = value;
      else baseRef = value;
      index += 1;
      continue;
    }
    if (argument.startsWith("-")) throw new Error(`Unknown option: ${argument}`);
    if (repositoryProvided) throw new Error(`Unexpected argument: ${argument}`);
    repositoryPath = argument;
    repositoryProvided = true;
  }

  if (projectId !== undefined && registryPath === undefined) throw new Error("--project requires --registry.");

  return {
    command: rawCommand,
    repositoryPath: path.resolve(repositoryPath),
    packPath,
    packExplicit,
    ...(registryPath ? { registryPath } : {}),
    ...(projectId ? { projectId } : {}),
    ...(profilePath ? { profilePath } : {}),
    ...(baseRef ? { baseRef } : {}),
    runTools,
    json,
    ...(format ? { format } : {}),
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
    if (args.command === "validate") {
      // Validate what was named: the pack by default, or only the registry when --registry is given alone.
      const validated: string[] = [];
      if (args.packExplicit || !args.registryPath) {
        await loadGovernancePack(args.repositoryPath, args.packPath, nodeFileSystem);
        validated.push(args.packPath);
      }
      if (args.profilePath) {
        await loadArchitectureProfile(args.repositoryPath, args.profilePath, nodeFileSystem);
        validated.push(args.profilePath);
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
    const result = await runGovernanceCommand({
      snapshot,
      governancePack,
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
