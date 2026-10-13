import { execFile } from "node:child_process";
import { access, realpath } from "node:fs/promises";
import path from "node:path";
import type {
  VerificationProcessResult,
  VerificationToolName,
  VerificationToolRunner,
} from "../../analyzer/src/verification.js";

const EXECUTION_BUFFER_BYTES = 2_000_000;

function assertAllowlistedTool(tool: string): asserts tool is VerificationToolName {
  if (tool !== "typescript" && tool !== "python3" && tool !== "python") {
    throw new Error(`Verification tool is not allowlisted: ${tool}`);
  }
}

async function resolveConfinedWorkingDirectory(rootPath: string, workingDirectory: string): Promise<string> {
  const root = await realpath(rootPath);
  const candidate = path.resolve(root, workingDirectory);
  const lexicalRelative = path.relative(root, candidate);
  if (
    lexicalRelative === ".." ||
    lexicalRelative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(lexicalRelative)
  ) {
    throw new Error(`Verification working directory escapes repository root: ${workingDirectory}`);
  }

  const canonicalCandidate = await realpath(candidate);
  const canonicalRelative = path.relative(root, canonicalCandidate);
  if (
    canonicalRelative === ".." ||
    canonicalRelative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(canonicalRelative)
  ) {
    throw new Error(`Verification working directory resolves outside repository root: ${workingDirectory}`);
  }
  return canonicalCandidate;
}

function runExecutable(
  executable: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<VerificationProcessResult> {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    execFile(
      executable,
      args,
      {
        cwd,
        timeout: timeoutMs,
        maxBuffer: EXECUTION_BUFFER_BYTES,
        windowsHide: true,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          SystemRoot: process.env.SystemRoot ?? "",
          TEMP: process.env.TEMP ?? "",
          TMP: process.env.TMP ?? "",
          HOME: process.env.HOME ?? "",
          PYTHONNOUSERSITE: "1",
          PYTHONDONTWRITEBYTECODE: "1",
        },
      },
      (error, stdout, stderr) => {
        const durationMs = Date.now() - startedAt;
        if (!error) {
          resolve({ exitCode: 0, stdout, stderr, durationMs });
          return;
        }

        const exitCode = typeof error.code === "number" ? error.code : undefined;
        if (exitCode !== undefined) {
          resolve({ exitCode, stdout, stderr, durationMs });
          return;
        }
        reject(error);
      },
    );
  });
}

async function findTypeScriptCompiler(rootPath: string, workingDirectory: string): Promise<string | undefined> {
  const root = await realpath(rootPath);
  let directory = await resolveConfinedWorkingDirectory(root, workingDirectory);

  while (directory === root || directory.startsWith(`${root}${path.sep}`)) {
    const candidate = path.join(directory, "node_modules", "typescript", "bin", "tsc");
    try {
      await access(candidate);
      return candidate;
    } catch {
      if (directory === root) break;
      directory = path.dirname(directory);
    }
  }
  return undefined;
}

/**
 * Executes only the allowlisted TypeScript compiler and Python interpreter.
 * It never invokes a shell or installs dependencies, and callers must opt in
 * before passing this runner to governance commands.
 */
export const nodeVerificationToolRunner: VerificationToolRunner = {
  async isAvailable(tool: VerificationToolName, rootPath: string, workingDirectory: string): Promise<boolean> {
    assertAllowlistedTool(tool);
    if (tool === "typescript") {
      return Boolean(await findTypeScriptCompiler(rootPath, workingDirectory));
    }

    try {
      const cwd = await resolveConfinedWorkingDirectory(rootPath, workingDirectory);
      const result = await runExecutable(tool, ["--version"], cwd, 5_000);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  },

  async getVersion(
    tool: VerificationToolName,
    rootPath: string,
    workingDirectory: string,
  ): Promise<string | undefined> {
    assertAllowlistedTool(tool);
    try {
      if (tool === "typescript") {
        const compiler = await findTypeScriptCompiler(rootPath, workingDirectory);
        if (!compiler) return undefined;
        const result = await runExecutable(
          process.execPath,
          [compiler, "--version"],
          await resolveConfinedWorkingDirectory(rootPath, workingDirectory),
          5_000,
        );
        return result.exitCode === 0 ? result.stdout.trim() || undefined : undefined;
      }
      const result = await runExecutable(
        tool,
        ["--version"],
        await resolveConfinedWorkingDirectory(rootPath, workingDirectory),
        5_000,
      );
      return result.exitCode === 0 ? result.stdout.trim() || undefined : undefined;
    } catch {
      return undefined;
    }
  },

  async run(
    tool: VerificationToolName,
    args: string[],
    rootPath: string,
    workingDirectory: string,
    timeoutMs: number,
  ): Promise<VerificationProcessResult> {
    assertAllowlistedTool(tool);
    const cwd = await resolveConfinedWorkingDirectory(rootPath, workingDirectory);
    if (tool === "typescript") {
      const compiler = await findTypeScriptCompiler(rootPath, workingDirectory);
      if (!compiler) throw new Error(`Local TypeScript compiler was not found for ${workingDirectory}.`);
      return runExecutable(
        process.execPath,
        [compiler, ...args],
        cwd,
        timeoutMs,
      );
    }

    return runExecutable(tool, args, cwd, timeoutMs);
  },
};
