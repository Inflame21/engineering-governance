import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createNodeFileSystem, nodeFileSystem } from "../src/filesystem.js";

const temporaryRoots: string[] = [];

async function createRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "governance-cli-"));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) =>
    rm(root, { recursive: true, force: true }),
  ));
});

describe("Node filesystem adapter", () => {
  it("walks regular files deterministically and ignores generated directories", async () => {
    const root = await createRoot();
    await mkdir(path.join(root, "src"), { recursive: true });
    await mkdir(path.join(root, "node_modules", "ignored"), { recursive: true });
    await writeFile(path.join(root, "src", "main.py"), "print('ok')");
    await writeFile(path.join(root, "node_modules", "ignored", "module.js"), "");

    await expect(nodeFileSystem.listFiles(root)).resolves.toEqual(["src/main.py"]);
  });

  it("refuses paths that escape the repository root", async () => {
    const root = await createRoot();
    await expect(nodeFileSystem.readTextFile(root, "../outside.txt"))
      .rejects.toThrow("Path escapes repository root");
  });

  it("does not traverse symbolic links during discovery", async () => {
    const root = await createRoot();
    const outside = await createRoot();
    await writeFile(path.join(outside, "secret.txt"), "secret");
    await symlink(outside, path.join(root, "external-link"), process.platform === "win32" ? "junction" : "dir");

    await expect(nodeFileSystem.listFiles(root)).resolves.toEqual([]);
    await expect(nodeFileSystem.readTextFile(root, "external-link/secret.txt"))
      .rejects.toThrow("Resolved file escapes repository root");
  });

  it("loads only regular files within the configured size limit", async () => {
    const root = await createRoot();
    await writeFile(path.join(root, "manifest.json"), '{"name":"example"}');

    await expect(nodeFileSystem.readTextFile(root, "manifest.json"))
      .resolves.toBe('{"name":"example"}');
    await expect(nodeFileSystem.readTextFile(root, "missing.json"))
      .resolves.toBeUndefined();
  });

  it("enforces file-count and text-size limits before unbounded discovery or reads", async () => {
    const root = await createRoot();
    await writeFile(path.join(root, "one.txt"), "one");
    await writeFile(path.join(root, "two.txt"), "two");
    await writeFile(path.join(root, "large.txt"), "too large");
    const bounded = createNodeFileSystem({ maxFiles: 2, maxTextFileBytes: 4 });

    await expect(bounded.listFiles(root)).rejects.toThrow("2 file limit");
    await expect(bounded.readTextFile(root, "large.txt")).rejects.toThrow("exceeds 4 bytes");
  });

  it("rejects a repository root that does not exist or is not a directory", async () => {
    const root = await createRoot();
    await writeFile(path.join(root, "file.txt"), "not a directory");

    await expect(nodeFileSystem.listFiles(path.join(root, "missing"))).rejects.toThrow();
    await expect(nodeFileSystem.listFiles(path.join(root, "file.txt"))).rejects.toThrow("not a directory");
  });

  it("does not list or read a file symlink that points outside the repository", async (context) => {
    const root = await createRoot();
    const outside = await createRoot();
    await writeFile(path.join(outside, "secret.txt"), "secret");
    try {
      await symlink(path.join(outside, "secret.txt"), path.join(root, "link.txt"), "file");
    } catch (error) {
      // shortcut: Windows needs symlink privilege; CI (Linux) exercises this case.
      if ((error as NodeJS.ErrnoException).code === "EPERM") return context.skip();
      throw error;
    }

    await expect(nodeFileSystem.listFiles(root)).resolves.toEqual([]);
    await expect(nodeFileSystem.readTextFile(root, "link.txt")).resolves.toBeUndefined();
  });

  it("treats file names containing shell metacharacters as literal data", async () => {
    const root = await createRoot();
    const name = "a;b$(id)`x`&c.ts";
    await writeFile(path.join(root, name), "export {};");

    await expect(nodeFileSystem.listFiles(root)).resolves.toEqual([name]);
    await expect(nodeFileSystem.readTextFile(root, name)).resolves.toBe("export {};");
  });
});
