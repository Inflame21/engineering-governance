export { detectRepositoryFacts } from "./detector.js";
export type {
  RepositoryAnalysis,
  RepositoryAnalyzerAdapter,
  RepositoryFacts,
  RepositorySnapshot,
} from "./types.js";

export { analyzeRepository } from "./pipeline.js";
export { defaultAnalyzerAdapters, selectAnalyzerAdapters } from "./adapters/registry.js";
