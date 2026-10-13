export interface RepositorySnapshot {
  rootPath: string;
  files: readonly string[];
  changedFiles: readonly string[];
  fileContents?: Readonly<Record<string, string>>;
}

export interface RepositoryFacts extends Record<string, unknown> {
  languages: string[];
  frameworks: string[];
  packageManagers: string[];
  buildSystems: string[];
  infrastructureSystems: string[];
  testSystems: string[];
}

export interface RepositoryEvidence {
  id: string;
  type: string;
  status: "VERIFIED" | "PARTIALLY_VERIFIED" | "UNVERIFIED" | "NOT_APPLICABLE";
  description: string;
  source: string;
  freshness: string;
  supports_controls: string[];
}

export interface RepositoryAnalysis {
  facts: RepositoryFacts;
  signals: string[];
  evidence: RepositoryEvidence[];
}

export interface RepositoryAdapterOutput {
  /** Adapter-specific observations; omitted fields do not erase base facts. */
  facts?: Partial<RepositoryFacts>;
  signals: string[];
  evidence?: RepositoryEvidence[];
}

export interface RepositoryAnalyzerAdapter {
  readonly id: string;
  readonly languages: readonly string[];
  readonly frameworks?: readonly string[];
  supports(snapshot: RepositorySnapshot): boolean;
  analyze(snapshot: RepositorySnapshot): Promise<RepositoryAdapterOutput>;
}
