import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { REVIEW_AREAS } from "../src/summary.js";

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
  const COMMANDS = ["analyze", "check", "init", "report", "review", "setup", "summary", "validate"];
  // setup and review first run discovery; every other command runs its own CLI command.
  const INVOCATION: Record<string, string> = { setup: "discover . --json", review: "discover . --json", summary: "discover . --json" };

  it("provides exactly the eight commands", async () => {
    expect((await readdir(path.join(pluginDirectory, "skills"))).sort()).toEqual(COMMANDS);
  });

  it.each(COMMANDS)("%s is explicit-only and runs the bundled CLI, surfacing its exit code", async (command) => {
    const text = normalize(await readFile(path.join(pluginDirectory, "skills", command, "SKILL.md"), "utf8"));
    const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? "";
    expect(frontmatter).toMatch(/^description: \S/m);
    // No automatic invocation: the user must type the command.
    expect(frontmatter).toMatch(/^disable-model-invocation: true$/m);
    // The command runs the bundled CLI from the plugin, not anything on the user's machine.
    expect(text).toContain(`node "\${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" ${INVOCATION[command] ?? `${command} . $ARGUMENTS`};`);
    // A non-zero exit would abort the injection and hide a NO-GO, so the exit code is echoed instead.
    expect(text).toContain('echo "[governance exit code: $?]"');
    // The instructions must forbid altering or inventing evidence to change an outcome.
    expect(text).toMatch(/Do not (change|edit|add)|Never overwrite/);
  });
});

describe("summary command", () => {
  const skill = async () => normalize(await readFile(path.join(pluginDirectory, "skills", "summary", "SKILL.md"), "utf8"));

  it("keeps the CLI's facts apart from the AI's suggestions", async () => {
    const text = await skill();
    expect(text).toContain("The factual part is not yours to change");
    expect(text).toContain("## Suggestions (AI-written)");
    expect(text).toContain("Ground every suggestion");
    expect(text).toContain("summarize <repository> --write");
    expect(text).toContain("Never describe a repository as production-ready");
  });

  it("uses the same review areas as the review command, so a summary and a review cannot disagree", async () => {
    const areas = JSON.parse(await readFile(path.join(pluginDirectory, "templates", "review-areas.json"), "utf8")) as { areas: Record<string, unknown> };
    expect([...REVIEW_AREAS].sort()).toEqual(Object.keys(areas.areas).sort());
  });

  it("works from the standalone bundle: --write creates a dated file that is never overwritten", async () => {
    const scratch = await mkdtemp(path.join(os.tmpdir(), "governance-summary-bundle-"));
    try {
      const bundle = path.join(scratch, "governance.mjs");
      await copyFile(committedBundle, bundle);
      const repo = path.join(scratch, "repo");
      await mkdir(repo);
      await run("git", ["init", "-q", "-b", "main"], { cwd: repo });

      const first = await node(bundle, ["summarize", ".", "--write"], repo);
      expect(first.code).toBe(0);
      expect(first.stdout).toMatch(/^Wrote \.governance\/reports\/summary-\d{4}-\d{2}-\d{2}\.md/);
      const second = await node(bundle, ["summarize", ".", "--write"], repo);
      expect(second.stdout).toMatch(/summary-\d{4}-\d{2}-\d{2}-2\.md/);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });
});

describe("setup command", () => {
  const skill = async () => normalize(await readFile(path.join(pluginDirectory, "skills", "setup", "SKILL.md"), "utf8"));

  it("states the rules that keep AI-drafted evidence honest", async () => {
    const text = await skill();
    expect(text).toContain("Evidence is only what you observed");
    expect(text).toContain("Never overwrite");
    expect(text).toContain("Ask before running anything");
    expect(text).toContain("Only run checks");
    expect(text).toContain("unreviewed");
    expect(text).toContain("Do not describe any repository as production-ready");
    expect(text).toContain("${CLAUDE_PLUGIN_ROOT}/templates/standards-index.json");
  });

  it("only offers standards that exist, with matching titles and unique ids", async () => {
    const index = JSON.parse(await readFile(path.join(pluginDirectory, "templates", "standards-index.json"), "utf8")) as {
      standards: Array<{ id: string; title: string; file: string }>;
    };
    expect(new Set(index.standards.map((standard) => standard.id)).size).toBe(index.standards.length);
    for (const standard of index.standards) {
      expect(standard.id, standard.id).toMatch(/^[A-Z]{2,6}-\d{3}$/);
      const lines = normalize(await readFile(path.join(repositoryRoot, standard.file), "utf8")).split("\n");
      const heading = lines.find((line) => line.startsWith("# "));
      expect(heading, `${standard.file} title`).toContain(standard.title);
    }
  });

  describe("the evidence recipe, run through the CLI from the standalone bundle", () => {
    let scratch: string;
    let bundle: string;

    beforeAll(async () => {
      scratch = await mkdtemp(path.join(os.tmpdir(), "governance-recipe-"));
      bundle = path.join(scratch, "governance.mjs");
      await copyFile(committedBundle, bundle);
    });
    afterAll(async () => {
      await rm(scratch, { recursive: true, force: true });
    });

    const evidence = (overrides: Record<string, unknown>) => ({
      id: "EVD-LINT-001",
      type: "E3_AUTOMATED_ANALYSIS",
      status: "VERIFIED",
      description: "pnpm lint exited 0.",
      source: "app at abc1234, 0 uncommitted changes",
      freshness: "current",
      freshness_status: "current",
      supports_controls: ["QA-LINT-001"],
      result_status: "PASS",
      exit_code: 0,
      command: ["pnpm", "lint"],
      generated_at: "2026-11-18T10:00:00Z",
      ...overrides,
    });
    const pack = (items: unknown[], findings: unknown[] = []) => ({
      version: "1.0.0",
      project: { id: "app", name: "app", repository: "acme/app", environment: "development" },
      change: { id: "CHG-APP-BASELINE", type: "configuration", title: "Baseline", risk_class: "C", files: [".governance/governance-pack.json"], description: "Drafted by Claude; unreviewed." },
      standards: [{ id: "QA-008", title: "Testing & Quality Engineering Standard", version: "1.0.0", source: "engineering-governance/08-testing/08-testing-quality-engineering-standard.md" }],
      controls: [{ id: "QA-LINT-001", standard: "QA-008", title: "Lint passes", severity: "P2", required_evidence: ["EVD-LINT-001"], failure_decision: "GO_WITH_CONDITIONS" }],
      evidence: items,
      ...(findings.length ? { findings } : {}),
      risks: [], decisions: [], exceptions: [], debt: [],
    });

    async function validate(content: unknown, name: string) {
      const repository = path.join(scratch, name);
      await mkdir(path.join(repository, ".governance"), { recursive: true });
      await writeFile(path.join(repository, ".governance", "governance-pack.json"), JSON.stringify(content));
      return node(bundle, ["validate", repository], scratch);
    }

    it("accepts a passing run recorded with the fields the instructions list", async () => {
      expect((await validate(pack([evidence({})]), "pass")).code).toBe(0);
    });

    it("accepts a failed run recorded as UNVERIFIED with a FAIL result and a finding", async () => {
      const failed = evidence({ status: "UNVERIFIED", result_status: "FAIL", exit_code: 1, description: "pnpm lint exited 1: 5 errors." });
      const finding = { id: "FND-LINT-001", rule_id: "LINT", severity: "P2", category: "static-analysis", message: "5 lint errors, first at src/a.ts:10.", status: "OPEN", evidence_refs: ["EVD-LINT-001"], remediation: "Fix the reported errors." };
      expect((await validate(pack([failed], [finding]), "fail")).code).toBe(0);
    });

    it("rejects a failed run recorded as VERIFIED, so a failure cannot be passed off as proof", async () => {
      const lie = evidence({ status: "VERIFIED", result_status: "FAIL", exit_code: 1 });
      const result = await validate(pack([lie]), "lie");
      expect(result.code).toBe(3);
      expect(result.stderr).toContain("EVIDENCE_STATUS_OVERSTATED");
    });
  });
});

describe("review command", () => {
  const skill = async () => normalize(await readFile(path.join(pluginDirectory, "skills", "review", "SKILL.md"), "utf8"));
  const read = async (...parts: string[]) => readFile(path.join(pluginDirectory, ...parts), "utf8");

  it("states the rules that keep an AI review honest", async () => {
    const text = await skill();
    expect(text).toContain("Only report what you can show");
    expect(text).toContain("No claim of compliance");
    expect(text).toContain("Never print a secret");
    expect(text).toContain("No exploit code");
    expect(text).toContain("Read-only commands only");
    expect(text).toContain("Not reviewed by a person");
    expect(text).toContain("It is not exhaustive");
    expect(text).toContain("FND-REVIEW-<AREA>-001");
    expect(text).toContain("EVD-REVIEW-<AREA>-<YYYYMMDD>");
  });

  it("defines areas whose standards exist in the index and are shipped inside the plugin, unchanged", async () => {
    const index = JSON.parse(await read("templates", "standards-index.json")) as { standards: Array<{ id: string; file: string }> };
    const areas = JSON.parse(await read("templates", "review-areas.json")) as {
      common_standards: string[];
      areas: Record<string, { title: string; standards: string[]; focus: string[] }>;
    };
    expect(Object.keys(areas.areas).sort()).toEqual(["api", "architecture", "cicd", "data", "frontend", "observability", "security", "testing"]);

    const used = new Set(areas.common_standards);
    for (const [name, area] of Object.entries(areas.areas)) {
      expect(area.focus.length, name).toBeGreaterThan(2);
      area.standards.forEach((id) => used.add(id));
    }
    for (const id of used) {
      const entry = index.standards.find((standard) => standard.id === id);
      expect(entry, `${id} is not in the standards index`).toBeDefined();
      const shipped = normalize(await read("standards", path.basename(entry!.file)));
      expect(shipped, `${id} copy differs from its source`).toBe(normalize(await readFile(path.join(repositoryRoot, entry!.file), "utf8")));
    }
    const text = await skill();
    for (const name of Object.keys(areas.areas)) expect(text).toContain(name);
  });

  describe("findings recorded by a review, through the CLI from the standalone bundle", () => {
    let scratch: string;
    let bundle: string;

    beforeAll(async () => {
      scratch = await mkdtemp(path.join(os.tmpdir(), "governance-review-"));
      bundle = path.join(scratch, "governance.mjs");
      await copyFile(committedBundle, bundle);
    });
    afterAll(async () => {
      await rm(scratch, { recursive: true, force: true });
    });

    const evidence = {
      id: "EVD-REVIEW-SECURITY-20261118", type: "E2_INSPECTION", status: "UNVERIFIED",
      description: "AI review of security: 12 of 40 files read. Report: .governance/reports/review-security-2026-11-18.md",
      source: "Claude review at abc1234 (0 uncommitted changes)", freshness: "current", freshness_status: "current",
      generated_at: "2026-11-18T10:00:00Z", supports_controls: [],
    };
    const finding = (overrides: Record<string, unknown>) => ({
      id: "FND-REVIEW-SECURITY-001", rule_id: "REVIEW-SECURITY", severity: "P1", category: "security",
      message: "Route has no authorization check.", status: "OPEN", evidence_refs: ["EVD-REVIEW-SECURITY-20261118"],
      source_location: { file: "src/routes/users.ts", start_line: 42 }, confidence: 0.9,
      remediation: "Add the authorization guard; see the report.", ...overrides,
    });
    const pack = (findings: unknown[]) => ({
      version: "1.0.0",
      project: { id: "app", name: "app", repository: "acme/app", environment: "development" },
      change: { id: "CHG-APP-BASELINE", type: "configuration", title: "Baseline", risk_class: "C", files: [".governance/governance-pack.json"] },
      standards: [{ id: "SEC-007", title: "Security Engineering Standard", version: "1.0.0", source: "engineering-governance/07-security/07-security-engineering-standard.md" }],
      controls: [], evidence: [evidence], findings, risks: [], decisions: [], exceptions: [], debt: [],
    });

    async function run(name: string, content: unknown, command: "validate" | "check") {
      const repository = path.join(scratch, name);
      await mkdir(path.join(repository, ".governance"), { recursive: true });
      await writeFile(path.join(repository, ".governance", "governance-pack.json"), JSON.stringify(content));
      return node(bundle, command === "check" ? ["check", repository, "--json"] : ["validate", repository], scratch);
    }

    it("accepts a finding with the fields the instructions list", async () => {
      expect((await run("ok", pack([finding({})]), "validate")).code).toBe(0);
    });

    it("rejects a finding that points at evidence that does not exist", async () => {
      const result = await run("dangling", pack([finding({ evidence_refs: ["EVD-NOPE"] })]), "validate");
      expect(result.code).toBe(3);
      expect(result.stderr).toContain("UNKNOWN_EVIDENCE");
    });

    it("makes an open P1 finding a blocking violation of check", async () => {
      const result = await run("p1", pack([finding({})]), "check");
      const output = JSON.parse(result.stdout) as { evaluation: { decision: { status: string; blockingViolations: Array<{ controlId: string }> } } };
      expect(output.evaluation.decision.status).toBe("NO-GO");
      expect(output.evaluation.decision.blockingViolations.map((violation) => violation.controlId)).toContain("FINDING:FND-REVIEW-SECURITY-001");
    });

    it("keeps a P2 finding visible as a warning, not a blocker", async () => {
      const result = await run("p2", pack([finding({ severity: "P2" })]), "check");
      const output = JSON.parse(result.stdout) as { evaluation: { decision: { blockingViolations: Array<{ controlId: string }>; warnings: Array<{ controlId: string }> } } };
      expect(output.evaluation.decision.warnings.map((warning) => warning.controlId)).toContain("FINDING:FND-REVIEW-SECURITY-001");
      expect(output.evaluation.decision.blockingViolations.map((violation) => violation.controlId)).not.toContain("FINDING:FND-REVIEW-SECURITY-001");
    });

    it("stops counting a finding only when it is explicitly RESOLVED", async () => {
      for (const status of ["ACKNOWLEDGED", "ACCEPTED", "SUPPRESSED"]) {
        const result = await run(`still-${status}`, pack([finding({ status })]), "check");
        expect(result.stdout, status).toContain("FINDING:FND-REVIEW-SECURITY-001");
      }
      const resolved = await run("resolved", pack([finding({ status: "RESOLVED" })]), "check");
      expect(resolved.stdout).not.toContain("FINDING:FND-REVIEW-SECURITY-001");
    });
  });
});
