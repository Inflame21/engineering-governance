import { mkdtemp, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadGitChangeScope, type GitCommandRunner } from "../src/git-scope.js";

const roots: string[] = [];
async function createRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "governance-git-scope-"));
  roots.push(root);
  return root;
}
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function successfulGitRunner(root: string): GitCommandRunner {
  return {
    async run(args) {
      if (args[0] === "rev-parse" && args[1] === "--show-toplevel") {
        return { exitCode: 0, stdout: `${root}\n`, stderr: "" };
      }
      if (args[0] === "rev-parse" && args.includes("origin/main^{commit}")) {
        return { exitCode: 0, stdout: "base-sha\n", stderr: "" };
      }
      if (args[0] === "rev-parse" && args.includes("HEAD^{commit}")) {
        return { exitCode: 0, stdout: "head-sha\n", stderr: "" };
      }
      if (args[0] === "diff" && args.includes("HEAD")) {
        return { exitCode: 0, stdout: "src/working.py\0", stderr: "" };
      }
      if (args[0] === "diff") {
        return { exitCode: 0, stdout: "src/a.ts\0src/b.py\0", stderr: "" };
      }
      if (args[0] === "ls-files") {
        return { exitCode: 0, stdout: "src/new.py\0", stderr: "" };
      }
      return { exitCode: 1, stdout: "", stderr: "Unexpected Git command." };
    },
  };
}

describe("Git change-scope adapter", () => {
  it("returns normalized changed files and commit provenance", async () => {
    const root = await createRoot();
    const result = await loadGitChangeScope(root, "origin/main", successfulGitRunner(root));

    expect(result).toEqual({
      status: "VERIFIED",
      baseRef: "origin/main",
      headRef: "head-sha",
      files: ["src/a.ts", "src/b.py", "src/new.py", "src/working.py"],
    });
  });

  it("rejects option-like base refs before invoking Git", async () => {
    let invoked = false;
    const result = await loadGitChangeScope("/repo", "--upload-pack=evil", {
      async run() {
        invoked = true;
        return { exitCode: 0, stdout: "", stderr: "" };
      },
    });

    expect(result.status).toBe("UNVERIFIED");
    expect(invoked).toBe(false);
  });

  it("does not claim a diff when the requested scan root is not the Git top level", async () => {
    const root = await createRoot();
    const subdirectory = path.join(root, "service");
    await mkdir(subdirectory);
    const result = await loadGitChangeScope(subdirectory, "origin/main", successfulGitRunner(root));

    expect(result.status).toBe("UNVERIFIED");
    expect(result.reason).toContain("Git top-level directory");
  });
});
