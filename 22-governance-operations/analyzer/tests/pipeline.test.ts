import { describe, expect, it } from "vitest";
import { analyzeRepository } from "../src/pipeline.js";

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
  });
});
