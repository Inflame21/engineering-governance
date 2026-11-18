import type {
  GovernanceEvidence,
  GovernanceFinding,
  ToolResultStatus,
} from "../../engine/src/types.js";
import { evidenceStatusForResult } from "../../engine/src/evidence-policy.js";
import type { RepositoryAdapterResult } from "./types.js";
import type { RepositorySnapshotFingerprint } from "./fingerprint.js";
import type { VerificationProcessResult, VerificationToolResult } from "./verification.js";

export function stableId(value: string): string {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

export function basename(file: string): string {
  return file.split("/").at(-1) ?? file;
}

export function directoryname(file: string): string {
  const index = file.lastIndexOf("/");
  return index < 0 ? "." : file.slice(0, index) || ".";
}

export function compactOutput(stdout: string, stderr: string): string {
  return [stdout.trim(), stderr.trim()].filter(Boolean).join("\n").slice(0, 4_000);
}

/** What a scanner adapter is, so its result, evidence and adapter record are assembled one way. */
export interface ScannerIdentity {
  tool: string;
  adapterId: string;
  adapterVersion: string;
  capability: string;
  evidenceId: string;
  evidenceSource: string;
}

export interface ScannerOutcome {
  status: ToolResultStatus;
  summary: string;
  findings: GovernanceFinding[];
  limitations: string[];
  /** Present when the tool ran to completion; its absence means no evidence record is produced. */
  processResult?: VerificationProcessResult;
  version?: string;
  command: string[];
}

export interface ScannerAdapterOutput {
  result: VerificationToolResult;
  evidence: GovernanceEvidence[];
  findings: GovernanceFinding[];
  adapterResult: RepositoryAdapterResult;
}

/**
 * The evidence status comes only from the engine's policy, so a scanner result that did not pass can
 * never be recorded as proof. A result that never ran produces no evidence at all.
 */
export function concludeScanner(
  identity: ScannerIdentity,
  outcome: ScannerOutcome,
  fingerprint: RepositorySnapshotFingerprint,
): ScannerAdapterOutput {
  const completed = outcome.status === "PASS" || outcome.status === "WARN" || outcome.status === "FAIL";
  const processResult = outcome.processResult;
  const evidence: GovernanceEvidence[] = processResult
    ? [{
      id: identity.evidenceId,
      type: "E3_AUTOMATED_ANALYSIS",
      status: evidenceStatusForResult(outcome.status),
      result_status: outcome.status,
      description: outcome.summary,
      source: identity.evidenceSource,
      freshness: "current",
      supports_controls: [],
      generated_at: new Date().toISOString(),
      repository_fingerprint: fingerprint.digest,
      ...(outcome.version ? { tool_version: outcome.version } : {}),
      ...(processResult.durationMs !== undefined ? { duration_ms: processResult.durationMs } : {}),
      exit_code: processResult.exitCode,
      command: outcome.command,
    }]
    : [];

  return {
    result: {
      tool: identity.tool,
      status: outcome.status,
      command: outcome.command,
      ...(processResult ? { exitCode: processResult.exitCode, evidenceId: identity.evidenceId } : {}),
      summary: outcome.summary,
      ...(outcome.version ? { toolVersion: outcome.version } : {}),
      findings: outcome.findings,
      limitations: outcome.limitations,
    },
    evidence,
    findings: outcome.findings,
    adapterResult: {
      adapterId: identity.adapterId,
      version: identity.adapterVersion,
      executionStatus: completed ? "SUCCESS" : outcome.status === "ERROR" ? "FAILED" : "PARTIAL",
      supportedCapabilities: completed ? [identity.capability] : [],
      unsupportedCapabilities: completed ? [] : [identity.capability],
      evidenceRefs: processResult ? [identity.evidenceId] : [],
      limitations: outcome.limitations,
    },
  };
}
