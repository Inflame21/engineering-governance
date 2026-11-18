import type { GovernanceFinding, Severity, ToolResultStatus } from "../../engine/src/types.js";
import type { RepositorySnapshot } from "./types.js";
import type { RepositorySnapshotFingerprint } from "./fingerprint.js";
import type { VerificationProcessResult, VerificationToolRunner } from "./verification.js";
import {
  basename,
  compactOutput,
  concludeScanner,
  directoryname,
  stableId,
  type ScannerAdapterOutput,
  type ScannerIdentity,
  type ScannerOutcome,
} from "./verification-shared.js";

/**
 * Dependency vulnerability scanning with OSV-Scanner (ADR-0001).
 *
 * The parser relies only on fields the OSV-Scanner output documentation shows (results[].source.path,
 * packages[].package, vulnerabilities[].id, groups[].ids) and on the exit-code contract (0 clean, 1
 * vulnerabilities, 127 general error, 128 no packages). It was written without running the tool, so
 * it is untested against real output. Anything it cannot parse is an ERROR, never a PASS.
 */

const IDENTITY: ScannerIdentity = {
  tool: "osv-scanner",
  adapterId: "osv-dependency-scan",
  adapterVersion: "0.1.0",
  capability: "verification:osv-dependency-scan",
  evidenceId: "EVD-OSV-DEPENDENCIES",
  evidenceSource: "osv-scanner-adapter",
};
const EVIDENCE_ID = IDENTITY.evidenceId;
const MAX_LOCKFILES = 50;
const TOOL_TIMEOUT_MS = 120_000;

const NODE_LOCKFILES = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"];
const PYTHON_LOCKFILES = ["poetry.lock", "Pipfile.lock", "requirements.txt"];
const NODE_MANIFESTS = ["package.json"];
const PYTHON_MANIFESTS = ["pyproject.toml", "Pipfile"];

const severityRank: Record<Severity, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

/**
 * GitHub-reviewed advisories publish a severity label in `database_specific.severity`. That field is
 * advisory-database specific and is not part of OSV-Scanner's documented output contract, so a label
 * is used when present and its absence is handled fail-closed (see groupSeverity).
 */
const SEVERITY_LABELS: Record<string, Severity> = {
  CRITICAL: "P1",
  HIGH: "P1",
  MODERATE: "P2",
  MEDIUM: "P2",
  LOW: "P3",
};

interface OsvVulnerability {
  id: string;
  summary?: string;
  label?: string;
}

interface OsvPackage {
  source: string;
  name: string;
  version: string;
  ecosystem: string;
  vulnerabilities: OsvVulnerability[];
  groups: string[][];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function withinDirectory(directory: string, ancestor: string): boolean {
  return ancestor === "." || directory === ancestor || directory.startsWith(`${ancestor}/`);
}

function discoverLockfiles(files: string[]): { lockfiles: string[]; uncovered: string[] } {
  const candidates = files.filter((file) => !file.split("/").includes("node_modules"));
  const lockfiles = candidates
    .filter((file) => NODE_LOCKFILES.includes(basename(file)) || PYTHON_LOCKFILES.includes(basename(file)))
    .sort();
  const nodeLockDirs = lockfiles.filter((file) => NODE_LOCKFILES.includes(basename(file))).map(directoryname);
  const pythonLockDirs = lockfiles.filter((file) => PYTHON_LOCKFILES.includes(basename(file))).map(directoryname);

  // A lockfile in the same or an ancestor directory covers a manifest (workspaces and monorepos).
  const uncovered = candidates
    .filter((file) => {
      const directory = directoryname(file);
      if (NODE_MANIFESTS.includes(basename(file))) return !nodeLockDirs.some((lock) => withinDirectory(directory, lock));
      if (PYTHON_MANIFESTS.includes(basename(file))) return !pythonLockDirs.some((lock) => withinDirectory(directory, lock));
      return false;
    })
    .sort();
  return { lockfiles, uncovered };
}

function parseOsvOutput(stdout: string): OsvPackage[] {
  const parsed: unknown = JSON.parse(stdout);
  if (!isRecord(parsed) || !Array.isArray(parsed.results)) {
    throw new Error("OSV-Scanner output has no results array.");
  }
  const packages: OsvPackage[] = [];
  for (const result of parsed.results as unknown[]) {
    if (!isRecord(result)) throw new Error("OSV-Scanner result entry is not an object.");
    const source = isRecord(result.source) && typeof result.source.path === "string" ? result.source.path : "unknown";
    if (result.packages !== undefined && !Array.isArray(result.packages)) {
      throw new Error("OSV-Scanner result packages is not an array.");
    }
    for (const entry of (result.packages ?? []) as unknown[]) {
      if (!isRecord(entry) || !isRecord(entry.package)) throw new Error("OSV-Scanner package entry is malformed.");
      const { name, version, ecosystem } = entry.package;
      if (typeof name !== "string" || typeof version !== "string" || typeof ecosystem !== "string") {
        throw new Error("OSV-Scanner package is missing name, version or ecosystem.");
      }
      if (entry.vulnerabilities !== undefined && !Array.isArray(entry.vulnerabilities)) {
        throw new Error("OSV-Scanner package vulnerabilities is not an array.");
      }
      const vulnerabilities = ((entry.vulnerabilities ?? []) as unknown[]).map((vulnerability): OsvVulnerability => {
        if (!isRecord(vulnerability) || typeof vulnerability.id !== "string") {
          throw new Error("OSV-Scanner vulnerability has no id.");
        }
        const label = isRecord(vulnerability.database_specific) && typeof vulnerability.database_specific.severity === "string"
          ? vulnerability.database_specific.severity
          : undefined;
        return {
          id: vulnerability.id,
          ...(typeof vulnerability.summary === "string" ? { summary: vulnerability.summary } : {}),
          ...(label !== undefined ? { label } : {}),
        };
      });
      if (entry.groups !== undefined && !Array.isArray(entry.groups)) {
        throw new Error("OSV-Scanner package groups is not an array.");
      }
      const groups = ((entry.groups ?? []) as unknown[]).map((group): string[] => {
        if (!isRecord(group) || !Array.isArray(group.ids) || group.ids.some((id) => typeof id !== "string")) {
          throw new Error("OSV-Scanner group has no ids.");
        }
        return group.ids as string[];
      });
      packages.push({ source, name, version, ecosystem, vulnerabilities, groups });
    }
  }
  return packages;
}

/** Vulnerabilities that share an alias are one advisory; the package's `groups` say which. */
function advisoryGroups(pkg: OsvPackage): OsvVulnerability[][] {
  const byId = new Map(pkg.vulnerabilities.map((vulnerability) => [vulnerability.id, vulnerability]));
  const used = new Set<string>();
  const groups: OsvVulnerability[][] = [];
  for (const ids of pkg.groups) {
    const members = ids.filter((id) => byId.has(id) && !used.has(id));
    if (members.length === 0) continue;
    for (const id of members) used.add(id);
    groups.push(members.map((id) => byId.get(id)!));
  }
  for (const vulnerability of pkg.vulnerabilities) {
    if (!used.has(vulnerability.id)) groups.push([vulnerability]);
  }
  return groups;
}

/**
 * Unknown is not safe (GOV-022 section 10). An advisory whose severity cannot be established from any
 * alias is P1, so a missing label can never turn a serious vulnerability into a warning. The
 * documented output does not distinguish development-only dependencies, so every dependency is
 * treated as a runtime dependency.
 */
function groupSeverity(group: OsvVulnerability[]): { severity: Severity; established: boolean } {
  let worst: Severity | undefined;
  for (const vulnerability of group) {
    const severity = vulnerability.label ? SEVERITY_LABELS[vulnerability.label.trim().toUpperCase()] : undefined;
    if (severity && (!worst || severityRank[severity] < severityRank[worst])) worst = severity;
  }
  return worst ? { severity: worst, established: true } : { severity: "P1", established: false };
}

function relativeSource(source: string, rootPath: string): string {
  const normalized = source.replaceAll("\\", "/");
  const root = rootPath.replaceAll("\\", "/").replace(/\/+$/, "");
  return root && normalized.startsWith(`${root}/`) ? normalized.slice(root.length + 1) : normalized;
}

function oneLine(value: string, limit: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

function advisoryFindings(packages: OsvPackage[], rootPath: string): GovernanceFinding[] {
  const findings: GovernanceFinding[] = [];
  for (const pkg of packages) {
    for (const group of advisoryGroups(pkg)) {
      const ids = group.map((vulnerability) => vulnerability.id).sort();
      const { severity, established } = groupSeverity(group);
      const summary = group.find((vulnerability) => vulnerability.summary)?.summary;
      const file = relativeSource(pkg.source, rootPath);
      findings.push({
        id: `FND-OSV-${stableId(`${file}:${pkg.ecosystem}:${pkg.name}:${pkg.version}:${ids.join(",")}`)}`,
        rule_id: "OSV-ADVISORY",
        severity,
        category: "dependency-vulnerability",
        message: `${pkg.name}@${pkg.version} (${pkg.ecosystem}) is affected by ${ids.join(", ")}${summary ? `: ${oneLine(summary, 200)}` : ""}${established ? "" : ". Severity could not be established from the advisory and is treated as P1"}.`,
        status: "OPEN",
        evidence_refs: [EVIDENCE_ID],
        source_location: { file },
        confidence: 0.9,
        remediation: "Upgrade or replace the dependency, or record an approved governance exception. A local ignore entry is not accepted as a waiver.",
      });
    }
  }
  return findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || a.id.localeCompare(b.id));
}

export async function runOsvAdapter(
  snapshot: RepositorySnapshot,
  runner: VerificationToolRunner,
  fingerprint: RepositorySnapshotFingerprint,
): Promise<ScannerAdapterOutput | undefined> {
  const files = snapshot.files.map((file) => file.replaceAll("\\", "/"));
  const { lockfiles, uncovered } = discoverLockfiles(files);
  if (lockfiles.length === 0 && uncovered.length === 0) return undefined;

  const conclude = (outcome: ScannerOutcome): ScannerAdapterOutput => concludeScanner(IDENTITY, outcome, fingerprint);
  const command = ["osv-scanner", "scan", "source", "--format", "json", `<${lockfiles.length} lockfiles>`];
  const coverageGap = uncovered.length > 0
    ? [`No lockfile covers: ${uncovered.slice(0, 10).join(", ")}${uncovered.length > 10 ? ", ..." : ""}. Their dependencies were not scanned.`]
    : [];
  const notRun = (status: ToolResultStatus, summary: string, limitations: string[]): ScannerAdapterOutput =>
    conclude({ status, summary, findings: [], limitations, command });

  if (lockfiles.length === 0) {
    return notRun("UNSUPPORTED", "Dependency manifests were found, but no supported lockfile; dependencies were not scanned.", coverageGap);
  }
  if (lockfiles.length > MAX_LOCKFILES) {
    return notRun("SKIPPED", `Found ${lockfiles.length} lockfiles; the safety limit is ${MAX_LOCKFILES}.`, ["Not all lockfiles were scanned.", ...coverageGap]);
  }
  if (!(await runner.isAvailable("osv-scanner", snapshot.rootPath, "."))) {
    return notRun("UNSUPPORTED", "osv-scanner was not available; dependency vulnerabilities were not scanned.", ["osv-scanner is not installed or not on PATH.", ...coverageGap]);
  }

  const version = await runner.getVersion?.("osv-scanner", snapshot.rootPath, ".");
  let processResult: VerificationProcessResult;
  try {
    // `--lockfile=<path>` keeps a path that begins with "-" from being read as a flag.
    processResult = await runner.run(
      "osv-scanner",
      ["scan", "source", "--format", "json", ...lockfiles.map((file) => `--lockfile=${file}`)],
      snapshot.rootPath,
      ".",
      TOOL_TIMEOUT_MS,
    );
  } catch (error) {
    const limitation = `osv-scanner failed to run: ${error instanceof Error ? error.message : String(error)}`;
    return notRun("ERROR", limitation, [limitation, ...coverageGap]);
  }

  const ranOutcome = (status: ToolResultStatus, summary: string, findings: GovernanceFinding[], limitations: string[]): ScannerAdapterOutput =>
    conclude({ status, summary, findings, limitations, processResult, command, ...(version ? { version } : {}) });
  const untrusted = (reason: string): ScannerAdapterOutput =>
    ranOutcome("ERROR", `${reason} Dependency scan could not be trusted.`, [], [reason, ...coverageGap]);

  if (processResult.exitCode === 128) {
    return ranOutcome("UNVERIFIED", "osv-scanner found no packages in the lockfiles; nothing was verified.", [], ["osv-scanner reported no packages found (exit 128).", ...coverageGap]);
  }
  if (processResult.exitCode !== 0 && processResult.exitCode !== 1) {
    const detail = compactOutput("", processResult.stderr).slice(0, 500);
    return untrusted(`osv-scanner exited with code ${processResult.exitCode}${detail ? `: ${detail}` : "."}`);
  }

  let packages: OsvPackage[];
  try {
    packages = parseOsvOutput(processResult.stdout);
  } catch (error) {
    return untrusted(`osv-scanner output could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
  }

  const findings = advisoryFindings(packages, snapshot.rootPath);
  // The exit code and the structured result must agree, otherwise the tool cannot be trusted.
  if ((processResult.exitCode === 0 && findings.length > 0) || (processResult.exitCode === 1 && findings.length === 0)) {
    return untrusted(`osv-scanner exit code ${processResult.exitCode} contradicts its output (${findings.length} advisories).`);
  }

  const counts = (severity: Severity) => findings.filter((finding) => finding.severity === severity).length;
  const tally = `${findings.length} advisories (P1: ${counts("P1")}, P2: ${counts("P2")}, P3: ${counts("P3")})`;
  const status: ToolResultStatus = counts("P1") > 0 ? "FAIL"
    : coverageGap.length > 0 ? "UNVERIFIED"
      : findings.length > 0 ? "WARN"
        : "PASS";
  const summary = {
    FAIL: `Dependency scan found ${tally}; at least one is P1.`,
    UNVERIFIED: `Dependency scan found ${tally}, but some manifests are not covered by a lockfile.`,
    WARN: `Dependency scan found ${tally}; none is P1.`,
    PASS: `Dependency scan found no known vulnerabilities in ${lockfiles.length} lockfile(s).`,
  }[status as "FAIL" | "UNVERIFIED" | "WARN" | "PASS"];
  return ranOutcome(status, summary, findings, coverageGap);
}
