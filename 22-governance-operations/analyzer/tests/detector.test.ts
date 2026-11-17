import { describe, expect, it } from "vitest";
import { detectRepositoryFacts } from "../src/detector.js";

describe("repository fact detection", () => {
  it("detects multiple languages and common ecosystem markers", () => {
    const facts = detectRepositoryFacts({
      rootPath: "/repo",
      changedFiles: ["src/App.tsx", "backend/main.py", "go.mod"],
      files: [
        "src/App.tsx",
        "src/main.ts",
        "backend/main.py",
        "package.json",
        "pnpm-lock.yaml",
        "vite.config.ts",
        "go.mod",
        "go.sum",
        "Dockerfile",
        "Makefile",
      ],
    });

    expect(facts.languages).toEqual(["go", "python", "typescript"]);
    expect(facts.frameworks).toEqual(["vite"]);
    expect(facts.packageManagers).toEqual(["go", "pnpm"]);
    expect(facts.buildSystems).toEqual(["docker", "make"]);
  });


  it("detects package and framework markers in nested monorepo packages", () => {
    const facts = detectRepositoryFacts({
      rootPath: "/repo",
      changedFiles: [],
      files: [
        "apps/web/package.json",
        "apps/web/pnpm-lock.yaml",
        "apps/web/vite.config.ts",
        "services/api/pyproject.toml",
        "services/api/poetry.lock",
        "services/api/manage.py",
        "infra/terraform/main.tf",
      ],
      fileContents: {
        "apps/web/package.json": JSON.stringify({
          dependencies: { react: "^19.0.0" },
        }),
        "services/api/pyproject.toml": '[project]\\ndependencies = ["fastapi>=0.115"]',
      },
    });

    expect(facts.frameworks).toEqual(["django", "vite"]);
    expect(facts.packageManagers).toEqual(["pnpm", "poetry"]);
    expect(facts.infrastructureSystems).toEqual(["terraform"]);
    expect(facts.packages?.map(({ root, frameworks, packageManagers }) => ({
      root,
      frameworks,
      packageManagers,
    }))).toEqual([
      { root: "apps/web", frameworks: ["react", "vite"], packageManagers: ["pnpm"] },
      { root: "services/api", frameworks: ["django", "fastapi"], packageManagers: ["poetry"] },
    ]);
  });

  it("does not infer a language from an unknown extension", () => {
    const facts = detectRepositoryFacts({
      rootPath: "/repo",
      changedFiles: [],
      files: ["README.md", "config.custom"],
    });

    expect(facts.languages).toEqual([]);
  });
});
