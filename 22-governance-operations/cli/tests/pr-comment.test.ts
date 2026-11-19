import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";

const run = promisify(execFile);
const scriptPath = path.resolve("../../.github/scripts/governance-comment.mjs");

interface CommentModule {
  MARKER: string;
  safeText(value: unknown, max?: number): string;
  buildComment(report: unknown, meta?: { runUrl?: string; governanceRef?: string }): string;
  postComment(body: string, target: { repository: string; pullNumber: string }): Promise<string>;
}
const load = async (): Promise<CommentModule> => (await import(pathToFileURL(scriptPath).href)) as CommentModule;

const violation = (controlId: string, message: string, severity = "P1") => ({ controlId, severity, message, status: "FAIL", decision: "NO-GO" });
const report = (decision: string, blocking: unknown[] = [], warnings: unknown[] = [], reason = "Because.") => ({
  report: { decision },
  evaluation: { decision: { status: decision, reason, blockingViolations: blocking, warnings } },
});

describe("governance pull-request comment", () => {
  const dirs: string[] = [];
  afterEach(async () => {
    vi.unstubAllGlobals();
    await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
  });

  it("shows a GO with nothing blocking", async () => {
    const { buildComment, MARKER } = await load();
    const body = buildComment(report("GO"), { runUrl: "https://github.com/o/r/actions/runs/1", governanceRef: "a".repeat(40) });
    expect(body.startsWith(MARKER)).toBe(true);
    expect(body).toContain("Governance check: GO");
    expect(body).toContain("### Blocking (0)");
    expect(body).toContain("[Full report and job summary](https://github.com/o/r/actions/runs/1)");
    expect(body).toContain(`baseline \`${"a".repeat(40)}\``);
  });

  it("lists the blockers and the conditions with their control ids and severities", async () => {
    const { buildComment } = await load();
    const body = buildComment(report("NO-GO", [violation("SEC-AUTH-001", "No verified evidence.")], [violation("CHANGE-SCOPE:NOT-REQUESTED", "Scope not requested.", "P2")]));
    expect(body).toContain("NO-GO");
    expect(body).toContain("### Blocking (1)");
    expect(body).toContain("- `SEC-AUTH-001` (P1): No verified evidence.");
    expect(body).toContain("### Conditions (1)");
    expect(body).toContain("`CHANGE-SCOPE:NOT-REQUESTED` (P2)");
  });

  it("says nothing was assessed when there is no usable report, instead of implying a pass", async () => {
    const { buildComment } = await load();
    for (const bad of [undefined, {}, { report: { decision: "MAYBE" } }]) {
      const body = buildComment(bad);
      expect(body).toContain("Governance check: ERROR");
      expect(body).toContain("treat this as not approved");
      expect(body).not.toContain("### Blocking");
    }
  });

  it("caps a long list", async () => {
    const { buildComment } = await load();
    const many = Array.from({ length: 40 }, (_v, i) => violation(`C-${i}`, "m"));
    const body = buildComment(report("NO-GO", many));
    expect(body).toContain("### Blocking (40)");
    expect(body).toContain("…and 25 more in the full report");
    expect(body.match(/^- `C-/gm)).toHaveLength(15);
  });

  it("neutralises hostile repository text: mentions, links, HTML, table and code breaks, newlines", async () => {
    const { buildComment, safeText } = await load();
    const hostile = "@everyone [click](https://evil.example) ![x](https://evil.example/p.png) <img src=x onerror=alert(1)>\n## injected\n| a | b |\n```";
    const body = buildComment(report("NO-GO", [violation("X`]\n@all", hostile)], [], hostile));
    expect(body).not.toMatch(/@everyone|@all/);
    expect(body).not.toContain("<img");
    expect(body).not.toContain("](https://evil.example");
    expect(body).not.toMatch(/^## injected/m);
    expect(body.split("\n").filter((line) => line.startsWith("## "))).toHaveLength(1);
    expect(body).toContain("`X____all`");
    expect(safeText("a".repeat(1000), 50)).toHaveLength(50);
    expect(safeText(undefined)).toBe("");
  });

  it("writes the comment to a file in dry-run mode, from the command line", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "governance-comment-"));
    dirs.push(dir);
    const reportFile = path.join(dir, "report.json");
    await writeFile(reportFile, JSON.stringify(report("GO_WITH_CONDITIONS", [], [violation("CHANGE-SCOPE:NOT-REQUESTED", "Scope.", "P2")])));
    const out = path.join(dir, "comment.md");
    await run(process.execPath, [scriptPath, reportFile], { env: { PATH: process.env.PATH ?? "", DRY_RUN_FILE: out } });
    expect(await readFile(out, "utf8")).toContain("Governance check: GO WITH CONDITIONS");
    // A missing report file still yields a comment (the ERROR one), never a crash.
    await run(process.execPath, [scriptPath, path.join(dir, "absent.json")], { env: { PATH: process.env.PATH ?? "", DRY_RUN_FILE: out } });
    expect(await readFile(out, "utf8")).toContain("Governance check: ERROR");
  });

  it("does not fail the job when it cannot post (no token, fork, API error)", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "governance-comment-"));
    dirs.push(dir);
    const reportFile = path.join(dir, "report.json");
    await writeFile(reportFile, JSON.stringify(report("GO")));
    const withoutToken = await run(process.execPath, [scriptPath, reportFile], { env: { PATH: process.env.PATH ?? "", GITHUB_REPOSITORY: "o/r", PR_NUMBER: "7" } });
    expect(withoutToken.stdout).toContain("::warning title=Governance comment::Not posted");
    const unreachable = await run(process.execPath, [scriptPath, reportFile], {
      env: { PATH: process.env.PATH ?? "", GITHUB_TOKEN: "t", GITHUB_REPOSITORY: "o/r", PR_NUMBER: "7", GITHUB_API_URL: "http://127.0.0.1:9" },
    });
    expect(unreachable.stdout).toContain("::warning title=Governance comment::Not posted");
  });

  it("creates the comment once and updates it afterwards, only touching its own bot comment", async () => {
    const { postComment, MARKER } = await load();
    const calls: { method: string; url: string; body?: string }[] = [];
    let existing: unknown[] = [];
    vi.stubGlobal("fetch", async (url: string, init: { method?: string; body?: string } = {}) => {
      calls.push({ method: init.method ?? "GET", url, ...(init.body ? { body: init.body } : {}) });
      const json = (value: unknown) => ({ ok: true, status: 200, json: async () => value });
      return (init.method ?? "GET") === "GET" ? json(existing) : json({});
    });

    expect(await postComment(`${MARKER}\nfirst`, { repository: "o/r", pullNumber: "7" })).toBe("created");
    expect(calls.at(-1)).toMatchObject({ method: "POST", url: expect.stringContaining("/repos/o/r/issues/7/comments") });

    existing = [
      { id: 1, body: `${MARKER}\nimpostor`, user: { type: "User" } },
      { id: 2, body: "unrelated", user: { type: "Bot" } },
      { id: 3, body: `${MARKER}\nold`, user: { type: "Bot" } },
    ];
    expect(await postComment(`${MARKER}\nsecond`, { repository: "o/r", pullNumber: "7" })).toBe("updated");
    expect(calls.at(-1)).toMatchObject({ method: "PATCH", url: expect.stringContaining("/issues/comments/3") });
  });
});
