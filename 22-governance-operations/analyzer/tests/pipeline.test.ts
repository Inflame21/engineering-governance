import { describe, expect, it } from "vitest";
import { analyzeRepository } from "../src/pipeline.js";
import { toGovernanceContext } from "../src/normalize.js";
import type { RepositoryAnalyzerAdapter } from "../src/types.js";

describe("repository analyzer pipeline", () => {
  it("flows repository manifests through framework detection", async () => {
    const result = await analyzeRepository({
      rootPath: "/repo",
      changedFiles: ["backend/main.py", "frontend/App.tsx"],
      files: [
        "backend/main.py",
        "backend/routers/users.py",
        "frontend/App.tsx",
        "package.json",
        "pyproject.toml",
        ".github/workflows/ci.yml",
      ],
      fileContents: {
        "package.json": JSON.stringify({
          dependencies: { react: "^19.0.0", vite: "^7.0.0" },
        }),
        "pyproject.toml": '[project]\ndependencies = ["fastapi>=0.115"]',
      },
    });

    expect(result.facts.languages).toEqual(["python", "typescript"]);
    expect(result.facts.frameworks).toEqual(["fastapi", "react", "vite"]);
    expect(result.signals).toContain("framework:fastapi");
    expect(result.signals).toContain("framework:react");
    expect(result.signals).toContain("build:vite");
    expect(result.signals).toContain("capability:http-api");
    expect(result.evidence.map((item) => item.id)).toContain("EVD-FRAMEWORK-MANIFEST");
    expect(result.snapshotFingerprint?.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(result.evidence.every((item) => item.repository_fingerprint === result.snapshotFingerprint?.digest)).toBe(true);
    expect(result.evidence.every((item) => Boolean(item.generated_at))).toBe(true);
    expect(result.adapterResults.every((item) => item.version.length > 0)).toBe(true);
  });

  it("surfaces malformed manifests as adapter failures instead of aborting repository analysis", async () => {
    const result = await analyzeRepository({
      rootPath: "/repo",
      changedFiles: [],
      files: ["package.json", "src/index.ts"],
      fileContents: {
        "package.json": "{not-json",
        "src/index.ts": "export const ready = true;",
      },
    });
    const context = toGovernanceContext(result);

    expect(result.adapterResults.some((item) =>
      item.adapterId === "framework-detection" && item.executionStatus === "FAILED",
    )).toBe(true);
    expect(context.analysisStatus).toBe("PARTIAL");
    expect(context.analyzerLimitations.some((item) => item.includes("package.json:"))).toBe(true);
  });

  it("keeps valid framework facts when another monorepo manifest is malformed", async () => {
    const result = await analyzeRepository({
      rootPath: "/repo",
      changedFiles: [],
      files: [
        "apps/broken/package.json",
        "apps/web/package.json",
        "apps/web/src/App.tsx",
      ],
      fileContents: {
        "apps/broken/package.json": "{not-json",
        "apps/web/package.json": JSON.stringify({
          dependencies: { react: "^19.0.0" },
        }),
        "apps/web/src/App.tsx": "export default function App() { return null; }",
      },
    });

    expect(result.facts.frameworks).toContain("react");
    expect(result.adapterResults.some((item) =>
      item.adapterId === "framework-detection" &&
      item.executionStatus === "PARTIAL" &&
      item.unsupportedCapabilities.includes("framework-detection:manifest-parse"),
    )).toBe(true);
    expect(result.evidence.some((item) =>
      item.id === "EVD-FRAMEWORK-MANIFEST" && item.status === "PARTIALLY_VERIFIED",
    )).toBe(true);
  });

  it("reports languages without a registered analyzer as unsupported", async () => {
    const result = await analyzeRepository({
      rootPath: "/repo",
      changedFiles: ["main.go"],
      files: ["main.go", "go.mod"],
    });
    const context = toGovernanceContext(result);

    expect(context.analysisStatus).toBe("PARTIAL");
    expect(context.unsupportedCapabilities).toContain("language-specific-analysis:go");
  });

  it("captures adapter execution failures instead of silently dropping them", async () => {
    const failingAdapter: RepositoryAnalyzerAdapter = {
      id: "failing-python-test-adapter",
      version: "1.0.0",
      languages: ["python"],
      capabilities: ["python-test-analysis"],
      supports: () => true,
      async analyze() {
        throw new Error("synthetic analyzer failure");
      },
    };

    const result = await analyzeRepository({
      rootPath: "/repo",
      changedFiles: ["main.py"],
      files: ["main.py"],
    }, [failingAdapter]);
    const context = toGovernanceContext(result);

    expect(result.adapterResults[0]?.executionStatus).toBe("FAILED");
    expect(result.adapterResults[0]?.unsupportedCapabilities).toContain("python-test-analysis");
    expect(result.adapterResults[0]?.limitations[0]).toContain("synthetic analyzer failure");
    expect(context.analysisStatus).toBe("FAILED");
  });
});
