import type { AnalyzerInput, AnalyzerOutput, RepositoryAnalyzer } from "./types.js";

export function mergeAnalyzerOutputs(outputs: readonly AnalyzerOutput[]): AnalyzerOutput {
  return {
    signals: [...new Set(outputs.flatMap((item) => item.signals))],
    facts: outputs.reduce<Record<string, unknown>>(
      (all, item) => ({ ...all, ...(item.facts ?? {}) }),
      {},
    ),
    evidence: outputs.flatMap((item) => item.evidence ?? []),
  };
}

export type { AnalyzerInput, AnalyzerOutput, RepositoryAnalyzer };
