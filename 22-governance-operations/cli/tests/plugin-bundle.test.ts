import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const run = promisify(execFile);
const cliDirectory = fileURLToPath(new URL("..", import.meta.url));
const repositoryRoot = path.resolve(cliDirectory, "../..");
const pluginDirectory = path.join(repositoryRoot, "plugins", "engineering-governance");
const committedBundle = path.join(pluginDirectory, "bundle", "governance.mjs");

interface Outcome { code: number; stdout: string; stderr: string }

// A plugin install copies only the plugin directory. Every run below happens from a temporary
// directory that has no node_modules and no access to this repository's sources.
async function node(file: string, args: string[], cwd: string): Promise<Outcome> {
  try {
    const { stdout, stderr } = await run(process.execPath, [file, ...args], { cwd, timeout: 60_000 });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return { code: typeof failure.code === "number" ? failure.code : -1, stdout: failure.stdout ?? "", stderr: failure.stderr ?? "" };
  }
}

const normalize = (text: string) => text.replaceAll("\r\n", "\n");

describe("plugin bundle", () => {
  let scratch: string;
  let installedBundle: string;
  let project: string;

  beforeAll(async () => {
    scratch = await mkdtemp(path.join(os.tmpdir(), "governance-plugin-"));
    await mkdir(path.join(scratch, "plugin", "bundle"), { recursive: true });
    installedBundle = path.join(scratch, "plugin", "bundle", "governance.mjs");
    await copyFile(committedBundle, installedBundle);

    project = path.join(scratch, "project");
    await mkdir(path.join(project, "src"), { recursive: true });
    await writeFile(path.join(project, "package.json"), '{"name":"demo","dependencies":{}}\n');
    await writeFile(path.join(project, "src", "index.ts"), "export const answer = 42;\n");
  });

  afterAll(async () => {
    await rm(scratch, { recursive: true, force: true });
  });

  it("runs standalone, outside the repository and without node_modules", async () => {
    const result = await node(installedBundle, ["--version"], project);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/^engineering-governance \d+\.\d+\.\d+/);
  });

  it("analyzes a project's structure without a governance pack", async () => {
    const result = await node(installedBundle, ["analyze", ".", "--json"], project);
    expect([0, 1]).toContain(result.code);
    const analysis = JSON.parse(result.stdout) as { analysis?: { adapterResults?: unknown[] }; context?: unknown };
    expect(Array.isArray(analysis.analysis?.adapterResults)).toBe(true);
    expect(analysis.context).toBeDefined();
  });

  it("fails with exit 3 and a diagnostic when the project has no governance pack", async () => {
    const result = await node(installedBundle, ["check", "."], project);
    expect(result.code).toBe(3);
    expect(result.stderr).toContain("Governance CLI error:");
  });

  it("init creates a pack that asserts nothing, and check on it is NO-GO, from the standalone bundle", async () => {
    const fresh = path.join(scratch, "fresh");
    await mkdir(fresh);
    const created = await node(installedBundle, ["init", ".", "--id", "fresh-app"], fresh);
    expect(created.code).toBe(0);
    expect(created.stdout).toContain("This pack asserts nothing.");

    const again = await node(installedBundle, ["init", "."], fresh);
    expect(again.code).toBe(3);
    expect(again.stderr).toContain("already exists");

    const checked = await node(installedBundle, ["check", ".", "--json"], fresh);
    expect(checked.code).toBe(2);
    expect((JSON.parse(checked.stdout) as { evaluation: { decision: { status: string } } }).evaluation.decision.status).toBe("NO-GO");
  });

  it("validates the shipped starter pack, which has its schema inlined in the bundle", async () => {
    await mkdir(path.join(project, ".governance"), { recursive: true });
    await copyFile(
      path.join(pluginDirectory, "templates", "governance-pack.example.json"),
      path.join(project, ".governance", "governance-pack.json"),
    );
    const result = await node(installedBundle, ["validate", "."], project);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Valid");
  });

  it("derives a decision with the starter pack and never GO for an unassessed project", async () => {
    const result = await node(installedBundle, ["check", ".", "--json"], project);
    expect([1, 2]).toContain(result.code);
    const output = JSON.parse(result.stdout) as { evaluation: { decision: { status: string } } };
    expect(["GO_WITH_CONDITIONS", "NO-GO"]).toContain(output.evaluation.decision.status);
  });

  it("rejects an invalid governance pack with exit 3 instead of crashing", async () => {
    await writeFile(path.join(project, ".governance", "governance-pack.json"), '{"version":"x"}');
    const result = await node(installedBundle, ["check", "."], project);
    expect(result.code).toBe(3);
  });

  it("is up to date with the CLI sources (run `npm run bundle:plugin` after changing them)", async () => {
    const rebuilt = path.join(scratch, "rebuilt.mjs");
    const result = await node(path.join(cliDirectory, "scripts", "bundle-plugin.mjs"), ["--out", rebuilt], cliDirectory);
    expect(result.code).toBe(0);
    expect(normalize(await readFile(rebuilt, "utf8"))).toBe(normalize(await readFile(committedBundle, "utf8")));
  }, 60_000);

  it("ships starter templates that match their source of truth in model/", async () => {
    const pairs: Array<[string, string]> = [
      ["governance-pack.example.json", "example-governance-pack.json"],
      ["architecture-profile-clean-architecture.json", "architecture-profile-clean-architecture.json"],
    ];
    for (const [template, source] of pairs) {
      expect(normalize(await readFile(path.join(pluginDirectory, "templates", template), "utf8")))
        .toBe(normalize(await readFile(path.join(repositoryRoot, "22-governance-operations", "model", source), "utf8")));
    }
  });
});

describe("plugin manifests", () => {
  it("keeps the plugin, marketplace and CLI versions in step", async () => {
    const plugin = JSON.parse(await readFile(path.join(pluginDirectory, ".claude-plugin", "plugin.json"), "utf8")) as { name: string; version: string };
    const marketplace = JSON.parse(await readFile(path.join(repositoryRoot, ".claude-plugin", "marketplace.json"), "utf8")) as {
      plugins: Array<{ name: string; version?: string; source: string }>;
    };
    const entry = marketplace.plugins.find((item) => item.name === plugin.name);
    expect(entry).toBeDefined();
    expect(entry?.version).toBe(plugin.version);
    expect(path.resolve(repositoryRoot, entry!.source)).toBe(pluginDirectory);

    const cli = await node(committedBundle, ["--version"], repositoryRoot);
    expect(cli.stdout.trim()).toBe(`engineering-governance ${plugin.version}`);
  });
});

describe("plugin licensing", () => {
  it("ships the repository LICENSE inside the plugin, unchanged, because an install copies only that directory", async () => {
    const pluginCopy = normalize(await readFile(path.join(pluginDirectory, "LICENSE"), "utf8"));
    expect(pluginCopy).toBe(normalize(await readFile(path.join(repositoryRoot, "LICENSE"), "utf8")));
    expect(pluginCopy).toContain("Copyright (c) 2026 Inflame21");
  });

  it("points the manifest at that file", async () => {
    const plugin = JSON.parse(await readFile(path.join(pluginDirectory, ".claude-plugin", "plugin.json"), "utf8")) as { license?: string };
    expect(plugin.license).toBe("SEE LICENSE IN LICENSE");
  });

  it("has a notice, with its license text, for every third-party package inlined in the bundle", async () => {
    const bundle = await readFile(committedBundle, "utf8");
    const bundled = new Set(
      [...bundle.matchAll(/^\/\/ (?:\.\.\/)*node_modules\/((?:@[^/\n]+\/)?[^/\n]+)\//gm)].map((match) => match[1]!),
    );
    expect(bundled.size).toBeGreaterThan(0);

    const notices = normalize(await readFile(path.join(pluginDirectory, "THIRD-PARTY-NOTICES.md"), "utf8"));
    for (const name of bundled) {
      const section = new RegExp(`(?:^|\\n)## ${name.replace(/[/.]/g, "\\$&")} \\S+ \\(([^)]+)\\)\\n\\n([\\s\\S]+?)(?=\\n## |(?![\\s\\S]))`).exec(notices);
      expect(section, `no notice for bundled package ${name}`).not.toBeNull();
      expect(section![2]!.length, `empty license text for ${name}`).toBeGreaterThan(100);
    }
  });
});

describe("plugin commands", () => {
  const COMMANDS = ["analyze", "check", "init", "report", "validate"];

  it("provides exactly the five commands", async () => {
    expect((await readdir(path.join(pluginDirectory, "skills"))).sort()).toEqual(COMMANDS);
  });

  it.each(COMMANDS)("%s is explicit-only and runs the bundled CLI, surfacing its exit code", async (command) => {
    const text = normalize(await readFile(path.join(pluginDirectory, "skills", command, "SKILL.md"), "utf8"));
    const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? "";
    expect(frontmatter).toMatch(/^description: \S/m);
    // No automatic invocation: the user must type the command.
    expect(frontmatter).toMatch(/^disable-model-invocation: true$/m);
    // The command runs the bundled CLI from the plugin, not anything on the user's machine.
    expect(text).toContain(`node "\${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" ${command} . $ARGUMENTS;`);
    // A non-zero exit would abort the injection and hide a NO-GO, so the exit code is echoed instead.
    expect(text).toContain('echo "[governance exit code: $?]"');
    // The instructions must forbid altering or inventing evidence to change an outcome.
    expect(text).toMatch(/Do not (change|edit|add)/);
  });
});
