import type { RepositoryAdapterOutput, RepositoryAnalyzerAdapter, RepositorySnapshot } from "../types.js";
import { hasPackageDependency, hasPythonDependency, parsePackageJson } from "../manifest.js";

export const frameworkAdapter: RepositoryAnalyzerAdapter = {
  id: "framework-detection",
  version: "0.1.0",
  languages: [],
  capabilities: ["manifest-dependency-detection", "framework-detection"],
  supports: (snapshot) =>
    snapshot.files.some((file) =>
      /(^|\/)(package\.json|pyproject\.toml|requirements\.txt)$/.test(file),
    ),
  async analyze(snapshot: RepositorySnapshot): Promise<RepositoryAdapterOutput> {
    const signals = new Set<string>();
    const frameworks = new Set<string>();
    let inspectedManifestCount = 0;

    const packages: Array<[string, string, string]> = [
      ["next", "nextjs", "framework:nextjs"],
      ["react", "react", "framework:react"],
      ["express", "express", "framework:express"],
      ["@nestjs/core", "nestjs", "framework:nestjs"],
      ["vite", "vite", "build:vite"],
    ];

    for (const [manifestPath, content] of Object.entries(snapshot.fileContents ?? {})) {
      const basename = manifestPath.split("/").at(-1);
      if (basename === "package.json") {
        inspectedManifestCount += 1;
        const packageJson = parsePackageJson(content);
        for (const [dependency, framework, signal] of packages) {
          if (hasPackageDependency(packageJson, dependency)) {
            frameworks.add(framework);
            signals.add(signal);
          }
        }
      } else if (basename === "pyproject.toml" || basename === "requirements.txt") {
        inspectedManifestCount += 1;
        if (hasPythonDependency(content, "fastapi")) {
          frameworks.add("fastapi");
          signals.add("framework:fastapi");
        }
        if (hasPythonDependency(content, "django")) {
          frameworks.add("django");
          signals.add("framework:django");
        }
      }
    }

    if (frameworks.size === 0) {
      return {
        facts: {},
        signals: [],
        evidence: [],
        executionStatus: inspectedManifestCount > 0 ? "PARTIAL" : "FAILED",
        supportedCapabilities: ["manifest-dependency-detection"],
        unsupportedCapabilities: ["framework-detection"],
        limitations: inspectedManifestCount > 0
          ? ["Supported manifests were inspected, but no recognized framework dependency was found."]
          : ["Manifest files were discovered but their contents were unavailable to the analyzer."],
      };
    }

    return {
      facts: { frameworks: [...frameworks] },
      signals: [...signals].sort(),
      evidence: [{
        id: "EVD-FRAMEWORK-MANIFEST",
        type: "E3_AUTOMATED_ANALYSIS",
        status: "VERIFIED",
        description: `Framework identity was determined from ${inspectedManifestCount} project manifest(s).`,
        source: "framework-detection-adapter",
        freshness: "current",
        supports_controls: [],
      }],
      supportedCapabilities: ["manifest-dependency-detection", "framework-detection"],
    };
  },
};
