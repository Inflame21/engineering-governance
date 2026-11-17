import type { ApproverAuthority, Severity } from "./types.js";

export interface AuthorityCheck {
  authorized: boolean;
  /** Why the approver is, or is not, authorized. */
  reason: string;
}

const normalize = (value: string): string => value.trim().replace(/^@/, "").toLowerCase();

/**
 * Decide whether an approver may approve a deviation of the given severity (EXC-021 section 15).
 *
 * The approver must name an authority role, that role must be one the caller has verified as approved,
 * the role must cover the severity, and the approver must be one of its holders (matched on name or
 * handle, ignoring case and a leading @). This checks a CLAIMED identity against the authorized list; it
 * does not authenticate the person, which the governance pack alone cannot do.
 */
export function checkApproverAuthority(
  approver: string,
  claimedRole: string | undefined,
  severity: Severity,
  authority: readonly ApproverAuthority[],
): AuthorityCheck {
  if (!claimedRole?.trim()) {
    return { authorized: false, reason: "the approval does not name the approver's authority role" };
  }
  const role = authority.find((candidate) => candidate.role === claimedRole);
  if (!role) {
    return { authorized: false, reason: `role ${claimedRole} is not an approved authority role` };
  }
  if (!role.severities.includes(severity)) {
    return { authorized: false, reason: `role ${role.role} may not approve ${severity} deviations` };
  }
  const approverKey = normalize(approver);
  if (!role.holders.some((holder) => normalize(holder) === approverKey)) {
    return { authorized: false, reason: `'${approver.trim()}' is not a holder of role ${role.role}` };
  }
  return { authorized: true, reason: `'${approver.trim()}' holds role ${role.role}, which may approve ${severity}` };
}
