import type {
  ControlEvaluation,
  GovernanceContext,
  GovernanceControl,
  GovernanceEvidence,
  GovernancePack,
} from "./types.js";

function normalizeConditions(appliesWhen: GovernanceControl["applies_when"]): string[] {
  if (!appliesWhen) return [];
  return Array.isArray(appliesWhen) ? appliesWhen : [appliesWhen];
}

/** A control applies when every declared normalized signal is present. */
export function isControlApplicable(
  control: GovernanceControl,
  context: GovernanceContext,
): boolean {
  const conditions = normalizeConditions(control.applies_when);
  if (conditions.length === 0) return true;
  const signals = new Set(context.signals);
  return conditions.every((condition) => signals.has(condition));
}

function evidenceForControl(
  control: GovernanceControl,
  evidence: GovernanceEvidence[],
): { missing: string[]; supporting: string[] } {
  const required = control.required_evidence ?? [];
  const byId = new Map(evidence.map((item) => [item.id, item]));
  const missing: string[] = [];
  const supporting: string[] = [];

  for (const evidenceId of required) {
    const item = byId.get(evidenceId);
    if (!item || item.status === "UNVERIFIED") {
      missing.push(evidenceId);
      continue;
    }
    supporting.push(evidenceId);
  }

  return { missing, supporting };
}

export function evaluateControl(
  control: GovernanceControl,
  evidence: GovernanceEvidence[],
  context: GovernanceContext,
): ControlEvaluation {
  const applicable = isControlApplicable(control, context);

  if (!applicable) {
    return {
      controlId: control.id,
      applicable: false,
      status: "NOT_APPLICABLE",
      severity: control.severity,
      failureDecision: control.failure_decision ?? "NONE",
      missingEvidence: [],
      supportingEvidence: [],
      reason: "Control conditions are not satisfied by the normalized governance context.",
    };
  }

  const { missing, supporting } = evidenceForControl(control, evidence);
  const status = control.status ?? (missing.length > 0 ? "UNVERIFIED" : "PASS");

  return {
    controlId: control.id,
    applicable: true,
    status,
    severity: control.severity,
    failureDecision: control.failure_decision ?? "NONE",
    missingEvidence: missing,
    supportingEvidence: supporting,
    reason:
      missing.length > 0
        ? `Required evidence is missing or unverified: ${missing.join(", ")}.`
        : `Required evidence is satisfied for control ${control.id}.`,
  };
}

export function evaluateControls(
  pack: GovernancePack,
  context: GovernanceContext,
): ControlEvaluation[] {
  return pack.controls.map((control) =>
    evaluateControl(control, pack.evidence, context),
  );
}
