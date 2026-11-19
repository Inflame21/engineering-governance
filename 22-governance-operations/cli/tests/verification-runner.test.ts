import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { nodeVerificationToolRunner } from "../src/verification-runner.js";

describe("node verification tool runner", () => {
  it("rejects a runtime tool name outside the fixed allowlist before execution", async () => {
    await expect(
      nodeVerificationToolRunner.run(
        "cmd" as never,
        ["/c", "echo", "unexpected"],
        process.cwd(),
        ".",
        1_000,
      ),
    ).rejects.toThrow("not allowlisted");
  });

  it("allowlists osv-scanner and reports availability as a boolean whether or not it is installed", async () => {
    await expect(nodeVerificationToolRunner.isAvailable("osv-scanner", process.cwd(), "."))
      .resolves.toEqual(expect.any(Boolean));
  });

  it("rejects a lexical working-directory traversal before execution", async () => {
    await expect(
      nodeVerificationToolRunner.run(
        "typescript",
        ["--version"],
        process.cwd(),
        "..",
        1_000,
      ),
    ).rejects.toThrow("escapes repository root");
  });
});

describe("node verification tool runner execution boundaries", () => {
  const roots: string[] = [];

  async function repoWithFakeCompiler(source: string): Promise<string> {
    const root = await mkdtemp(path.join(os.tmpdir(), "governance-runner-"));
    roots.push(root);
    await mkdir(path.join(root, "node_modules", "typescript", "bin"), { recursive: true });
    await writeFile(path.join(root, "node_modules", "typescript", "bin", "tsc"), source);
    return root;
  }

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  it("passes repository-controlled arguments verbatim without shell interpretation", async () => {
    const root = await repoWithFakeCompiler("console.log(JSON.stringify(process.argv.slice(2)));");
    const hostile = ["; touch pwned-1", "$(touch pwned-2)", "`touch pwned-3`", "a b && echo c"];

    const result = await nodeVerificationToolRunner.run("typescript", hostile, root, ".", 10_000);

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(hostile);
    for (const marker of ["pwned-1", "pwned-2", "pwned-3"]) {
      await expect(access(path.join(root, marker))).rejects.toThrow();
    }
  });

  it("does not forward unrelated environment variables to verification tools", async () => {
    const root = await repoWithFakeCompiler("console.log(JSON.stringify(Object.keys(process.env)));");
    process.env.GOVERNANCE_TEST_SECRET = "must-not-leak";
    try {
      const result = await nodeVerificationToolRunner.run("typescript", [], root, ".", 10_000);
      expect(JSON.parse(result.stdout)).not.toContain("GOVERNANCE_TEST_SECRET");
    } finally {
      delete process.env.GOVERNANCE_TEST_SECRET;
    }
  });

  it("surfaces a timeout as an execution failure rather than a result", async () => {
    const root = await repoWithFakeCompiler("setTimeout(() => {}, 30000);");

    await expect(nodeVerificationToolRunner.run("typescript", [], root, ".", 300))
      .rejects.toMatchObject({ killed: true });
  });

  it("surfaces output beyond the buffer limit as an execution failure", async () => {
    const root = await repoWithFakeCompiler('process.stdout.write("x".repeat(3_000_000));');

    await expect(nodeVerificationToolRunner.run("typescript", [], root, ".", 10_000))
      .rejects.toMatchObject({ code: "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" });
  });

  it("reports a non-zero tool exit as a result, distinct from an execution failure", async () => {
    const root = await repoWithFakeCompiler("console.error('boom'); process.exit(2);");

    await expect(nodeVerificationToolRunner.run("typescript", [], root, ".", 10_000))
      .resolves.toMatchObject({ exitCode: 2, stderr: expect.stringContaining("boom") });
  });

  it("rejects a working directory that resolves outside the repository through a link", async () => {
    const root = await repoWithFakeCompiler("console.log('ran');");
    const outside = await mkdtemp(path.join(os.tmpdir(), "governance-runner-outside-"));
    roots.push(outside);
    await symlink(outside, path.join(root, "escape"), process.platform === "win32" ? "junction" : "dir");

    await expect(nodeVerificationToolRunner.run("typescript", [], root, "escape", 10_000))
      .rejects.toThrow("resolves outside repository root");
  });

  it("reports TypeScript unavailable only when no local compiler exists", async () => {
    const withCompiler = await repoWithFakeCompiler("console.log('v');");
    const withoutCompiler = await mkdtemp(path.join(os.tmpdir(), "governance-runner-empty-"));
    roots.push(withoutCompiler);

    await expect(nodeVerificationToolRunner.isAvailable("typescript", withCompiler, ".")).resolves.toBe(true);
    await expect(nodeVerificationToolRunner.isAvailable("typescript", withoutCompiler, ".")).resolves.toBe(false);
  });
});

describe("node verification tool runner and Go", () => {
  const originalPath = process.env.PATH;
  const dirs: string[] = [];
  afterEach(async () => {
    process.env.PATH = originalPath;
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("allowlists gofmt, and reports its availability and version without throwing whether or not Go is installed", async () => {
    await expect(nodeVerificationToolRunner.isAvailable("gofmt", process.cwd(), ".")).resolves.toEqual(expect.any(Boolean));
    const version = await nodeVerificationToolRunner.getVersion?.("gofmt", process.cwd(), ".");
    expect(version === undefined || /^go version /.test(version)).toBe(true);
  });

  it("reports gofmt unavailable when no such program is on the PATH", async () => {
    const empty = await mkdtemp(path.join(os.tmpdir(), "governance-no-go-"));
    dirs.push(empty);
    process.env.PATH = empty;
    await expect(nodeVerificationToolRunner.isAvailable("gofmt", process.cwd(), ".")).resolves.toBe(false);
    await expect(nodeVerificationToolRunner.getVersion?.("gofmt", process.cwd(), ".")).resolves.toBeUndefined();
  });

  // Fake gofmt and go programs are shell scripts, so these two run on Linux and macOS (including CI).
  describe.skipIf(process.platform === "win32")("with stand-in gofmt and go programs", () => {
    async function withFakeGo(gofmtScript: string): Promise<{ marker: string; repo: string }> {
      const bin = await mkdtemp(path.join(os.tmpdir(), "governance-fake-go-"));
      const repo = await mkdtemp(path.join(os.tmpdir(), "governance-fake-repo-"));
      dirs.push(bin, repo);
      const marker = path.join(bin, "go-marker.txt");
      await writeFile(path.join(bin, "gofmt"), gofmtScript, { mode: 0o755 });
      await writeFile(path.join(bin, "go"), `#!/bin/sh\necho "$GOTOOLCHAIN|$(pwd -P)" > "${marker}"\necho "go version go1.99.0 fake/amd64"\n`, { mode: 0o755 });
      process.env.PATH = `${bin}${path.delimiter}${originalPath ?? ""}`;
      return { marker, repo };
    }

    it("treats gofmt as available when it prints its usage for -h, whatever the exit code (older versions exit 2)", async () => {
      const { repo } = await withFakeGo("#!/bin/sh\nif [ \"$1\" = \"-h\" ]; then echo 'usage: gofmt [flags] [path ...]' >&2; exit 2; fi\nexit 2\n");
      await expect(nodeVerificationToolRunner.isAvailable("gofmt", repo, ".")).resolves.toBe(true);
    });

    it("does not treat a program named gofmt that fails to print usage as gofmt", async () => {
      const { repo } = await withFakeGo("#!/bin/sh\necho 'something else'\nexit 0\n");
      await expect(nodeVerificationToolRunner.isAvailable("gofmt", repo, ".")).resolves.toBe(false);
    });

    it("reads the Go version by running go outside the repository with toolchain switching off", async () => {
      const { marker, repo } = await withFakeGo("#!/bin/sh\nexit 0\n");
      await expect(nodeVerificationToolRunner.getVersion?.("gofmt", repo, ".")).resolves.toBe("go version go1.99.0 fake/amd64");
      const [toolchain, cwd] = (await readFile(marker, "utf8")).trim().split("|");
      expect(toolchain).toBe("local"); // a go.mod naming a newer toolchain cannot make go download one
      expect(cwd).not.toContain(path.basename(repo));
    });

    it("runs gofmt with the arguments given, in the repository, and returns its exit code", async () => {
      const { repo } = await withFakeGo("#!/bin/sh\necho \"$@\" >&2\nexit 2\n");
      const result = await nodeVerificationToolRunner.run("gofmt", ["-e", "-l", "--", "-x.go"], repo, ".", 10_000);
      expect(result).toMatchObject({ exitCode: 2, stderr: "-e -l -- -x.go\n" });
    });
  });
});
