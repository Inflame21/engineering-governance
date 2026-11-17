import { execFile } from "node:child_process";
import { realpath } from "node:fs/promises";
import type { RepositoryChangeScope } from "../../analyzer/src/types.js";

export interface GitCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface GitCommandRunner {
  run(args: string[], cwd: string, timeoutMs: number): Promise<GitCommandResult>;
}

const GIT_TIMEOUT_MS = 10_000;
const GIT_MAX_BUFFER = 1_000_000;

export const nodeGitCommandRunner: GitCommandRunner = {
  async run(args, cwd, timeoutMs): Promise<GitCommandResult> {
    return new Promise((resolve, reject) => {
      execFile(
        "git",
        args,
        {
          cwd,
          timeout: timeoutMs,
          maxBuffer: GIT_MAX_BUFFER,
          windowsHide: true,
          encoding: "utf8",
          env: {
            PATH: process.env.PATH ?? "",
            SystemRoot: process.env.SystemRoot ?? "",
            HOME: process.env.HOME ?? "",
            GIT_CONFIG_NOSYSTEM: "1",
            GIT_TERMINAL_PROMPT: "0",
            GIT_OPTIONAL_LOCKS: "0",
          },
        },
        (error, stdout, stderr) => {
          if (!error) {
            resolve({ exitCode: 0, stdout, stderr });
            return;
          }
          const exitCode = typeof error.code === "number" ? error.code : undefined;
          if (exitCode !== undefined) {
            resolve({ exitCode, stdout, stderr });
            return;
          }
          reject(error);
        },
      );
    });
  },
};

function unverifiedScope(baseRef: string, reason: string): RepositoryChangeScope {
  return { status: "UNVERIFIED", baseRef, files: [], reason };
}

/**
 * Computes a deterministic diff without a shell. The scan root must be the Git
 * top-level directory so paths in the diff match repository snapshot paths.
 */
export async function loadGitChangeScope(
  repositoryRoot: string,
  baseRef: string,
  runner: GitCommandRunner = nodeGitCommandRunner,
): Promise<RepositoryChangeScope> {
  const normalizedBase = baseRef.trim();
  if (!normalizedBase || normalizedBase.startsWith("-") || normalizedBase.includes("\0") || /[\r\n]/.test(normalizedBase)) {
    return unverifiedScope(baseRef, "The base revision is empty or contains unsupported characters.");
  }

  try {
    const root = await realpath(repositoryRoot);
    const topResult = await runner.run(["rev-parse", "--show-toplevel"], root, GIT_TIMEOUT_MS);
    if (topResult.exitCode !== 0) {
      return unverifiedScope(normalizedBase, topResult.stderr.trim() || "The scan root is not a Git repository.");
    }

    const gitRoot = await realpath(topResult.stdout.trim());
    if (gitRoot !== root) {
      return unverifiedScope(normalizedBase, "The scan root must be the Git top-level directory for changed-file paths to be reliable.");
    }

    const baseResult = await runner.run(
      ["rev-parse", "--verify", "--end-of-options", `${normalizedBase}^{commit}`],
      root,
      GIT_TIMEOUT_MS,
    );
    if (baseResult.exitCode !== 0 || !baseResult.stdout.trim()) {
      return unverifiedScope(normalizedBase, baseResult.stderr.trim() || "The base revision could not be resolved.");
    }

    const headResult = await runner.run(
      ["rev-parse", "--verify", "--end-of-options", "HEAD^{commit}"],
      root,
      GIT_TIMEOUT_MS,
    );
    if (headResult.exitCode !== 0 || !headResult.stdout.trim()) {
      return unverifiedScope(normalizedBase, headResult.stderr.trim() || "HEAD could not be resolved.");
    }

    const baseCommit = baseResult.stdout.trim();
    const headCommit = headResult.stdout.trim();
    const diffArguments = [
      "diff",
      "--name-only",
      "-z",
      "--diff-filter=ACDMRT",
      "--no-ext-diff",
      "--no-textconv",
    ];
    const committedDiff = await runner.run(
      [...diffArguments, `${baseCommit}...${headCommit}`, "--"],
      root,
      GIT_TIMEOUT_MS,
    );
    if (committedDiff.exitCode !== 0) {
      return unverifiedScope(normalizedBase, committedDiff.stderr.trim() || "Git could not compute the committed diff.");
    }

    // Include staged and unstaged edits as well as non-ignored untracked files,
    // because the repository snapshot analyzes the working tree, not just HEAD.
    const workingTreeDiff = await runner.run(
      [...diffArguments, "HEAD", "--"],
      root,
      GIT_TIMEOUT_MS,
    );
    if (workingTreeDiff.exitCode !== 0) {
      return unverifiedScope(normalizedBase, workingTreeDiff.stderr.trim() || "Git could not compute the working-tree diff.");
    }

    const untrackedFiles = await runner.run(
      ["ls-files", "--others", "--exclude-standard", "-z"],
      root,
      GIT_TIMEOUT_MS,
    );
    if (untrackedFiles.exitCode !== 0) {
      return unverifiedScope(normalizedBase, untrackedFiles.stderr.trim() || "Git could not enumerate untracked files.");
    }

    const files = [...new Set([
      ...committedDiff.stdout.split("\0"),
      ...workingTreeDiff.stdout.split("\0"),
      ...untrackedFiles.stdout.split("\0"),
    ].filter(Boolean).map((file) => file.replaceAll("\\", "/")))].sort();
    return {
      status: "VERIFIED",
      baseRef: normalizedBase,
      headRef: headCommit,
      files,
    };
  } catch (error) {
    return unverifiedScope(
      normalizedBase,
      `Git change-scope verification failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
