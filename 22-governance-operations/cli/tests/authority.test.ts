import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { authoritySummary, effectiveApproverAuthority } from "../src/authority.js";
import { loadAuthorityPolicy, type AuthorityPolicy, type AuthorityRole } from "../src/config.js";

const committedText = readFileSync(new URL("../../model/authority/organization-authority.json", import.meta.url), "utf8");
const committed = JSON.parse(committedText) as AuthorityPolicy;
const repoFile = (path: string) => readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");

const fsOf = (content: string | undefined) => ({ readTextFile: async () => content });
const load = (content: string | undefined) => loadAuthorityPolicy(".", "authority.json", fsOf(content));

function role(overrides: Partial<AuthorityRole> = {}): AuthorityRole {
  return {
    id: "TEST_ROLE",
    title: "Test role",
    severities: ["P2", "P3"],
    source_file: "21-exceptions/21-engineering-exception-standard.md",
    source_section: "15. Approval Authority",
    source_text: "| P2 | Test role |",
    holders: [{ name: "UNASSIGNED" }],
    status: "DRAFT",
    ...overrides,
  };
}
const policyOf = (...roles: AuthorityRole[]): AuthorityPolicy => ({
  version: "1.0.0",
  policy_id: "test-authority",
  policy_version: "0.1.0",
  description: "Test policy.",
  roles,
});
const approved = { status: "APPROVED" as const, effective_from: "2026-11-17", holders: [{ name: "Sam Senior", handle: "samsenior" }] };

describe("authority policy schema and loader", () => {
  it("loads the committed policy: three DRAFT roles with unassigned holders", async () => {
    const policy = await load(committedText);
    expect(policy.policy_id).toBe("organization-authority");
    expect(policy.roles.map((r) => r.id)).toEqual(["SENIOR_ENGINEERING_AUTHORITY", "ENGINEERING_REVIEWER_OWNER", "TEAM_ENGINEERING_AUTHORITY"]);
    expect(policy.roles.every((r) => r.status === "DRAFT" && r.holders.every((h) => h.name === "UNASSIGNED"))).toBe(true);
  });

  it("accepts an APPROVED role with an effective date and a named holder", async () => {
    await expect(load(JSON.stringify(policyOf(role(approved))))).resolves.toBeTruthy();
  });

  const bad = (change: (r: Record<string, any>) => void) => {
    const r = JSON.parse(JSON.stringify(role())) as Record<string, any>;
    change(r);
    return JSON.stringify(policyOf(r as AuthorityRole));
  };

  it.each([
    ["a missing required field", (r: Record<string, any>) => { delete r.source_text; }],
    ["P0 as an approvable severity", (r: Record<string, any>) => { r.severities = ["P0", "P1"]; }],
    ["an empty severity list", (r: Record<string, any>) => { r.severities = []; }],
    ["a duplicated severity", (r: Record<string, any>) => { r.severities = ["P1", "P1"]; }],
    ["an unknown severity", (r: Record<string, any>) => { r.severities = ["P9"]; }],
    ["no holders", (r: Record<string, any>) => { r.holders = []; }],
    ["a lowercase role id", (r: Record<string, any>) => { r.id = "test_role"; }],
    ["an unknown status", (r: Record<string, any>) => { r.status = "PENDING"; }],
    ["an unknown property", (r: Record<string, any>) => { r.surprise = true; }],
    ["an APPROVED role without an effective date", (r: Record<string, any>) => { r.status = "APPROVED"; r.holders = [{ name: "Sam" }]; }],
    ["an APPROVED role whose only holder is UNASSIGNED", (r: Record<string, any>) => { r.status = "APPROVED"; r.effective_from = "2026-11-17"; }],
    ["a RETIRED role without a retirement date", (r: Record<string, any>) => { r.status = "RETIRED"; }],
    ["a malformed holder handle", (r: Record<string, any>) => { r.holders = [{ name: "Sam", handle: "not a handle!" }]; }],
  ])("rejects %s with a schema diagnostic", async (_name, change) => {
    await expect(load(bad(change))).rejects.toThrow("Authority policy schema validation failed");
  });

  it("rejects an empty policy, invalid JSON, a missing file and duplicate role ids", async () => {
    await expect(load(JSON.stringify(policyOf()))).rejects.toThrow("schema validation failed");
    await expect(load("{nope")).rejects.toThrow("Authority policy is not valid JSON");
    await expect(load(undefined)).rejects.toThrow("Authority policy not found: authority.json");
    await expect(load(JSON.stringify(policyOf(role(), role())))).rejects.toThrow("duplicate role id(s): TEST_ROLE");
  });
});

describe("effective approver authority", () => {
  it("is empty for the committed draft policy: nothing confers authority yet", () => {
    expect(effectiveApproverAuthority(committed)).toEqual([]);
    expect(authoritySummary(committed)).toEqual({ id: "organization-authority", version: "0.1.0", roles: 3, approved: 0 });
  });

  it("includes only APPROVED roles that have a named holder, listing both name and handle", () => {
    const policy = policyOf(
      role({ id: "APPROVED_ROLE", severities: ["P1", "P2", "P3"], ...approved }),
      role({ id: "DRAFT_ROLE" }),
      role({ id: "DEPRECATED_ROLE", status: "DEPRECATED", holders: [{ name: "Old Holder" }] }),
      role({ id: "PLACEHOLDER_ROLE", status: "APPROVED", effective_from: "2026-11-17", holders: [{ name: "UNASSIGNED" }, { name: "Quinn Holder" }] }),
    );
    expect(effectiveApproverAuthority(policy)).toEqual([
      { role: "APPROVED_ROLE", severities: ["P1", "P2", "P3"], holders: ["Sam Senior", "samsenior"] },
      { role: "PLACEHOLDER_ROLE", severities: ["P2", "P3"], holders: ["Quinn Holder"] },
    ]);
    expect(authoritySummary(policy).approved).toBe(2);
  });

  it("drops an APPROVED role whose only holder is the UNASSIGNED placeholder", () => {
    const loose = policyOf(role({ status: "APPROVED", effective_from: "2026-11-17", holders: [{ name: "UNASSIGNED" }] }));
    expect(effectiveApproverAuthority(loose)).toEqual([]);
  });
});

describe("committed authority policy is faithful to EXC-021 section 15", () => {
  const lines = repoFile("21-exceptions/21-engineering-exception-standard.md").split("\n");
  const start = lines.findIndex((l) => l.trim() === "## 15. Approval Authority");
  const next = lines.findIndex((l, i) => i > start && /^## /.test(l));
  const rows = lines
    .slice(start + 1, next)
    .map((l) => /^\| (P[0-3]) \| (.+) \|$/.exec(l.trim()))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ line: m[0], severity: m[1]!, authority: m[2]!.trim() }));

  it("finds the table of minimum authority by severity", () => {
    expect(start).toBeGreaterThanOrEqual(0);
    expect(rows.map((r) => r.severity)).toEqual(["P0", "P1", "P2", "P3"]);
  });

  it.each(committed.roles.map((r) => [r.id, r] as const))("%s quotes its row and covers its severity and every lower one", (_id, r) => {
    const row = rows.find((candidate) => candidate.line === r.source_text);
    expect(row, `row ${r.source_text} in EXC-021 section 15`).toBeDefined();
    expect(r.title).toBe(row!.authority);
    const all = ["P1", "P2", "P3"];
    expect(r.severities).toEqual(all.slice(all.indexOf(row!.severity)));
  });

  it("has a role for every approvable row, and none for P0, which needs the emergency process", () => {
    const covered = committed.roles.map((r) => r.severities[0]).sort();
    expect(covered).toEqual(["P1", "P2", "P3"]);
    expect(committed.roles.some((r) => (r.severities as string[]).includes("P0"))).toBe(false);
    expect(rows.find((r) => r.severity === "P0")?.authority).toBe("Emergency / organizational authority");
    expect(repoFile("21-exceptions/21-engineering-exception-standard.md")).toContain("not approvable through normal exception flow");
  });
});
