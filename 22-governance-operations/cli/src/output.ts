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

  const incompleteAdapters = analysis.adapterResults.filter((item) => item.executionStatus !== "SUCCESS");
  if (incompleteAdapters.length > 0) {
    lines.push("", "Analyzer limitations:");
    for (const adapter of incompleteAdapters) {
      lines.push(`  - ${adapter.adapterId}: ${adapter.executionStatus}`);
      for (const limitation of adapter.limitations) lines.push(`    ${limitation}`);
      for (const capability of adapter.unsupportedCapabilities) lines.push(`    Unsupported: ${capability}`);
    }
  }

  if (analysis.architecture) {
    lines.push(
      "",
      `Architecture profile: ${analysis.architecture.profileId} (${analysis.architecture.status})`,
      `  Dependency edges: ${analysis.architecture.graph.edges.length}`,
      `  Boundary findings: ${analysis.architecture.findings.length}`,
    );
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
  return JSON.stringify({ analysis, context, evaluation }, null, 2);
}
