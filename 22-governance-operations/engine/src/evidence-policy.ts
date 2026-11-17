import type { EvidenceStatus, ToolResultStatus } from "./types.js";

/**
 * Every state a verification tool or adapter can report (operating blueprint, Release 2):
 *
 * - PASS: the check ran and found no problem.
 * - WARN: the check ran and passed with non-blocking warnings.
 * - FAIL: the check ran and found a problem.
 * - SKIPPED: the check was deliberately not run, for example a safety or scan limit was reached.
 * - UNSUPPORTED: the check cannot run here, for example no project configuration or no tool installed.
 * - UNVERIFIED: the check ran but could not establish the property, for example coverage was incomplete.
 * - ERROR: the tool itself failed, timed out or returned output that cannot be trusted.
 */
export const TOOL_RESULT_STATUSES: readonly ToolResultStatus[] = [
  "PASS",
  "WARN",
  "FAIL",
  "SKIPPED",
  "UNSUPPORTED",
  "UNVERIFIED",
  "ERROR",
];

/**
 * The explicit policy mapping a tool result to the GOV-023 evidence state it can support (section 20
 * keeps four evidence states). Only a clean pass verifies and a warning partially verifies. Every
 * other result, including a failed check, is UNVERIFIED: a tool that did not pass, did not run, could
 * not run or could not be trusted is never proof. A FAIL additionally raises a finding, which is
 * what makes the failure visible and blocking.
 */
export const EVIDENCE_STATUS_FOR_RESULT: Readonly<Record<ToolResultStatus, EvidenceStatus>> = {
  PASS: "VERIFIED",
  WARN: "PARTIALLY_VERIFIED",
  FAIL: "UNVERIFIED",
  SKIPPED: "UNVERIFIED",
  UNSUPPORTED: "UNVERIFIED",
  UNVERIFIED: "UNVERIFIED",
  ERROR: "UNVERIFIED",
};

export const evidenceStatusForResult = (result: ToolResultStatus): EvidenceStatus =>
  EVIDENCE_STATUS_FOR_RESULT[result];

const strength: Record<EvidenceStatus, number> = {
  VERIFIED: 2,
  PARTIALLY_VERIFIED: 1,
  UNVERIFIED: 0,
  NOT_APPLICABLE: 0,
};

/** True when the claimed evidence status is stronger than the tool result allows. */
export function overstatesToolResult(claimed: EvidenceStatus, result: ToolResultStatus): boolean {
  return strength[claimed] > strength[evidenceStatusForResult(result)];
}
