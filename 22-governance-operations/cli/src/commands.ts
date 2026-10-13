import { analyzeRepository } from "../../analyzer/src/pipeline.js";
import type { ArchitectureProfile } from "../../analyzer/src/architecture.js";
import { runVerificationAdapters } from "../../analyzer/src/verification.js";
import type { VerificationToolRunner } from "../../analyzer/src/verification.js";
import { toGovernanceContext } from "../../analyzer/src/normalize.js";
import { evaluateGovernance } from "../../engine/src/decision.js";
import type { GovernancePack, GovernanceViolation } from "../../engine/src/types.js";
import { formatAnalysisResult, formatHumanResult, formatJsonResult } from "./output.js";

export interface AnalyzeCommandInput {
  snapshot: Parameters<typeof analyzeRepository>[0];
  governancePack: GovernancePack;
  json?: boolean;
  architectureProfile?: ArchitectureProfile;
  verificationRunner?: VerificationToolRunner;
}

export async function runGovernanceCommand(input: AnalyzeCommandInput) {
  const analysis = await analyzeRepository(input.snapshot, undefined, input.architectureProfile);

  if (input.verificationRunner) {
    const verification = await runVerificationAdapters(input.snapshot, input.verificationRunner);
    analysis.verification = verification;
    analysis.evidence.push(...verification.evidence);
    analysis.findings.push(...verification.findings);
    analysis.adapterResults.push(...verification.adapterResults);
  }

  const packEvidenceIds = new Set(input.governancePack.evidence.map((item) => item.id));
  const collidingEvidence = analysis.evidence.filter((item) => packEvidenceIds.has(item.id));
  if (collidingEvidence.length > 0) {
    analysis.findings.push(...collidingEvidence.map((item) => ({
      id: `FND-EVIDENCE-COLLISION-${item.id}`,
      rule_id: "EVIDENCE-ID-COLLISION",
      severity: "P1" as const,
      category: "evidence-integrity",
      message: `Generated evidence ID '${item.id}' conflicts with evidence declared in the governance pack; neither record was silently substituted.`,
      status: "OPEN" as const,
      evidence_refs: [item.id],
      confidence: 1,
      remediation: "Use distinct, namespaced evidence IDs and rerun the assessment.",
    })));
  }

  const context = toGovernanceContext(analysis);
  const assessmentPack: GovernancePack = {
    ...input.governancePack,
    evidence: [
      ...input.governancePack.evidence,
      ...analysis.evidence.filter((item) => !packEvidenceIds.has(item.id)),
    ],
  };
  const evaluation = evaluateGovernance(assessmentPack, context);

  const missingRequiredControls = (input.architectureProfile?.requiredControls ?? [])
    .filter((controlId) => !input.governancePack.controls.some((control) => control.id === controlId));
  const profileControlViolations: GovernanceViolation[] = missingRequiredControls.map((controlId) => ({
    controlId: `PROFILE:${input.architectureProfile?.id}:REQUIRED-CONTROL:${controlId}`,
    severity: "P1",
    decision: "NO-GO",
    message: `Architecture profile '${input.architectureProfile?.id}' requires governance control '${controlId}', but the governance pack does not define it.`,
    missingEvidence: [],
    missingSignals: [],
  }));

  if (profileControlViolations.length > 0) {
    evaluation.decision.status = "NO-GO";
    evaluation.decision.blockingViolations.push(...profileControlViolations);
    evaluation.decision.reason = `${evaluation.decision.reason} ${profileControlViolations.length} required architecture control(s) are missing from the governance pack.`;
    evaluation.violations.push(...profileControlViolations);
  }

  const output = input.json
    ? formatJsonResult(analysis, evaluation, context)
    : formatHumanResult(analysis, evaluation, context);

  return { analysis, context, evaluation, output };
}

export async function runAnalyzeCommand(input: AnalyzeCommandInput): Promise<string> {
  return (await runGovernanceCommand(input)).output;
}

export async function runRepositoryAnalysisCommand(
  snapshot: Parameters<typeof analyzeRepository>[0],
  json = false,
  architectureProfile?: ArchitectureProfile,
  verificationRunner?: VerificationToolRunner,
) {
  const analysis = await analyzeRepository(snapshot, undefined, architectureProfile);
  if (verificationRunner) {
    const verification = await runVerificationAdapters(snapshot, verificationRunner);
    analysis.verification = verification;
    analysis.evidence.push(...verification.evidence);
    analysis.findings.push(...verification.findings);
    analysis.adapterResults.push(...verification.adapterResults);
  }
  const context = toGovernanceContext(analysis);
  return {
    analysis,
    context,
    output: formatAnalysisResult(analysis, context, json),
  };
}
