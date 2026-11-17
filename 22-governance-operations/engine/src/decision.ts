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
    status: control.status,
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

  // An unrecognized severity is treated as P0 so malformed packs fail closed.
  const isLowSeverity = (severity: string) =>
    severity === "P1" || severity === "P2" || severity === "P3";

  const blockingViolations = violations.filter(
    (item) => item.status === "UNVERIFIED" || item.status === "FAIL" || item.decision === "NO-GO" || !isLowSeverity(item.severity),
  );

  const warnings = violations.filter(
    (item) => !blockingViolations.includes(item),
  );

  // ACCEPTED is a claim, not an approval: the engine cannot verify the approver, expiry or
  // exception behind it, and P0 is not approvable (EXC-021 section 8). Until exceptions are
  // evaluated, only MITIGATED/CLOSED resolves a P0/P1 risk; any other or unrecognized
  // status, and any unrecognized severity, fails closed.
  const openRisks = pack.risks.filter(
    (risk) =>
      risk.status !== "MITIGATED" &&
      risk.status !== "CLOSED" &&
      risk.severity !== "P2" &&
      risk.severity !== "P3",
  );

  if (blockingViolations.length > 0 || openRisks.length > 0) {
    const riskViolations: GovernanceViolation[] = openRisks.map((risk) => ({
      controlId: `RISK:${risk.id}`,
      status: "FAIL",
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
          : `Production blocked by ${openRisks.length} unresolved P0/P1 risk(s) (open, or accepted without verifiable approval).`,
      blockingViolations: [...blockingViolations, ...riskViolations].sort(
        (a, b) => (severityRank[a.severity] ?? 0) - (severityRank[b.severity] ?? 0),
      ),
      warnings: warnings.sort(
        (a, b) => (severityRank[a.severity] ?? 0) - (severityRank[b.severity] ?? 0),
      ),
    };
  }

  if (warnings.length > 0) {
    return {
      status: "GO_WITH_CONDITIONS",
      reason: `${warnings.length} applicable control(s) require review or conditional approval.`,
      blockingViolations: [],
      warnings: warnings.sort(
        (a, b) => (severityRank[a.severity] ?? 0) - (severityRank[b.severity] ?? 0),
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
