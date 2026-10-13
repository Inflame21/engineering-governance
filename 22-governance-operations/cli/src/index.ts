#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import { analyzeRepository } from "../../analyzer/src/pipeline.js";
import { toGovernanceContext } from "../../analyzer/src/normalize.js";
import { evaluateGovernance } from "../../engine/src/decision.js";
import { loadGovernancePack } from "./config.js";
import { runRepositoryAnalysisCommand, runGovernanceCommand } from "./commands.js";
import { loadRepositorySnapshot, nodeFileSystem } from "./filesystem.js";
import { formatAnalysisResult } from "./output.js";

export { formatHumanResult, formatJsonResult, formatAnalysisResult } from "./output.js";
export { loadGovernancePack } from "./config.js";
export { loadRepositorySnapshot, nodeFileSystem } from "./filesystem.js";
export { runAnalyzeCommand, runGovernanceCommand, runRepositoryAnalysisCommand } from "./commands.js";

const VERSION = "0.1.0";
const DEFAULT_PACK_PATH = ".governance/governance-pack.json";

interface ParsedArguments {
  command: "check" | "analyze" | "help" | "version";
  repositoryPath: string;
  packPath: string;
  json: boolean;
}

function usage(): string {
  return [
    "Engineering Governance CLI",
    "",
    "Usage:",
    "  governance check <repository> [--pack <relative-path>] [--json]",
    "  governance analyze <repository> [--json]",
    "  governance --help",
    "  governance --version",
    "",
    "Commands:",
    "  check     Analyze a repository, validate its governance pack, and derive a decision.",
    "  analyze   Inspect repository languages, frameworks, and analyzer coverage without a pack.",
    "",
    "Options:",
    `  --pack    Governance pack JSON path relative to the repository root (default: ${DEFAULT_PACK_PATH})`,
    "  --json    Emit machine-readable JSON.",
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

function parseArguments(argv: string[]): ParsedArguments {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    return { command: "help", repositoryPath: ".", packPath: DEFAULT_PACK_PATH, json: false };
  }
  if (argv.includes("--version") || argv.includes("-v")) {
    return { command: "version", repositoryPath: ".", packPath: DEFAULT_PACK_PATH, json: false };
  }

  const [rawCommand, ...rest] = argv;
  if (rawCommand !== "check" && rawCommand !== "analyze") {
    throw new Error(`Unknown command: ${rawCommand ?? "(empty)"}\n\n${usage()}`);
  }

  let repositoryPath = ".";
  let packPath = DEFAULT_PACK_PATH;
  let json = false;
  let repositoryProvided = false;

  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index]!;
    if (argument === "--json") {
      json = true;
      continue;
    }
    if (argument === "--pack") {
      const value = rest[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--pack requires a relative path.");
      packPath = value;
      index += 1;
      continue;
    }
    if (argument.startsWith("-")) throw new Error(`Unknown option: ${argument}`);
    if (repositoryProvided) throw new Error(`Unexpected argument: ${argument}`);
    repositoryPath = argument;
    repositoryProvided = true;
  }

  return {
    command: rawCommand,
    repositoryPath: path.resolve(repositoryPath),
    packPath,
    json,
  };
}

export async function runCli(argv: string[]): Promise<number> {
  let args: ParsedArguments;
  try {
    args = parseArguments(argv);
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
    const snapshot = await loadRepositorySnapshot(args.repositoryPath, nodeFileSystem);

    if (args.command === "analyze") {
      const result = await runRepositoryAnalysisCommand(snapshot, args.json);
      process.stdout.write(`${result.output}\n`);
      return result.context.analysisStatus === "COMPLETE" ? 0 : 1;
    }

    const governancePack = await loadGovernancePack(args.repositoryPath, args.packPath, nodeFileSystem);
    const result = await runGovernanceCommand({
      snapshot,
      governancePack,
      ...(args.json ? { json: true } : {}),
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
