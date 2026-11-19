import { execFile } from "node:child_process";
import { access, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type {
  VerificationProcessResult,
  VerificationToolName,
  VerificationToolRunner,
} from "../../analyzer/src/verification.js";

const EXECUTION_BUFFER_BYTES = 2_000_000;

const ALLOWLISTED_TOOLS: ReadonlySet<string> = new Set<VerificationToolName>([
  "typescript",
  "python3",
  "python",
  "gofmt",
  "osv-scanner",
  "gitleaks",
  "semgrep",
]);

function assertAllowlistedTool(tool: string): asserts tool is VerificationToolName {
  if (!ALLOWLISTED_TOOLS.has(tool)) {
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
  extraEnvironment: Record<string, string> = {},
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
          ...extraEnvironment,
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
 * Executes only the allowlisted TypeScript compiler, Python interpreter and the OSV-Scanner,
 * Gitleaks and Semgrep scanners.
 * It never invokes a shell or installs dependencies, and callers must opt in
 * before passing this runner to governance commands.
 */
/**
 * gofmt has no --version flag (it exits 2), but it prints its usage for -h. Real gofmt from Go 1.24 exits 0
 * for -h, older ones 2, so the usage text, not the exit code, says it is there.
 */
async function gofmtAvailable(cwd: string): Promise<boolean> {
  try {
    const result = await runExecutable("gofmt", ["-h"], cwd, 5_000);
    return /usage: gofmt/i.test(`${result.stdout}\n${result.stderr}`);
  } catch {
    return false;
  }
}

/**
 * gofmt's version is the Go toolchain's. `go version` run inside a module whose go.mod names a newer
 * toolchain makes Go download and switch to it, so this runs outside the repository, with switching off.
 */
async function goToolchainVersion(): Promise<string | undefined> {
  try {
    const result = await runExecutable("go", ["version"], os.tmpdir(), 5_000, { GOTOOLCHAIN: "local" });
    return result.exitCode === 0 ? firstLine(result.stdout) : undefined;
  } catch {
    return undefined;
  }
}

/** The first non-empty line: osv-scanner prints four lines of build information for --version. */
function firstLine(text: string): string | undefined {
  return text.split(/\r?\n/).map((line) => line.trim()).find((line) => line !== "");
}

export const nodeVerificationToolRunner: VerificationToolRunner = {
  async isAvailable(tool: VerificationToolName, rootPath: string, workingDirectory: string): Promise<boolean> {
    assertAllowlistedTool(tool);
    if (tool === "typescript") {
      return Boolean(await findTypeScriptCompiler(rootPath, workingDirectory));
    }

    try {
      const cwd = await resolveConfinedWorkingDirectory(rootPath, workingDirectory);
      if (tool === "gofmt") return await gofmtAvailable(cwd);
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
      if (tool === "gofmt") return await goToolchainVersion();
      if (tool === "typescript") {
        const compiler = await findTypeScriptCompiler(rootPath, workingDirectory);
        if (!compiler) return undefined;
        const result = await runExecutable(
          process.execPath,
          [compiler, "--version"],
          await resolveConfinedWorkingDirectory(rootPath, workingDirectory),
          5_000,
        );
        return result.exitCode === 0 ? firstLine(result.stdout) : undefined;
      }
      const result = await runExecutable(
        tool,
        ["--version"],
        await resolveConfinedWorkingDirectory(rootPath, workingDirectory),
        5_000,
      );
      return result.exitCode === 0 ? firstLine(result.stdout) : undefined;
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
