import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadGitChangeScope, loadHeadCommit, type GitCommandRunner } from "../src/git-scope.js";

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

describe("assessed commit", () => {
  const SHA = "0123456789abcdef0123456789abcdef01234567";
  const fake = (head: { exitCode: number; stdout: string }, status: { exitCode: number; stdout: string }): GitCommandRunner => ({
    async run(args) {
      const out = args[0] === "status" ? status : head;
      return { ...out, stderr: "" };
    },
  });

  it("names HEAD when no tracked file is modified", async () => {
    expect(await loadHeadCommit("/repo", fake({ exitCode: 0, stdout: `${SHA.toUpperCase()}\n` }, { exitCode: 0, stdout: "" }))).toBe(SHA);
  });

  it("names no commit when tracked files are modified, Git fails, or the output is not a commit id", async () => {
    expect(await loadHeadCommit("/repo", fake({ exitCode: 0, stdout: `${SHA}\n` }, { exitCode: 0, stdout: " M src/a.ts\n" }))).toBeUndefined();
    expect(await loadHeadCommit("/repo", fake({ exitCode: 128, stdout: "" }, { exitCode: 0, stdout: "" }))).toBeUndefined();
    expect(await loadHeadCommit("/repo", fake({ exitCode: 0, stdout: "head-sha\n" }, { exitCode: 0, stdout: "" }))).toBeUndefined();
    expect(await loadHeadCommit("/repo", fake({ exitCode: 0, stdout: `${SHA}\n` }, { exitCode: 128, stdout: "" }))).toBeUndefined();
    expect(await loadHeadCommit("/repo", { async run() { throw new Error("git is not installed"); } })).toBeUndefined();
  });

  it("works against a real repository: modified tracked files hide the commit, untracked files (CI's evidence) do not", async () => {
    const root = await createRoot();
    const git = (...args: string[]) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", ...args], { cwd: root, encoding: "utf8" });
    git("init", "-q");
    await writeFile(path.join(root, "a.txt"), "one\n");
    git("add", "a.txt");
    git("commit", "-q", "-m", "first");
    const commit = git("rev-parse", "HEAD").trim();

    expect(await loadHeadCommit(root)).toBe(commit);
    await mkdir(path.join(root, ".governance", "evidence", "ci"), { recursive: true });
    await writeFile(path.join(root, ".governance", "evidence", "ci", "runs.json"), "{}");
    expect(await loadHeadCommit(root)).toBe(commit);
    await writeFile(path.join(root, "a.txt"), "two\n");
    expect(await loadHeadCommit(root)).toBeUndefined();
  });

  it("names no commit outside a Git repository", async () => {
    expect(await loadHeadCommit(await createRoot())).toBeUndefined();
  });
});
