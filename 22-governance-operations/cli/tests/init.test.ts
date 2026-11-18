import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadGovernancePack } from "../src/config.js";
import { createNodeFileSystem } from "../src/filesystem.js";
import { runCli, parseCliArguments } from "../src/index.js";
import { buildGovernancePackSkeleton, initializeGovernancePack, slugifyProjectId } from "../src/init.js";

const roots: string[] = [];

async function temporaryDirectory(prefix = "governance-init-"): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix));
  roots.push(directory);
  return directory;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("init argument parsing", () => {
  it("accepts the init-only options and a custom pack path", () => {
    expect(parseCliArguments(["init", "repo", "--id", "billing", "--name", "Billing API", "--repo", "acme/billing", "--environment", "staging", "--pack", "gov/pack.json"]))
      .toMatchObject({
        command: "init",
        packPath: "gov/pack.json",
        init: { id: "billing", name: "Billing API", repository: "acme/billing", environment: "staging" },
      });
  });

  it.each(["--id", "--name", "--repo", "--environment"])("rejects %s on commands other than init", (option) => {
    expect(() => parseCliArguments(["check", ".", option, "x"])).toThrow(`${option} is only supported by the init command.`);
  });

  it.each(["--id", "--name", "--repo", "--environment"])("requires a value for %s", (option) => {
    expect(() => parseCliArguments(["init", ".", option])).toThrow(`${option} requires a value.`);
    expect(() => parseCliArguments(["init", ".", option, "--json"])).toThrow(`${option} requires a value.`);
  });

  it.each([
    [["--json"], "--json"],
    [["--run-tools"], "--run-tools"],
    [["--base", "origin/main"], "--base"],
    [["--profile", "p.json"], "--profile"],
    [["--catalog", "c.json"], "--catalog"],
  ])("rejects %j, which init does not use", (extra, name) => {
    expect(() => parseCliArguments(["init", ".", ...extra])).toThrow(`${name} not supported by the init command.`);
  });
});

describe("generated pack", () => {
  it("asserts nothing: no control, evidence, risk, decision, exception or debt", () => {
    const pack = buildGovernancePackSkeleton({ id: "demo", name: "Demo", repository: "UNSET", environment: "development" });
    expect(pack.controls).toEqual([]);
    expect(pack.evidence).toEqual([]);
    expect(pack.risks).toEqual([]);
    expect(pack.decisions).toEqual([]);
    expect(pack.exceptions).toEqual([]);
    expect(pack.debt).toEqual([]);
    expect(pack.standards).toEqual([]);
    expect(pack.change.files).toEqual([]);
  });

  it.each([
    ["My Project!", "my-project"],
    ["Billing_API.v2", "billing_api.v2"],
    ["--weird--", "weird"],
    ["___", undefined],
    ["日本語", undefined],
  ])("derives a project id from %j as %j", (name, expected) => {
    expect(slugifyProjectId(name)).toBe(expected);
  });
});

describe("initializeGovernancePack", () => {
  it("creates a pack that the CLI's own loader accepts, with the project record filled in", async () => {
    const repository = await temporaryDirectory();
    const result = await initializeGovernancePack({ repositoryPath: repository, packPath: ".governance/governance-pack.json", id: "demo", name: "Demo App", repository: "acme/demo" });

    expect(result).toMatchObject({ packPath: ".governance/governance-pack.json", project: { id: "demo", name: "Demo App", repository: "acme/demo", environment: "development" } });
    const pack = await loadGovernancePack(repository, ".governance/governance-pack.json", createNodeFileSystem());
    expect(pack.project.id).toBe("demo");
  });

  it("marks what still has to be filled in, rather than inventing it", async () => {
    const repository = await temporaryDirectory();
    const { project } = await initializeGovernancePack({ repositoryPath: repository, packPath: ".governance/governance-pack.json", id: "demo" });
    expect(project.repository).toBe("UNSET");
  });

  it("derives the project id from the directory name when none is given", async () => {
    const parent = await temporaryDirectory();
    const repository = path.join(parent, "My Project!");
    await mkdir(repository);
    const { project } = await initializeGovernancePack({ repositoryPath: repository, packPath: ".governance/governance-pack.json" });
    expect(project).toMatchObject({ id: "my-project", name: "My Project!" });
  });

  it("asks for --id when the directory name gives nothing usable", async () => {
    const parent = await temporaryDirectory();
    const repository = path.join(parent, "___");
    await mkdir(repository);
    await expect(initializeGovernancePack({ repositoryPath: repository, packPath: ".governance/governance-pack.json" })).rejects.toThrow("pass --id");
  });

  it("rejects an invalid --id and writes nothing", async () => {
    const repository = await temporaryDirectory();
    await expect(initializeGovernancePack({ repositoryPath: repository, packPath: ".governance/governance-pack.json", id: "Not A Slug" })).rejects.toThrow("Invalid --id");
    await expect(readFile(path.join(repository, ".governance", "governance-pack.json"), "utf8")).rejects.toThrow();
  });

  it("never overwrites an existing pack", async () => {
    const repository = await temporaryDirectory();
    await mkdir(path.join(repository, ".governance"));
    const existing = path.join(repository, ".governance", "governance-pack.json");
    await writeFile(existing, '{"precious":"content"}');

    await expect(initializeGovernancePack({ repositoryPath: repository, packPath: ".governance/governance-pack.json", id: "demo" })).rejects.toThrow("already exists; it was not overwritten");
    expect(await readFile(existing, "utf8")).toBe('{"precious":"content"}');
  });

  it("creates missing parent directories for a custom pack path", async () => {
    const repository = await temporaryDirectory();
    await initializeGovernancePack({ repositoryPath: repository, packPath: "tools/governance/pack.json", id: "demo" });
    await expect(loadGovernancePack(repository, "tools/governance/pack.json", createNodeFileSystem())).resolves.toBeDefined();
  });

  it.each(["../outside.json", "../../outside.json", "nested/../../outside.json"])("refuses a pack path that escapes the repository: %s", async (packPath) => {
    const repository = await temporaryDirectory();
    await expect(initializeGovernancePack({ repositoryPath: repository, packPath, id: "demo" })).rejects.toThrow("escapes repository root");
  });

  it("refuses an absolute pack path outside the repository", async () => {
    const repository = await temporaryDirectory();
    const outside = path.join(await temporaryDirectory(), "pack.json");
    await expect(initializeGovernancePack({ repositoryPath: repository, packPath: outside, id: "demo" })).rejects.toThrow("escapes repository root");
    await expect(readFile(outside, "utf8")).rejects.toThrow();
  });

  it("refuses to write through a symlinked directory that points outside the repository", async (context) => {
    const repository = await temporaryDirectory();
    const outside = await temporaryDirectory("governance-outside-");
    try {
      await symlink(outside, path.join(repository, ".governance"), "junction");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EPERM") return context.skip();
      throw error;
    }
    await expect(initializeGovernancePack({ repositoryPath: repository, packPath: ".governance/governance-pack.json", id: "demo" })).rejects.toThrow("not a plain directory");
    await expect(readFile(path.join(outside, "governance-pack.json"), "utf8")).rejects.toThrow();
  });

  it("fails clearly for a missing repository or one that is a file", async () => {
    const parent = await temporaryDirectory();
    await expect(initializeGovernancePack({ repositoryPath: path.join(parent, "missing"), packPath: ".governance/governance-pack.json" })).rejects.toThrow("Repository not found");
    const file = path.join(parent, "file.txt");
    await writeFile(file, "x");
    await expect(initializeGovernancePack({ repositoryPath: file, packPath: ".governance/governance-pack.json" })).rejects.toThrow("not a directory");
  });
});

describe("init through the CLI", () => {
  function capture() {
    let stdout = "";
    let stderr = "";
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => { stdout += String(chunk); return true; });
    vi.spyOn(process.stderr, "write").mockImplementation((chunk) => { stderr += String(chunk); return true; });
    return { out: () => stdout, err: () => stderr };
  }

  it("creates the pack (exit 0), then refuses to repeat itself (exit 3)", async () => {
    const repository = await temporaryDirectory();
    const output = capture();

    expect(await runCli(["init", repository, "--id", "demo"])).toBe(0);
    expect(output.out()).toContain('Created .governance/governance-pack.json for project "demo".');
    expect(output.out()).toContain("This pack asserts nothing.");

    expect(await runCli(["init", repository, "--id", "demo"])).toBe(3);
    expect(output.err()).toContain("already exists; it was not overwritten");
  });

  it("is not a pass: check returns NO-GO because nothing was evaluated", async () => {
    const repository = await temporaryDirectory();
    await writeFile(path.join(repository, "package.json"), '{"name":"demo"}\n');
    const output = capture();
    expect(await runCli(["init", repository, "--id", "demo"])).toBe(0);

    const initOutput = output.out().length;
    const exitCode = await runCli(["check", repository, "--json"]);
    expect(exitCode).toBe(2);
    const result = JSON.parse(output.out().slice(initOutput)) as { evaluation: { decision: { status: string; blockingViolations: Array<{ controlId: string }> } } };
    expect(result.evaluation.decision.status).toBe("NO-GO");
    expect(result.evaluation.decision.blockingViolations.map((violation) => violation.controlId)).toContain("SCOPE:NO_APPLICABLE_CONTROLS");
  });

  it("validate accepts the generated pack", async () => {
    const repository = await temporaryDirectory();
    const output = capture();
    expect(await runCli(["init", repository, "--id", "demo"])).toBe(0);
    expect(await runCli(["validate", repository])).toBe(0);
    expect(output.out()).toContain("Valid");
  });
});
