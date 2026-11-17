import { analyzeRepository } from "../../analyzer/src/pipeline.js";
import type { ArchitectureProfile } from "../../analyzer/src/architecture.js";
import { runVerificationAdapters } from "../../analyzer/src/verification.js";
import type { VerificationToolRunner } from "../../analyzer/src/verification.js";
import { toGovernanceContext } from "../../analyzer/src/normalize.js";
import { evaluateGovernance } from "../../engine/src/decision.js";
import type { GovernancePack, GovernanceViolation } from "../../engine/src/types.js";
import { assessPackAgainstCatalog } from "./catalog.js";
import type { ControlCatalog, ProjectRegistration } from "./config.js";
import { formatAnalysisResult, formatHumanResult, formatJsonResult, formatMarkdownResult } from "./output.js";

export interface AnalyzeCommandInput {
  snapshot: Parameters<typeof analyzeRepository>[0];
  governancePack: GovernancePack;
  json?: boolean;
  markdown?: boolean;
  architectureProfile?: ArchitectureProfile;
  verificationRunner?: VerificationToolRunner;
  /** The registered project being assessed, when the registry was used. */
  registration?: ProjectRegistration;
  /** A control catalog the governance pack must satisfy. */
  controlCatalog?: ControlCatalog;
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

  if (!context.changeScopeStatus) {
    const scopeWarning: GovernanceViolation = {
      controlId: "CHANGE-SCOPE:NOT-REQUESTED",
      status: "UNVERIFIED",
      severity: "P1",
      decision: "GO_WITH_CONDITIONS",
      message: "Git changed-file scope was not requested. Pass --base <git-ref> before treating this as a complete change review.",
      missingEvidence: [],
      missingSignals: [],
    };
    if (evaluation.decision.status === "GO") evaluation.decision.status = "GO_WITH_CONDITIONS";
    evaluation.decision.warnings.push(scopeWarning);
    evaluation.decision.reason = `${evaluation.decision.reason} Git changed-file scope was not requested.`;
    evaluation.violations.push(scopeWarning);
  }

  if (context.changeScopeStatus === "VERIFIED") {
    const normalizeChangedPath = (file: string): string =>
      file.replaceAll("\\", "/").replace(/^\.\//, "");
    const actualFiles = new Set((context.changedFiles ?? []).map(normalizeChangedPath));
    const declaredFiles = new Set(input.governancePack.change.files.map(normalizeChangedPath));
    const undeclaredFiles = [...actualFiles].filter((file) => !declaredFiles.has(file)).sort();
    const staleDeclarations = [...declaredFiles].filter((file) => !actualFiles.has(file)).sort();

    if (undeclaredFiles.length > 0 || staleDeclarations.length > 0) {
      const details = [
        ...(undeclaredFiles.length ? [`undeclared changed files: ${undeclaredFiles.join(", ")}`] : []),
        ...(staleDeclarations.length ? [`declared but unchanged files: ${staleDeclarations.join(", ")}`] : []),
      ].join("; ");
      const scopeViolation: GovernanceViolation = {
        controlId: "CHANGE-SCOPE:DECLARATION-MISMATCH",
        status: "FAIL",
        severity: "P1",
        decision: "NO-GO",
        message: `The governance change manifest does not match the verified Git diff (${details}).`,
        missingEvidence: [],
        missingSignals: [],
      };
      evaluation.decision.status = "NO-GO";
      evaluation.decision.blockingViolations.push(scopeViolation);
      evaluation.decision.reason = `${evaluation.decision.reason} Declared change scope does not match the verified diff.`;
      evaluation.violations.push(scopeViolation);
    }
  }

  const missingRequiredControls = (input.architectureProfile?.requiredControls ?? [])
    .filter((controlId) => !input.governancePack.controls.some((control) => control.id === controlId));
  const profileControlViolations: GovernanceViolation[] = missingRequiredControls.map((controlId) => ({
    controlId: `PROFILE:${input.architectureProfile?.id}:REQUIRED-CONTROL:${controlId}`,
    status: "FAIL",
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

  // The pack must define every mandatory catalog control and may not weaken it. APPROVED controls
  // block; DRAFT controls are reported as one condition each and not enforced.
  if (input.controlCatalog) {
    const assessed = assessPackAgainstCatalog(input.governancePack, input.controlCatalog);
    if (assessed.blocking.length > 0) {
      evaluation.decision.status = "NO-GO";
      evaluation.decision.blockingViolations.push(...assessed.blocking);
      evaluation.violations.push(...assessed.blocking);
      evaluation.decision.reason = `${evaluation.decision.reason} ${assessed.blocking.length} APPROVED catalog control(s) are missing from, or weakened by, the governance pack.`;
    }
    if (assessed.warnings.length > 0) {
      evaluation.decision.warnings.push(...assessed.warnings);
      evaluation.violations.push(...assessed.warnings);
      if (evaluation.decision.status === "GO") {
        evaluation.decision.status = "GO_WITH_CONDITIONS";
        evaluation.decision.reason = `${evaluation.decision.reason} Draft catalog controls are not satisfied (not enforced until approved).`;
      }
    }
  }

  // An unassigned owner is an explicit ownership gap, not a pass: the assessment cannot be an
  // unconditional GO while the registry says nobody is accountable for the project.
  const registration = input.registration;
  const gaps = registration
    ? ([
        ["technical owner", registration.owners.technical_owner],
        ["governance representative", registration.owners.governance_representative],
      ] as const).filter(([, contact]) => contact.name === "UNASSIGNED").map(([role]) => role)
    : [];
  if (registration && gaps.length > 0) {
    const ownershipGap: GovernanceViolation = {
      controlId: `REGISTRY:${registration.id}:OWNERSHIP-GAP`,
      status: "WARN",
      severity: "P2",
      decision: "GO_WITH_CONDITIONS",
      message: `Project '${registration.id}' has no assigned ${gaps.join(" or ")} in the registry; ownership is an explicit gap, not a pass.`,
      missingEvidence: [],
      missingSignals: [],
    };
    evaluation.decision.warnings.push(ownershipGap);
    evaluation.violations.push(ownershipGap);
    if (evaluation.decision.status === "GO") {
      evaluation.decision.status = "GO_WITH_CONDITIONS";
      evaluation.decision.reason = `${evaluation.decision.reason} Registry ownership gap: ${gaps.join(", ")} unassigned.`;
    }
  }

  const project = registration
    ? {
        id: registration.id,
        name: registration.name,
        status: registration.status,
        criticality: registration.criticality,
        data_classification: registration.data_classification,
      }
    : undefined;
  const scope = {
    ...(project ? { project } : {}),
    ...(input.controlCatalog
      ? {
          catalog: {
            id: input.controlCatalog.catalog_id,
            version: input.controlCatalog.catalog_version,
            controls: input.controlCatalog.controls.length,
          },
        }
      : {}),
  };
  const output = input.json
    ? formatJsonResult(analysis, evaluation, context, scope)
    : input.markdown
      ? formatMarkdownResult(analysis, evaluation, context, scope)
      : formatHumanResult(analysis, evaluation, context, scope);

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
