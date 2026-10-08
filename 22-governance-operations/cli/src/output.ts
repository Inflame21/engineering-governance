import type { GovernanceEvaluation } from "../../engine/src/types.js";
import type { RepositoryAnalysis } from "../../analyzer/src/types.js";

export function formatHumanResult(
  analysis: RepositoryAnalysis,
  evaluation: GovernanceEvaluation,
): string {
  const lines = [
    `Decision: ${evaluation.decision.status}`,
    "",
    "Repository facts:",
    `  Languages: ${analysis.facts.languages.join(", ") || "none"}`,
    `  Frameworks: ${analysis.facts.frameworks.join(", ") || "none"}`,
    `  Package managers: ${analysis.facts.packageManagers.join(", ") || "none"}`,
    `  Infrastructure: ${analysis.facts.infrastructureSystems.join(", ") || "none"}`,
    "",
    `Controls: ${evaluation.controls.length}`,
    `Blocking violations: ${evaluation.decision.blockingViolations.length}`,
    `Warnings: ${evaluation.decision.warnings.length}`,
    `Open risks: ${evaluation.decision.openRisks.length}`,
  ];

  if (evaluation.decision.reason) {
    lines.push("", `Reason: ${evaluation.decision.reason}`);
  }

  return lines.join("\n");
}

export function formatJsonResult(
  analysis: RepositoryAnalysis,
  evaluation: GovernanceEvaluation,
): string {
  return JSON.stringify({ analysis, evaluation }, null, 2);
}
