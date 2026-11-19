import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { discoverRepositories, formatDiscovery, isPlaceholderPack, repositorySlug, sanitizeRemote } from "../src/discover.js";
import { buildGovernancePackSkeleton } from "../src/init.js";
import { parseCliArguments, runCli } from "../src/index.js";

const run = promisify(execFile);
const roots: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "governance-discover-"));
  roots.push(directory);
  return directory;
}

async function gitRepository(directory: string, commit = true): Promise<void> {
  await mkdir(directory, { recursive: true });
  await run("git", ["init", "-q", "-b", "main"], { cwd: directory });
  if (commit) {
    await run("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "commit", "-q", "--allow-empty", "-m", "init"], { cwd: directory });
  }
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("remote handling", () => {
  it.each([
    ["https://user:secrettoken@github.com/acme/app.git", "https://github.com/acme/app.git"],
    ["https://secrettoken@github.com/acme/app.git", "https://github.com/acme/app.git"],
    ["ssh://git@github.com/acme/app.git", "ssh://github.com/acme/app.git"],
    ["git@github.com:acme/app.git", "git@github.com:acme/app.git"],
    ["https://github.com/acme/app", "https://github.com/acme/app"],
  ])("removes credentials from %s", (remote, expected) => {
    expect(sanitizeRemote(remote)).toBe(expected);
    expect(sanitizeRemote(remote)).not.toContain("secrettoken");
  });

  it.each([
    ["https://github.com/acme/app.git", "acme/app"],
    ["https://github.com/acme/app", "acme/app"],
    ["git@github.com:acme/app.git", "acme/app"],
    ["ssh://github.com/acme/app.git", "acme/app"],
    ["/local/path/only", undefined],
    ["not a url", undefined],
  ])("derives the slug of %s as %s", (remote, expected) => {
    expect(repositorySlug(remote)).toBe(expected);
  });
});

describe("discoverRepositories", () => {
  it("finds each repository in a folder that is not itself a repository", async () => {
    const root = await temporaryDirectory();
    await gitRepository(path.join(root, "backend"));
    await gitRepository(path.join(root, "frontend"));
    await mkdir(path.join(root, "notes"));

    const result = await discoverRepositories(root);
    expect(result.repositories.map((repository) => repository.path)).toEqual(["backend", "frontend"]);
  });

  it("reports the folder itself when it is a repository", async () => {
    const root = await temporaryDirectory();
    await gitRepository(root);
    expect((await discoverRepositories(root)).repositories.map((repository) => repository.path)).toEqual(["."]);
  });

  it("returns an empty list, not an error, when there are no repositories", async () => {
    const root = await temporaryDirectory();
    const result = await discoverRepositories(root);
    expect(result.repositories).toEqual([]);
    expect(formatDiscovery(result)).toContain("No git repositories found");
  });

  it("does not look inside dependency directories or repositories it already found", async () => {
    const root = await temporaryDirectory();
    await gitRepository(path.join(root, "app"));
    await gitRepository(path.join(root, "app", "vendor", "sub"));
    await gitRepository(path.join(root, "node_modules", "pkg"));
    expect((await discoverRepositories(root)).repositories.map((repository) => repository.path)).toEqual(["app"]);
  });

  it("does not follow a symlinked directory out of the folder", async () => {
    const root = await temporaryDirectory();
    const outside = await temporaryDirectory();
    await gitRepository(path.join(outside, "elsewhere"));
    try {
      await symlink(outside, path.join(root, "link"), "junction");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EPERM") return;
      throw error;
    }
    expect((await discoverRepositories(root)).repositories).toEqual([]);
  });

  it("reports git facts: branch, head, and uncommitted changes outside .governance", async () => {
    const root = await temporaryDirectory();
    const repository = path.join(root, "app");
    await gitRepository(repository);

    let facts = (await discoverRepositories(root)).repositories[0]!.git;
    expect(facts.branch).toBe("main");
    expect(facts.head).toMatch(/^[0-9a-f]{40}$/);
    expect(facts.uncommittedChanges).toBe(0);

    await mkdir(path.join(repository, ".governance"));
    await writeFile(path.join(repository, ".governance", "governance-pack.json"), "{}");
    expect((await discoverRepositories(root)).repositories[0]!.git.uncommittedChanges).toBe(0);

    await writeFile(path.join(repository, "change.txt"), "x");
    facts = (await discoverRepositories(root)).repositories[0]!.git;
    expect(facts.uncommittedChanges).toBe(1);
  });

  it("never reports a credential from the origin URL", async () => {
    const root = await temporaryDirectory();
    const repository = path.join(root, "app");
    await gitRepository(repository);
    await run("git", ["remote", "add", "origin", "https://user:secrettoken@github.com/acme/app.git"], { cwd: repository });

    const result = await discoverRepositories(root);
    expect(result.repositories[0]!.git).toMatchObject({ remote: "https://github.com/acme/app.git", repositorySlug: "acme/app" });
    expect(JSON.stringify(result)).not.toContain("secrettoken");
    expect(formatDiscovery(result)).not.toContain("secrettoken");
  });

  it("reads package scripts, package manager, CI commands, docs and notable directories", async () => {
    const root = await temporaryDirectory();
    const repository = path.join(root, "app");
    await gitRepository(repository, false);
    await writeFile(path.join(repository, "package.json"), JSON.stringify({ scripts: { lint: "eslint .", test: "vitest run", broken: 5 } }));
    await writeFile(path.join(repository, "pnpm-lock.yaml"), "lockfileVersion: 9\n");
    await writeFile(path.join(repository, "CLAUDE.md"), "# rules\n");
    await mkdir(path.join(repository, "migrations"));
    await mkdir(path.join(repository, ".github", "workflows"), { recursive: true });
    await writeFile(
      path.join(repository, ".github", "workflows", "ci.yml"),
      ["jobs:", "  verify:", "    steps:", "      - name: Lint", "        run: pnpm lint", "      - run: pnpm test", "      - run: |", "          echo multi", "          echo line"].join("\n"),
    );

    const [found] = (await discoverRepositories(root)).repositories;
    expect(found).toMatchObject({
      name: "app",
      packageManager: "pnpm",
      scripts: { lint: "eslint .", test: "vitest run" },
      docs: ["CLAUDE.md"],
      existingPack: false,
      packIsPlaceholder: false,
    });
    expect(found!.directories).toContain("migrations");
    // Only single-line commands are read; a multi-line script is skipped, not mangled.
    expect(found!.ci).toEqual([{ file: ".github/workflows/ci.yml", commands: ["pnpm lint", "pnpm test"] }]);
  });

  it("tolerates a package.json that is not valid JSON", async () => {
    const root = await temporaryDirectory();
    const repository = path.join(root, "app");
    await gitRepository(repository, false);
    await writeFile(path.join(repository, "package.json"), "{ not json");
    expect((await discoverRepositories(root)).repositories[0]!.scripts).toEqual({});
  });

  it("notices an existing governance pack", async () => {
    const root = await temporaryDirectory();
    const repository = path.join(root, "app");
    await gitRepository(repository, false);
    await mkdir(path.join(repository, ".governance"));
    await writeFile(path.join(repository, ".governance", "governance-pack.json"), "{}");
    expect((await discoverRepositories(root)).repositories[0]!.existingPack).toBe(true);
  });

  describe("telling the empty pack from init apart from a pack with content", () => {
    async function withPack(content: string | undefined) {
      const root = await temporaryDirectory();
      const repository = path.join(root, "app");
      await gitRepository(repository, false);
      if (content !== undefined) {
        await mkdir(path.join(repository, ".governance"));
        await writeFile(path.join(repository, ".governance", "governance-pack.json"), content);
      }
      return (await discoverRepositories(root)).repositories[0]!;
    }
    const skeleton = () => buildGovernancePackSkeleton({ id: "app", name: "app", repository: "UNSET", environment: "development" });

    it("calls the file init writes a placeholder, ready to fill", async () => {
      const found = await withPack(JSON.stringify(skeleton(), null, 2));
      expect(found).toMatchObject({ existingPack: true, packIsPlaceholder: true });
      expect(formatDiscovery({ root: "/r", repositories: [found] })).toContain("pack: placeholder from init (empty, ready to fill)");
    });

    it("has no placeholder when there is no pack at all", async () => {
      expect(await withPack(undefined)).toMatchObject({ existingPack: false, packIsPlaceholder: false });
    });

    it("keeps a placeholder a placeholder when only the project fields were edited", async () => {
      const edited = { ...skeleton(), project: { id: "shop", name: "Shop", repository: "acme/shop", environment: "production" } };
      expect((await withPack(JSON.stringify(edited))).packIsPlaceholder).toBe(true);
    });

    it.each([
      ["a control", (p: Record<string, unknown>) => { p.controls = [{ id: "C-1" }]; }],
      ["evidence", (p: Record<string, unknown>) => { p.evidence = [{ id: "E-1" }]; }],
      ["a standard", (p: Record<string, unknown>) => { p.standards = [{ id: "SEC-007" }]; }],
      ["a risk", (p: Record<string, unknown>) => { p.risks = [{ id: "R-1" }]; }],
      ["a finding", (p: Record<string, unknown>) => { p.findings = [{ id: "F-1" }]; }],
      ["debt", (p: Record<string, unknown>) => { p.debt = [{ id: "DEBT-1" }]; }],
      ["a described change", (p: Record<string, unknown>) => { (p.change as Record<string, unknown>).id = "CHG-APP-1"; }],
      ["declared changed files", (p: Record<string, unknown>) => { (p.change as Record<string, unknown>).files = ["a.ts"]; }],
    ])("is not a placeholder once it has %s, so setup never overwrites it", async (_name, mutate) => {
      const pack = skeleton() as unknown as Record<string, unknown>;
      mutate(pack);
      expect(await withPack(JSON.stringify(pack))).toMatchObject({ existingPack: true, packIsPlaceholder: false });
    });

    it.each(["{ not json", "[]", "null", "{}", ""])("treats an unreadable or unrecognised file (%j) as not a placeholder", async (content) => {
      expect((await withPack(content)).packIsPlaceholder).toBe(false);
    });

    it("recognises exactly the skeleton that init builds", () => {
      expect(isPlaceholderPack(skeleton())).toBe(true);
      expect(isPlaceholderPack({ ...skeleton(), controls: [{}] })).toBe(false);
    });
  });

  it("fails clearly for a folder that does not exist", async () => {
    const parent = await temporaryDirectory();
    await expect(discoverRepositories(path.join(parent, "missing"))).rejects.toThrow("Folder not found");
  });
});

describe("discover through the CLI", () => {
  it("prints machine-readable JSON and exits 0", async () => {
    const root = await temporaryDirectory();
    await gitRepository(path.join(root, "app"));
    let out = "";
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => { out += String(chunk); return true; });

    expect(await runCli(["discover", root, "--json"])).toBe(0);
    const parsed = JSON.parse(out) as { repositories: Array<{ path: string }> };
    expect(parsed.repositories.map((repository) => repository.path)).toEqual(["app"]);
  });

  it("is read-only: it writes nothing into the repositories", async () => {
    const root = await temporaryDirectory();
    const repository = path.join(root, "app");
    await gitRepository(repository);
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    await runCli(["discover", root]);
    const { stdout } = await run("git", ["status", "--porcelain"], { cwd: repository });
    expect(stdout.trim()).toBe("");
  });

  it.each([["--pack", "x.json"], ["--run-tools"], ["--base", "main"], ["--profile", "p.json"]])("rejects %s, which discover does not use", (...extra) => {
    expect(() => parseCliArguments(["discover", ".", ...extra])).toThrow("not supported by the discover command");
  });

  it("still rejects --json for init but allows it for discover", () => {
    expect(() => parseCliArguments(["init", ".", "--json"])).toThrow("--json not supported by the init command.");
    expect(parseCliArguments(["discover", ".", "--json"])).toMatchObject({ command: "discover", json: true });
  });
});
