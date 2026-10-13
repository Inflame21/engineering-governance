import type { GovernanceEvidence, GovernanceFinding } from "../../engine/src/types.js";
import type { ArchitectureVerificationResult } from "./architecture.js";
import type { VerificationReport } from "./verification.js";
import type { RepositorySnapshotFingerprint } from "./fingerprint.js";

export type AnalyzerExecutionStatus = "SUCCESS" | "PARTIAL" | "FAILED" | "SKIPPED";

export interface RepositoryChangeScope {
  status: "VERIFIED" | "UNVERIFIED";
  baseRef: string;
  headRef?: string;
  files: string[];
  reason?: string;
}

export interface RepositorySnapshot {
  rootPath: string;
  files: readonly string[];
  changedFiles: readonly string[];
  fileContents?: Readonly<Record<string, string>>;
  contentLimitations?: readonly string[];
  changeScope?: RepositoryChangeScope;
}

export interface RepositoryFacts extends Record<string, unknown> {
  languages: string[];
  frameworks: string[];
  packageManagers: string[];
  buildSystems: string[];
  infrastructureSystems: string[];
  testSystems: string[];
}

export type RepositoryEvidence = GovernanceEvidence;

export interface RepositoryAdapterResult {
  adapterId: string;
  version: string;
  executionStatus: AnalyzerExecutionStatus;
  supportedCapabilities: string[];
  unsupportedCapabilities: string[];
  evidenceRefs: string[];
  limitations: string[];
}

export interface RepositoryAnalysis {
  facts: RepositoryFacts;
  signals: string[];
  evidence: RepositoryEvidence[];
  findings: GovernanceFinding[];
  adapterResults: RepositoryAdapterResult[];
  architecture?: ArchitectureVerificationResult;
  verification?: VerificationReport;
  changeScope?: RepositoryChangeScope;
  snapshotFingerprint?: RepositorySnapshotFingerprint;
}

export interface RepositoryAdapterOutput {
  /** Adapter-specific observations; omitted fields do not erase base facts. */
  facts?: Partial<RepositoryFacts>;
  signals: string[];
  evidence?: RepositoryEvidence[];
  findings?: GovernanceFinding[];
  executionStatus?: Exclude<AnalyzerExecutionStatus, "SKIPPED">;
  supportedCapabilities?: string[];
  unsupportedCapabilities?: string[];
  limitations?: string[];
}

export interface RepositoryAnalyzerAdapter {
  readonly id: string;
  readonly version: string;
  readonly capabilities: readonly string[];
  readonly languages: readonly string[];
  readonly frameworks?: readonly string[];
  supports(snapshot: RepositorySnapshot): boolean;
  analyze(snapshot: RepositorySnapshot): Promise<RepositoryAdapterOutput>;
}
