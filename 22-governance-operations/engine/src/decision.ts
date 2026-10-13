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
      control.reason ??
      `Control ${control.controlId} is ${control.status}.`,
    missingEvidence: control.missingEvidence,
    missingSignals: control.missingSignals,
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

  const blockingControlViolations = violations.filter(
    (item) => item.decision === "NO-GO" || item.severity === "P0",
  );
  const controlWarnings = violations.filter(
    (item) => !blockingControlViolations.includes(item),
  );

  const openRisks = pack.risks.filter((risk) => risk.status === "OPEN");
  const riskViolations: GovernanceViolation[] = openRisks.map((risk) => ({
    controlId: `RISK:${risk.id}`,
    severity: risk.severity,
    decision:
      risk.severity === "P0" || risk.severity === "P1"
        ? "NO-GO"
        : "GO_WITH_CONDITIONS",
    message: risk.title,
    missingEvidence: [],
    missingSignals: [],
  }));
  const blockingRiskViolations = riskViolations.filter(
    (item) => item.severity === "P0" || item.severity === "P1",
  );
  const riskWarnings = riskViolations.filter(
    (item) => item.severity === "P2" || item.severity === "P3",
  );
  const blockingViolations = [...blockingControlViolations, ...blockingRiskViolations]
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  const warnings = [...controlWarnings, ...riskWarnings]
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  if (blockingViolations.length > 0) {
    return {
      status: "NO-GO",
      reason:
        blockingControlViolations.length > 0
          ? `Production blocked by ${blockingControlViolations.length} blocking control violation(s) and ${blockingRiskViolations.length} blocking risk(s).`
          : `Production blocked by ${blockingRiskViolations.length} open P0/P1 risk(s).`,
      blockingViolations,
      warnings,
      openRisks,
    };
  }

  if (warnings.length > 0) {
    return {
      status: "GO_WITH_CONDITIONS",
      reason: `${warnings.length} applicable control or risk item(s) require review or conditional approval.`,
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

  const decision = deriveDecision(pack, controls);

  // Incomplete repository analysis must be visible in the final result even when
  // the governance pack has no applicable controls for the capabilities missed.
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

  return {
    controls,
    violations: [...decision.blockingViolations, ...decision.warnings],
    decision,
  };
}
