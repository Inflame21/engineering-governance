import { describe, expect, it } from "vitest";
import { genericRepositoryAdapter } from "../src/adapters/generic.js";
import { pythonAdapter } from "../src/adapters/python.js";
import { typescriptAdapter } from "../src/adapters/typescript.js";

const snapshot = {
  rootPath: "/repo",
  changedFiles: ["backend/main.py", "src/App.tsx"],
  files: [
    "backend/main.py",
    "backend/routers/users.py",
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
