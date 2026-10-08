import type { RepositoryAnalysis, RepositoryAnalyzerAdapter, RepositorySnapshot } from "../types.js";
import { hasPackageDependency, hasPythonDependency, parsePackageJson } from "../manifest.js";

export const frameworkAdapter: RepositoryAnalyzerAdapter = {
  id: "framework-detection",
  languages: [],
  supports: (snapshot) =>
    snapshot.files.includes("package.json") ||
    snapshot.files.includes("pyproject.toml") ||
    snapshot.files.includes("requirements.txt"),
  async analyze(snapshot: RepositorySnapshot): Promise<RepositoryAnalysis> {
    const signals = new Set<string>();
    const frameworks = new Set<string>();

    const packageContent = snapshot.fileContents?.["package.json"];
    if (packageContent) {
      const packageJson = parsePackageJson(packageContent);
      const packages: Array<[string, string, string]> = [
        ["next", "nextjs", "framework:nextjs"],
        ["react", "react", "framework:react"],
        ["express", "express", "framework:express"],
        ["@nestjs/core", "nestjs", "framework:nestjs"],
        ["vite", "vite", "build:vite"],
      ];

      for (const [dependency, framework, signal] of packages) {
        if (hasPackageDependency(packageJson, dependency)) {
          frameworks.add(framework);
          signals.add(signal);
        }
      }
    }

    const pythonContent =
      snapshot.fileContents?.["pyproject.toml"] ??
      snapshot.fileContents?.["requirements.txt"];

    if (hasPythonDependency(pythonContent, "fastapi")) {
      frameworks.add("fastapi");
      signals.add("framework:fastapi");
    }

    if (hasPythonDependency(pythonContent, "django")) {
      frameworks.add("django");
      signals.add("framework:django");
    }

    if (frameworks.size === 0) return { facts: {}, signals: [], evidence: [] };

    return {
      facts: { frameworks: [...frameworks] },
      signals: [...signals].sort(),
      evidence: [{
        id: "EVD-FRAMEWORK-MANIFEST",
        type: "E3_AUTOMATED_ANALYSIS",
        status: "VERIFIED",
        description: "Framework identity was determined from declared project dependencies.",
        source: "framework-detection-adapter",
        freshness: "current",
        supports_controls: [],
      }],
    };
  },
};
