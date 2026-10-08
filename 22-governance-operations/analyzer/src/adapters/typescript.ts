import type { RepositoryAnalysis, RepositoryAnalyzerAdapter, RepositorySnapshot } from "../types.js";

export const typescriptAdapter: RepositoryAnalyzerAdapter = {
  id: "typescript",
  languages: ["typescript", "javascript"],
  supports: (snapshot) =>
    snapshot.files.some((file) => /\.(ts|tsx|js|jsx)$/.test(file)),
  async analyze(snapshot: RepositorySnapshot): Promise<RepositoryAnalysis> {
    const files = snapshot.files;
    const signals = new Set<string>();

    if (files.some((file) => /(^|\/)(src\/)?(api|routes?|controllers?)\//.test(file))) {
      signals.add("capability:http-api");
    }
    if (files.some((file) => /(^|\/)(components?|pages?|app)\//.test(file))) {
      signals.add("capability:frontend");
    }
    if (files.some((file) => /(^|\/)(tests?|__tests__)\//.test(file))) {
      signals.add("tests:typescript");
    }

    return { facts: {}, signals: [...signals].sort(), evidence: [] };
  },
};
