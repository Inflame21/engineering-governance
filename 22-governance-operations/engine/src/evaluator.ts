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

  // When a control does not enumerate evidence IDs, require evidence explicitly
  // linked to the control rather than treating an empty list as proof of success.
  const evidenceIds = required.length > 0
    ? required
    : evidence
        .filter((item) => item.supports_controls.includes(control.id))
        .map((item) => item.id);

  if (evidenceIds.length === 0) {
    return { missing: [`EVIDENCE_REQUIRED:${control.id}`], supporting };
  }

  for (const evidenceId of evidenceIds) {
    const item = byId.get(evidenceId);
    if (!item || item.status !== "VERIFIED") {
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

  // Explicit failure/warning findings remain findings. For a claimed PASS (or
  // absent status), incomplete proof must produce UNVERIFIED, never PASS.
  // NOT_APPLICABLE is derived from applicability above and cannot be asserted
  // by a control that the normalized context says is applicable.
  let status: ControlEvaluation["status"];
  if (control.status === "FAIL") {
    status = "FAIL";
  } else if (control.status === "WARN") {
    status = "WARN";
  } else if (control.status === "NOT_APPLICABLE") {
    status = "UNVERIFIED";
  } else if (missing.length > 0) {
    status = "UNVERIFIED";
  } else {
    status = "PASS";
  }

  let reason: string;
  if (control.status === "FAIL") {
    reason = control.message ?? `Control ${control.id} is explicitly marked as failed.`;
  } else if (control.status === "WARN") {
    reason = control.message ?? `Control ${control.id} requires review.`;
  } else if (control.status === "NOT_APPLICABLE") {
    reason = "Control is marked NOT_APPLICABLE but its applicability conditions are satisfied; verification is required.";
  } else if (missing.length > 0) {
    reason = `Required evidence is missing, partial, unverified, or not applicable: ${missing.join(", ")}.`;
  } else {
    reason = `Verified evidence satisfies control ${control.id}.`;
  }

  return {
    controlId: control.id,
    applicable: true,
    status,
    severity: control.severity,
    failureDecision: control.failure_decision ?? "NONE",
    missingEvidence: missing,
    supportingEvidence: supporting,
    reason,
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
