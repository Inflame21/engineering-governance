import type { RepositoryAnalysis, RepositoryAnalyzerAdapter, RepositorySnapshot } from "../types.js";

export const genericRepositoryAdapter: RepositoryAnalyzerAdapter = {
  id: "generic-repository",
  languages: [],
  supports: () => true,
  async analyze(snapshot: RepositorySnapshot): Promise<RepositoryAnalysis> {
    const files = new Set(snapshot.files);
    const signals = new Set<string>();
    const evidence = [];

    if ([...files].some((file) => /(^|\/)\.github\/workflows\/.*\.ya?ml$/.test(file))) {
      signals.add("ci:configured");
    }

    if ([...files].some((file) => /(^|\/)(Dockerfile|docker-compose\.ya?ml)$/.test(file))) {
      signals.add("containerized");
    }

    if ([...files].some((file) => /(^|\/)(migrations?|alembic|prisma)\//.test(file))) {
      signals.add("database:migrations");
    }

    if ([...files].some((file) => /(^|\/)(tests?|__tests__)\//.test(file))) {
      signals.add("tests:present");
    }

    if (signals.size > 0) {
      evidence.push({
        id: "EVD-REPO-STRUCTURE",
        type: "E2_INSPECTION",
        status: "VERIFIED" as const,
        description: "Repository structure was inspected for governance-relevant engineering capabilities.",
        source: "generic-repository-adapter",
        freshness: "current",
        supports_controls: [],
      });
    }

    return { facts: {}, signals: [...signals].sort(), evidence };
  },
};
