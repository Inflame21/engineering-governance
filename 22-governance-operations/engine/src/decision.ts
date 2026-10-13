import { evaluateControl } from "./evaluator.js";
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

interface ExceptionAssessment {
  valid: boolean;
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
  if (control.severity === "P0") {
    return {
      valid: false,
      controlSeverity: control.severity,
      reason: "P0 controls cannot be waived by an exception.",
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

  const blockingControlViolations = violations.filter(
    (item) => item.decision === "NO-GO" || item.severity === "P0",
  );
  const controlWarnings = violations.filter(
    (item) => !blockingControlViolations.includes(item),
  );

  const openRisks: GovernanceRisk[] = pack.risks
    .filter((risk) =>
      risk.status === "OPEN" ||
      (risk.status === "ACCEPTED" && !isRiskAcceptanceValid(risk, context)),
    )
    .map((risk) => risk.status === "ACCEPTED" ? { ...risk, status: "OPEN" } : risk);

  const riskViolations: GovernanceViolation[] = openRisks.map((risk) => ({
    controlId: `RISK:${risk.id}`,
    severity: risk.severity,
    decision:
      risk.severity === "P0" || risk.severity === "P1"
        ? "NO-GO"
        : "GO_WITH_CONDITIONS",
    message:
      pack.risks.some((sourceRisk) => sourceRisk.id === risk.id && sourceRisk.status === "ACCEPTED")
        ? `Risk ${risk.id} has an invalid or expired acceptance and is treated as open.`
        : risk.title,
    missingEvidence: [],
    missingSignals: [],
  }));
  const blockingRiskViolations = riskViolations.filter(
    (item) => item.severity === "P0" || item.severity === "P1",
  );
  const riskWarnings = riskViolations.filter(
    (item) => item.severity === "P2" || item.severity === "P3",
  );

  const exceptionWarnings: GovernanceViolation[] = [];
  for (const exception of pack.exceptions ?? []) {
    if (exception.status === "REQUESTED") {
      exceptionWarnings.push({
        controlId: `EXCEPTION:${exception.id}`,
        severity: "P2",
        decision: "GO_WITH_CONDITIONS",
        message: `Exception ${exception.id} is requested but not approved; it does not waive the control.`,
        missingEvidence: [],
        missingSignals: [],
      });
    } else if (exception.status === "EXPIRED") {
      exceptionWarnings.push({
        controlId: `EXCEPTION:${exception.id}`,
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
        severity,
        decision: "GO_WITH_CONDITIONS",
        message: assessment?.valid
          ? `Exception ${exception.id} is active; residual risk remains and the exception expires at ${exception.expires_at}.`
          : `Exception ${exception.id} was not applied: ${assessment?.reason ?? "validity could not be established"}`,
        missingEvidence: [],
        missingSignals: [],
      });
    }
  }

  const blockingViolations = [...blockingControlViolations, ...blockingRiskViolations]
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  const warnings = [...controlWarnings, ...riskWarnings, ...exceptionWarnings]
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  if (blockingViolations.length > 0) {
    return {
      status: "NO-GO",
      reason:
        blockingControlViolations.length > 0
          ? `Production blocked by ${blockingControlViolations.length} blocking control violation(s) and ${blockingRiskViolations.length} blocking risk(s).`
          : `Production blocked by ${blockingRiskViolations.length} open or unaccepted P0/P1 risk(s).`,
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

  return {
    controls,
    violations: [...decision.blockingViolations, ...decision.warnings],
    decision,
  };
}
