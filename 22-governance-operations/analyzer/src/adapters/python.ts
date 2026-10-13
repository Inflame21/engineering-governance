import type { RepositoryAdapterOutput, RepositoryAnalyzerAdapter, RepositorySnapshot } from "../types.js";

export const pythonAdapter: RepositoryAnalyzerAdapter = {
  id: "python",
  version: "0.1.0",
  languages: ["python"],
  capabilities: [
    "python-api-path-detection",
    "python-database-path-detection",
    "python-test-path-detection",
  ],
  supports: (snapshot) => snapshot.files.some((file) => file.endsWith(".py")),
  async analyze(snapshot: RepositorySnapshot): Promise<RepositoryAdapterOutput> {
    const files = snapshot.files;
    const signals = new Set<string>();

    if (files.some((file) => /(^|\/)(routers?|routes?|views?|api)\//.test(file))) {
      signals.add("capability:http-api");
    }
    if (files.some((file) => /(^|\/)(models?|repositories?|dal)\//.test(file))) {
      signals.add("capability:database-access");
    }
    if (files.some((file) => /(^|\/)(tests?|test_.*\.py$|.*_test\.py$)/.test(file))) {
      signals.add("tests:python");
    }

    return {
      facts: {},
      signals: [...signals].sort(),
      evidence: [],
      supportedCapabilities: [...this.capabilities],
    };
  },
};
