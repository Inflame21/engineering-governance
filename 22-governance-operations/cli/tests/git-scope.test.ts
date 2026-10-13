import { describe, expect, it } from "vitest";
import { loadGitChangeScope, type GitCommandRunner } from "../src/git-scope.js";

function successfulGitRunner(): GitCommandRunner {
  return {
    async run(args) {
      if (args[0] === "rev-parse" && args[1] === "--show-toplevel") {
        return { exitCode: 0, stdout: "/repo\n", stderr: "" };
      }
      if (args[0] === "rev-parse" && args.includes("origin/main^{commit}")) {
        return { exitCode: 0, stdout: "base-sha\n", stderr: "" };
      }
      if (args[0] === "rev-parse" && args.includes("HEAD^{commit}")) {
        return { exitCode: 0, stdout: "head-sha\n", stderr: "" };
      }
      if (args[0] === "diff") {
        return { exitCode: 0, stdout: "src/a.ts\0src/b.py\0", stderr: "" };
      }
      return { exitCode: 1, stdout: "", stderr: "Unexpected Git command." };
    },
  };
}

describe("Git change-scope adapter", () => {
  it("returns normalized changed files and commit provenance", async () => {
    const result = await loadGitChangeScope("/repo", "origin/main", successfulGitRunner());

    expect(result).toEqual({
      status: "VERIFIED",
      baseRef: "origin/main",
      headRef: "head-sha",
      files: ["src/a.ts", "src/b.py"],
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
    const result = await loadGitChangeScope("/repo/service", "origin/main", {
      async run() {
        return { exitCode: 0, stdout: "/repo\n", stderr: "" };
      },
    });

    expect(result.status).toBe("UNVERIFIED");
    expect(result.reason).toContain("Git top-level directory");
  });
});
