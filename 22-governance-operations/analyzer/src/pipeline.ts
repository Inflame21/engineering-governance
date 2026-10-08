import { mergeAnalyzerOutputs } from "../../engine/src/analyzer.js";
import type { AnalyzerOutput } from "../../engine/src/types.js";
import { detectRepositoryFacts } from "./detector.js";
import { toGovernanceContext } from "./normalize.js";
import type {
  RepositoryAnalysis,
  RepositoryAnalyzerAdapter,
  RepositorySnapshot,
} from "./types.js";

export async function analyzeRepository(
  snapshot: RepositorySnapshot,
  adapters: readonly RepositoryAnalyzerAdapter[] = [],
): Promise<RepositoryAnalysis> {
  const baseFacts = detectRepositoryFacts(snapshot);
  const supportedAdapters = adapters.filter((adapter) =>
    adapter.supports(snapshot),
  );

  const outputs: AnalyzerOutput[] = [];
  for (const adapter of supportedAdapters) {
    const analysis = await adapter.analyze(snapshot);
    outputs.push({
      signals: analysis.signals,
      facts: analysis.facts,
      evidence: analysis.evidence,
    });
  }

  const merged = mergeAnalyzerOutputs(outputs);
  const facts = {
    languages: baseFacts.languages,
    frameworks: baseFacts.frameworks,
    packageManagers: baseFacts.packageManagers,
    buildSystems: baseFacts.buildSystems,
    infrastructureSystems: baseFacts.infrastructureSystems,
    testSystems: baseFacts.testSystems,
    ...((merged.facts ?? {}) as Record<string, unknown>),
  };

  const analysis: RepositoryAnalysis = {
    facts: facts as RepositoryAnalysis["facts"],
    signals: merged.signals,
    evidence: merged.evidence ?? [],
  };

  // Validate that the normalization path is executable and deterministic.
  toGovernanceContext(analysis);

  return analysis;
}
