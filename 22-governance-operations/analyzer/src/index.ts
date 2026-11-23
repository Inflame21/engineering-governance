export { detectRepositoryFacts } from "./detector.js";
export type {
  RepositoryAnalysis,
  RepositoryAnalyzerAdapter,
  RepositoryFacts,
  RepositoryPackageFacts,
  RepositorySnapshot,
} from "./types.js";

export { analyzeRepository } from "./pipeline.js";
export { defaultAnalyzerAdapters, selectAnalyzerAdapters } from "./adapters/registry.js";

export { runVerificationAdapters } from "./verification.js";
export type {
  VerificationProcessResult,
  VerificationReport,
  VerificationToolName,
  VerificationToolResult,
  VerificationToolRunner,
  VerificationToolStatus,
} from "./verification.js";

export { COVERAGE_REPORT_DIRECTORY } from "./coverage-report.js";
export { TEST_REPORT_DIRECTORY } from "./test-report.js";
export { LINT_REPORT_DIRECTORY } from "./lint-report.js";
export { fingerprintRepositorySnapshot } from "./fingerprint.js";
export type { RepositorySnapshotFingerprint } from "./fingerprint.js";

export { buildRepositorySystemGraph } from "./system-graph.js";
export type {
  RepositorySystemGraph,
  SystemGraphEdge,
  SystemGraphNode,
  SystemGraphNodeType,
  SystemGraphRelationshipType,
} from "./system-graph.js";
