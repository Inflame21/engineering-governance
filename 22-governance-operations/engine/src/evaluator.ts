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
): { missing: string[]; supporting: string[]; failed: string[]; partial: string[] } {
  const required = control.required_evidence ?? [];
  const missing: string[] = [];
  const supporting: string[] = [];
  const failed: string[] = [];
  const partial: string[] = [];

  for (const evidenceId of required) {
    const matches = evidence.filter((item) => item.id === evidenceId);
    if (matches.length !== 1) {
      missing.push(evidenceId);
      continue;
    }

    const item = matches[0]!;
    if (!item.supports_controls.includes(control.id) ||
        item.freshness !== "current" ||
        !item.source.trim()) {
      missing.push(evidenceId);
    } else if (item.status === "VERIFIED") {
      supporting.push(evidenceId);
    } else if (item.status === "PARTIALLY_VERIFIED") {
      partial.push(evidenceId);
    } else if (item.status === "NOT_APPLICABLE") {
      failed.push(evidenceId);
    } else {
      missing.push(evidenceId);
    }
  }

  return { missing, supporting, failed, partial };
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

  const { missing, supporting, failed, partial } = evidenceForControl(control, evidence);
  // Declared status is never proof that a required verification passed.
  // An empty required-evidence set is not a verified PASS.
  const status: ControlEvaluation["status"] =
    failed.length > 0 ? "FAIL" :
    missing.length > 0 || (control.required_evidence ?? []).length === 0 ? "UNVERIFIED" :
    partial.length > 0 ? "WARN" : "PASS";

  return {
    controlId: control.id,
    applicable: true,
    status,
    severity: control.severity,
    failureDecision: control.failure_decision ?? "NONE",
    missingEvidence: missing,
    supportingEvidence: supporting,
    reason:
      failed.length > 0 ? `Required evidence is inapplicable: ${failed.join(", ")}.` :
      missing.length > 0 ? `Required evidence is missing, stale, unlinked, duplicated, or unverified: ${missing.join(", ")}.` :
      (control.required_evidence ?? []).length === 0 ? "No required evidence is declared; verification cannot be established." :
      partial.length > 0 ? `Required evidence is only partially verified: ${partial.join(", ")}.` :
      `Required evidence is verified for control ${control.id}.`,
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
