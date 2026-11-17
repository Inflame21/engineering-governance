import { access, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
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
