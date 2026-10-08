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

  return {
    signals: [...signals].sort(),
    facts: analysis.facts,
  };
}
