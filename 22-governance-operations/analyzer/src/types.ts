export interface RepositorySnapshot {
  rootPath: string;
  files: readonly string[];
  changedFiles: readonly string[];
  fileContents?: Readonly<Record<string, string>>;
}

// A type alias (not an interface) so facts are assignable to the engine's Record<string, unknown>.
export type RepositoryFacts = {
  languages: string[];
  frameworks: string[];
  packageManagers: string[];
  buildSystems: string[];
  infrastructureSystems: string[];
  testSystems: string[];
};

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

/** What one adapter contributes; the pipeline merges it over the base facts. */
export type AdapterAnalysis = Omit<RepositoryAnalysis, "facts"> & {
  facts: Partial<RepositoryFacts>;
};

export interface RepositoryAnalyzerAdapter {
  readonly id: string;
  readonly languages: readonly string[];
  readonly frameworks?: readonly string[];
  supports(snapshot: RepositorySnapshot): boolean;
  analyze(snapshot: RepositorySnapshot): Promise<AdapterAnalysis>;
}
