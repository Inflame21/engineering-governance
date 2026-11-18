import { execFile } from "node:child_process";
import { lstat, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

export interface DiscoveredRepository {
  /** Path relative to the discovery root; "." when the root itself is a repository. */
  path: string;
  name: string;
  git: {
    branch?: string;
    head?: string;
    /** Tracked or untracked changes, not counting .governance/. */
    uncommittedChanges?: number;
    /** The origin URL with any credentials removed. */
    remote?: string;
    /** "owner/name" when the remote is a recognizable hosted repository. */
    repositorySlug?: string;
  };
  packageManager?: string;
  /** package.json scripts, name to command. */
  scripts: Record<string, string>;
  /** Single-line `run:` commands of each CI workflow. Multi-line scripts are not read. */
  ci: Array<{ file: string; commands: string[] }>;
  /** Guidance documents present at the repository root. */
  docs: string[];
  /** Notable directories present at the repository root. */
  directories: string[];
  existingPack: boolean;
}

export interface DiscoveryResult {
  root: string;
  repositories: DiscoveredRepository[];
}

const MAX_DEPTH = 3;
const MAX_TEXT_BYTES = 1_000_000;
const MAX_CI_COMMANDS = 200;
const GIT_TIMEOUT_MS = 10_000;
const SKIPPED_DIRECTORIES = new Set([
  ".git", "node_modules", "dist", "build", "coverage", ".next", ".nuxt",
  ".venv", "venv", "__pycache__", ".pytest_cache", ".mypy_cache", ".tox",
]);
const KNOWN_DOCS = ["CLAUDE.md", "AGENTS.md", "README.md", "CONTRIBUTING.md", "SECURITY.md"];
const KNOWN_DIRECTORIES = ["docs", "contracts", "migrations", "tests", "test", "src", "scripts"];
const LOCKFILES: Array<[string, string]> = [
  ["pnpm-lock.yaml", "pnpm"], ["package-lock.json", "npm"], ["yarn.lock", "yarn"],
  ["bun.lock", "bun"], ["bun.lockb", "bun"], ["uv.lock", "uv"], ["poetry.lock", "poetry"],
  ["requirements.txt", "pip"],
];

async function exists(target: string): Promise<boolean> {
  try {
    await lstat(target);
    return true;
  } catch {
    return false;
  }
}

async function readSmallText(file: string): Promise<string | undefined> {
  try {
    const info = await lstat(file);
    if (!info.isFile() || info.size > MAX_TEXT_BYTES) return undefined;
    return await readFile(file, "utf8");
  } catch {
    return undefined;
  }
}

/** Remove credentials from a git remote so they can never be copied into a pack. */
export function sanitizeRemote(remote: string): string {
  return remote.trim().replace(/^([a-z][a-z0-9+.-]*:\/\/)[^@/\s]*@/i, "$1");
}

/** "owner/name" for common hosted-repository URLs, otherwise undefined. */
export function repositorySlug(remote: string): string | undefined {
  const match = /^(?:[a-z][a-z0-9+.-]*:\/\/(?:[^/]+)\/|[^@\s]+@[^:\s]+:)([^/\s]+\/[^/\s]+?)(?:\.git)?\/?$/i.exec(remote.trim());
  return match?.[1];
}

async function git(repository: string, args: string[]): Promise<string | undefined> {
  try {
    const { stdout } = await run("git", args, {
      cwd: repository,
      timeout: GIT_TIMEOUT_MS,
      windowsHide: true,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });
    return stdout.trim();
  } catch {
    return undefined;
  }
}

async function gitFacts(repository: string): Promise<DiscoveredRepository["git"]> {
  const [branch, head, status, rawRemote] = await Promise.all([
    git(repository, ["branch", "--show-current"]),
    git(repository, ["rev-parse", "HEAD"]),
    git(repository, ["status", "--porcelain"]),
    git(repository, ["remote", "get-url", "origin"]),
  ]);
  const changes = status === undefined
    ? undefined
    : status.split("\n").filter((line) => line.trim() && !/^.. "?\.governance\//.test(line)).length;
  const remote = rawRemote ? sanitizeRemote(rawRemote) : undefined;
  const slug = remote ? repositorySlug(remote) : undefined;
  return {
    ...(branch ? { branch } : {}),
    ...(head ? { head } : {}),
    ...(changes !== undefined ? { uncommittedChanges: changes } : {}),
    ...(remote ? { remote } : {}),
    ...(slug ? { repositorySlug: slug } : {}),
  };
}

async function readScripts(repository: string): Promise<Record<string, string>> {
  const text = await readSmallText(path.join(repository, "package.json"));
  if (!text) return {};
  try {
    const scripts = (JSON.parse(text) as { scripts?: unknown }).scripts;
    if (typeof scripts !== "object" || scripts === null || Array.isArray(scripts)) return {};
    return Object.fromEntries(Object.entries(scripts).filter(([, value]) => typeof value === "string")) as Record<string, string>;
  } catch {
    return {};
  }
}

async function readCi(repository: string): Promise<DiscoveredRepository["ci"]> {
  const directory = path.join(repository, ".github", "workflows");
  let names: string[];
  try {
    names = (await readdir(directory)).filter((name) => /\.ya?ml$/i.test(name)).sort();
  } catch {
    return [];
  }
  const workflows: DiscoveredRepository["ci"] = [];
  for (const name of names) {
    const text = await readSmallText(path.join(directory, name));
    if (text === undefined) continue;
    // A single-line command only. The lookahead also refuses a space, so `run: |` cannot be matched by
    // backtracking over the whitespace.
    const commands = [...text.matchAll(/^[ \t]*(?:-[ \t]+)?run:[ \t]+(?![|> \t])(.+?)[ \t]*$/gm)]
      .map((match) => match[1]!)
      .slice(0, MAX_CI_COMMANDS);
    workflows.push({ file: `.github/workflows/${name}`, commands });
  }
  return workflows;
}

async function describeRepository(root: string, repository: string): Promise<DiscoveredRepository> {
  const relative = path.relative(root, repository).replaceAll("\\", "/") || ".";
  const packageManager = (await Promise.all(LOCKFILES.map(async ([file, name]) => (await exists(path.join(repository, file))) ? name : undefined))).find(Boolean);
  return {
    path: relative,
    name: path.basename(repository),
    git: await gitFacts(repository),
    ...(packageManager ? { packageManager } : {}),
    scripts: await readScripts(repository),
    ci: await readCi(repository),
    docs: (await Promise.all(KNOWN_DOCS.map(async (doc) => (await exists(path.join(repository, doc))) ? doc : undefined))).filter((doc): doc is string => Boolean(doc)),
    directories: (await Promise.all(KNOWN_DIRECTORIES.map(async (directory) => {
      try {
        return (await stat(path.join(repository, directory))).isDirectory() ? directory : undefined;
      } catch {
        return undefined;
      }
    }))).filter((directory): directory is string => Boolean(directory)),
    existingPack: await exists(path.join(repository, ".governance", "governance-pack.json")),
  };
}

/**
 * Find the git repositories in a folder, and report facts about each. It reads files and runs only
 * `git` with fixed arguments; it never follows symlinks, never descends into a repository it has found,
 * skips dependency and build directories, and never executes anything the repositories define.
 */
export async function discoverRepositories(rootPath: string): Promise<DiscoveryResult> {
  const root = path.resolve(rootPath);
  const info = await stat(root).catch(() => undefined);
  if (!info?.isDirectory()) throw new Error(`Folder not found: ${rootPath}`);

  const found: string[] = [];
  async function walk(directory: string, depth: number): Promise<void> {
    if (await exists(path.join(directory, ".git"))) {
      found.push(directory);
      return;
    }
    if (depth >= MAX_DEPTH) return;
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || SKIPPED_DIRECTORIES.has(entry.name)) continue;
      await walk(path.join(directory, entry.name), depth + 1);
    }
  }
  await walk(root, 0);

  return { root, repositories: await Promise.all(found.map((repository) => describeRepository(root, repository))) };
}

export function formatDiscovery(result: DiscoveryResult): string {
  if (result.repositories.length === 0) {
    return `No git repositories found under ${result.root} (searched ${MAX_DEPTH} levels deep).`;
  }
  const lines = [`Found ${result.repositories.length} git ${result.repositories.length === 1 ? "repository" : "repositories"} under ${result.root}:`, ""];
  for (const repository of result.repositories) {
    const { git: facts } = repository;
    lines.push(
      `${repository.path}`,
      `  branch ${facts.branch ?? "unknown"}, head ${facts.head?.slice(0, 7) ?? "unknown"}, uncommitted changes: ${facts.uncommittedChanges ?? "unknown"}`,
      `  remote ${facts.repositorySlug ?? facts.remote ?? "none"}`,
      `  package manager ${repository.packageManager ?? "unknown"}; scripts: ${Object.keys(repository.scripts).join(", ") || "none"}`,
      `  CI: ${repository.ci.map((workflow) => `${workflow.file} (${workflow.commands.length} commands)`).join(", ") || "none"}`,
      `  docs: ${repository.docs.join(", ") || "none"}; pack: ${repository.existingPack ? "exists" : "none"}`,
      "",
    );
  }
  return lines.join("\n").trimEnd();
}
