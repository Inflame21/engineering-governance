import { describe, expect, it } from "vitest";
import { loadRepositorySnapshot } from "../src/filesystem.js";

describe("repository snapshot loader", () => {
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
