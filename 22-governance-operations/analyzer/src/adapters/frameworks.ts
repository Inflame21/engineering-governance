import type { RepositoryAdapterOutput, RepositoryAnalyzerAdapter, RepositoryEvidence, RepositorySnapshot } from "../types.js";
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
    const manifestErrors: string[] = [];
    let inspectedManifestCount = 0;
    let successfullyInspectedManifestCount = 0;

    const packages: Array<[string, string, string]> = [
      ["next", "nextjs", "framework:nextjs"],
      ["react", "react", "framework:react"],
      ["express", "express", "framework:express"],
      ["@nestjs/core", "nestjs", "framework:nestjs"],
      ["vite", "vite", "build:vite"],
    ];

    for (const [manifestPath, content] of Object.entries(snapshot.fileContents ?? {})) {
      const basename = manifestPath.split("/").at(-1);
      if (basename !== "package.json" && basename !== "pyproject.toml" && basename !== "requirements.txt") {
        continue;
      }
      inspectedManifestCount += 1;

      if (basename === "package.json") {
        try {
          const packageJson = parsePackageJson(content);
          successfullyInspectedManifestCount += 1;
          for (const [dependency, framework, signal] of packages) {
            if (hasPackageDependency(packageJson, dependency)) {
              frameworks.add(framework);
              signals.add(signal);
            }
          }
        } catch (error) {
          manifestErrors.push(
            `${manifestPath}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      } else {
        successfullyInspectedManifestCount += 1;
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

    const unsupportedCapabilities = new Set<string>();
    const limitations = [...manifestErrors];
    if (manifestErrors.length > 0) unsupportedCapabilities.add("framework-detection:manifest-parse");

    if (frameworks.size === 0) {
      unsupportedCapabilities.add("framework-detection");
      const allReadableManifestsFailed =
        inspectedManifestCount > 0 && successfullyInspectedManifestCount === 0;
      return {
        facts: {},
        signals: [],
        evidence: [],
        executionStatus: allReadableManifestsFailed ? "FAILED" : "PARTIAL",
        supportedCapabilities: successfullyInspectedManifestCount > 0
          ? ["manifest-dependency-detection"]
          : [],
        unsupportedCapabilities: [...unsupportedCapabilities].sort(),
        limitations: [
          ...(manifestErrors.length > 0 ? [] : [
            inspectedManifestCount > 0
              ? "Supported manifests were inspected, but no recognized framework dependency was found."
              : "Manifest files were discovered but their contents were unavailable to the analyzer.",
          ]),
          ...limitations,
        ],
      };
    }

    const partial = manifestErrors.length > 0;
    const evidence: RepositoryEvidence = {
      id: "EVD-FRAMEWORK-MANIFEST",
      type: "E3_AUTOMATED_ANALYSIS",
      status: partial ? "PARTIALLY_VERIFIED" : "VERIFIED",
      description: partial
        ? `Framework identity was determined from ${successfullyInspectedManifestCount} manifest(s); ${manifestErrors.length} manifest(s) could not be parsed.`
        : `Framework identity was determined from ${successfullyInspectedManifestCount} project manifest(s).`,
      source: "framework-detection-adapter",
      freshness: "current",
      supports_controls: [],
    };

    return {
      facts: { frameworks: [...frameworks].sort() },
      signals: [...signals].sort(),
      evidence: [evidence],
      executionStatus: partial ? "PARTIAL" : "SUCCESS",
      supportedCapabilities: ["manifest-dependency-detection", "framework-detection"],
      unsupportedCapabilities: [...unsupportedCapabilities].sort(),
      limitations,
    };
  },
};
