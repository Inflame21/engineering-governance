import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseCliArguments, runCli } from "../src/index.js";
import { REVIEW_AREAS, formatSummaryMarkdown, summarizeRepository, writeSummary } from "../src/summary.js";

const run = promisify(execFile);
const roots: string[] = [];
const NOW = new Date("2026-11-18T10:00:00Z");

async function repository(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "governance-summary-"));
  roots.push(root);
  await run("git", ["init", "-q", "-b", "main"], { cwd: root });
  await run("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "commit", "-q", "--allow-empty", "-m", "init"], { cwd: root });
  await writeFile(path.join(root, "package.json"), '{"name":"app","scripts":{"test":"vitest run"}}\n');
  return root;
}

type Json = Record<string, unknown>;

function pack(overrides: Json = {}): Json {
  return {
    version: "1.0.0",
    project: { id: "app", name: "app", repository: "acme/app", environment: "development" },
    change: { id: "CHG-APP-BASELINE", type: "configuration", title: "Baseline", risk_class: "C", files: [] },
    standards: [{ id: "SEC-007", title: "Security Engineering Standard", version: "1.0.0", source: "x" }],
    controls: [{ id: "SEC-AUTH-001", standard: "SEC-007", title: "Auth", severity: "P1", required_evidence: ["EVD-AUTH-001"], failure_decision: "NO-GO" }],
    evidence: [{ id: "EVD-AUTH-001", type: "E2_INSPECTION", status: "UNVERIFIED", description: "not yet", source: "none", freshness: "current", supports_controls: ["SEC-AUTH-001"] }],
    risks: [], decisions: [], exceptions: [], debt: [],
    ...overrides,
  };
}

async function writePack(root: string, content: Json): Promise<void> {
  await mkdir(path.join(root, ".governance"), { recursive: true });
  await writeFile(path.join(root, ".governance", "governance-pack.json"), JSON.stringify(content));
}

const finding = (id: string, severity: string, extra: Json = {}): Json => ({
  id, rule_id: "REVIEW-SECURITY", severity, category: "security", message: `Problem ${id}`, status: "OPEN",
  evidence_refs: ["EVD-AUTH-001"], source_location: { file: "src/a.ts", start_line: 7 }, ...extra,
});

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("summarizeRepository", () => {
  it("reports that there is no pack, instead of inventing a decision", async () => {
    const root = await repository();
    const summary = await summarizeRepository(root, NOW);
    expect(summary.pack).toBeUndefined();
    expect(summary.assessment).toBeUndefined();
    expect(summary.controls).toEqual([]);
    const markdown = formatSummaryMarkdown(summary);
    expect(markdown).toContain("**none** (run /engineering-governance:setup)");
    expect(markdown).toContain("not assessed: no pack");
  });

  it("takes the decision and each control's status from the engine, with the missing evidence", async () => {
    const root = await repository();
    await writePack(root, pack());
    const summary = await summarizeRepository(root, NOW);
    expect(summary.assessment?.decision).toBe("NO-GO");
    expect(summary.assessment?.blocking.map((item) => item.id)).toContain("SEC-AUTH-001");
    expect(summary.controls).toEqual([{ id: "SEC-AUTH-001", standard: "SEC-007", severity: "P1", status: "UNVERIFIED", missingEvidence: ["EVD-AUTH-001"] }]);
    expect(summary.repository.head).toMatch(/^[0-9a-f]{40}$/);
  });

  it("counts open findings by severity, worst first, and leaves out resolved ones", async () => {
    const root = await repository();
    await writePack(root, pack({
      findings: [finding("F-3", "P2"), finding("F-1", "P0"), finding("F-2", "P1", { status: "RESOLVED" }), finding("F-4", "P1", { status: "UNVERIFIED" })],
    }));
    const { findings } = await summarizeRepository(root, NOW);
    expect(findings.total).toBe(4);
    expect(findings.bySeverity).toEqual({ P0: 1, P1: 1, P2: 1, P3: 0 });
    expect(findings.open.map((item) => item.id)).toEqual(["F-1", "F-4", "F-3"]);
    expect(findings.open[0]).toMatchObject({ location: "src/a.ts:7" });
  });

  it("shows which areas have been reviewed, using the latest report and the coverage recorded in the pack", async () => {
    const root = await repository();
    await mkdir(path.join(root, ".governance", "reports"), { recursive: true });
    for (const name of ["review-security-2026-11-10.md", "review-security-2026-11-18.md", "review-security-2026-11-18-2.md", "review-bogus-2026-11-18.md", "notes.md"]) {
      await writeFile(path.join(root, ".governance", "reports", name), "# report\n");
    }
    await writePack(root, pack({
      evidence: [
        { id: "EVD-AUTH-001", type: "E2_INSPECTION", status: "UNVERIFIED", description: "x", source: "x", freshness: "current", supports_controls: ["SEC-AUTH-001"] },
        { id: "EVD-REVIEW-SECURITY-20261118", type: "E2_INSPECTION", status: "UNVERIFIED", description: "AI review of security: 12 of 40 files read.", source: "x", freshness: "current", supports_controls: [] },
      ],
      findings: [finding("F-1", "P1", { evidence_refs: ["EVD-REVIEW-SECURITY-20261118"] })],
    }));
    const { areas } = await summarizeRepository(root, NOW);
    const security = areas.find((area) => area.area === "security")!;
    expect(security.lastReview).toMatchObject({ date: "2026-11-18", file: "review-security-2026-11-18-2.md", coverage: "AI review of security: 12 of 40 files read." });
    expect(security.openFindings).toBe(1);
    expect(security.controls).toBe(1);
    expect(areas.filter((area) => !area.lastReview).map((area) => area.area)).toEqual(REVIEW_AREAS.filter((area) => area !== "security"));
  });

  it("flags a possible gap only when a repository signal is present and the pack has no control for the area", async () => {
    const root = await repository();
    await mkdir(path.join(root, "migrations"));
    await writePack(root, pack());
    let data = (await summarizeRepository(root, NOW)).areas.find((area) => area.area === "data")!;
    expect(data).toMatchObject({ signal: "has a migrations/ directory", controls: 0, possibleGap: true });

    await writePack(root, pack({
      standards: [{ id: "SEC-007", title: "S", version: "1.0.0", source: "x" }, { id: "DB-005", title: "D", version: "1.0.0", source: "x" }],
      controls: [
        { id: "SEC-AUTH-001", standard: "SEC-007", title: "Auth", severity: "P1", required_evidence: ["EVD-AUTH-001"], failure_decision: "NO-GO" },
        { id: "DB-MIG-001", standard: "DB-005", title: "Migrations", severity: "P1", required_evidence: ["EVD-AUTH-001"], failure_decision: "NO-GO" },
      ],
    }));
    data = (await summarizeRepository(root, NOW)).areas.find((area) => area.area === "data")!;
    expect(data).toMatchObject({ controls: 2 - 1, possibleGap: false });

    // No signal, no gap: security has no repository signal at all.
    expect((await summarizeRepository(root, NOW)).areas.find((area) => area.area === "security")).toMatchObject({ possibleGap: false });
  });

  it("refuses a folder that is not a repository root", async () => {
    const folder = await mkdtemp(path.join(os.tmpdir(), "governance-summary-plain-"));
    roots.push(folder);
    await expect(summarizeRepository(folder, NOW)).rejects.toThrow("Not a git repository root");
  });
});

describe("formatSummaryMarkdown", () => {
  it("is deterministic and states what is computed and what is not covered", async () => {
    const root = await repository();
    await writePack(root, pack({ findings: [finding("F-1", "P1")] }));
    const summary = await summarizeRepository(root, NOW);
    const markdown = formatSummaryMarkdown(summary);
    expect(formatSummaryMarkdown(summary)).toBe(markdown);
    for (const heading of ["## Snapshot", "## Decision", "## Controls", "## Findings", "## Review coverage", "## Not covered"]) expect(markdown).toContain(heading);
    expect(markdown).toContain("**NO-GO**");
    expect(markdown).toContain("none of it is estimated");
    expect(markdown).toContain("Not yet reviewed: security, architecture");
    expect(markdown).toContain("does not show that the software is correct, secure or production-ready");
  });

  it("keeps a table intact when text contains pipes or line breaks", async () => {
    const root = await repository();
    await writePack(root, pack({ findings: [finding("F-1", "P2", { message: "bad | pipe\nand a newline" })] }));
    const markdown = formatSummaryMarkdown(await summarizeRepository(root, NOW));
    const row = markdown.split("\n").find((line) => line.startsWith("| F-1"))!;
    expect(row).toContain("bad \\| pipe and a newline");
    expect(row.split("|").length).toBeGreaterThan(5);
  });
});

describe("writeSummary", () => {
  it("writes a new dated file and never overwrites an earlier one", async () => {
    const root = await repository();
    const summary = await summarizeRepository(root, NOW);

    expect(await writeSummary(root, summary)).toBe(".governance/reports/summary-2026-11-18.md");
    expect(await writeSummary(root, summary)).toBe(".governance/reports/summary-2026-11-18-2.md");
    expect((await readdir(path.join(root, ".governance", "reports"))).sort()).toEqual(["summary-2026-11-18-2.md", "summary-2026-11-18.md"]);
    expect(await readFile(path.join(root, ".governance", "reports", "summary-2026-11-18.md"), "utf8")).toBe(`${formatSummaryMarkdown(summary)}\n`);
  });

  it("is not counted as a review report", async () => {
    const root = await repository();
    await writeSummary(root, await summarizeRepository(root, NOW));
    expect((await summarizeRepository(root, NOW)).reviewReports).toEqual([]);
  });
});

describe("report --write", () => {
  function capture() {
    let stdout = "";
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => { stdout += String(chunk); return true; });
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    return { out: () => stdout };
  }

  it("prints the report, saves the same Markdown to a dated file, and keeps the decision's exit code", async () => {
    const root = await repository();
    await writePack(root, pack());
    const output = capture();

    expect(await runCli(["report", root, "--write"])).toBe(2);
    const match = /Wrote (\.governance\/reports\/report-\d{4}-\d{2}-\d{2}\.md)/.exec(output.out());
    expect(match).not.toBeNull();
    const saved = await readFile(path.join(root, match![1]!), "utf8");
    expect(saved).toContain("NO-GO");
    // What was printed is what was saved.
    expect(output.out()).toContain(saved.trim());
  });

  it("never overwrites: a second report the same day is -2", async () => {
    const root = await repository();
    await writePack(root, pack());
    capture();
    await runCli(["report", root, "--write"]);
    await runCli(["report", root, "--write"]);
    const files = await readdir(path.join(root, ".governance", "reports"));
    expect(files.filter((name) => name.startsWith("report-")).length).toBe(2);
    expect(files.some((name) => /-2\.md$/.test(name))).toBe(true);
  });

  it("does not write without --write", async () => {
    const root = await repository();
    await writePack(root, pack());
    capture();
    await runCli(["report", root]);
    await expect(readdir(path.join(root, ".governance", "reports"))).rejects.toThrow();
  });

  it("cannot be combined with --format json, which would save something other than Markdown", () => {
    expect(() => parseCliArguments(["report", ".", "--write", "--format", "json"])).toThrow("cannot be combined with --format json");
    expect(parseCliArguments(["report", ".", "--write"])).toMatchObject({ command: "report", write: true });
  });
});

describe("summarize through the CLI", () => {
  function capture() {
    let stdout = "";
    let stderr = "";
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => { stdout += String(chunk); return true; });
    vi.spyOn(process.stderr, "write").mockImplementation((chunk) => { stderr += String(chunk); return true; });
    return { out: () => stdout, err: () => stderr };
  }

  it("prints Markdown without writing anything", async () => {
    const root = await repository();
    await writePack(root, pack());
    const output = capture();
    expect(await runCli(["summarize", root])).toBe(0);
    expect(output.out()).toContain("# Governance status:");
    const { stdout } = await run("git", ["status", "--porcelain"], { cwd: root });
    expect(stdout).not.toContain("reports");
  });

  it("prints JSON with --json", async () => {
    const root = await repository();
    const output = capture();
    expect(await runCli(["summarize", root, "--json"])).toBe(0);
    expect(JSON.parse(output.out())).toMatchObject({ areas: expect.any(Array), findings: { total: 0 } });
  });

  it("saves the file with --write and says where", async () => {
    const root = await repository();
    const output = capture();
    expect(await runCli(["summarize", root, "--write"])).toBe(0);
    expect(output.out()).toMatch(/^Wrote \.governance\/reports\/summary-\d{4}-\d{2}-\d{2}\.md/);
    expect((await readdir(path.join(root, ".governance", "reports"))).length).toBe(1);
  });

  it("exits 3 for a folder that is not a repository", async () => {
    const folder = await mkdtemp(path.join(os.tmpdir(), "governance-summary-plain-"));
    roots.push(folder);
    const output = capture();
    expect(await runCli(["summarize", folder])).toBe(3);
    expect(output.err()).toContain("Not a git repository root");
  });

  it("rejects options it does not use, and --write on other commands", () => {
    expect(() => parseCliArguments(["summarize", ".", "--pack", "x.json"])).toThrow("not supported by the summarize command");
    expect(() => parseCliArguments(["summarize", ".", "--run-tools"])).toThrow("not supported by the summarize command");
    expect(() => parseCliArguments(["check", ".", "--write"])).toThrow("--write is only supported by the summarize and report commands.");
    expect(parseCliArguments(["summarize", ".", "--write", "--json"])).toMatchObject({ command: "summarize", write: true, json: true });
  });
});
