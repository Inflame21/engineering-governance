import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assessPackAgainstCatalog } from "../src/catalog.js";
import { loadControlCatalog, type CatalogControl, type ControlCatalog } from "../src/config.js";
import type { GovernancePack } from "../../engine/src/types.js";

const repoFile = (path: string) => readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const committedText = readFileSync(new URL("../../model/catalog/organization-controls.json", import.meta.url), "utf8");
const committed = JSON.parse(committedText) as ControlCatalog;
const examplePack = JSON.parse(readFileSync(new URL("../../model/example-governance-pack.json", import.meta.url), "utf8")) as GovernancePack;

const fsOf = (content: string | undefined) => ({ readTextFile: async () => content });
const load = (content: string | undefined) => loadControlCatalog(".", "catalog.json", fsOf(content));

function entry(overrides: Partial<CatalogControl> = {}): CatalogControl {
  return {
    id: "CTL-001",
    standard_id: "SEC-007",
    standard_version: "1.0.0",
    source_file: "07-security/07-security-engineering-standard.md",
    source_section: "1. Example",
    source_text: "an example requirement",
    title: "Blocker: an example requirement",
    description: "Blocks when this is present: an example requirement.",
    mandatory: true,
    severity: "P1",
    failure_decision: "NO-GO",
    verification_capabilities: [],
    required_evidence_classes: [],
    exception_policy: "ALLOWED",
    owner: { name: "UNASSIGNED" },
    status: "DRAFT",
    ...overrides,
  };
}
const catalogOf = (...controls: CatalogControl[]): ControlCatalog => ({
  version: "1.0.0",
  catalog_id: "test-catalog",
  catalog_version: "0.1.0",
  description: "Test catalog.",
  controls,
});
const packWith = (...controls: Array<{ id: string } & Record<string, unknown>>): GovernancePack => ({
  ...examplePack,
  controls: controls.map((c) => ({ standard: "SEC-007", title: "t", severity: "P1", failure_decision: "NO-GO", ...c })) as GovernancePack["controls"],
});

describe("control catalog schema and loader", () => {
  it("loads the committed catalog: 88 DRAFT controls with unique ids and unassigned owners", async () => {
    const catalog = await load(committedText);
    expect(catalog.catalog_id).toBe("organization-controls");
    expect(catalog.controls).toHaveLength(88);
    expect(new Set(catalog.controls.map((c) => c.id)).size).toBe(88);
    expect(catalog.controls.every((c) => c.status === "DRAFT" && c.mandatory && c.owner.name === "UNASSIGNED")).toBe(true);
    expect(catalog.controls.every((c) => c.failure_decision === "NO-GO")).toBe(true);
  });

  it("accepts an APPROVED control that has an effective date and a named owner", async () => {
    const approved = entry({ status: "APPROVED", effective_from: "2026-11-17", owner: { name: "Control Owner", handle: "owner1" } });
    await expect(load(JSON.stringify(catalogOf(approved)))).resolves.toBeTruthy();
  });

  const bad = (change: (c: Record<string, any>) => void) => {
    const c = JSON.parse(JSON.stringify(entry())) as Record<string, any>;
    change(c);
    return JSON.stringify(catalogOf(c as CatalogControl));
  };

  it.each([
    ["a missing required field", (c: Record<string, any>) => { delete c.source_text; }],
    ["an unknown severity", (c: Record<string, any>) => { c.severity = "P9"; }],
    ["an unknown status", (c: Record<string, any>) => { c.status = "PENDING"; }],
    ["an unknown failure decision", (c: Record<string, any>) => { c.failure_decision = "MAYBE"; }],
    ["an unknown exception policy", (c: Record<string, any>) => { c.exception_policy = "SOMETIMES"; }],
    ["a malformed evidence class", (c: Record<string, any>) => { c.required_evidence_classes = ["E9"]; }],
    ["a lowercase control id", (c: Record<string, any>) => { c.id = "ctl-001"; }],
    ["a malformed standard id", (c: Record<string, any>) => { c.standard_id = "SECURITY"; }],
    ["a non-boolean mandatory flag", (c: Record<string, any>) => { c.mandatory = "yes"; }],
    ["an unknown property", (c: Record<string, any>) => { c.surprise = true; }],
    ["an APPROVED control without an effective date", (c: Record<string, any>) => { c.status = "APPROVED"; c.owner = { name: "Control Owner" }; }],
    ["an APPROVED control with an UNASSIGNED owner", (c: Record<string, any>) => { c.status = "APPROVED"; c.effective_from = "2026-11-17"; }],
    ["a RETIRED control without a retirement date", (c: Record<string, any>) => { c.status = "RETIRED"; }],
    ["a malformed date", (c: Record<string, any>) => { c.status = "APPROVED"; c.owner = { name: "O" }; c.effective_from = "yesterday"; }],
  ])("rejects %s with a schema diagnostic", async (_name, change) => {
    await expect(load(bad(change))).rejects.toThrow("Control catalog schema validation failed");
  });

  it("rejects an empty catalog, invalid JSON, a missing file and duplicate ids", async () => {
    await expect(load(JSON.stringify(catalogOf()))).rejects.toThrow("schema validation failed");
    await expect(load("{nope")).rejects.toThrow("Control catalog is not valid JSON");
    await expect(load(undefined)).rejects.toThrow("Control catalog not found: catalog.json");
    await expect(load(JSON.stringify(catalogOf(entry(), entry())))).rejects.toThrow("duplicate control id(s): CTL-001");
  });
});

describe("committed catalog is faithful to the standards", () => {
  /** The bullets of a standard's "MUST block" list, read straight from the standard's text. */
  function sectionBullets(file: string, sectionPath: string): string[] {
    const lines = repoFile(file).split("\n");
    const [heading, group] = sectionPath.split(" / ");
    const headingOf = (l: string) => (/^#+ /.test(l) ? l.replace(/^#+\s+/, "").trim() : undefined);
    const start = lines.findIndex((l) => headingOf(l) === heading);
    expect(start, `heading '${heading}' in ${file}`).toBeGreaterThanOrEqual(0);
    const level = /^#+/.exec(lines[start]!)![0].length;
    let body: string[] = [];
    for (const l of lines.slice(start + 1)) {
      const m = /^(#+) /.exec(l);
      if (m && m[1]!.length <= level) break;
      body.push(l);
    }
    if (group) {
      const g = body.findIndex((l) => headingOf(l) === group);
      expect(g, `sub-heading '${group}' under '${heading}'`).toBeGreaterThanOrEqual(0);
      const rest = body.slice(g + 1);
      const next = rest.findIndex((l) => /^#+ /.test(l));
      body = next === -1 ? rest : rest.slice(0, next);
    }
    return body.filter((l) => l.startsWith("- ")).map((l) => l.slice(2).replace(/[;,.]$/, "").trim());
  }

  const sources = [...new Set(committed.controls.map((c) => `${c.source_file}\u0000${c.source_section}`))];

  it.each(sources)("lists exactly the requirements in %s", (key) => {
    const [file, section] = key.split("\u0000") as [string, string];
    const fromCatalog = committed.controls.filter((c) => c.source_file === file && c.source_section === section).map((c) => c.source_text);
    // Same bullets, verbatim and in order: nothing omitted, nothing invented.
    expect(fromCatalog).toEqual(sectionBullets(file, section));
  });

  it("covers every blocker the seven standards list (19 + 11 + 9 + 13 + 10 + 15 + 11)", () => {
    const per = (id: string) => committed.controls.filter((c) => c.standard_id === id).length;
    expect(["GOV-000", "GOV-022", "GOV-023", "SEC-007", "QA-008", "CICD-012", "DB-005"].map(per)).toEqual([19, 11, 9, 13, 10, 15, 11]);
  });

  it("states a standard version only where the standard has one", () => {
    expect(repoFile("00-governance/00-engineering-governance-constitution.md")).toMatch(/\*\*Version:\*\* 1\.0\.0/);
    for (const c of committed.controls) expect(c.standard_version).toBe(c.standard_id === "GOV-000" ? "1.0.0" : "unversioned");
  });

  it("marks only requirements that EXC-021 section 7 names as non-exceptionable, and keeps P0 to the few the standards call P0", () => {
    const nonExceptionable = committed.controls.filter((c) => c.exception_policy === "NON_EXCEPTIONABLE").map((c) => c.source_text).sort();
    expect(nonExceptionable).toEqual(["Authorization bypass", "authorization bypass", "broken tenant/data isolation", "evidence was fabricated", "irreversible data-loss risk"]);
    const p0 = committed.controls.filter((c) => c.severity === "P0").map((c) => c.source_text).sort();
    expect(p0).toEqual(["Authentication bypass", "a P0 issue remains unresolved", "authentication bypass", "exposed secrets"]);
  });
});

describe("assessing a governance pack against the catalog", () => {
  it("blocks when an APPROVED mandatory control is missing from the pack", () => {
    const approved = entry({ status: "APPROVED", effective_from: "2026-11-17", owner: { name: "Owner" }, severity: "P0" });
    const { blocking, warnings } = assessPackAgainstCatalog(packWith(), catalogOf(approved));
    expect(warnings).toEqual([]);
    expect(blocking).toHaveLength(1);
    expect(blocking[0]).toMatchObject({ controlId: "CATALOG:CTL-001:NOT-DEFINED", severity: "P0", decision: "NO-GO", status: "FAIL" });
    expect(blocking[0]?.message).toContain("an example requirement");
  });

  it("reports missing DRAFT controls as one aggregate condition and never blocks", () => {
    const drafts = ["CTL-001", "CTL-002", "CTL-003"].map((id) => entry({ id }));
    const { blocking, warnings } = assessPackAgainstCatalog(packWith(), catalogOf(...drafts));
    expect(blocking).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ controlId: "CATALOG:test-catalog:DRAFT-CONTROLS-NOT-DEFINED", decision: "GO_WITH_CONDITIONS", status: "WARN" });
    expect(warnings[0]?.message).toContain("3 mandatory DRAFT control(s)");
    expect(warnings[0]?.message).toContain("CTL-001, CTL-002, CTL-003");
  });

  it("abbreviates a long list of missing draft controls", () => {
    const many = Array.from({ length: 9 }, (_, i) => entry({ id: `CTL-${String(i + 1).padStart(3, "0")}` }));
    const { warnings } = assessPackAgainstCatalog(packWith(), catalogOf(...many));
    expect(warnings[0]?.message).toContain("CTL-001, CTL-002, CTL-003, CTL-004, CTL-005, CTL-006 and 3 more");
  });

  it("accepts a pack that defines the control at least as strongly, with the catalog's standard", () => {
    const approved = entry({ status: "APPROVED", effective_from: "2026-11-17", owner: { name: "Owner" } });
    expect(assessPackAgainstCatalog(packWith({ id: "CTL-001" }), catalogOf(approved))).toEqual({ blocking: [], warnings: [] });
    expect(assessPackAgainstCatalog(packWith({ id: "CTL-001", severity: "P0" }), catalogOf(approved))).toEqual({ blocking: [], warnings: [] });
  });

  it.each([
    ["a lower severity", { severity: "P2" as const }, "severity P2 is below the catalog's P1"],
    ["a softer failure decision", { failure_decision: "GO_WITH_CONDITIONS" as const }, "failure decision GO_WITH_CONDITIONS is softer than the catalog's NO-GO"],
    ["no failure decision", { failure_decision: undefined }, "failure decision NONE is softer"],
    ["a different standard", { standard: "API-006" }, "it cites standard API-006 instead of SEC-007"],
  ])("blocks a pack that weakens an APPROVED control with %s", (_name, override, reason) => {
    const approved = entry({ status: "APPROVED", effective_from: "2026-11-17", owner: { name: "Owner" } });
    const { blocking } = assessPackAgainstCatalog(packWith({ id: "CTL-001", ...override }), catalogOf(approved));
    expect(blocking).toHaveLength(1);
    expect(blocking[0]?.controlId).toBe("CATALOG:CTL-001:WEAKENED");
    expect(blocking[0]?.message).toContain(reason);
  });

  it("reports every way one control is weakened at once", () => {
    const approved = entry({ status: "APPROVED", effective_from: "2026-11-17", owner: { name: "Owner" } });
    const { blocking } = assessPackAgainstCatalog(packWith({ id: "CTL-001", severity: "P3", failure_decision: "NONE", standard: "API-006" }), catalogOf(approved));
    expect(blocking[0]?.message).toMatch(/severity P3.*failure decision NONE.*API-006/);
  });

  it("reports a weakened DRAFT control as a condition, not a block", () => {
    const { blocking, warnings } = assessPackAgainstCatalog(packWith({ id: "CTL-001", severity: "P3" }), catalogOf(entry()));
    expect(blocking).toEqual([]);
    expect(warnings.map((w) => w.controlId)).toEqual(["CATALOG:test-catalog:DRAFT-CONTROLS-WEAKENED"]);
  });

  it("ignores optional, DEPRECATED and RETIRED controls", () => {
    const ignored = [
      entry({ id: "CTL-001", mandatory: false }),
      entry({ id: "CTL-002", status: "DEPRECATED" }),
      entry({ id: "CTL-003", status: "RETIRED", retired_at: "2026-11-17" }),
    ];
    expect(assessPackAgainstCatalog(packWith(), catalogOf(...ignored))).toEqual({ blocking: [], warnings: [] });
  });
});
