import type { ControlEvaluation, ControlStatus, GovernanceDebt, GovernancePack, GovernanceViolation, Severity } from "./types.js";

/**
 * Technical debt as feedback into the decision (DEBT-020, OPS-04). Pure: it reads the pack's debt records
 * and the control evaluations and returns a summary and violations; the caller folds them into the decision.
 *
 * Rules, each from the standard:
 *
 *   Blocks (NO-GO)
 *   - P0 or P1 debt with no explicit owner: "Unowned critical debt is a governance failure" (section 15)
 *     and an automatic production blocker (section 29).
 *   - P0 debt that is not resolved, whatever its status: the default for P0 is "production blocked"
 *     (section 9), and acceptance cannot bypass a production blocker (section 17).
 *
 *   Conditions (GO WITH CONDITIONS)
 *   - P1 debt that is open, planned or in progress: "normally blocked unless explicitly mitigated and
 *     approved" (section 9). The model has no mitigation or approval field, so this is a condition, not a
 *     block: ACCEPTED is how a P1 item records that decision.
 *   - Debt past its target date.
 *   - ACCEPTED debt that has never been reviewed: "A debt item without an explicit acceptance decision
 *     SHALL be treated as unreviewed debt" (section 18).
 *
 * P2 and P3 debt only counts, unless it is overdue or accepted without a review. RESOLVED debt is ignored.
 */

const SEVERITIES: readonly Severity[] = ["P0", "P1", "P2", "P3"];

export interface DebtItemReport {
  id: string;
  title?: string;
  severity: Severity;
  status: GovernanceDebt["status"];
  owner?: string;
  target_date?: string;
  last_reviewed?: string;
  overdue: boolean;
  blocking: boolean;
  /** Why the item blocks or needs a condition; empty for debt that only counts. */
  reasons: string[];
  /** Controls this debt is recorded against, with their current status. */
  linkedControls: { id: string; status: ControlStatus }[];
}

export interface DebtSummary {
  /** Debt that is not RESOLVED, by severity. */
  unresolved: Record<Severity, number>;
  unresolvedTotal: number;
  accepted: number;
  resolved: number;
  overdue: number;
  /** Unresolved debt that names an owner / a last-reviewed date (DEBT-020 section 30). */
  withOwner: number;
  withReviewDate: number;
  /** Unresolved debt, one entry each, most severe first. */
  items: DebtItemReport[];
}

export interface DebtEvaluation {
  summary: DebtSummary;
  blocking: GovernanceViolation[];
  conditions: GovernanceViolation[];
}

const severityRank = (severity: Severity): number => SEVERITIES.indexOf(severity);

export function hasOwner(debt: Pick<GovernanceDebt, "owner">): boolean {
  const owner = debt.owner?.trim();
  return Boolean(owner) && owner!.toUpperCase() !== "UNASSIGNED";
}

/** Past its target: the whole of the target day (UTC) is allowed. */
export function isOverdue(targetDate: string | undefined, evaluatedAt: string | undefined): boolean {
  if (!targetDate) return false;
  const end = Date.parse(`${targetDate}T23:59:59.999Z`);
  const now = evaluatedAt ? Date.parse(evaluatedAt) : Date.now();
  return Number.isFinite(end) && Number.isFinite(now) && now > end;
}

export function evaluateDebt(pack: GovernancePack, controls: readonly ControlEvaluation[], evaluatedAt?: string): DebtEvaluation {
  const statusOf = new Map(controls.map((control) => [control.controlId, control.status]));
  const items: DebtItemReport[] = [];
  const unresolved: Record<Severity, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
  let accepted = 0;
  let resolved = 0;

  for (const debt of pack.debt ?? []) {
    if (debt.status === "RESOLVED") {
      resolved += 1;
      continue;
    }
    unresolved[debt.severity] += 1;
    if (debt.status === "ACCEPTED") accepted += 1;

    const critical = debt.severity === "P0" || debt.severity === "P1";
    const overdue = isOverdue(debt.target_date, evaluatedAt);
    const blockers: string[] = [];
    const conditions: string[] = [];

    if (critical && !hasOwner(debt)) blockers.push(`${debt.severity} debt has no explicit owner (DEBT-020 sections 15 and 29)`);
    if (debt.severity === "P0") blockers.push(`P0 debt is not resolved${debt.status === "ACCEPTED" ? " and acceptance cannot bypass a production blocker" : ""} (DEBT-020 sections 9 and 17)`);
    if (debt.severity === "P1" && debt.status !== "ACCEPTED") conditions.push(`P1 debt is ${debt.status.toLowerCase().replace("_", " ")} and has no recorded acceptance (DEBT-020 section 9)`);
    if (overdue) conditions.push(`past its target date ${debt.target_date}`);
    if (debt.status === "ACCEPTED" && !debt.last_reviewed) conditions.push("accepted but never reviewed (DEBT-020 section 18)");

    items.push({
      id: debt.id,
      ...(debt.title ? { title: debt.title } : {}),
      severity: debt.severity,
      status: debt.status,
      ...(debt.owner ? { owner: debt.owner } : {}),
      ...(debt.target_date ? { target_date: debt.target_date } : {}),
      ...(debt.last_reviewed ? { last_reviewed: debt.last_reviewed } : {}),
      overdue,
      blocking: blockers.length > 0,
      reasons: [...blockers, ...conditions],
      linkedControls: (debt.controls ?? []).map((id) => ({ id, status: statusOf.get(id) ?? "UNVERIFIED" })),
    });
  }

  items.sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || a.id.localeCompare(b.id));
  const open = items;
  const summary: DebtSummary = {
    unresolved,
    unresolvedTotal: open.length,
    accepted,
    resolved,
    overdue: open.filter((item) => item.overdue).length,
    withOwner: open.filter((item) => hasOwner(item)).length,
    withReviewDate: open.filter((item) => Boolean(item.last_reviewed)).length,
    items,
  };

  const toViolation = (item: DebtItemReport): GovernanceViolation => {
    const linked = item.linkedControls.length > 0
      ? ` Recorded against ${item.linkedControls.map((control) => `${control.id} (${control.status})`).join(", ")}.`
      : "";
    return {
      controlId: `DEBT:${item.id}`,
      status: item.blocking ? "FAIL" : "WARN",
      severity: item.severity,
      decision: item.blocking ? "NO-GO" : "GO_WITH_CONDITIONS",
      message: `Debt ${item.id}${item.title ? ` (${item.title})` : ""}: ${item.reasons.join("; ")}.${linked}`,
      missingEvidence: [],
      missingSignals: [],
    };
  };
  return {
    summary,
    blocking: items.filter((item) => item.blocking).map(toViolation),
    conditions: items.filter((item) => !item.blocking && item.reasons.length > 0).map(toViolation),
  };
}
