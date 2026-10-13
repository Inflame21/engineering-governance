import { describe, expect, it } from "vitest";
import { loadRepositorySnapshot } from "../src/filesystem.js";

describe("repository snapshot loader", () => {

  it("loads bounded source content for dependency graph analysis", async () => {
    const snapshot = await loadRepositorySnapshot("/repo", {
      async listFiles() {
        return ["src/domain/user.ts", "src/infrastructure/db.ts", "package.json"];
      },
      async readTextFile(_root, path) {
        if (path === "package.json") return '{"dependencies":{"react":"^19.0.0"}}';
        if (path === "src/domain/user.ts") return 'import { db } from "../infrastructure/db.js";';
        if (path === "src/infrastructure/db.ts") return "export const db = {};";
        return undefined;
      },
    });

    expect(snapshot.fileContents?.["src/domain/user.ts"]).toContain("infrastructure/db");
    expect(snapshot.fileContents?.["src/infrastructure/db.ts"]).toContain("export const db");
    expect(snapshot.contentLimitations).toBeUndefined();
  });

  it("reports unreadable source files instead of treating them as clean", async () => {
    const snapshot = await loadRepositorySnapshot("/repo", {
      async listFiles() {
        return ["src/main.ts"];
      },
      async readTextFile() {
        return undefined;
      },
    });

    expect(snapshot.contentLimitations?.some((item) => item.includes("src/main.ts"))).toBe(true);
  });

  it("loads paths and manifest contents through an injected filesystem port", async () => {
    const snapshot = await loadRepositorySnapshot("/repo", {
      async listFiles() {
        return ["./src/main.py", "pyproject.toml", "README.md"];
      },
      async readTextFile(_root, path) {
        return path === "pyproject.toml" ? '[project]\ndependencies = ["fastapi"]' : undefined;
      },
    }, ["src/main.py"]);

    expect(snapshot.files).toEqual(["README.md", "pyproject.toml", "src/main.py"]);
    expect(snapshot.fileContents?.["pyproject.toml"]).toContain("fastapi");
    expect(snapshot.changedFiles).toEqual(["src/main.py"]);
  });
});
