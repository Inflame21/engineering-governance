export interface RepositorySnapshot {
  rootPath: string;
  files: readonly string[];
  changedFiles: readonly string[];
}

export interface RepositoryFacts {
  languages: string[];
  frameworks: string[];
  packageManagers: string[];
  buildSystems: string[];
  infrastructureSystems: string[];
  testSystems: string[];
}

export interface RepositoryAnalysis {
  facts: RepositoryFacts;
  signals: string[];
  evidence: Array<{
    id: string;
    type: string;
    status: "VERIFIED" | "PARTIALLY_VERIFIED" | "UNVERIFIED" | "NOT_APPLICABLE";
    description: string;
    source: string;
    freshness: string;
    supports_controls: string[];
  }>;
}

export interface RepositoryAnalyzerAdapter {
  readonly id: string;
  readonly languages: readonly string[];
  readonly frameworks?: readonly string[];
  supports(snapshot: RepositorySnapshot): boolean;
  analyze(snapshot: RepositorySnapshot): Promise<RepositoryAnalysis>;
}
