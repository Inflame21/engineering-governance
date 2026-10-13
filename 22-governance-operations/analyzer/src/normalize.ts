import type { GovernanceContext } from "../../engine/src/types.js";
import type { RepositoryAnalysis } from "./types.js";

export function toGovernanceContext(
  analysis: RepositoryAnalysis,
): GovernanceContext {
  const signals = new Set(analysis.signals);

  for (const language of analysis.facts.languages) {
    signals.add(`language:${language}`);
  }

  for (const framework of analysis.facts.frameworks) {
    signals.add(`framework:${framework}`);
  }

  for (const manager of analysis.facts.packageManagers) {
    signals.add(`package_manager:${manager}`);
  }

  for (const buildSystem of analysis.facts.buildSystems) {
    signals.add(`build_system:${buildSystem}`);
  }

  for (const infrastructure of analysis.facts.infrastructureSystems) {
    signals.add(`infrastructure:${infrastructure}`);
  }

  for (const testSystem of analysis.facts.testSystems) {
    signals.add(`test_system:${testSystem}`);
  }

  const unsupportedCapabilities = [
    ...new Set(analysis.adapterResults.flatMap((result) => result.unsupportedCapabilities)),
  ].sort();
  const analyzerLimitations = [
    ...new Set(analysis.adapterResults.flatMap((result) => result.limitations)),
  ].sort();
  const hasFailure = analysis.adapterResults.some((result) => result.executionStatus === "FAILED");
  const hasPartialResult = analysis.adapterResults.some(
    (result) => result.executionStatus === "PARTIAL" || result.executionStatus === "SKIPPED",
  );
  const analysisStatus =
    analysis.adapterResults.length === 0
      ? "PARTIAL"
      : hasFailure && analysis.adapterResults.every(
          (result) => result.executionStatus === "FAILED" || result.executionStatus === "SKIPPED",
        )
        ? "FAILED"
        : hasFailure || hasPartialResult || unsupportedCapabilities.length > 0
          ? "PARTIAL"
          : "COMPLETE";

  if (analysis.adapterResults.length === 0) {
    unsupportedCapabilities.push("analysis:no-adapters");
    analyzerLimitations.push("No analyzer adapters produced a result.");
  }

  return {
    signals: [...signals].sort(),
    facts: analysis.facts,
    findings: analysis.findings,
    analysisStatus,
    unsupportedCapabilities: [...new Set(unsupportedCapabilities)].sort(),
    analyzerLimitations: [...new Set(analyzerLimitations)].sort(),
    ...(analysis.changeScope ? {
      changeScopeStatus: analysis.changeScope.status,
      ...(analysis.changeScope.reason ? { changeScopeReason: analysis.changeScope.reason } : {}),
      changedFiles: analysis.changeScope.files,
    } : {}),
    evaluatedAt: new Date().toISOString(),
  };
}
