import type { GovernanceContext, GovernanceEvaluation } from "../../engine/src/types.js";
import type { RepositoryAnalysis } from "../../analyzer/src/types.js";

function analysisLines(analysis: RepositoryAnalysis, context: GovernanceContext): string[] {
  const lines = [
    "Repository analysis:",
    `  Status: ${context.analysisStatus ?? "UNVERIFIED"}`,
    `  Languages: ${analysis.facts.languages.join(", ") || "none detected"}`,
    `  Frameworks: ${analysis.facts.frameworks.join(", ") || "none detected"}`,
    `  Package managers: ${analysis.facts.packageManagers.join(", ") || "none detected"}`,
    `  Build systems: ${analysis.facts.buildSystems.join(", ") || "none detected"}`,
    `  Infrastructure: ${analysis.facts.infrastructureSystems.join(", ") || "none detected"}`,
    `  Test systems: ${analysis.facts.testSystems.join(", ") || "none detected"}`,
    `  Analyzer adapters: ${analysis.adapterResults.length}`,
  ];

  const packages = analysis.facts.packages ?? [];
  lines.push(`  Packages/workspaces: ${packages.length}`);
  for (const projectPackage of packages) {
    lines.push(
      `    - ${projectPackage.root} | languages: ${projectPackage.languages.join(", ") || "none"} | frameworks: ${projectPackage.frameworks.join(", ") || "none"} | package managers: ${projectPackage.packageManagers.join(", ") || "none"}`,
    );
  }

  if (analysis.snapshotFingerprint) {
    lines.push(
      "",
      `Snapshot fingerprint: ${analysis.snapshotFingerprint.digest}`,
      `  Files inventoried: ${analysis.snapshotFingerprint.fileCount}`,
      `  Source content coverage: ${analysis.snapshotFingerprint.inspectedSourceFileCount}/${analysis.snapshotFingerprint.sourceFileCount} (${analysis.snapshotFingerprint.sourceContentStatus})`,
    );
    for (const limitation of analysis.snapshotFingerprint.limitations) {
      lines.push(`  Fingerprint limitation: ${limitation}`);
    }
  }

  if (analysis.changeScope) {
    lines.push(
      "",
      `Changed-file scope: ${analysis.changeScope.status}`,
      `  Base revision: ${analysis.changeScope.baseRef}`,
      `  Changed files: ${analysis.changeScope.files.length}`,
    );
    if (analysis.changeScope.headRef) lines.push(`  Head revision: ${analysis.changeScope.headRef}`);
    if (analysis.changeScope.reason) lines.push(`  Scope limitation: ${analysis.changeScope.reason}`);
  } else {
    lines.push("", "Changed-file scope: NOT REQUESTED", "  Pass --base <git-ref> to verify the declared change scope.");
  }

  const incompleteAdapters = analysis.adapterResults.filter((item) => item.executionStatus !== "SUCCESS");
  if (incompleteAdapters.length > 0) {
    lines.push("", "Analyzer limitations:");
    for (const adapter of incompleteAdapters) {
      lines.push(`  - ${adapter.adapterId}: ${adapter.executionStatus}`);
      for (const limitation of adapter.limitations) lines.push(`    ${limitation}`);
      for (const capability of adapter.unsupportedCapabilities) lines.push(`    Unsupported: ${capability}`);
    }
  }

  if (analysis.verification) {
    lines.push("", `Tool verification: ${analysis.verification.status}`);
    for (const result of analysis.verification.results) {
      lines.push(`  [${result.status}] ${result.tool}${result.toolVersion ? ` (${result.toolVersion})` : ""}: ${result.summary}`);
      for (const limitation of result.limitations) lines.push(`    Limitation: ${limitation}`);
    }
  }

  if (analysis.architecture) {
    lines.push(
      "",
      `Architecture profile: ${analysis.architecture.profileId} (${analysis.architecture.status})`,
      `  File dependency edges: ${analysis.architecture.graph.edges.length}`,
      `  Mapped components: ${analysis.architecture.graph.components.length}`,
      `  Component dependency edges: ${analysis.architecture.graph.componentEdges.length}`,
      `  Boundary findings: ${analysis.architecture.findings.length}`,
    );
    const impact = analysis.architecture.graph.changeImpact;
    lines.push(
      `  Change impact: ${impact.status}`,
      `  Changed source files: ${impact.changedFiles.length}`,
      `  Changed components: ${impact.changedComponents.join(", ") || "none mapped"}`,
      `  Impacted files (including changed files): ${impact.impactedFiles.length}`,
      `  Impacted components: ${impact.impactedComponents.join(", ") || "none mapped"}`,
    );
    for (const limitation of impact.limitations) lines.push(`  Change-impact limitation: ${limitation}`);
    for (const finding of analysis.architecture.findings) {
      const location = finding.source_location
        ? ` ${finding.source_location.file}:${finding.source_location.start_line ?? 1}`
        : "";
      lines.push(`  [${finding.severity}] ${finding.rule_id}${location}: ${finding.message}`);
    }
  }

  if (context.unsupportedCapabilities?.length) {
    lines.push("", `Unsupported capabilities: ${context.unsupportedCapabilities.join(", ")}`);
  }

  return lines;
}

export function formatAnalysisResult(
  analysis: RepositoryAnalysis,
  context: GovernanceContext,
  json = false,
): string {
  if (json) return JSON.stringify({ analysis, context }, null, 2);
  return analysisLines(analysis, context).join("\n");
}

export function formatHumanResult(
  analysis: RepositoryAnalysis,
  evaluation: GovernanceEvaluation,
  context: GovernanceContext,
): string {
  const lines = [
    `Decision: ${evaluation.decision.status}`,
    "",
    ...analysisLines(analysis, context),
    "",
    `Controls evaluated: ${evaluation.controls.length}`,
    `Blocking violations: ${evaluation.decision.blockingViolations.length}`,
    `Warnings: ${evaluation.decision.warnings.length}`,
    `Open risks: ${evaluation.decision.openRisks.length}`,
  ];

  if (evaluation.decision.reason) lines.push("", `Reason: ${evaluation.decision.reason}`);

  const decisionItems = [...evaluation.decision.blockingViolations, ...evaluation.decision.warnings];
  if (decisionItems.length > 0) lines.push("", "Decision findings:");
  for (const item of decisionItems) {
    lines.push(`  [${item.severity}] ${item.controlId}: ${item.message}`);
    if (item.missingEvidence.length > 0) lines.push(`    Missing evidence: ${item.missingEvidence.join(", ")}`);
    if (item.missingSignals.length > 0) lines.push(`    Missing signals/capabilities: ${item.missingSignals.join(", ")}`);
    if (item.evidenceRefs?.length) lines.push(`    Evidence: ${item.evidenceRefs.join(", ")}`);
  }

  for (const control of evaluation.controls) {
    if (control.status === "PASS" || control.status === "NOT_APPLICABLE") continue;
    lines.push("", `[${control.status}] ${control.controlId}: ${control.reason}`);
  }

  return lines.join("\n");
}

export function formatJsonResult(
  analysis: RepositoryAnalysis,
  evaluation: GovernanceEvaluation,
  context: GovernanceContext,
): string {
  const generatedAt = new Date().toISOString();
  const fingerprint = analysis.snapshotFingerprint?.digest ?? null;
  const timestampKey = generatedAt.replace(/\D/g, "").slice(0, 17);
  const fingerprintKey = fingerprint?.replace(/^sha256:/, "").slice(0, 12).toUpperCase() ?? "NO-FINGERPRINT";
  const assessmentId = `ASM-${timestampKey}-${fingerprintKey}`;

  return JSON.stringify({
    report: {
      schemaVersion: "1.0.0",
      assessmentId,
      generatedAt,
      repositoryFingerprint: fingerprint,
      changeScope: analysis.changeScope ?? null,
      decision: evaluation.decision.status,
    },
    analysis,
    context,
    evaluation,
  }, null, 2);
}
