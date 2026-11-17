import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadProjectRegistry } from "../src/config.js";

const read = (name: string) => readFileSync(new URL(`../../model/${name}`, import.meta.url), "utf8");
const example = JSON.parse(read("example-project-registration.json")) as Record<string, any>;

const fsOf = (files: Record<string, string>) => ({
  listFiles: async () => Object.keys(files),
  readTextFile: async (_root: string, path: string) => files[path],
});
const record = (change: (r: Record<string, any>) => void = () => {}) => {
  const r = structuredClone(example);
  change(r);
  return JSON.stringify(r);
};
const named = (name: string) => ({ name, handle: "someone" });
const load = (files: Record<string, string>, path = "registry/projects") =>
  loadProjectRegistry(".", path, fsOf(files));

describe("project registry", () => {
  it("accepts the example record, including placeholder owners while ONBOARDING", async () => {
    const records = await load({ "registry/projects/example-saas.json": record() });
    expect(records).toHaveLength(1);
    expect(records[0]?.owners.technical_owner.name).toBe("UNASSIGNED");
  });

  it("accepts an ACTIVE project that names a technical owner and governance representative", async () => {
    const active = record((r) => {
      r.status = "ACTIVE";
      r.owners.technical_owner = named("Technical Owner");
      r.owners.governance_representative = named("Governance Rep");
    });
    await expect(load({ "registry/projects/a.json": active })).resolves.toHaveLength(1);
  });

  it.each([
    ["technical owner", "technical_owner"],
    ["governance representative", "governance_representative"],
  ])("rejects an ACTIVE project whose %s is still UNASSIGNED", async (_label, key) => {
    const active = record((r) => {
      r.status = "ACTIVE";
      r.owners.technical_owner = named("Technical Owner");
      r.owners.governance_representative = named("Governance Rep");
      r.owners[key] = { name: "UNASSIGNED" };
    });
    await expect(load({ "registry/projects/a.json": active })).rejects.toThrow("schema validation failed");
  });

  it.each([
    ["a missing required field", (r: Record<string, any>) => { delete r.criticality; }],
    ["an unknown criticality", (r: Record<string, any>) => { r.criticality = "EXTREME"; }],
    ["an unknown data classification", (r: Record<string, any>) => { r.data_classification = "SECRET"; }],
    ["an unknown property", (r: Record<string, any>) => { r.surprise = true; }],
    ["no repositories", (r: Record<string, any>) => { r.repositories = []; }],
    ["a malformed repository name", (r: Record<string, any>) => { r.repositories = [{ name: "not-a-repo" }]; }],
    ["an uppercase project id", (r: Record<string, any>) => { r.id = "Example"; }],
    ["no owners block", (r: Record<string, any>) => { delete r.owners; }],
    ["duplicate environments", (r: Record<string, any>) => { r.environments = ["staging", "staging"]; }],
  ])("rejects %s with a schema diagnostic", async (_name, change) => {
    await expect(load({ "registry/projects/a.json": record(change) })).rejects.toThrow(
      /Project registration registry\/projects\/a\.json schema validation failed/,
    );
  });

  it("rejects invalid JSON naming the file", async () => {
    await expect(load({ "registry/projects/a.json": "{nope" })).rejects.toThrow("registry/projects/a.json is not valid JSON");
  });

  it("fails when the registry holds no records instead of validating nothing", async () => {
    await expect(load({ "registry/projects/README.md": "# docs" })).rejects.toThrow("No project registration records");
    await expect(load({})).rejects.toThrow("No project registration records");
  });

  it("ignores files outside the requested directory and non-JSON files", async () => {
    const records = await load({
      "registry/projects/a.json": record(),
      "registry/projects/README.md": "# docs",
      "other/b.json": "{not even read}",
    });
    expect(records).toHaveLength(1);
  });

  it("accepts a single .json file path", async () => {
    await expect(load({ "x/one.json": record() }, "x/one.json")).resolves.toHaveLength(1);
  });

  it("reports a missing single file", async () => {
    await expect(load({}, "x/missing.json")).rejects.toThrow("Project registration not found: x/missing.json");
  });

  it("rejects a duplicate project id across records", async () => {
    const other = record((r) => { r.repositories = [{ name: "Inflame21/other" }]; });
    await expect(load({ "registry/projects/a.json": record(), "registry/projects/b.json": other })).rejects.toThrow(
      "project id 'example-saas' is already registered in registry/projects/a.json",
    );
  });

  it("rejects a repository mapped to two projects, ignoring case", async () => {
    const other = record((r) => { r.id = "other-project"; r.repositories = [{ name: "inflame21/EXAMPLE-SAAS" }]; });
    await expect(load({ "registry/projects/a.json": record(), "registry/projects/b.json": other })).rejects.toThrow(
      "repository 'inflame21/EXAMPLE-SAAS' already belongs to project 'example-saas'",
    );
  });

  it("rejects an unknown architecture profile and lists the known ones", async () => {
    const bad = record((r) => { r.profiles.architecture = "made-up"; });
    await expect(load({ "registry/projects/a.json": bad })).rejects.toThrow(
      /unknown architecture profile 'made-up' \(known: clean-architecture, hexagonal-architecture, microservices, modular-architecture-example\)/,
    );
  });

  it("accepts every committed registration record and the example record", async () => {
    const dir = new URL("../../registry/projects/", import.meta.url);
    const committed = readdirSync(dir).filter((file) => file.endsWith(".json"));
    const files: Record<string, string> = { "model/example.json": read("example-project-registration.json") };
    for (const file of committed) files[`registry/projects/${file}`] = readFileSync(new URL(file, dir), "utf8");

    // Each committed record must be valid on its own, and the registry as a whole must be consistent.
    for (const [path, content] of Object.entries(files)) {
      await expect(load({ [path]: content }, path)).resolves.toHaveLength(1);
    }
    if (committed.length > 0) {
      await expect(load(Object.fromEntries(Object.entries(files).filter(([p]) => p.startsWith("registry/"))))).resolves.toHaveLength(committed.length);
    }
  });
});
