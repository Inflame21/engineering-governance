import { mergeAnalyzerOutputs } from "../../engine/src/analyzer.js";
import type { AnalyzerOutput } from "../../engine/src/types.js";
import { detectRepositoryFacts } from "./detector.js";
import { defaultAnalyzerAdapters } from "./adapters/registry.js";
import { toGovernanceContext } from "./normalize.js";
import type {
  RepositoryAnalysis,
  RepositoryFacts,
  RepositoryAnalyzerAdapter,
  RepositorySnapshot,
} from "./types.js";

const factKeys = [
  "languages",
  "frameworks",
  "packageManagers",
  "buildSystems",
  "infrastructureSystems",
  "testSystems",
] as const;

function mergeRepositoryFacts(
  baseFacts: RepositoryFacts,
  outputs: readonly AnalyzerOutput[],
): RepositoryFacts {
  const merged = { ...baseFacts };

  for (const key of factKeys) {
    const adapterValues = outputs.flatMap((output) => {
      const value = output.facts?.[key];
      return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
    });
    merged[key] = [...new Set([...baseFacts[key], ...adapterValues])].sort();
  }

  return merged;
}

export async function analyzeRepository(
  snapshot: RepositorySnapshot,
  adapters: readonly RepositoryAnalyzerAdapter[] = defaultAnalyzerAdapters,
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
      ...(analysis.facts ? { facts: analysis.facts } : {}),
      evidence: analysis.evidence ?? [],
    });
  }

  const merged = mergeAnalyzerOutputs(outputs);
  const analysis: RepositoryAnalysis = {
    facts: mergeRepositoryFacts(baseFacts, outputs),
    signals: merged.signals,
    evidence: merged.evidence ?? [],
  };

  // Validate that the normalization path is executable and deterministic.
  toGovernanceContext(analysis);

  return analysis;
}
