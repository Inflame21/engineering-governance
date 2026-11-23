import type { GovernanceEvidence, GovernanceFinding, ToolResultStatus } from "../../engine/src/types.js";
import { evidenceStatusForResult } from "../../engine/src/evidence-policy.js";
import type { RepositoryAdapterResult, RepositorySnapshot } from "./types.js";
import type { ScannerAdapterOutput } from "./verification-shared.js";
import { stableId } from "./verification-shared.js";

/**
 * CI run status, read from GitHub Actions "list workflow runs" JSON the project saved from its own CI.
 *
 * Nothing is fetched or run: the project writes the response (`gh api repos/OWNER/REPO/actions/runs?head_sha=SHA`)
 * under CI_REPORT_DIRECTORY, and the adapter only reads it. With no files there it returns nothing.
 *
 * For each workflow the latest run counts. When the snapshot knows the assessed commit (`headCommit`, set by
 * the CLI only when HEAD resolves and no tracked file is modified), only runs on that commit count, so a green
 * run for older code cannot pass. When the commit is unknown the runs are taken as supplied and the result is
 * capped at WARN, never PASS. A run that has not completed, or no run for the commit, is UNVERIFIED.
 *
 * Read against real GitHub API output (tests/fixtures/real-ci-output). Only the fields below are read:
 * `id`, `name`, `workflow_id`, `head_sha`, `status`, `conclusion`, `run_number`, `run_attempt`,
 * `created_at`, `updated_at` and `html_url`.
 */

export const CI_REPORT_DIRECTORY = ".governance/evidence/ci";

const IDENTITY = {
  tool: "ci-run-status",
  adapterId: "ci-run-status",
  adapterVersion: "0.1.0",
  capability: "verification:ci-run-status",
  evidenceId: "EVD-CI-RUN-STATUS",
  evidenceSource: "ci-status-adapter",
} as const;
const MAX_REPORTS = 20;
const MAX_FINDINGS = 50;
/** Conclusions that mean the run did not succeed. `success` is the only pass; `skipped` and `neutral` warn. */
const FAILED = new Set(["failure", "timed_out", "cancelled", "startup_failure", "action_required", "stale"]);
const NOT_RUN = new Set(["skipped", "neutral"]);

interface CiRun {
  /** Groups runs of one workflow: its id when the report has one, else its name. */
  key: string;
  workflow: string;
  runNumber: number;
  attempt: number;
  created: number;
  updated: number;
  sha: string;
  status: string;
  conclusion: string;
  url: string;
  id: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Returns undefined when the text is not a workflow-runs response (an object with `workflow_runs`, or a bare array of runs). */
export function parseCiRuns(text: string): CiRun[] | undefined {
  let document: unknown;
  try {
    document = JSON.parse(text);
  } catch {
    return undefined;
  }
  const list = Array.isArray(document) ? document : isRecord(document) ? document.workflow_runs : undefined;
  if (!Array.isArray(list)) return undefined;

  const runs: CiRun[] = [];
  for (const item of list) {
    if (!isRecord(item)) return undefined;
    const name = typeof item.name === "string" && item.name ? item.name : undefined;
    const workflowId = typeof item.workflow_id === "number" || typeof item.workflow_id === "string" ? String(item.workflow_id) : undefined;
    // A run that names neither its workflow nor an id cannot be grouped, so the report is not usable.
    if (!name && !workflowId) return undefined;
    runs.push({
      key: workflowId ?? name!,
      workflow: name ?? `workflow ${workflowId}`,
      runNumber: typeof item.run_number === "number" ? item.run_number : 0,
      attempt: typeof item.run_attempt === "number" ? item.run_attempt : 1,
      created: Date.parse(String(item.created_at ?? "")),
      updated: Date.parse(String(item.updated_at ?? "")),
      sha: typeof item.head_sha === "string" ? item.head_sha.toLowerCase() : "",
      status: typeof item.status === "string" ? item.status : "",
      conclusion: typeof item.conclusion === "string" ? item.conclusion : "",
      url: typeof item.html_url === "string" ? item.html_url : "",
      id: String(item.id ?? ""),
    });
  }
  return runs;
}

/** The newest run wins: higher run number, then higher attempt, then later creation. */
const newer = (a: CiRun, b: CiRun): boolean =>
  a.runNumber !== b.runNumber ? a.runNumber > b.runNumber
    : a.attempt !== b.attempt ? a.attempt > b.attempt
      : (Number.isFinite(a.created) ? a.created : 0) > (Number.isFinite(b.created) ? b.created : 0);

export function runCiStatusAdapter(snapshot: RepositorySnapshot): ScannerAdapterOutput | undefined {
  const reportFiles = snapshot.files
    .map((file) => file.replaceAll("\\", "/"))
    .filter((file) => file.startsWith(`${CI_REPORT_DIRECTORY}/`) && file.toLowerCase().endsWith(".json"))
    .sort();
  if (reportFiles.length === 0) return undefined;

  const selected = reportFiles.slice(0, MAX_REPORTS);
  const notIngested = selected.filter((file) => snapshot.fileContents?.[file] === undefined);
  const malformed: string[] = [];
  const latest = new Map<string, CiRun & { report: string }>();
  let otherCommit = 0;
  const commit = snapshot.headCommit?.toLowerCase();
  for (const file of selected) {
    const content = snapshot.fileContents?.[file];
    if (content === undefined) continue;
    const runs = parseCiRuns(content);
    if (!runs) {
      malformed.push(file);
      continue;
    }
    for (const run of runs) {
      if (commit && run.sha !== commit) {
        otherCommit += 1;
        continue;
      }
      const current = latest.get(run.key);
      if (!current || newer(run, current)) latest.set(run.key, { ...run, report: file });
    }
  }

  const counted = [...latest.values()].sort((a, b) => a.workflow.localeCompare(b.workflow));
  const failed = counted.filter((run) => run.status === "completed" && FAILED.has(run.conclusion));
  const pending = counted.filter((run) => run.status !== "completed" || run.conclusion === "");
  const notRun = counted.filter((run) => run.status === "completed" && NOT_RUN.has(run.conclusion));
  const unknown = counted.filter((run) => run.status === "completed" && run.conclusion !== "success"
    && !FAILED.has(run.conclusion) && !NOT_RUN.has(run.conclusion) && run.conclusion !== "");
  const truncated = reportFiles.length > MAX_REPORTS;

  const limitations = [
    "Only GitHub Actions workflow-run JSON is read, and it is taken as supplied: a file cannot prove it came from the CI service, and a workflow with no run in it is not noticed.",
    commit
      ? `Only runs on commit ${commit.slice(0, 12)} were counted${otherCommit ? ` (${otherCommit} run(s) on other commits ignored)` : ""}.`
      : "The assessed commit is not known (no Git HEAD, or tracked files are modified), so the runs could not be matched to this code and the result cannot be better than WARN.",
    ...(malformed.length ? [`Not a workflow-runs response: ${malformed.slice(0, 10).join(", ")}.`] : []),
    ...(notIngested.length ? [`Content was not ingested for: ${notIngested.slice(0, 10).join(", ")}.`] : []),
    ...(truncated ? [`Found ${reportFiles.length} reports; only the first ${MAX_REPORTS} were read.`] : []),
    ...(pending.length ? [`Not finished: ${pending.slice(0, 10).map((run) => run.workflow).join(", ")}.`] : []),
    ...(unknown.length ? [`Unrecognised conclusion for: ${unknown.slice(0, 10).map((run) => `${run.workflow} (${run.conclusion})`).join(", ")}.`] : []),
  ];

  const status: ToolResultStatus = failed.length > 0 ? "FAIL"
    : malformed.length > 0 ? "ERROR"
      : counted.length === 0 || pending.length > 0 || unknown.length > 0 || notIngested.length > 0 || truncated ? "UNVERIFIED"
        : notRun.length > 0 || !commit ? "WARN"
          : "PASS";
  const tally = `${counted.length} workflow(s): ${failed.length} failed, ${pending.length} not finished, ${notRun.length} skipped`;
  const summary = status === "ERROR"
    ? `CI status could not be trusted: ${malformed.length} file(s) are not workflow-run data.`
    : counted.length === 0 && malformed.length === 0
      ? commit ? `No workflow run was found for commit ${commit.slice(0, 12)}, so nothing was verified.` : "The CI files contain no workflow runs, so nothing was verified."
      : `CI run status: ${tally}.${commit ? "" : " Not matched to a commit."}`;

  const findings: GovernanceFinding[] = failed.slice(0, MAX_FINDINGS).map((run) => ({
    id: `FND-CI-${stableId(`${run.workflow}:${run.id}:${run.attempt}`)}`,
    rule_id: "CI-RUN-FAILED",
    severity: "P1",
    category: "ci-cd",
    message: `CI workflow ${run.workflow} run #${run.runNumber} concluded ${run.conclusion} on ${run.sha.slice(0, 12) || "an unknown commit"}${run.url ? ` - ${run.url}` : ""}`.replace(/\s+/g, " ").trim().slice(0, 300),
    status: "OPEN",
    evidence_refs: [IDENTITY.evidenceId],
    source_location: { file: run.report },
    confidence: 0.9,
    remediation: "Fix the failing job and let CI run again on the new commit. Re-running until it passes without a fix, or disabling the workflow, is not accepted.",
  }));
  if (failed.length > MAX_FINDINGS) limitations.push(`${failed.length} workflows failed; findings were raised for the first ${MAX_FINDINGS}.`);

  const updated = counted.map((run) => run.updated);
  const oldest = counted.length > 0 && updated.every(Number.isFinite) ? new Date(Math.min(...updated)).toISOString() : undefined;
  const evidence: GovernanceEvidence = {
    id: IDENTITY.evidenceId,
    type: "E1_DIRECT_VERIFICATION",
    status: evidenceStatusForResult(status),
    result_status: status,
    description: summary,
    source: IDENTITY.evidenceSource,
    freshness: oldest ? "current" : "unknown",
    supports_controls: [],
    ...(oldest ? { generated_at: oldest } : {}),
    command: [`<read ${CI_REPORT_DIRECTORY}/*.json>`],
  };

  const completed = status === "PASS" || status === "WARN" || status === "FAIL";
  const adapterResult: RepositoryAdapterResult = {
    adapterId: IDENTITY.adapterId,
    version: IDENTITY.adapterVersion,
    executionStatus: completed ? "SUCCESS" : status === "ERROR" ? "FAILED" : "PARTIAL",
    supportedCapabilities: completed ? [IDENTITY.capability] : [],
    unsupportedCapabilities: completed ? [] : [IDENTITY.capability],
    evidenceRefs: [IDENTITY.evidenceId],
    limitations,
  };
  return {
    result: {
      tool: IDENTITY.tool,
      status,
      command: evidence.command!,
      summary,
      evidenceId: IDENTITY.evidenceId,
      findings,
      limitations,
    },
    evidence: [evidence],
    findings,
    adapterResult,
  };
}
