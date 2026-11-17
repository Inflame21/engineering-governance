import type { ApproverAuthority } from "../../engine/src/types.js";
import type { AuthorityPolicy } from "./config.js";

/**
 * The authority the engine may rely on: APPROVED roles that have at least one named holder. DRAFT,
 * DEPRECATED and RETIRED roles confer nothing, and the UNASSIGNED placeholder never counts as a holder.
 * Both a holder's name and handle are listed, so an approver can be recognised by either.
 */
export function effectiveApproverAuthority(policy: AuthorityPolicy): ApproverAuthority[] {
  return policy.roles
    .filter((role) => role.status === "APPROVED")
    .map((role) => ({
      role: role.id,
      severities: [...role.severities],
      holders: role.holders
        .filter((holder) => holder.name !== "UNASSIGNED")
        .flatMap((holder) => [holder.name, ...(holder.handle ? [holder.handle] : [])]),
    }))
    .filter((role) => role.holders.length > 0);
}

/** How many roles confer authority, out of how many are defined; for reports. */
export function authoritySummary(policy: AuthorityPolicy): { id: string; version: string; roles: number; approved: number } {
  return {
    id: policy.policy_id,
    version: policy.policy_version,
    roles: policy.roles.length,
    approved: effectiveApproverAuthority(policy).length,
  };
}
