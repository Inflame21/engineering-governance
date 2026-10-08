import { evaluateControl } from "./evaluator.js";
import type {
  ControlEvaluation,
  GovernanceContext,
  GovernanceDecision,
  GovernanceEvaluation,
  GovernancePack,
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
      `Control ${control.controlId} is ${control.status}.`,
    missingEvidence: control.missingEvidence,
  };
}

export function deriveDecision(
  pack: GovernancePack,
  evaluations: ControlEvaluation[],
): GovernanceDecision {
  const violations = evaluations
    .filter(
      (item) =>
        item.applicable &&
        item.status !== "PASS" &&
        item.status !== "NOT_APPLICABLE",
    )
    .map((item) => toViolation(item, pack));

  const blockingViolations = violations.filter(
    (item) => item.decision === "NO-GO" || item.severity === "P0",
  );

  const warnings = violations.filter(
    (item) => !blockingViolations.includes(item),
  );

  const openRisks = pack.risks.filter(
    (risk) => risk.status === "OPEN" && (risk.severity === "P0" || risk.severity === "P1"),
  );

  if (blockingViolations.length > 0 || openRisks.length > 0) {
    const riskViolations: GovernanceViolation[] = openRisks.map((risk) => ({
      controlId: `RISK:${risk.id}`,
      severity: risk.severity,
      decision: "NO-GO",
      message: risk.title,
      missingEvidence: [],
    }));

    return {
      status: "NO-GO",
      reason:
        blockingViolations.length > 0
          ? `Production blocked by ${blockingViolations.length} control violation(s).`
          : `Production blocked by ${openRisks.length} open P0/P1 risk(s).`,
      blockingViolations: [...blockingViolations, ...riskViolations].sort(
        (a, b) => severityRank[a.severity] - severityRank[b.severity],
      ),
      warnings: warnings.sort(
        (a, b) => severityRank[a.severity] - severityRank[b.severity],
      ),
    };
  }

  if (warnings.length > 0) {
    return {
      status: "GO_WITH_CONDITIONS",
      reason: `${warnings.length} applicable control(s) require review or conditional approval.`,
      blockingViolations: [],
      warnings: warnings.sort(
        (a, b) => severityRank[a.severity] - severityRank[b.severity],
      ),
    };
  }

  return {
    status: "GO",
    reason: "All applicable controls are satisfied and no blocking risks remain.",
    blockingViolations: [],
    warnings: [],
  };
}

export function evaluateGovernance(
  pack: GovernancePack,
  context: GovernanceContext,
): GovernanceEvaluation {
  const controls = pack.controls.map((control) =>
    evaluateControl(control, pack.evidence, context),
  );

  const decision = deriveDecision(pack, controls);

  return {
    controls,
    violations: [...decision.blockingViolations, ...decision.warnings],
    decision,
  };
}
