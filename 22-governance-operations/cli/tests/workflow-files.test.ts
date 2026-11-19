import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Static checks over the workflow files this repository ships. They cannot prove a workflow runs (only
// GitHub can), but they catch the mistakes that matter most: an unpinned action, a dangerous trigger, a
// gate that is not wired.

const root = path.resolve("../..");
const read = (relative: string) => readFileSync(path.join(root, relative), "utf8").replace(/\r\n/g, "\n");

const workflows = [
  ".github/workflows/governance-check.yml",
  ".github/workflows/governance-pr-comment.yml",
  ".github/workflows/governance-operations.yml",
];
const templates = readdirSync(path.join(root, "22-governance-operations/templates/github"))
  .filter((file) => file.endsWith(".yml"))
  .map((file) => `22-governance-operations/templates/github/${file}`);

describe.each([...workflows, ...templates])("%s", (file) => {
  const text = read(file);
  const code = text.split("\n").filter((line) => !line.trim().startsWith("#")).join("\n");

  it("never uses the pull_request_target trigger", () => {
    expect(code).not.toMatch(/pull_request_target/);
  });

  it("pins every third-party action to a full commit SHA, and the baseline to a SHA placeholder or tag", () => {
    const uses = [...code.matchAll(/^\s*(?:-\s*)?uses:\s*(\S+)/gm)].map((match) => match[1]!);
    for (const reference of uses) {
      if (reference.startsWith("./")) continue;
      if (reference.startsWith("Inflame21/engineering-governance/")) {
        expect(reference, reference).toMatch(/@(<GOVERNANCE_SHA>|[0-9a-f]{40}|v\d+\.\d+\.\d+)$/);
      } else {
        expect(reference, reference).toMatch(/@[0-9a-f]{40}$/);
      }
    }
  });

  it("declares permissions, and none broader than needed", () => {
    expect(code).toMatch(/^permissions:/m);
    expect(code).not.toMatch(/write-all|contents:\s*write|id-token:\s*write|packages:\s*write/);
  });
});

describe("pull-request comment workflow", () => {
  const text = read(".github/workflows/governance-pr-comment.yml");

  it("is opt-in and separate: the check workflow never asks for pull-requests: write", () => {
    expect(text).toMatch(/pull-requests:\s*write/);
    expect(read(".github/workflows/governance-check.yml")).not.toMatch(/pull-requests:\s*write/);
  });

  it("refuses a branch as the baseline and passes values to the script only through env", () => {
    expect(text).toContain("^[0-9a-f]{40}$");
    const runBlocks = text.split("\n").filter((line) => /\$\{\{\s*(inputs|github)\./.test(line) && !/^\s*(\w+:|-|#)/.test(line.trim()));
    expect(runBlocks).toEqual([]);
  });

  it("is called from the check template, which grants it the permission", () => {
    const template = read("22-governance-operations/templates/github/governance-check.yml");
    expect(template).toMatch(/governance-pr-comment\.yml@<GOVERNANCE_SHA>/);
    expect(template).toMatch(/comment:[\s\S]*pull-requests:\s*write/);
  });
});

describe("production approval template", () => {
  const text = read("22-governance-operations/templates/github/production-approval.yml");

  it("gates the release on the governance decision and on a protected environment", () => {
    expect(text).toMatch(/governance:\s*\n(?:.*\n)*?\s+uses: Inflame21\/engineering-governance\/\.github\/workflows\/governance-check\.yml@<GOVERNANCE_SHA>/);
    expect(text).toMatch(/approve:[\s\S]*needs: governance/);
    expect(text).toMatch(/environment: production/);
  });

  it("only runs on main, on a manual trigger, and fails conditional results", () => {
    expect(text).toMatch(/workflow_dispatch:/);
    expect(text).not.toMatch(/^\s+(push|pull_request):/m);
    expect(text).toContain("github.ref == 'refs/heads/main'");
    expect(text).toMatch(/conditions: fail/);
  });

  it("records who approved, and fails when nothing gated the run", () => {
    expect(text).toContain("actions/runs/${RUN_ID}/approvals");
    expect(text).toContain("production-approval.json");
    expect(text).toContain("No approval recorded");
    expect(text).toMatch(/actions:\s*read/);
  });

  it("documents the environment settings it depends on", () => {
    expect(text).toMatch(/Required reviewers/);
    expect(text).toMatch(/Prevent self-review/);
  });
});
