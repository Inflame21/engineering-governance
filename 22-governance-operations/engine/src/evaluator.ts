import type {
  ApplicabilityStatus,
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

export function resolveControlApplicability(
  control: GovernanceControl,
  context: GovernanceContext,
): { status: ApplicabilityStatus; missingSignals: string[] } {
  const conditions = normalizeConditions(control.applies_when);
  if (conditions.length === 0) {
    return { status: "APPLICABLE", missingSignals: [] };
  }

  const signals = new Set(context.signals);
  const missingSignals = conditions.filter((condition) => !signals.has(condition));
  if (missingSignals.length === 0) {
    return { status: "APPLICABLE", missingSignals: [] };
  }

  // A missing signal proves non-applicability only after analysis is complete.
  // Missing analysis status is treated conservatively as incomplete.
  if (context.analysisStatus === "COMPLETE") {
    return { status: "NOT_APPLICABLE", missingSignals };
  }

  return { status: "UNVERIFIED", missingSignals };
}

/** Boolean compatibility helper. Unknown applicability is not considered applicable proof. */
export function isControlApplicable(
  control: GovernanceControl,
  context: GovernanceContext,
): boolean {
  return resolveControlApplicability(control, context).status === "APPLICABLE";
}

function evidenceIsUsable(
  control: GovernanceControl,
  item: GovernanceEvidence,
  evaluatedAt?: string,
): boolean {
  const legacyFreshness = item.freshness.trim().toLowerCase();
  if (
    item.status !== "VERIFIED" ||
    (item.freshness_status !== undefined && item.freshness_status !== "current") ||
    (item.freshness_status === undefined && ["stale", "expired", "unknown"].includes(legacyFreshness))
  ) return false;

  const maxAgeSeconds = control.max_evidence_age_seconds;
  if (maxAgeSeconds === undefined) return true;
  if (!item.generated_at) return false;

  const generatedAt = Date.parse(item.generated_at);
  const assessmentTime = evaluatedAt ? Date.parse(evaluatedAt) : Date.now();
  if (!Number.isFinite(generatedAt) || !Number.isFinite(assessmentTime)) return false;

  const ageSeconds = (assessmentTime - generatedAt) / 1_000;
  return ageSeconds >= 0 && ageSeconds <= maxAgeSeconds;
}

function evidenceForControl(
  control: GovernanceControl,
  evidence: GovernanceEvidence[],
  evaluatedAt?: string,
): { missing: string[]; supporting: string[] } {
  const required = control.required_evidence ?? [];
  const byId = new Map(evidence.map((item) => [item.id, item]));
  const missing = new Set<string>();
  const supporting = new Set<string>();

  // When a control does not enumerate evidence IDs, require evidence explicitly
  // linked to the control rather than treating an empty list as proof of success.
  const explicitlyLinked = evidence.filter((item) => item.supports_controls.includes(control.id));
  const evidenceIds = required.length > 0
    ? required
    : explicitlyLinked.map((item) => item.id);

  if (evidenceIds.length === 0) {
    return { missing: [`EVIDENCE_REQUIRED:${control.id}`], supporting: [] };
  }

  for (const evidenceId of evidenceIds) {
    const item = byId.get(evidenceId);
    if (!item || !evidenceIsUsable(control, item, evaluatedAt)) {
      missing.add(evidenceId);
      continue;
    }
    supporting.add(evidenceId);
  }

  // A control cannot be passed from a selected subset of its evidence while a
  // separate record explicitly linked to that same control is stale, partial,
  // unverified, or otherwise unusable.  The model has no assertion scope that
  // could safely prove the records address different checks, so fail closed.
  for (const item of explicitlyLinked) {
    if (!evidenceIsUsable(control, item, evaluatedAt)) missing.add(item.id);
  }

  return { missing: [...missing].sort(), supporting: [...supporting].sort() };
}

export function evaluateControl(
  control: GovernanceControl,
  evidence: GovernanceEvidence[],
  context: GovernanceContext,
): ControlEvaluation {
  const applicability = resolveControlApplicability(control, context);
  const failureDecision = control.failure_decision ?? "NONE";

  if (applicability.status === "NOT_APPLICABLE") {
    return {
      controlId: control.id,
      applicable: false,
      applicabilityStatus: "NOT_APPLICABLE",
      status: "NOT_APPLICABLE",
      severity: control.severity,
      failureDecision,
      missingEvidence: [],
      missingSignals: applicability.missingSignals,
      supportingEvidence: [],
      reason: "Control conditions are absent and repository analysis completed successfully.",
    };
  }

  const { missing, supporting } = evidenceForControl(control, evidence, context.evaluatedAt);

  if (applicability.status === "UNVERIFIED") {
    return {
      controlId: control.id,
      applicable: true,
      applicabilityStatus: "UNVERIFIED",
      status: control.status === "FAIL" ? "FAIL" : "UNVERIFIED",
      severity: control.severity,
      failureDecision,
      missingEvidence: missing,
      missingSignals: applicability.missingSignals,
      supportingEvidence: supporting,
      reason: `Control applicability could not be established because repository analysis is ${context.analysisStatus ?? "not declared"}. Missing signals: ${applicability.missingSignals.join(", ")}.`,
    };
  }

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
    reason = `Required evidence is missing, stale, partial, unverified, or not applicable: ${missing.join(", ")}.`;
  } else {
    reason = `Verified evidence satisfies control ${control.id}.`;
  }

  return {
    controlId: control.id,
    applicable: true,
    applicabilityStatus: "APPLICABLE",
    status,
    severity: control.severity,
    failureDecision,
    missingEvidence: missing,
    missingSignals: [],
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
