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
import { discoverRepositories, formatDiscovery } from "./discover.js";
import { formatSummaryMarkdown, summarizeRepository, writeDatedReport, writeSummary } from "./summary.js";
import { formatInitResult, initializeGovernancePack } from "./init.js";
import { loadGitChangeScope, nodeGitCommandRunner } from "./git-scope.js";
import { approveException, exceptionRows, expireExceptions, formatExceptionRows, gpgSignaturePort, parseExpiry, renewException, requestException, signApproval, verifyApprovals, writePack, type ExceptionRow } from "./exceptions.js";
import { createCheckpoint, formatCheckpointReport, verifyCheckpoints } from "./checkpoints.js";
import { assessmentFacts, diffAssessments, formatDiff, formatHistory, nodeHistoryStore, readHistory, recordAssessment, sha256Hex } from "./history.js";

export { formatHumanResult, formatJsonResult, formatAnalysisResult } from "./output.js";
export { loadArchitectureProfile, loadAuthorityPolicy, loadControlCatalog, loadGovernancePack, loadProjectRegistry } from "./config.js";
export { loadRepositorySnapshot, nodeFileSystem } from "./filesystem.js";
export { loadGitChangeScope, nodeGitCommandRunner } from "./git-scope.js";
export { runAnalyzeCommand, runGovernanceCommand, runRepositoryAnalysisCommand } from "./commands.js";

const VERSION = "0.6.0";
const DEFAULT_PACK_PATH = ".governance/governance-pack.json";

interface ParsedArguments {
  command: "check" | "validate" | "report" | "analyze" | "init" | "discover" | "summarize" | "history" | "diff" | "exception" | "checkpoint" | "help" | "version";
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
  /** summarize and report: save the Markdown under .governance/reports/. */
  write?: boolean;
  /** check and report: append the assessment to .governance/history/. */
  record?: boolean;
  /** check and report: verify each approved exception's GPG signature (needs --authority) so unsigned approvals do not hold. */
  verifySignatures?: boolean;
  /** exception only: which action and its values. */
  exception?: { action: string; id?: string; control?: string; reason?: string; by?: string; role?: string; expires?: string; sign?: string };
  /** diff only: the two assessment numbers to compare. */
  diff?: { from: number; to: number };
  /** checkpoint only: the GPG key that signs. */
  checkpointKey?: string;
  format?: "markdown" | "json";
  /** init only: values for the generated pack's project record. */
  init?: { id?: string; name?: string; repository?: string; environment?: string };
}

function usage(): string {
  return [
    "Engineering Governance CLI",
    "",
    "Usage:",
    "  governance check <repository> [--pack <relative-path>] [--profile <relative-path>] [--registry <relative-path>] [--catalog <relative-path>] [--authority <relative-path>] [--project <id>] [--base <git-ref>] [--run-tools] [--record] [--verify-signatures] [--json]",
    "  governance validate <repository> [--pack <relative-path>] [--profile <relative-path>] [--registry <relative-path>] [--catalog <relative-path>] [--authority <relative-path>]",
    "  governance report <repository> [--write] [--pack <relative-path>] [--profile <relative-path>] [--registry <relative-path>] [--catalog <relative-path>] [--authority <relative-path>] [--project <id>] [--base <git-ref>] [--run-tools] [--record] [--verify-signatures] [--format markdown|json]",
    "  governance analyze <repository> [--profile <relative-path>] [--base <git-ref>] [--run-tools] [--json]",
    "  governance discover <folder> [--json]",
    "  governance summarize <repository> [--json] [--write]",
    "  governance history <repository> [--authority <relative-path>] [--json]",
    "  governance checkpoint <repository> --sign <gpg-key>",
    "  governance diff [<repository>] <a> <b> [--json]",
    "  governance exception request <repository> --id <EXC-id> --control <id> --reason <text> --by <name> [--pack <relative-path>]",
    "  governance exception approve <repository> --id <EXC-id> --by <name> --role <ROLE> --expires <date> [--sign <gpg-key>] [--pack <relative-path>]",
    "  governance exception renew <repository> --id <EXC-id> --by <name> --role <ROLE> --expires <date> [--sign <gpg-key>] [--pack <relative-path>]",
    "  governance exception expire <repository> [--pack <relative-path>]",
    "  governance exception list <repository> [--authority <relative-path>] [--pack <relative-path>] [--json]",
    "  governance init <repository> [--pack <relative-path>] [--id <slug>] [--name <text>] [--repo <owner/name>] [--environment <name>]",
    "  governance --help",
    "  governance --version",
    "",
    "Commands:",
    "  check     Analyze a repository, validate its governance pack, and derive a decision.",
    "  validate  Validate the governance pack, architecture profile and/or project registry; no analysis.",
    "  report    Same assessment and exit codes as check, rendered as a Markdown (default) or JSON report.",
    "  analyze   Inspect repository languages, frameworks, and analyzer coverage without a pack.",
    "  summarize One status report for a repository: decision, controls, findings and which review areas are covered, all computed from files. --write saves it to .governance/reports/.",
    "  history   Verify the hash-chained assessment history in .governance/history/ and list every recorded assessment and each issue's lifecycle (first seen, resolved, reopened). With --authority it also verifies the signed checkpoints, which show deleted newest records or a rewritten chain.",
    "  checkpoint  GPG-sign the newest history record (sequence number and hash) into .governance/history/checkpoints/<n>.asc. Verified by history --authority against the keys the policy registers; never replaces an existing checkpoint.",
    "  diff      Compare two recorded assessments by number: decision, resolved and introduced issues, and evidence that changed status.",
    "  exception Manage the exception lifecycle in the pack: request, approve (with an expiry), renew (a fresh approval with a later expiry), expire (mark lapsed ones EXPIRED) and list (days left, signature status). approve and renew can GPG-sign the approval with --sign.",
    "  discover  Find the git repositories in a folder and report facts about each (scripts, CI commands, docs, git state). Read-only.",
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
    "  --record  check/report: append the assessment (decision, issues, evidence statuses, pack hash, git head) to the append-only history .governance/history/assessments.jsonl. Refuses if the existing chain was altered.",
    "  --verify-signatures  check/report: with --authority, verify each approved exception's GPG signature against the approver's key_fingerprint in the policy. An approval without a verified signature does not waive the control.",
    "  --control, --reason, --by, --role, --expires, --sign  exception only: the control, reason, requester (request) or approver (approve, renew), authority role, expiry (a date or timestamp) and GPG key id.",
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
  if (rawCommand !== "check" && rawCommand !== "analyze" && rawCommand !== "validate" && rawCommand !== "report" && rawCommand !== "init" && rawCommand !== "discover" && rawCommand !== "summarize" && rawCommand !== "history" && rawCommand !== "diff" && rawCommand !== "exception" && rawCommand !== "checkpoint") {
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
  let write = false;
  let record = false;
  let verifySignatures = false;
  const exceptionOptions: { id?: string; control?: string; reason?: string; by?: string; role?: string; expires?: string; sign?: string } = {};
  let format: "markdown" | "json" | undefined;
  let repositoryProvided = false;
  const positionals: string[] = [];
  const initOptions: NonNullable<ParsedArguments["init"]> = {};

  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index]!;
    if (argument === "--json") {
      json = true;
      continue;
    }
    if (argument === "--write") {
      if (rawCommand !== "summarize" && rawCommand !== "report") throw new Error("--write is only supported by the summarize and report commands.");
      write = true;
      continue;
    }
    if (argument === "--record") {
      if (rawCommand !== "check" && rawCommand !== "report") throw new Error("--record is only supported by the check and report commands.");
      record = true;
      continue;
    }
    if (argument === "--verify-signatures") {
      if (rawCommand !== "check" && rawCommand !== "report") throw new Error("--verify-signatures is only supported by the check and report commands.");
      verifySignatures = true;
      continue;
    }
    if (argument === "--control" || argument === "--reason" || argument === "--by" || argument === "--role" || argument === "--expires" || argument === "--sign") {
      const value = rest[index + 1];
      if (rawCommand !== "exception" && !(rawCommand === "checkpoint" && argument === "--sign")) throw new Error(`${argument} is only supported by the exception command.`);
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
      exceptionOptions[argument.slice(2) as "control"] = value;
      index += 1;
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
      if (rawCommand !== "init" && !(rawCommand === "exception" && argument === "--id")) throw new Error(`${argument} is only supported by the init command.`);
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
      if (argument === "--id" && rawCommand === "exception") exceptionOptions.id = value;
      else if (argument === "--id") initOptions.id = value;
      else if (argument === "--name") initOptions.name = value;
      else if (argument === "--repo") initOptions.repository = value;
      else initOptions.environment = value;
      index += 1;
      continue;
    }
    if (argument.startsWith("-")) throw new Error(`Unknown option: ${argument}`);
    if (rawCommand === "diff" || rawCommand === "exception") {
      positionals.push(argument);
      continue;
    }
    if (repositoryProvided) throw new Error(`Unexpected argument: ${argument}`);
    repositoryPath = argument;
    repositoryProvided = true;
  }

  let exception: NonNullable<ParsedArguments["exception"]> | undefined;
  if (rawCommand === "exception") {
    const [action, maybeRepository, ...extra] = positionals;
    if (!action || !["request", "approve", "renew", "expire", "list"].includes(action) || extra.length > 0) throw new Error("exception needs an action: request, approve, renew, expire or list, then an optional repository.");
    if (maybeRepository) repositoryPath = maybeRepository;
    const require = (name: keyof typeof exceptionOptions, flag: string): void => { if (!exceptionOptions[name]) throw new Error(`exception ${action} requires ${flag}.`); };
    if (action === "request") { require("id", "--id"); require("control", "--control"); require("reason", "--reason"); require("by", "--by"); }
    if (action === "approve" || action === "renew") { require("id", "--id"); require("by", "--by"); require("expires", "--expires"); }
    if (action !== "approve" && action !== "renew" && exceptionOptions.sign) throw new Error("--sign is only supported by exception approve and renew.");
    exception = { action, ...exceptionOptions };
  }
  let diff: { from: number; to: number } | undefined;
  if (rawCommand === "diff") {
    if (positionals.length !== 2 && positionals.length !== 3) throw new Error("diff needs two assessment numbers: governance diff [<repository>] <a> <b>.");
    if (positionals.length === 3) repositoryPath = positionals.shift()!;
    const [from, to] = positionals.map(Number) as [number, number];
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < 1) throw new Error("diff takes two assessment numbers (positive integers), as shown by `governance history`.");
    diff = { from, to };
  }
  if (verifySignatures && !authorityPath) throw new Error("--verify-signatures requires --authority (the policy holds each approver's key).");
  if (projectId !== undefined && registryPath === undefined) throw new Error("--project requires --registry.");
  if (write && format === "json") throw new Error("--write saves Markdown; it cannot be combined with --format json.");
  if (rawCommand === "checkpoint" && !exceptionOptions.sign) throw new Error("checkpoint requires --sign <gpg-key>.");
  if (rawCommand === "init" || rawCommand === "discover" || rawCommand === "summarize" || rawCommand === "history" || rawCommand === "diff" || rawCommand === "checkpoint") {
    const unsupported = [
      profilePath && "--profile", baseRef && "--base", registryPath && "--registry", catalogPath && "--catalog",
      rawCommand !== "history" && authorityPath && "--authority", projectId && "--project", runTools && "--run-tools", rawCommand === "init" && json && "--json", format && "--format",
    ].filter(Boolean);
    if (rawCommand !== "init" && packExplicit) unsupported.unshift("--pack");
    if (unsupported.length > 0) throw new Error(`${unsupported.join(", ")} not supported by the ${rawCommand} command.`);
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
    ...(write ? { write: true } : {}),
    ...(record ? { record: true } : {}),
    ...(verifySignatures ? { verifySignatures: true } : {}),
    ...(exception ? { exception } : {}),
    ...(diff ? { diff } : {}),
    ...(rawCommand === "checkpoint" ? { checkpointKey: exceptionOptions.sign! } : {}),
    ...(rawCommand === "init" ? { init: initOptions } : {}),
  };
}

async function runExceptionCommand(args: ParsedArguments): Promise<number> {
  const options = args.exception!;
  const now = new Date();
  const pack = await loadGovernancePack(args.repositoryPath, args.packPath, nodeFileSystem);
  const save = async (next: typeof pack): Promise<void> => {
    // Re-validate the edited pack exactly as check would load it, before anything is written.
    await loadGovernancePack(args.repositoryPath, args.packPath, { readTextFile: async () => JSON.stringify(next) });
    await writePack(args.repositoryPath, args.packPath, next);
  };

  if (options.action === "list") {
    const rows: ExceptionRow[] = exceptionRows(pack, now);
    if (args.authorityPath) {
      const policy = await loadAuthorityPolicy(args.repositoryPath, args.authorityPath, nodeFileSystem);
      const checks = await verifyApprovals(pack, policy, gpgSignaturePort, (file) => nodeFileSystem.readTextFile(args.repositoryPath, file));
      for (const row of rows) {
        const check = checks.find((item) => item.id === row.id);
        if (check) row.signature = check.verified ? "verified" : `NOT verified: ${check.detail}`;
      }
    }
    process.stdout.write(`${args.json ? JSON.stringify(rows, null, 2) : formatExceptionRows(rows)}\n`);
    return 0;
  }

  if (options.action === "expire") {
    const { pack: next, expired } = expireExceptions(pack, now);
    if (expired.length > 0) await save(next);
    process.stdout.write(expired.length > 0 ? `Marked EXPIRED: ${expired.join(", ")}\n` : "No approved exception has lapsed.\n");
    return 0;
  }

  let next: typeof pack;
  if (options.action === "request") {
    next = requestException(pack, { id: options.id!, control: options.control!, reason: options.reason!, requestedBy: options.by! }, now);
  } else {
    const input = { by: options.by!, ...(options.role ? { role: options.role } : {}), expires: options.expires! };
    parseExpiry(options.expires, now); // fail on a bad or past expiry before asking GPG for a passphrase
    next = (options.action === "approve" ? approveException : renewException)(pack, options.id!, input, now);
    if (options.sign) {
      const approved = (next.exceptions ?? []).find((item) => item.id === options.id)!;
      const signaturePath = await signApproval(args.repositoryPath, approved, options.sign, gpgSignaturePort);
      next = { ...next, exceptions: (next.exceptions ?? []).map((item) => (item.id === approved.id ? { ...item, approval_signature: signaturePath } : item)) };
    }
  }
  await save(next);
  const saved = (next.exceptions ?? []).find((item) => item.id === options.id)!;
  process.stdout.write(`${options.action === "request" ? "Requested" : options.action === "approve" ? "Approved" : "Renewed"} ${saved.id}${saved.expires_at ? ` until ${saved.expires_at}` : ""}${saved.approval_signature ? `; signed (${saved.approval_signature})` : options.action === "request" ? "" : "; not signed"}\n`);
  return 0;
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
    if (args.command === "summarize") {
      const summary = await summarizeRepository(args.repositoryPath);
      if (args.write) {
        const written = await writeSummary(args.repositoryPath, summary);
        process.stdout.write(`Wrote ${written}
`);
      } else {
        process.stdout.write(`${args.json ? JSON.stringify(summary, null, 2) : formatSummaryMarkdown(summary)}
`);
      }
      return 0;
    }

    if (args.command === "exception") {
      return await runExceptionCommand(args);
    }

    if (args.command === "history") {
      const records = await readHistory(nodeHistoryStore, args.repositoryPath);
      const policy = args.authorityPath ? await loadAuthorityPolicy(args.repositoryPath, args.authorityPath, nodeFileSystem) : undefined;
      const checkpoints = policy ? await verifyCheckpoints(args.repositoryPath, records, policy, gpgSignaturePort) : undefined;
      process.stdout.write(args.json
        ? `${JSON.stringify(checkpoints ? { records, checkpoints } : records, null, 2)}\n`
        : `${formatHistory(records)}${checkpoints ? formatCheckpointReport(checkpoints, records.length) : ""}\n`);
      if (checkpoints && checkpoints.problems.length > 0) {
        process.stderr.write(`Governance CLI error: the history failed its integrity check (${checkpoints.problems.length} problem${checkpoints.problems.length === 1 ? "" : "s"}).\n`);
        return 3;
      }
      return 0;
    }

    if (args.command === "checkpoint") {
      const records = await readHistory(nodeHistoryStore, args.repositoryPath);
      const made = await createCheckpoint(args.repositoryPath, records, args.checkpointKey!, gpgSignaturePort);
      process.stdout.write(`Signed assessment ${made.seq} in ${made.file}\n`);
      return 0;
    }

    if (args.command === "diff") {
      const records = await readHistory(nodeHistoryStore, args.repositoryPath);
      const result = diffAssessments(records, args.diff!.from, args.diff!.to);
      process.stdout.write(`${args.json ? JSON.stringify(result, null, 2) : formatDiff(result)}
`);
      return 0;
    }

    if (args.command === "discover") {
      const result = await discoverRepositories(args.repositoryPath);
      process.stdout.write(`${args.json ? JSON.stringify(result, null, 2) : formatDiscovery(result)}\n`);
      return 0;
    }

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
    // A policy can require signed approvals itself, so verification cannot be left out by omitting a flag.
    const verifiedApprovals = (args.verifySignatures || authorityPolicy?.require_signed_approvals === true) && authorityPolicy
      ? (await verifyApprovals(governancePack, authorityPolicy, gpgSignaturePort, (file) => nodeFileSystem.readTextFile(args.repositoryPath, file)))
          .filter((check) => check.verified).map((check) => check.id)
      : undefined;
    const result = await runGovernanceCommand({
      snapshot,
      governancePack,
      ...(verifiedApprovals ? { verifiedApprovals } : {}),
      ...(controlCatalog ? { controlCatalog } : {}),
      ...(authorityPolicy ? { authorityPolicy } : {}),
      ...(registration ? { registration } : {}),
      ...(args.json || (args.command === "report" && args.format === "json") ? { json: true } : {}),
      ...(args.command === "report" && args.format !== "json" ? { markdown: true } : {}),
      ...(architectureProfile ? { architectureProfile } : {}),
      ...(args.runTools ? { verificationRunner: nodeVerificationToolRunner } : {}),
    });
    process.stdout.write(`${result.output}\n`);
    if (args.record) {
      const packText = (await nodeFileSystem.readTextFile(args.repositoryPath, packPath)) ?? "";
      const head = await nodeGitCommandRunner.run(["rev-parse", "HEAD"], args.repositoryPath, 10_000).catch(() => undefined);
      const facts = assessmentFacts(governancePack, packText, result.evaluation, result.analysis.findings, head?.exitCode === 0 ? head.stdout.trim() : undefined, result.analysis.snapshotFingerprint?.digest);
      const saved = await recordAssessment(nodeHistoryStore, args.repositoryPath, facts);
      process.stderr.write(`Recorded assessment #${saved.seq} in .governance/history/assessments.jsonl
`);
    }
    if (args.write) {
      const written = await writeDatedReport(args.repositoryPath, "report", new Date().toISOString().slice(0, 10), `${result.output}\n`);
      process.stdout.write(`Wrote ${written}\n`);
    }

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
