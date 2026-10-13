import { describe, expect, it } from "vitest";
import { genericRepositoryAdapter } from "../src/adapters/generic.js";
import { frameworkAdapter } from "../src/adapters/frameworks.js";
import { pythonAdapter } from "../src/adapters/python.js";
import { typescriptAdapter } from "../src/adapters/typescript.js";

const snapshot = {
  rootPath: "/repo",
  changedFiles: ["backend/main.py", "src/App.tsx"],
  files: [
    "backend/main.py",
    "backend/routers/users.py",
    "backend/models/user.py",
    "backend/tests/test_users.py",
    "src/App.tsx",
    "src/api/users.ts",
    "tests/App.test.tsx",
    ".github/workflows/ci.yml",
    "Dockerfile",
  ],
};

describe("repository adapters", () => {
  it("detects generic engineering capabilities", async () => {
    const result = await genericRepositoryAdapter.analyze(snapshot);
    expect(result.signals).toEqual([
      "ci:configured",
      "containerized",
      "tests:present",
    ]);
  });


  it("detects frameworks from nested workspace manifests", async () => {
    const result = await frameworkAdapter.analyze({
      rootPath: "/repo",
      changedFiles: [],
      files: ["apps/api/pyproject.toml", "apps/web/package.json"],
      fileContents: {
        "apps/api/pyproject.toml": '[project]\\ndependencies = ["fastapi>=0.115"]',
        "apps/web/package.json": JSON.stringify({ dependencies: { react: "^19.0.0", vite: "^6.0.0" } }),
      },
    });

    expect(result.facts?.frameworks).toEqual(["react", "fastapi", "vite"]);
    expect(result.signals).toContain("framework:fastapi");
    expect(result.signals).toContain("framework:react");
    expect(result.executionStatus).toBeUndefined();
  });

  it("detects Python API and database capabilities", async () => {
    const result = await pythonAdapter.analyze(snapshot);
    expect(result.signals).toEqual([
      "capability:database-access",
      "capability:http-api",
      "tests:python",
    ]);
  });

  it("detects TypeScript API and frontend capabilities", async () => {
    const result = await typescriptAdapter.analyze(snapshot);
    expect(result.signals).toEqual([
      "capability:frontend",
      "capability:http-api",
      "tests:typescript",
    ]);
  });
});
