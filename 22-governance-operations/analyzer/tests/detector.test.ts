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
    expect(facts.frameworks).toEqual(["node", "vite"]);
    expect(facts.packageManagers).toEqual(["go", "pnpm"]);
    expect(facts.buildSystems).toEqual(["docker", "make"]);
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
