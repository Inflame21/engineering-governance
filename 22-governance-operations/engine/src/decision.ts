import { checkApproverAuthority } from "./authority.js";
import { evaluateControl } from "./evaluator.js";
import { validateGovernancePackSemantics } from "./validation.js";
import { evaluateDebt } from "./debt.js";
import { evaluateIncidents, incidentsByDebt } from "./incidents.js";
import type {
  ControlEvaluation,
  GovernanceContext,
  GovernanceDecision,
  GovernanceEvaluation,
  GovernanceException,
  GovernancePack,
  GovernanceRisk,
  GovernanceViolation,
} from "./types.js";

const severityRank: Record<GovernanceViolation["severity"], number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

function toViolation(
  control: ControlEvaluation,
  pack: GovernancePack,
): GovernanceViolation {
  const definition = pack.controls.find((item) => item.id === control.controlId);
  return {
    controlId: control.controlId,
    status: control.status,
    severity: control.severity,
    decision: control.failureDecision,
    message:
      definition?.message ??
      control.reason ??
      `Control ${control.controlId} is ${control.status}.`,
    missingEvidence: control.missingEvidence,
    missingSignals: control.missingSignals,
  };
}

function isRiskAcceptanceValid(
  risk: GovernanceRisk,
  context: GovernanceContext,
): boolean {
  if (
    risk.status !== "ACCEPTED" ||
    !risk.accepted_by?.trim() ||
    !risk.acceptance_reason?.trim() ||
    !risk.accepted_at ||
    !risk.acceptance_expires_at ||
    !context.evaluatedAt
  ) {
    return false;
  }

  const acceptedAt = Date.parse(risk.accepted_at);
  const expiresAt = Date.parse(risk.acceptance_expires_at);
  const evaluatedAt = Date.parse(context.evaluatedAt);
  if (
    Number.isNaN(acceptedAt) ||
    Number.isNaN(expiresAt) ||
    Number.isNaN(evaluatedAt)
  ) {
    return false;
  }

  return acceptedAt <= evaluatedAt && evaluatedAt < expiresAt && acceptedAt < expiresAt;
}

/**
 * Whether an ACCEPTED risk's acceptance holds. P0 is never approvable (EXC-021 section 8). When approved
 * authority roles are supplied, the accepter must hold one that covers the risk's severity, which is
 * what allows a P1 acceptance. Without them only P2/P3 acceptances hold, as before.
 */
function riskAcceptanceHolds(risk: GovernanceRisk, context: GovernanceContext): boolean {
  if (risk.status !== "ACCEPTED" || !isRiskAcceptanceValid(risk, context)) return false;
  if (risk.severity === "P0") return false;
  const authority = context.approverAuthority;
  if (authority && authority.length > 0) {
    return checkApproverAuthority(risk.accepted_by ?? "", risk.acceptance_role, risk.severity, authority).authorized;
  }
  return risk.severity === "P2" || risk.severity === "P3";
}

/** Days left before an exception lapses, as a phrase for reports. Silent when it is more than a fortnight away. */
export const EXPIRY_WARNING_DAYS = 14;
export function expiryCountdown(expiresAt: string | undefined, evaluatedAt: string | undefined): string {
  const days = daysUntil(expiresAt, evaluatedAt);
  return days === undefined || days > EXPIRY_WARNING_DAYS ? "" : ` (expiring in ${days} day${days === 1 ? "" : "s"})`;
}

/** Whole days (rounded up) from the evaluation time to a timestamp; undefined when either is unusable. */
export function daysUntil(timestamp: string | undefined, evaluatedAt: string | undefined): number | undefined {
  const target = Date.parse(timestamp ?? "");
  const now = Date.parse(evaluatedAt ?? "");
  return Number.isNaN(target) || Number.isNaN(now) ? undefined : Math.ceil((target - now) / 86_400_000);
}

interface ExceptionAssessment {
  valid: boolean;
  /** The authority role the waiver was approved under, when authority was checked. */
  role?: string;
  reason: string;
  controlSeverity?: GovernanceViolation["severity"];
}

function assessApprovedException(
  exception: GovernanceException,
  pack: GovernancePack,
  context: GovernanceContext,
): ExceptionAssessment {
  if (exception.status !== "APPROVED") {
    return { valid: false, reason: "Exception is not approved." };
  }

  const control = pack.controls.find((item) => item.id === exception.control);
  if (!control) {
    return { valid: false, reason: "Exception references an unknown control." };
  }
  if (context.nonExceptionableControls?.includes(control.id)) {
    return {
      valid: false,
      controlSeverity: control.severity,
      reason: `Control ${control.id} is non-exceptionable (EXC-021 section 7); an exception cannot waive it.`,
    };
  }
  if (
    exception.project_id !== pack.project.id ||
    exception.change_id !== pack.change.id
  ) {
    return {
      valid: false,
      controlSeverity: control.severity,
      reason: "Exception is outside the current project/change scope.",
    };
  }
  if (
    !exception.reason?.trim() ||
    !exception.requested_by?.trim() ||
    !exception.requested_at ||
    !exception.approved_by?.trim() ||
    !exception.approved_at ||
    !exception.expires_at
  ) {
    return {
      valid: false,
      controlSeverity: control.severity,
      reason: "Exception is missing required request or approval metadata.",
    };
  }
  if (!context.evaluatedAt) {
    return {
      valid: false,
      controlSeverity: control.severity,
      reason: "Evaluation timestamp is unavailable; exception validity cannot be verified.",
    };
  }

  const requestedAt = Date.parse(exception.requested_at);
  const approvedAt = Date.parse(exception.approved_at);
  const expiresAt = Date.parse(exception.expires_at);
  const evaluatedAt = Date.parse(context.evaluatedAt);
  if (
    [requestedAt, approvedAt, expiresAt, evaluatedAt].some((value) => Number.isNaN(value)) ||
    requestedAt > approvedAt ||
    approvedAt > evaluatedAt ||
    approvedAt >= expiresAt ||
    expiresAt <= evaluatedAt
  ) {
    return {
      valid: false,
      controlSeverity: control.severity,
      reason: "Exception has an invalid, future, or expired approval time window.",
    };
  }
  if (exception.requested_by.trim().toLowerCase() === exception.approved_by.trim().toLowerCase()) {
    return {
      valid: false,
      controlSeverity: control.severity,
      reason: "The requester cannot approve their own exception (EXC-021 section 15).",
    };
  }
  if (control.severity === "P0") {
    return {
      valid: false,
      controlSeverity: control.severity,
      reason: "P0 controls cannot be waived by an exception; they need the emergency governance process (EXC-021 section 8).",
    };
  }
  if (context.verifiedApprovals && !context.verifiedApprovals.includes(exception.id)) {
    return {
      valid: false,
      controlSeverity: control.severity,
      reason: "The approval has no verified signature from the approver's registered key, so the approver is not authenticated.",
    };
  }
  const authority = context.approverAuthority;
  if (authority && authority.length > 0) {
    const check = checkApproverAuthority(exception.approved_by, exception.approver_role, control.severity, authority);
    if (!check.authorized) {
      return {
        valid: false,
        controlSeverity: control.severity,
        reason: `Approver authority is not established: ${check.reason} (EXC-021 section 15).`,
      };
    }
    return {
      valid: true,
      role: exception.approver_role as string,
      controlSeverity: control.severity,
      reason: `Approved exception is active and in scope; ${check.reason}.`,
    };
  }
  if (control.severity === "P1") {
    return {
      valid: false,
      controlSeverity: control.severity,
      reason: "P1 controls cannot be waived by an exception without an approved approver-authority policy (EXC-021 sections 8 and 15).",
    };
  }

  return {
    valid: true,
    controlSeverity: control.severity,
    reason: "Approved exception is active and in scope.",
  };
}

export function deriveDecision(
  pack: GovernancePack,
  evaluations: ControlEvaluation[],
  context: GovernanceContext = { signals: [] },
): GovernanceDecision {
  const exceptionAssessments = new Map<string, ExceptionAssessment>();
  const applicableExceptions = new Map<string, GovernanceException>();

  for (const exception of pack.exceptions ?? []) {
    if (exception.status !== "APPROVED") continue;
    const assessment = assessApprovedException(exception, pack, context);
    exceptionAssessments.set(exception.id, assessment);
    if (assessment.valid && exception.control) {
      applicableExceptions.set(exception.control, exception);
    }
  }

  const violations = evaluations
    .filter(
      (item) =>
        item.applicable &&
        item.status !== "PASS" &&
        item.status !== "NOT_APPLICABLE",
    )
    .map((item) => {
      const violation = toViolation(item, pack);
      const exception = applicableExceptions.get(item.controlId);
      if (!exception) return violation;
      return {
        ...violation,
        decision: "GO_WITH_CONDITIONS" as const,
        message: `${violation.message} An approved exception (${exception.id}) is active until ${exception.expires_at}; the control remains unverified or failed.`,
      };
    });

  // An unrecognized severity is treated as P0 so malformed packs fail closed.
  const isLowSeverity = (severity: string) =>
    severity === "P1" || severity === "P2" || severity === "P3";

  const blockingControlViolations = violations.filter(
    (item) =>
      !isLowSeverity(item.severity) ||
      (!applicableExceptions.has(item.controlId) &&
        (item.status === "UNVERIFIED" ||
          item.status === "FAIL" ||
          item.decision === "NO-GO")),
  );
  const controlWarnings = violations.filter(
    (item) => !blockingControlViolations.includes(item),
  );

  // A risk is resolved only when MITIGATED/CLOSED, or ACCEPTED with an acceptance that holds
  // (valid, unexpired and, for P1, made by a holder of an approved authority role; see
  // riskAcceptanceHolds). Anything else, including a missing or unrecognised status, is open so
  // malformed records fail closed. P0 is never approvable (EXC-021 section 8).
  const isLowRisk = (risk: GovernanceRisk) => risk.severity === "P2" || risk.severity === "P3";
  const openRisks: GovernanceRisk[] = pack.risks
    .filter((risk) =>
      risk.status !== "MITIGATED" &&
      risk.status !== "CLOSED" &&
      !riskAcceptanceHolds(risk, context),
    )
    .map((risk): GovernanceRisk => risk.status === "ACCEPTED" ? { ...risk, status: "OPEN" } : risk)
    .sort((a, b) => (severityRank[a.severity] ?? 0) - (severityRank[b.severity] ?? 0) || a.id.localeCompare(b.id));

  const riskViolations: GovernanceViolation[] = openRisks.map((risk) => ({
    controlId: `RISK:${risk.id}`,
    status: isLowRisk(risk) ? "WARN" : "FAIL",
    severity: risk.severity,
    decision: isLowRisk(risk) ? "GO_WITH_CONDITIONS" : "NO-GO",
    message:
      pack.risks.some((sourceRisk) => sourceRisk.id === risk.id && sourceRisk.status === "ACCEPTED")
        ? `Risk ${risk.id} is ACCEPTED, but the acceptance does not hold (invalid, expired, or the approver's authority is not established) and it is treated as open.`
        : risk.title,
    missingEvidence: [],
    missingSignals: [],
  }));
  const blockingRiskViolations = riskViolations.filter((item) => item.decision === "NO-GO");
  const acceptedP1Warnings: GovernanceViolation[] = pack.risks
    .filter((risk) => risk.severity === "P1" && riskAcceptanceHolds(risk, context))
    .map((risk) => ({
      controlId: `RISK:${risk.id}`,
      status: "WARN" as const,
      severity: risk.severity,
      decision: "GO_WITH_CONDITIONS" as const,
      message: `Risk ${risk.id} is accepted under authority role ${risk.acceptance_role} until ${risk.acceptance_expires_at}; residual P1 risk remains. The approver's identity is declared in the governance pack, not authenticated.`,
      missingEvidence: [],
      missingSignals: [],
    }));
  const riskWarnings = [...riskViolations.filter((item) => item.decision !== "NO-GO"), ...acceptedP1Warnings];

  const exceptionWarnings: GovernanceViolation[] = [];
  for (const exception of pack.exceptions ?? []) {
    if (exception.status === "REQUESTED") {
      exceptionWarnings.push({
        controlId: `EXCEPTION:${exception.id}`,
        status: "WARN",
        severity: "P2",
        decision: "GO_WITH_CONDITIONS",
        message: `Exception ${exception.id} is requested but not approved; it does not waive the control.`,
        missingEvidence: [],
        missingSignals: [],
      });
    } else if (exception.status === "EXPIRED") {
      exceptionWarnings.push({
        controlId: `EXCEPTION:${exception.id}`,
        status: "WARN",
        severity: "P1",
        decision: "GO_WITH_CONDITIONS",
        message: `Exception ${exception.id} is expired and cannot waive a control.`,
        missingEvidence: [],
        missingSignals: [],
      });
    } else if (exception.status === "APPROVED") {
      const assessment = exceptionAssessments.get(exception.id);
      const severity = assessment?.controlSeverity ?? "P1";
      exceptionWarnings.push({
        controlId: `EXCEPTION:${exception.id}`,
        status: "WARN",
        severity,
        decision: "GO_WITH_CONDITIONS",
        message: assessment?.valid
          ? `Exception ${exception.id} is active; residual risk remains and the exception expires at ${exception.expires_at}${expiryCountdown(exception.expires_at, context.evaluatedAt)}.${assessment.role ? ` Approved under authority role ${assessment.role}; ${context.verifiedApprovals ? "the approver's signature was verified" : "the approver's identity is declared in the governance pack, not authenticated"}.` : ""}`
          : `Exception ${exception.id} was not applied: ${assessment?.reason ?? "validity could not be established"}`,
        missingEvidence: [],
        missingSignals: [],
      });
    }
  }

  // GOV-022 section 10: unknown is not safe. If no control applied, nothing was assessed, so an
  // empty pack or a context that matches no control must not read as GO (DEBT-GOV-003).
  const scopeViolations: GovernanceViolation[] = evaluations.some((item) => item.applicable)
    ? []
    : [{
        controlId: "SCOPE:NO_APPLICABLE_CONTROLS",
        status: "UNVERIFIED",
        severity: "P1",
        decision: "NO-GO",
        message: "No governance control applied to this change, so nothing was evaluated.",
        missingEvidence: [],
        missingSignals: [],
      }];

  const blockingViolations = [...blockingControlViolations, ...blockingRiskViolations, ...scopeViolations]
    .sort((a, b) => (severityRank[a.severity] ?? 0) - (severityRank[b.severity] ?? 0) || a.controlId.localeCompare(b.controlId));
  const warnings = [...controlWarnings, ...riskWarnings, ...exceptionWarnings]
    .sort((a, b) => (severityRank[a.severity] ?? 0) - (severityRank[b.severity] ?? 0) || a.controlId.localeCompare(b.controlId));

  if (blockingViolations.length > 0) {
    return {
      status: "NO-GO",
      reason:
        blockingControlViolations.length > 0
          ? `Production blocked by ${blockingControlViolations.length} blocking control violation(s) and ${blockingRiskViolations.length} blocking risk(s).`
          : blockingRiskViolations.length > 0
            ? `Production blocked by ${blockingRiskViolations.length} open or unaccepted P0/P1 risk(s).`
            : "Production blocked: no applicable control was evaluated, so the change is unassessed.",
      blockingViolations,
      warnings,
      openRisks,
    };
  }

  if (warnings.length > 0) {
    return {
      status: "GO_WITH_CONDITIONS",
      reason: `${warnings.length} control, risk, or exception item(s) require review or conditional approval.`,
      blockingViolations: [],
      warnings,
      openRisks,
    };
  }

  return {
    status: "GO",
    reason: "All applicable controls are satisfied and no open risks remain.",
    blockingViolations: [],
    warnings: [],
    openRisks,
  };
}

export function evaluateGovernance(
  pack: GovernancePack,
  context: GovernanceContext,
): GovernanceEvaluation {
  // Keep the engine safe when called directly, bypassing CLI pack loading.
  // A semantic error makes any derived decision ambiguous, so no invalid pack
  // may reach evaluation through this public API.
  const semanticIssues = validateGovernancePackSemantics(pack, context.evaluatedAt);
  if (semanticIssues.length > 0) {
    const details = semanticIssues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join("; ");
    throw new Error(`Governance pack semantic validation failed: ${details}`);
  }

  const controls = pack.controls.map((control) =>
    evaluateControl(control, pack.evidence, context),
  );

  const decision = deriveDecision(pack, controls, context);

  // Incomplete analysis must remain visible even when no control references the
  // capability the analyzer could not verify.
  if (context.analysisStatus && context.analysisStatus !== "COMPLETE") {
    const failed = context.analysisStatus === "FAILED";
    const analysisViolation: GovernanceViolation = {
      controlId: "ANALYSIS:COMPLETENESS",
      status: failed ? "FAIL" : "UNVERIFIED",
      severity: failed ? "P0" : "P1",
      decision: failed ? "NO-GO" : "GO_WITH_CONDITIONS",
      message: failed
        ? "Repository analysis failed; a production decision cannot be supported."
        : "Repository analysis is partial; unsupported or skipped checks require explicit review.",
      missingEvidence: [],
      missingSignals: context.unsupportedCapabilities ?? [],
    };

    if (failed) {
      decision.status = "NO-GO";
      decision.blockingViolations.push(analysisViolation);
    } else {
      if (decision.status === "GO") decision.status = "GO_WITH_CONDITIONS";
      decision.warnings.push(analysisViolation);
    }
    decision.reason = `${decision.reason} Analysis status: ${context.analysisStatus}.`;
  }

  if (context.changeScopeStatus === "UNVERIFIED") {
    const scopeViolation: GovernanceViolation = {
      controlId: "CHANGE-SCOPE:VERIFICATION",
      status: "UNVERIFIED",
      severity: "P1",
      decision: "GO_WITH_CONDITIONS",
      message: context.changeScopeReason
        ? `Changed-file scope could not be verified: ${context.changeScopeReason}`
        : "Changed-file scope was requested but could not be verified.",
      missingEvidence: [],
      missingSignals: [],
    };
    if (decision.status === "GO") decision.status = "GO_WITH_CONDITIONS";
    decision.warnings.push(scopeViolation);
    decision.reason = `${decision.reason} Changed-file scope is unverified.`;
  }

  const findingsById = new Map<string, NonNullable<GovernancePack["findings"]>[number]>();
  for (const finding of [...(pack.findings ?? []), ...(context.findings ?? [])]) {
    // Findings are only closed by an explicit RESOLVED state. A local "accepted"
    // or "suppressed" label is not, by itself, an approved risk exception.
    if (finding.status !== "RESOLVED") findingsById.set(finding.id, finding);
  }
  for (const finding of findingsById.values()) {
    const blocking = finding.severity === "P0" || finding.severity === "P1";
    const violation: GovernanceViolation = {
      controlId: `FINDING:${finding.id}`,
      status: blocking ? "FAIL" : "WARN",
      severity: finding.severity,
      decision: blocking ? "NO-GO" : "GO_WITH_CONDITIONS",
      message: `[${finding.rule_id}] ${finding.message}`,
      missingEvidence: [],
      missingSignals: [],
      evidenceRefs: finding.evidence_refs,
    };
    if (blocking) {
      decision.status = "NO-GO";
      decision.blockingViolations.push(violation);
    } else {
      if (decision.status === "GO") decision.status = "GO_WITH_CONDITIONS";
      decision.warnings.push(violation);
    }
  }
  if (findingsById.size > 0) {
    decision.reason = `${decision.reason} ${findingsById.size} unresolved finding(s) require remediation or governed acceptance.`;
  }

  // Technical debt (DEBT-020): unowned critical debt and unresolved P0 debt block; other debt that needs a
  // decision is a condition. The pack's debt is summarised in the evaluation whenever it has any.
  const debt = evaluateDebt(pack, controls, context.evaluatedAt, incidentsByDebt(pack));
  for (const violation of debt.blocking) {
    decision.status = "NO-GO";
    decision.blockingViolations.push(violation);
  }
  for (const violation of debt.conditions) {
    if (decision.status === "GO") decision.status = "GO_WITH_CONDITIONS";
    decision.warnings.push(violation);
  }
  if (debt.blocking.length > 0) {
    decision.reason = `${decision.reason} ${debt.blocking.length} technical debt item(s) block production (DEBT-020).`;
  } else if (debt.conditions.length > 0) {
    decision.reason = `${decision.reason} ${debt.conditions.length} technical debt item(s) need a decision or review (DEBT-020).`;
  }

  // Incidents (INC-019): every finding is a condition. The standard's automatic blockers are about
  // capabilities, which a list of past incidents cannot show (see incidents.ts).
  const incidents = evaluateIncidents(pack, controls, context.evaluatedAt);
  for (const violation of incidents.conditions) {
    if (decision.status === "GO") decision.status = "GO_WITH_CONDITIONS";
    decision.warnings.push(violation);
  }
  if (incidents.conditions.length > 0) {
    decision.reason = `${decision.reason} ${incidents.conditions.length} incident(s) need follow-up (INC-019).`;
  }

  return {
    controls,
    violations: [...decision.blockingViolations, ...decision.warnings],
    decision,
    ...((pack.debt ?? []).length > 0 ? { debt: debt.summary } : {}),
    ...((pack.incidents ?? []).length > 0 ? { incidents: incidents.summary } : {}),
  };
}
