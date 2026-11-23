import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { evaluateControl } from "../../engine/src/evaluator.js";
import { MIGRATION_REPORT_DIRECTORY, parseMigrationOutput, runMigrationCheckAdapter } from "../src/migration-check.js";
import { runVerificationAdapters, type VerificationToolRunner } from "../src/verification.js";
import type { RepositorySnapshot } from "../src/types.js";

const real = (name: string) => readFileSync(new URL(`./fixtures/real-migration-output/${name}`, import.meta.url), "utf8");
const at = (name: string) => `${MIGRATION_REPORT_DIRECTORY}/${name}`;

function snapshot(contents: Record<string, string | undefined>, extraFiles: string[] = []): RepositorySnapshot {
  const present = Object.fromEntries(Object.entries(contents).filter(([, v]) => v !== undefined)) as Record<string, string>;
  return { rootPath: "/repo", files: [...Object.keys(contents), ...extraFiles], changedFiles: [], fileContents: present };
}
const one = (name: string) => runMigrationCheckAdapter(snapshot({ [at("check.txt")]: real(name) }))!;

describe("migration check parser, on real output", () => {
  it.each([
    ["django-clean.txt", "clean"],
    ["django-pending.txt", "pending"],
    ["django-conflict.txt", "conflict"],
    ["alembic-clean.txt", "clean"],
    ["alembic-pending.txt", "pending"],
    ["alembic-not-current.txt", "not-run"],
    ["alembic-one-head.txt", "clean"],
    ["alembic-two-heads.txt", "conflict"],
  ])("%s is %s", (name, kind) => {
    expect(parseMigrationOutput(real(name))?.kind).toBe(kind);
  });

  it("tolerates a byte order mark and Windows line endings, which PowerShell redirection produces", () => {
    expect(parseMigrationOutput(`﻿${real("django-clean.txt").replace(/\n/g, "\r\n")}`)?.kind).toBe("clean");
    expect(parseMigrationOutput(real("django-pending.txt").replace(/\n/g, "\r\n"))?.kind).toBe("pending");
  });

  it("recognises nothing in a traceback, an empty file or unrelated text", () => {
    for (const text of ["", "Traceback (most recent call last):\n  File x\nImportError: no module", "all good", "No changes detected in the cache"]) {
      expect(parseMigrationOutput(text), text).toBeUndefined();
    }
  });

  it("names every app Django lists, and a problem beats a clean line", () => {
    const text = "Migrations for 'a':\n  a/migrations/0002_x.py\n    + Add field x to a\nMigrations for 'b':\n  b/migrations/0002_y.py\n    + Add field y to b\n";
    const outcome = parseMigrationOutput(text);
    expect(outcome).toMatchObject({ kind: "pending" });
    expect((outcome as { detail: string }).detail).toContain("Migrations for 'b':");
    expect(parseMigrationOutput("0001 (head)\nNo changes detected\nFAILED: New upgrade operations detected: [x]")?.kind).toBe("pending");
  });
});

describe("migration check collector", () => {
  it("returns nothing when the repository provides no migration check files", () => {
    expect(runMigrationCheckAdapter(snapshot({}, ["src/a.py", at("notes.md"), at("a.json")]))).toBeUndefined();
  });

  it("passes clean real output, as E3 evidence with unknown freshness and no commit binding", () => {
    for (const name of ["django-clean.txt", "alembic-clean.txt", "alembic-one-head.txt"]) {
      const out = one(name);
      expect(out.result.status, name).toBe("PASS");
      expect(out.findings).toEqual([]);
      expect(out.adapterResult.supportedCapabilities).toEqual(["verification:migration-consistency"]);
      expect(out.evidence[0]).toMatchObject({
        id: "EVD-MIGRATION-CHECK", type: "E3_AUTOMATED_ANALYSIS", status: "VERIFIED", result_status: "PASS", freshness: "unknown", supports_controls: [],
      });
      expect(out.evidence[0]).not.toHaveProperty("generated_at");
      expect(out.evidence[0]).not.toHaveProperty("repository_fingerprint");
    }
    expect(one("django-clean.txt").result.limitations.join(" ")).toContain("does not show that the migrations run");
  });

  it("fails a model change with no migration with a P1 finding that quotes what the tool said", () => {
    for (const [name, expected] of [["django-pending.txt", "Add field price to item"], ["alembic-pending.txt", "add_column"]] as const) {
      const out = one(name);
      expect(out.result.status, name).toBe("FAIL");
      expect(out.findings).toHaveLength(1);
      expect(out.findings[0]).toMatchObject({ rule_id: "MIGRATION-PENDING", severity: "P1", category: "database", status: "OPEN", source_location: { file: at("check.txt") } });
      expect(out.findings[0]!.message).toContain(expected);
      expect(out.evidence[0]).toMatchObject({ status: "UNVERIFIED", result_status: "FAIL" });
    }
  });

  it("fails a forked migration history", () => {
    for (const [name, expected] of [["django-conflict.txt", "0002_a, 0002_b"], ["alembic-two-heads.txt", "0002, 0003"]] as const) {
      const out = one(name);
      expect(out.result.status, name).toBe("FAIL");
      expect(out.findings[0]).toMatchObject({ rule_id: "MIGRATION-CONFLICT", severity: "P1" });
      expect(out.findings[0]!.message).toContain(expected);
    }
  });

  it("is UNVERIFIED, not PASS, when the Alembic check could not run because the database was not migrated", () => {
    const out = one("alembic-not-current.txt");
    expect(out.result.status).toBe("UNVERIFIED");
    expect(out.adapterResult.executionStatus).toBe("PARTIAL");
    expect(out.adapterResult.supportedCapabilities).toEqual([]);
    expect(out.result.limitations.join(" ")).toContain("not at the latest revision");
  });

  it("is ERROR for text that is not check output, and FAIL still wins when a real failure is also present", () => {
    const bad = runMigrationCheckAdapter(snapshot({ [at("check.txt")]: "Traceback (most recent call last):\nImportError" }))!;
    expect(bad.result.status).toBe("ERROR");
    expect(bad.adapterResult.executionStatus).toBe("FAILED");
    const both = runMigrationCheckAdapter(snapshot({ [at("a.txt")]: real("django-pending.txt"), [at("junk.log")]: "nope" }))!;
    expect(both.result.status).toBe("FAIL");
    expect(both.result.limitations.join(" ")).toContain("junk.log");
  });

  it("judges several files together: one clean file does not hide a failing one", () => {
    const out = runMigrationCheckAdapter(snapshot({ [at("django.txt")]: real("django-clean.txt"), [at("alembic.txt")]: real("alembic-two-heads.txt") }))!;
    expect(out.result.status).toBe("FAIL");
    expect(out.result.summary).toContain("1 clean, 1 failed");
    expect(out.findings[0]!.source_location).toEqual({ file: at("alembic.txt") });
  });

  it("is UNVERIFIED, not PASS, when one file's content was not ingested", () => {
    const out = runMigrationCheckAdapter(snapshot({ [at("a.txt")]: real("django-clean.txt"), [at("big.txt")]: undefined }))!;
    expect(out.result.status).toBe("UNVERIFIED");
    expect(out.result.limitations.join(" ")).toContain("big.txt");
  });

  it("reads at most 20 files and says so", () => {
    const files = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [at(`f${i}.txt`), `Conflicting migrations detected; multiple leaf nodes in the migration graph: (a${i}, b${i} in app).`]));
    const out = runMigrationCheckAdapter(snapshot(files))!;
    expect(out.findings).toHaveLength(20);
    const more = runMigrationCheckAdapter(snapshot({ ...files, [at("f99.txt")]: real("django-clean.txt") }))!;
    expect(more.result.limitations.join(" ")).toContain("only the first 20 were read");
  });
});

describe("migration check through the verification pipeline", () => {
  const noTools: VerificationToolRunner = {
    async isAvailable() { return false; },
    async run() { throw new Error("no tool should run"); },
  };

  it("adds the evidence and findings to the report without running any command", async () => {
    const report = await runVerificationAdapters(snapshot({ [at("check.txt")]: real("django-pending.txt") }), noTools);
    expect(report.results.map((r) => r.tool)).toContain("migration-check");
    expect(report.evidence.map((e) => e.id)).toContain("EVD-MIGRATION-CHECK");
    expect(report.findings.some((f) => f.rule_id === "MIGRATION-PENDING")).toBe(true);
  });

  it("changes nothing for a repository without migration check files", async () => {
    const report = await runVerificationAdapters(snapshot({}, ["README.md"]), noTools);
    expect(report.results.map((r) => r.tool)).not.toContain("migration-check");
  });

  it("cannot satisfy a control on its own, and even linked it cannot, because the output has no time", async () => {
    const control = { id: "DB-MIG", standard: "DB-001", title: "Migrations consistent", severity: "P1" as const, failure_decision: "NO-GO" as const, required_evidence: ["EVD-MIGRATION-CHECK"] };
    const report = await runVerificationAdapters(snapshot({ [at("check.txt")]: real("django-clean.txt") }), noTools);
    expect(evaluateControl(control, report.evidence, { signals: [] } as never).status).not.toBe("PASS");
    const linked = report.evidence.map((e) => ({ ...e, supports_controls: ["DB-MIG"] }));
    // Output has no time, so the evaluator treats its freshness as unknown and no control can use it (DEBT-GOV-032).
    expect(evaluateControl(control, linked, { signals: [] } as never).status).not.toBe("PASS");
  });
});
