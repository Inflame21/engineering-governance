import { goFrameworks, parseGoMod } from "../manifest.js";
import type { RepositoryAdapterOutput, RepositoryAnalyzerAdapter, RepositorySnapshot } from "../types.js";

const HTTP_FRAMEWORKS = new Set(["gin", "echo", "fiber", "chi", "gorilla-mux"]);

export const goAdapter: RepositoryAnalyzerAdapter = {
  id: "go",
  version: "0.1.0",
  languages: ["go"],
  capabilities: [
    "go-api-path-detection",
    "go-database-path-detection",
    "go-test-path-detection",
    "go-mod-framework-detection",
  ],
  supports: (snapshot) => snapshot.files.some((file) => file.endsWith(".go") || /(^|\/)go\.mod$/.test(file)),
  async analyze(snapshot: RepositorySnapshot): Promise<RepositoryAdapterOutput> {
    const files = snapshot.files.map((file) => file.replaceAll("\\", "/"));
    const signals = new Set<string>();
    const frameworks = new Set<string>();

    // Direct requirements of every go.mod in the repository (a monorepo can have several).
    for (const [file, content] of Object.entries(snapshot.fileContents ?? {})) {
      if (!/(^|\/)go\.mod$/.test(file.replaceAll("\\", "/"))) continue;
      for (const framework of goFrameworks(parseGoMod(content))) {
        frameworks.add(framework);
        signals.add(`framework:${framework}`);
      }
    }

    if (
      [...frameworks].some((framework) => HTTP_FRAMEWORKS.has(framework)) ||
      files.some((file) => /(^|\/)(handlers?|api|routes?|controllers?|rest|transport\/http|httpserver)\//.test(file))
    ) {
      signals.add("capability:http-api");
    }
    if (files.some((file) => /(^|\/)(repositor(?:y|ies)|store|storage|persistence|dal|db)\//.test(file))) {
      signals.add("capability:database-access");
    }
    if (files.some((file) => file.endsWith("_test.go"))) {
      signals.add("tests:go");
    }

    return {
      facts: frameworks.size > 0 ? { frameworks: [...frameworks].sort() } : {},
      signals: [...signals].sort(),
      evidence: [],
      supportedCapabilities: [...this.capabilities],
    };
  },
};
