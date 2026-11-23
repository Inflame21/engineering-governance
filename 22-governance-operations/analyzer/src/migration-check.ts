import type { GovernanceEvidence, GovernanceFinding, ToolResultStatus } from "../../engine/src/types.js";
import { evidenceStatusForResult } from "../../engine/src/evidence-policy.js";
import type { RepositoryAdapterResult, RepositorySnapshot } from "./types.js";
import type { ScannerAdapterOutput } from "./verification-shared.js";
import { stableId } from "./verification-shared.js";

/**
 * Migration consistency, read from the saved output of the project's own migration check.
 *
 * Nothing is run: a migration check imports the project's code and some need a database, and ADR-0002 forbids
 * running migrations. The project saves the output under MIGRATION_REPORT_DIRECTORY and the adapter only reads it.
 * With no files there it returns nothing.
 *
 * Recognised output (real Django 6.1 and Alembic 1.20 text, tests/fixtures/real-migration-output):
 *   Django   `manage.py makemigrations --check --dry-run`: "No changes detected", "Migrations for 'app':", "Conflicting migrations detected".
 *   Alembic  `alembic check`: "No new upgrade operations detected.", "FAILED: New upgrade operations detected", "Target database is not up to date".
 *   Alembic  `alembic heads`: one "(head)" line is a single history, two or more are a fork.
 * Text that matches none of these is an ERROR, never a pass. `alembic check` needs the database at the latest
 * revision, so "not up to date" says the check did not run (UNVERIFIED), not that the code is wrong.
 *
 * A pass means the migration files match the models and form one history. It does not mean the migrations run,
 * are safe on production data, or can be rolled back; that evidence (standard 23, section 15) is not collected.
 */

export const MIGRATION_REPORT_DIRECTORY = ".governance/evidence/migrations";

const IDENTITY = {
  tool: "migration-check",
  adapterId: "migration-check",
  adapterVersion: "0.1.0",
  capability: "verification:migration-consistency",
  evidenceId: "EVD-MIGRATION-CHECK",
  evidenceSource: "migration-check-adapter",
} as const;
const MAX_REPORTS = 20;

export type MigrationOutcome =
  | { kind: "clean" }
  | { kind: "pending"; detail: string }
  | { kind: "conflict"; detail: string }
  | { kind: "not-run"; detail: string };

/** Classifies one saved output, or returns undefined when it is not output of a recognised check. */
export function parseMigrationOutput(raw: string): MigrationOutcome | undefined {
  const text = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const conflict = /^(?:CommandError: )?(Conflicting migrations detected[^\n]*)/m.exec(text);
  if (conflict) return { kind: "conflict", detail: conflict[1]! };
  const heads = [...text.matchAll(/^\s*([\w.-]+) \(head\)\s*$/gm)].map((match) => match[1]!);
  if (heads.length > 1) return { kind: "conflict", detail: `Alembic has ${heads.length} heads: ${heads.join(", ")}` };
  const lines = text.split("\n");
  const first = lines.findIndex((line) => /^Migrations for '[^']+':\s*$/.test(line));
  if (first >= 0) {
    // The header of each app, then its indented file and operation lines.
    const block = lines.slice(first).filter((line) => /^Migrations for '/.test(line) || /^\s+\S/.test(line)).map((line) => line.trim());
    return { kind: "pending", detail: `Django: ${block.join("; ")}` };
  }
  const alembicPending = /^FAILED: (New upgrade operations detected[^\n]*)/m.exec(text);
  if (alembicPending) return { kind: "pending", detail: `Alembic: ${alembicPending[1]!}` };
  const notRun = /^FAILED: (Target database is not up to date[^\n]*)/m.exec(text);
  if (notRun) return { kind: "not-run", detail: notRun[1]! };
  if (/^No changes detected\s*$/m.test(text) || /^No new upgrade operations detected\./m.test(text) || heads.length === 1) return { kind: "clean" };
  return undefined;
}

export function runMigrationCheckAdapter(snapshot: RepositorySnapshot): ScannerAdapterOutput | undefined {
  const reportFiles = snapshot.files
    .map((file) => file.replaceAll("\\", "/"))
    .filter((file) => file.startsWith(`${MIGRATION_REPORT_DIRECTORY}/`) && /\.(txt|log)$/i.test(file))
    .sort();
  if (reportFiles.length === 0) return undefined;

  const selected = reportFiles.slice(0, MAX_REPORTS);
  const notIngested = selected.filter((file) => snapshot.fileContents?.[file] === undefined);
  const malformed: string[] = [];
  const notRun: string[] = [];
  const failed: Array<{ file: string; kind: "pending" | "conflict"; detail: string }> = [];
  let clean = 0;
  for (const file of selected) {
    const content = snapshot.fileContents?.[file];
    if (content === undefined) continue;
    const outcome = parseMigrationOutput(content);
    if (!outcome) malformed.push(file);
    else if (outcome.kind === "clean") clean += 1;
    else if (outcome.kind === "not-run") notRun.push(file);
    else failed.push({ file, kind: outcome.kind, detail: outcome.detail });
  }
  const truncated = reportFiles.length > MAX_REPORTS;

  const limitations = [
    "Only the saved text of Django makemigrations and Alembic check or heads is read, and it is taken as supplied: a file cannot prove which commit or database it came from, and it has no time, so it cannot satisfy a control with a maximum evidence age.",
    "A pass means the migration files match the models and form one history. It does not show that the migrations run, are safe on production data, or can be rolled back.",
    ...(malformed.length ? [`Not recognised as migration check output: ${malformed.slice(0, 10).join(", ")}.`] : []),
    ...(notRun.length ? [`The check did not run (the database is not at the latest revision): ${notRun.slice(0, 10).join(", ")}.`] : []),
    ...(notIngested.length ? [`Content was not ingested for: ${notIngested.slice(0, 10).join(", ")}.`] : []),
    ...(truncated ? [`Found ${reportFiles.length} files; only the first ${MAX_REPORTS} were read.`] : []),
  ];

  const status: ToolResultStatus = failed.length > 0 ? "FAIL"
    : malformed.length > 0 ? "ERROR"
      : clean === 0 || notRun.length > 0 || notIngested.length > 0 || truncated ? "UNVERIFIED"
        : "PASS";
  const tally = `${clean} clean, ${failed.length} failed, ${notRun.length} not run`;
  const summary = status === "ERROR"
    ? `Migration check could not be trusted: ${malformed.length} file(s) are not recognised check output.`
    : `Migration check: ${tally}.`;

  const findings: GovernanceFinding[] = failed.map(({ file, kind, detail }) => ({
    id: `FND-MIG-${stableId(`${file}:${kind}:${detail}`)}`,
    rule_id: kind === "conflict" ? "MIGRATION-CONFLICT" : "MIGRATION-PENDING",
    severity: "P1",
    category: "database",
    message: `${kind === "conflict" ? "Migration history has more than one head" : "Models changed without a migration"} - ${detail}`.replace(/\s+/g, " ").trim().slice(0, 300),
    status: "OPEN",
    evidence_refs: [IDENTITY.evidenceId],
    source_location: { file },
    confidence: 0.9,
    remediation: kind === "conflict"
      ? "Merge the migration heads into one history, then save the check output again."
      : "Generate and review the migration for the model change, commit it, then save the check output again.",
  }));

  const evidence: GovernanceEvidence = {
    id: IDENTITY.evidenceId,
    type: "E3_AUTOMATED_ANALYSIS",
    status: evidenceStatusForResult(status),
    result_status: status,
    description: summary,
    source: IDENTITY.evidenceSource,
    freshness: "unknown",
    supports_controls: [],
    command: [`<read ${MIGRATION_REPORT_DIRECTORY}/*.txt|log>`],
  };

  const completed = status === "PASS" || status === "FAIL";
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
    result: { tool: IDENTITY.tool, status, command: evidence.command!, summary, evidenceId: IDENTITY.evidenceId, findings, limitations },
    evidence: [evidence],
    findings,
    adapterResult,
  };
}
