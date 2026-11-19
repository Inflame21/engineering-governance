import type { ControlEvaluation, ControlStatus, GovernanceCorrectiveAction, GovernanceIncident, GovernancePack, GovernanceViolation, Severity } from "./types.js";

/**
 * Incident records as feedback into the decision (INC-019, OPS-04). Pure: it reads the pack's incidents
 * and the control evaluations and returns a summary and conditions; the caller folds them into the
 * decision.
 *
 * Every finding here is a CONDITION, never a block. INC-019's automatic blockers (section 56) are about
 * capabilities (an owner for incidents, an escalation path, a recovery procedure, preserved evidence), and a
 * list of past incidents cannot show that those exist. Rules, each from the standard:
 *
 *   - An active P0 or P1 incident: a change is acceptable only if it is the fix or an emergency change
 *     (section 27). The standard does not say a release is forbidden, so it is a condition.
 *   - An active P0, P1 or P2 incident with no owner (section 3.3).
 *   - A resolved or closed P0 or P1 incident with no completed post-incident review (section 31), or closed
 *     with no corrective action recorded (section 45).
 *   - A corrective action on a P0, P1 or P2 incident that is still open and lacks an owner, a target date or
 *     validation criteria (section 36), is past its target date, or was deprioritised with no justification
 *     (section 37).
 *   - A repeat of an earlier incident's cause (section 38), with a prompt to record technical debt (section 52).
 *   - A P0 or P1 incident recorded against a control that still evaluates PASS: the control did not catch it,
 *     so its evidence should be revisited (section 51).
 */

const SEVERITIES: readonly Severity[] = ["P0", "P1", "P2", "P3"];
const ACTIVE = new Set<GovernanceIncident["status"]>(["OPEN", "MITIGATED"]);
const MS_PER_HOUR = 3_600_000;

export interface ActionReport {
  id: string;
  description: string;
  status: GovernanceCorrectiveAction["status"];
  owner?: string;
  due_date?: string;
  overdue: boolean;
}

export interface IncidentItemReport {
  id: string;
  title: string;
  severity: Severity;
  status: GovernanceIncident["status"];
  owner?: string;
  cause?: string;
  detected_at: string;
  resolved_at?: string;
  review?: NonNullable<GovernanceIncident["review"]>;
  actions: ActionReport[];
  /** Earlier incidents that share this one's cause; empty for the first of its cause. */
  repeatOf: string[];
  linkedControls: { id: string; status: ControlStatus }[];
  linkedDebt: string[];
  reasons: string[];
}

export interface IncidentSummary {
  total: number;
  bySeverity: Record<Severity, number>;
  active: number;
  /** Resolved or closed P0 and P1 incidents, and how many of those have a completed review. */
  materialResolved: number;
  materialReviewed: number;
  actionsOpen: number;
  actionsOverdue: number;
  repeats: number;
  /** Mean hours from detection to resolution over incidents that have both; undefined when none do. */
  meanTimeToResolveHours?: number;
  items: IncidentItemReport[];
}

export interface IncidentEvaluation {
  summary: IncidentSummary;
  conditions: GovernanceViolation[];
}

const severityRank = (severity: Severity): number => SEVERITIES.indexOf(severity);
const isMaterial = (incident: Pick<GovernanceIncident, "severity">): boolean => incident.severity === "P0" || incident.severity === "P1";
const trimmed = (value: string | undefined): string => value?.trim() ?? "";

function dueOverdue(dueDate: string | undefined, evaluatedAt: string | undefined): boolean {
  if (!dueDate) return false;
  const end = Date.parse(`${dueDate}T23:59:59.999Z`);
  const now = evaluatedAt ? Date.parse(evaluatedAt) : Date.now();
  return Number.isFinite(end) && Number.isFinite(now) && now > end;
}

/** Which incident ids reference each debt id, for the debt report (DEBT-020 section 30: debt associated with incidents). */
export function incidentsByDebt(pack: GovernancePack): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const incident of pack.incidents ?? []) {
    for (const debtId of incident.debt ?? []) map.set(debtId, [...(map.get(debtId) ?? []), incident.id]);
  }
  return map;
}

export function evaluateIncidents(pack: GovernancePack, controls: readonly ControlEvaluation[], evaluatedAt?: string): IncidentEvaluation {
  const incidents = pack.incidents ?? [];
  const statusOf = new Map(controls.map((control) => [control.controlId, control.status]));
  const bySeverity: Record<Severity, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
  const ordered = [...incidents].sort((a, b) => Date.parse(a.detected_at) - Date.parse(b.detected_at) || a.id.localeCompare(b.id));

  // First incident of each cause; later ones with the same cause are repeats (section 38).
  const seenByCause = new Map<string, string[]>();
  const repeatOf = new Map<string, string[]>();
  for (const incident of ordered) {
    const cause = trimmed(incident.cause).toLowerCase();
    if (!cause) continue;
    const earlier = seenByCause.get(cause) ?? [];
    if (earlier.length > 0) repeatOf.set(incident.id, [...earlier]);
    seenByCause.set(cause, [...earlier, incident.id]);
  }

  let actionsOpen = 0;
  let actionsOverdue = 0;
  let materialResolved = 0;
  let materialReviewed = 0;
  const resolveHours: number[] = [];
  const items: IncidentItemReport[] = [];

  for (const incident of incidents) {
    bySeverity[incident.severity] += 1;
    const active = ACTIVE.has(incident.status);
    const material = isMaterial(incident);
    const reasons: string[] = [];

    if (active && material) reasons.push(`${incident.severity} incident is ${incident.status.toLowerCase()}: a change is acceptable only if it is the fix or an emergency change (INC-019 section 27)`);
    if (active && incident.severity !== "P3" && !trimmed(incident.owner)) reasons.push("an active incident has no owner (INC-019 section 3.3)");

    if (!active && material) {
      materialResolved += 1;
      const reviewed = incident.review?.status === "COMPLETE";
      if (reviewed) materialReviewed += 1;
      if (!reviewed && incident.review?.status !== "NOT_REQUIRED") reasons.push("no completed post-incident review (INC-019 section 31)");
      if (incident.status === "CLOSED" && (incident.actions ?? []).length === 0 && incident.review?.status !== "NOT_REQUIRED") reasons.push("closed with no corrective action recorded (INC-019 section 45)");
    }

    const actions: ActionReport[] = (incident.actions ?? []).map((action) => {
      const open = action.status === "OPEN" || action.status === "IN_PROGRESS";
      const overdue = open && dueOverdue(action.due_date, evaluatedAt);
      if (open) actionsOpen += 1;
      if (overdue) actionsOverdue += 1;
      if (incident.severity !== "P3") {
        if (open) {
          const missing = [!trimmed(action.owner) && "an owner", !action.due_date && "a target date", !trimmed(action.validation) && "validation criteria"].filter(Boolean);
          if (missing.length > 0) reasons.push(`corrective action ${action.id} lacks ${missing.join(", ")} (INC-019 section 36)`);
          if (overdue) reasons.push(`corrective action ${action.id} is past its target date ${action.due_date} (INC-019 section 37)`);
        }
        if (action.status === "DEPRIORITIZED" && !trimmed(action.justification)) reasons.push(`corrective action ${action.id} was deprioritised with no justification or risk acceptance (INC-019 section 37)`);
      }
      return {
        id: action.id,
        description: action.description,
        status: action.status,
        ...(action.owner ? { owner: action.owner } : {}),
        ...(action.due_date ? { due_date: action.due_date } : {}),
        overdue,
      };
    });

    const repeats = repeatOf.get(incident.id) ?? [];
    if (repeats.length > 0) {
      const noDebt = (incident.debt ?? []).length === 0;
      reasons.push(`repeats the cause "${trimmed(incident.cause)}" of ${repeats.join(", ")}: the earlier corrective action was not enough and a deeper review is due (INC-019 section 38)${noDebt ? "; consider recording technical debt (INC-019 section 52)" : ""}`);
    }

    const linkedControls = (incident.controls ?? []).map((id) => ({ id, status: statusOf.get(id) ?? ("UNVERIFIED" as ControlStatus) }));
    if (material) {
      const passing = linkedControls.filter((control) => control.status === "PASS").map((control) => control.id);
      if (passing.length > 0) reasons.push(`it is recorded against ${passing.join(", ")}, which still evaluates PASS: the control did not catch it, so revisit what its evidence proves (INC-019 section 51)`);
    }

    if (incident.resolved_at) {
      const hours = (Date.parse(incident.resolved_at) - Date.parse(incident.detected_at)) / MS_PER_HOUR;
      if (Number.isFinite(hours) && hours >= 0) resolveHours.push(hours);
    }

    items.push({
      id: incident.id,
      title: incident.title,
      severity: incident.severity,
      status: incident.status,
      ...(incident.owner ? { owner: incident.owner } : {}),
      ...(incident.cause ? { cause: incident.cause } : {}),
      detected_at: incident.detected_at,
      ...(incident.resolved_at ? { resolved_at: incident.resolved_at } : {}),
      ...(incident.review ? { review: incident.review } : {}),
      actions,
      repeatOf: repeats,
      linkedControls,
      linkedDebt: [...(incident.debt ?? [])],
      reasons,
    });
  }

  items.sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || a.id.localeCompare(b.id));
  const summary: IncidentSummary = {
    total: incidents.length,
    bySeverity,
    active: items.filter((item) => ACTIVE.has(item.status)).length,
    materialResolved,
    materialReviewed,
    actionsOpen,
    actionsOverdue,
    repeats: items.filter((item) => item.repeatOf.length > 0).length,
    ...(resolveHours.length > 0 ? { meanTimeToResolveHours: Math.round((resolveHours.reduce((sum, h) => sum + h, 0) / resolveHours.length) * 10) / 10 } : {}),
    items,
  };

  const conditions = items.filter((item) => item.reasons.length > 0).map((item): GovernanceViolation => ({
    controlId: `INCIDENT:${item.id}`,
    status: "WARN",
    severity: item.severity,
    decision: "GO_WITH_CONDITIONS",
    message: `Incident ${item.id} (${item.title}): ${item.reasons.join("; ")}.`,
    missingEvidence: [],
    missingSignals: [],
  }));
  return { summary, conditions };
}
