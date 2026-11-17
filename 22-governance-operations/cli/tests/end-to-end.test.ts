import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

const temporaryRoots: string[] = [];
const cliEntrypoint = path.resolve("dist/cli/src/index.js");

async function createRoot(prefix = "governance-cli-e2e-"): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}

async function run(executable: string, args: string[], cwd: string): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    execFile(executable, args, { cwd, windowsHide: true, encoding: "utf8" }, (error, stdout, stderr) => {
      if (!error) {
        resolve({ exitCode: 0, stdout, stderr });
        return;
      }
      if (typeof error.code === "number") {
        resolve({ exitCode: error.code, stdout, stderr });
        return;
      }
      reject(error);
    });
  });
}

async function runCli(args: string[]): Promise<ProcessResult> {
  return run(process.execPath, [cliEntrypoint, ...args], process.cwd());
}

function pack(openRisk = false): Record<string, unknown> {
  return {
    version: "1.0.0",
    project: { id: "e2e", name: "CLI E2E", repository: "example/e2e", environment: "test" },
    change: { id: "CHG-E2E", type: "feature", title: "CLI contract", risk_class: "D", files: [] },
    // One always-applicable control with verified evidence, so the assessment is not vacuous:
    // a pack where nothing applies is NO-GO (DEBT-GOV-003).
    standards: [{ id: "SEC-007", title: "Security Engineering", version: "1.0.0", source: "tests/end-to-end.test.ts" }],
    controls: [{
      id: "E2E-001",
      standard: "SEC-007",
      title: "E2E control",
      severity: "P1",
      required_evidence: ["EVD-E2E"],
      failure_decision: "NO-GO",
    }],
    evidence: [{
      id: "EVD-E2E",
      type: "E3_AUTOMATED_ANALYSIS",
      status: "VERIFIED",
      description: "E2E evidence.",
      source: "tests/end-to-end.test.ts",
      freshness: "current",
      supports_controls: ["E2E-001"],
    }],
    risks: openRisk ? [{ id: "RSK-E2E", severity: "P1", title: "Intentional E2E blocker", status: "OPEN" }] : [],
    decisions: [],
  };
}

async function createCompleteFixture(): Promise<string> {
  const root = await createRoot();
  await mkdir(path.join(root, ".governance"), { recursive: true });
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(path.join(root, "package.json"), JSON.stringify({ dependencies: { react: "^19.0.0" } }));
  await writeFile(path.join(root, "src", "main.ts"), "export const ready = true;\n");
  await writeFile(path.join(root, ".governance", "governance-pack.json"), JSON.stringify(pack()));
  for (const args of [
    ["init", "--quiet"],
    ["config", "user.email", "governance@example.test"],
    ["config", "user.name", "Governance E2E"],
    ["add", "."],
    ["commit", "--quiet", "-m", "fixture"],
  ]) {
    const result = await run("git", args, root);
    if (result.exitCode !== 0) throw new Error(`Could not initialize CLI E2E Git fixture: ${result.stderr}`);
  }
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("built governance CLI", () => {
  it("returns documented GO, GO WITH CONDITIONS, NO-GO, and execution-error exit codes", async () => {
    const root = await createCompleteFixture();

    const go = await runCli(["check", root, "--base", "HEAD", "--json"]);
    expect(go.exitCode).toBe(0);
    expect(JSON.parse(go.stdout).evaluation.decision.status).toBe("GO");

    const conditional = await runCli(["check", root]);
    expect(conditional.exitCode).toBe(1);
    expect(conditional.stdout).toContain("Decision: GO_WITH_CONDITIONS");

    await writeFile(path.join(root, ".governance", "governance-pack.json"), JSON.stringify(pack(true)));
    const blocked = await runCli(["check", root]);
    expect(blocked.exitCode).toBe(2);
    expect(blocked.stdout).toContain("Decision: NO-GO");

    await writeFile(path.join(root, ".governance", "governance-pack.json"), "{not-json");
    const invalid = await runCli(["check", root, "--json"]);
    expect(invalid.exitCode).toBe(3);
    expect(invalid.stderr).toContain("Governance CLI error: Governance pack is not valid JSON");

    const missingRoot = await runCli(["analyze", path.join(root, "missing"), "--json"]);
    expect(missingRoot.exitCode).toBe(3);
    expect(missingRoot.stderr).toContain("Governance CLI error:");
  });

  it("exits NO-GO for a pack where no control applies instead of reporting a vacuous GO", async () => {
    const root = await createCompleteFixture();
    await writeFile(path.join(root, ".governance", "governance-pack.json"), JSON.stringify({ ...pack(), controls: [], evidence: [] }));

    const result = await runCli(["check", root, "--base", "HEAD", "--json"]);
    expect(result.exitCode).toBe(2);
    const decision = JSON.parse(result.stdout).evaluation.decision;
    expect(decision.status).toBe("NO-GO");
    expect(decision.blockingViolations.map((v: { controlId: string }) => v.controlId)).toContain("SCOPE:NO_APPLICABLE_CONTROLS");
  });

  it("validate checks the pack without analysing the repository and exits 3 for an invalid pack", async () => {
    const root = await createCompleteFixture();
    const ok = await runCli(["validate", root]);
    expect(ok.exitCode).toBe(0);
    expect(ok.stdout).toContain("Valid: .governance/governance-pack.json");

    const { project: _project, ...withoutProject } = pack();
    await writeFile(path.join(root, ".governance", "governance-pack.json"), JSON.stringify(withoutProject));
    const bad = await runCli(["validate", root]);
    expect(bad.exitCode).toBe(3);
    expect(bad.stdout).toBe("");
    expect(bad.stderr).toContain("schema validation failed");

    const missing = await runCli(["validate", root, "--pack", "nope.json"]);
    expect(missing.exitCode).toBe(3);
    expect(missing.stderr).toContain("Governance pack not found");
  });

  it("report renders Markdown by default with the same exit codes as check, and supports --format json", async () => {
    const root = await createCompleteFixture();

    const go = await runCli(["report", root, "--base", "HEAD"]);
    expect(go.exitCode).toBe(0);
    expect(go.stdout).toContain("# Governance report");
    expect(go.stdout).toContain("**Decision:** GO");

    const json = await runCli(["report", root, "--base", "HEAD", "--format", "json"]);
    expect(json.exitCode).toBe(0);
    expect(JSON.parse(json.stdout).report.decision).toBe("GO");

    await writeFile(path.join(root, ".governance", "governance-pack.json"), JSON.stringify(pack(true)));
    const blocked = await runCli(["report", root, "--base", "HEAD"]);
    expect(blocked.exitCode).toBe(2);
    expect(blocked.stdout).toContain("**Decision:** NO-GO");
    expect(blocked.stdout).toContain("## Blocking violations");
  });

  it("validate --registry checks project registration records and fails closed on an empty or invalid registry", async () => {
    const root = await createCompleteFixture();
    const registry = path.join(root, "registry", "projects");
    await mkdir(registry, { recursive: true });
    const example = await readFile(path.resolve("../model/example-project-registration.json"), "utf8");

    const empty = await runCli(["validate", root, "--registry", "registry/projects"]);
    expect(empty.exitCode).toBe(3);
    expect(empty.stderr).toContain("No project registration records");

    await writeFile(path.join(registry, "example-saas.json"), example);
    const ok = await runCli(["validate", root, "--registry", "registry/projects"]);
    expect(ok.exitCode).toBe(0);
    expect(ok.stdout).toContain("Valid: 1 project registration in registry/projects");

    const both = await runCli(["validate", root, "--registry", "registry/projects", "--pack", ".governance/governance-pack.json"]);
    expect(both.exitCode).toBe(0);
    expect(both.stdout).toContain(".governance/governance-pack.json and 1 project registration");

    await writeFile(path.join(registry, "example-saas.json"), example.replace('"ONBOARDING"', '"ACTIVE"'));
    const gap = await runCli(["validate", root, "--registry", "registry/projects"]);
    expect(gap.exitCode).toBe(3);
    expect(gap.stdout).toBe("");
    expect(gap.stderr).toContain("schema validation failed");
  });

  it("rejects --registry on analyze, and --project without --registry or on other commands, with exit 3", async () => {
    const root = await createCompleteFixture();
    const analyze = await runCli(["analyze", root, "--registry", "registry/projects"]);
    expect(analyze.exitCode).toBe(3);
    expect(analyze.stderr).toContain("only supported by the validate, check and report commands");

    const orphan = await runCli(["check", root, "--project", "e2e"]);
    expect(orphan.exitCode).toBe(3);
    expect(orphan.stderr).toContain("--project requires --registry");

    const wrongCommand = await runCli(["validate", root, "--registry", "registry/projects", "--project", "e2e"]);
    expect(wrongCommand.exitCode).toBe(3);
    expect(wrongCommand.stderr).toContain("only supported by the check and report commands");
  });

  function registration(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      version: "1.0.0",
      id: "e2e",
      name: "CLI E2E",
      status: "ACTIVE",
      criticality: "LOW",
      data_classification: "INTERNAL",
      repositories: [{ name: "example/e2e" }],
      owners: {
        technical_owner: { name: "Technical Owner" },
        governance_representative: { name: "Governance Rep" },
        escalation_contact: { name: "Escalation Contact" },
      },
      environments: ["test"],
      profiles: { architecture: "hexagonal-architecture", technology: ["typescript"] },
      governance_pack: ".governance/governance-pack.json",
      ...overrides,
    };
  }

  async function writeRegistration(root: string, record: Record<string, unknown>, file = "e2e.json"): Promise<void> {
    const directory = path.join(root, "registry", "projects");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, file), JSON.stringify(record));
    // --base HEAD treats untracked files as changes, so commit the record like a real registry would be.
    for (const args of [["add", "-A"], ["commit", "--quiet", "--allow-empty", "-m", "registry"]]) {
      const result = await run("git", args, root);
      if (result.exitCode !== 0) throw new Error(`Could not commit the registry fixture: ${result.stderr}`);
    }
  }

  const REGISTRY = ["--registry", "registry/projects"];

  it("check uses the registered project's pack and profile, and labels the project", async () => {
    const root = await createCompleteFixture();
    await writeRegistration(root, registration());

    const result = await runCli(["check", root, ...REGISTRY, "--base", "HEAD"]);
    // The registry's hexagonal profile is applied. Its component mappings match nothing in this tiny
    // repository, so boundary rules are unverifiable: conditional, never an unconditional GO.
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Decision: GO_WITH_CONDITIONS");
    expect(result.stdout).toContain("Project: e2e (ACTIVE, criticality LOW, data INTERNAL)");
    expect(result.stdout).toContain("Architecture profile: hexagonal-architecture (PARTIAL)");
    expect(result.stdout).not.toContain("OWNERSHIP-GAP");
  });

  it("reads the pack path from the registry unless --pack names one explicitly", async () => {
    const root = await createCompleteFixture();
    await mkdir(path.join(root, "packs"), { recursive: true });
    await writeFile(path.join(root, "packs", "e2e-pack.json"), JSON.stringify(pack()));
    await writeRegistration(root, registration({ governance_pack: "packs/e2e-pack.json" }));
    expect((await runCli(["check", root, ...REGISTRY, "--base", "HEAD"])).exitCode).toBe(1);

    await writeRegistration(root, registration({ governance_pack: "packs/missing.json" }));
    const missing = await runCli(["check", root, ...REGISTRY, "--base", "HEAD"]);
    expect(missing.exitCode).toBe(3);
    expect(missing.stderr).toContain("Governance pack not found: packs/missing.json");

    const override = await runCli(["check", root, ...REGISTRY, "--pack", ".governance/governance-pack.json", "--base", "HEAD"]);
    expect(override.exitCode).toBe(1);
    expect(override.stderr).toBe("");
  });

  it("applies the registered architecture profile: clean-architecture requires controls this pack lacks", async () => {
    const root = await createCompleteFixture();
    await writeRegistration(root, registration({ profiles: { architecture: "clean-architecture", technology: ["typescript"] } }));

    const result = await runCli(["check", root, ...REGISTRY, "--base", "HEAD"]);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toContain("Decision: NO-GO");
    expect(result.stdout).toContain("REQUIRED-CONTROL:ARCH-DEPENDENCY-DIRECTION");
  });

  it("reports an unassigned owner as a condition, so the exit code is 1 and not 0", async () => {
    const root = await createCompleteFixture();
    await writeRegistration(root, registration({
      status: "ONBOARDING",
      owners: {
        technical_owner: { name: "UNASSIGNED" },
        governance_representative: { name: "UNASSIGNED" },
        escalation_contact: { name: "UNASSIGNED" },
      },
    }));

    const result = await runCli(["check", root, ...REGISTRY, "--base", "HEAD"]);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Decision: GO_WITH_CONDITIONS");
    expect(result.stdout).toContain("REGISTRY:e2e:OWNERSHIP-GAP");
  });

  it("rejects a pack that does not belong to the registered project, and RETIRED projects, with exit 3", async () => {
    const root = await createCompleteFixture();

    await writeRegistration(root, registration({ id: "someone-else" }));
    const wrongId = await runCli(["check", root, ...REGISTRY, "--base", "HEAD"]);
    expect(wrongId.exitCode).toBe(3);
    expect(wrongId.stdout).toBe("");
    expect(wrongId.stderr).toContain("does not match registered project 'someone-else'");

    await writeRegistration(root, registration({ repositories: [{ name: "example/another" }] }));
    const wrongRepo = await runCli(["check", root, ...REGISTRY, "--base", "HEAD"]);
    expect(wrongRepo.exitCode).toBe(3);
    expect(wrongRepo.stderr).toContain("is not one of the repositories registered");

    await writeRegistration(root, registration({ status: "RETIRED" }));
    const retired = await runCli(["check", root, ...REGISTRY, "--base", "HEAD"]);
    expect(retired.exitCode).toBe(3);
    expect(retired.stderr).toContain("RETIRED in the registry and cannot be assessed");
  });

  it("requires --project when the registry holds several projects, and fails on an empty or unknown registry", async () => {
    const root = await createCompleteFixture();

    const empty = await runCli(["check", root, ...REGISTRY]);
    expect(empty.exitCode).toBe(3);
    expect(empty.stderr).toContain("No project registration records");

    await writeRegistration(root, registration());
    await writeRegistration(root, registration({ id: "second", repositories: [{ name: "example/second" }] }), "second.json");

    const ambiguous = await runCli(["check", root, ...REGISTRY, "--base", "HEAD"]);
    expect(ambiguous.exitCode).toBe(3);
    expect(ambiguous.stderr).toContain("holds 2 projects; pass --project <id>");

    const named = await runCli(["check", root, ...REGISTRY, "--project", "e2e", "--base", "HEAD"]);
    expect(named.exitCode).toBe(1);
    expect(named.stdout).toContain("Project: e2e");
    const unknown = await runCli(["check", root, ...REGISTRY, "--project", "nope", "--base", "HEAD"]);
    expect(unknown.exitCode).toBe(3);
    expect(unknown.stderr).toContain("Project 'nope' is not registered");
  });

  it("report supports the registry in Markdown and JSON", async () => {
    const root = await createCompleteFixture();
    await writeRegistration(root, registration());

    const markdown = await runCli(["report", root, ...REGISTRY, "--base", "HEAD"]);
    expect(markdown.exitCode).toBe(1);
    expect(markdown.stdout).toContain("**Project:** e2e (ACTIVE, criticality LOW, data INTERNAL)");

    const json = await runCli(["report", root, ...REGISTRY, "--format", "json", "--base", "HEAD"]);
    expect(JSON.parse(json.stdout).report.project).toMatchObject({ id: "e2e", status: "ACTIVE" });
  });

  it("rejects an unsupported report format and --format on other commands with exit 3", async () => {
    const root = await createCompleteFixture();
    expect((await runCli(["report", root, "--format", "xml"])).exitCode).toBe(3);
    const wrongCommand = await runCli(["check", root, "--format", "markdown"]);
    expect(wrongCommand.exitCode).toBe(3);
    expect(wrongCommand.stderr).toContain("only supported by the report command");
  });

  async function writeCatalog(root: string, change: (catalog: any) => void = () => {}): Promise<void> {
    const catalog = JSON.parse(await readFile(path.resolve("../model/catalog/organization-controls.json"), "utf8"));
    change(catalog);
    await mkdir(path.join(root, "catalog"), { recursive: true });
    await writeFile(path.join(root, "catalog", "organization-controls.json"), JSON.stringify(catalog));
    // --base HEAD treats untracked files as changes, so commit the catalog like a real one would be.
    for (const args of [["add", "-A"], ["commit", "--quiet", "--allow-empty", "-m", "catalog"]]) {
      const result = await run("git", args, root);
      if (result.exitCode !== 0) throw new Error(`Could not commit the catalog fixture: ${result.stderr}`);
    }
  }
  const CATALOG = ["--catalog", "catalog/organization-controls.json"];

  it("validate --catalog checks the catalog alone, and exits 3 for an invalid or missing one", async () => {
    const root = await createCompleteFixture();
    await writeCatalog(root);
    const ok = await runCli(["validate", root, ...CATALOG]);
    expect(ok.exitCode).toBe(0);
    expect(ok.stdout).toContain("Valid: catalog organization-controls 0.1.0 (39 controls)");

    await writeCatalog(root, (c) => { delete c.controls[0].source_text; });
    const bad = await runCli(["validate", root, ...CATALOG]);
    expect(bad.exitCode).toBe(3);
    expect(bad.stdout).toBe("");
    expect(bad.stderr).toContain("Control catalog schema validation failed");

    const missing = await runCli(["validate", root, "--catalog", "catalog/nope.json"]);
    expect(missing.exitCode).toBe(3);
    expect(missing.stderr).toContain("Control catalog not found");
  });

  it("check --catalog with the draft catalog adds a condition but does not block", async () => {
    const root = await createCompleteFixture();
    await writeCatalog(root);

    const plain = await runCli(["check", root, "--base", "HEAD"]);
    expect(plain.exitCode).toBe(0);

    const result = await runCli(["check", root, ...CATALOG, "--base", "HEAD"]);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Decision: GO_WITH_CONDITIONS");
    expect(result.stdout).toContain("Catalog: organization-controls 0.1.0 (39 controls)");
    expect(result.stdout).toContain("CATALOG:organization-controls:DRAFT-CONTROLS-NOT-DEFINED");
    expect(result.stdout).toContain("39 mandatory DRAFT control(s)");
  });

  it("check --catalog blocks when a catalog control is APPROVED and the pack does not define it", async () => {
    const root = await createCompleteFixture();
    await writeCatalog(root, (c) => {
      Object.assign(c.controls[0], { status: "APPROVED", effective_from: "2026-11-17", owner: { name: "Control Owner" } });
    });
    const result = await runCli(["check", root, ...CATALOG, "--base", "HEAD"]);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toContain("Decision: NO-GO");
    expect(result.stdout).toContain("CATALOG:GOV000-SEC-01:NOT-DEFINED");
  });

  it("report supports the catalog, and --catalog is rejected on analyze", async () => {
    const root = await createCompleteFixture();
    await writeCatalog(root);
    const report = await runCli(["report", root, ...CATALOG, "--base", "HEAD"]);
    expect(report.exitCode).toBe(1);
    expect(report.stdout).toContain("**Catalog:** organization-controls 0.1.0 (39 controls)");

    const analyze = await runCli(["analyze", root, ...CATALOG]);
    expect(analyze.exitCode).toBe(3);
    expect(analyze.stderr).toContain("--catalog is only supported by the validate, check and report commands");
  });

  it("a catalog's NON_EXCEPTIONABLE control cannot be waived by an exception, through the built CLI", async () => {
    const root = await createCompleteFixture();
    const base = pack() as Record<string, any>;
    const waivable = {
      ...base,
      controls: [{ ...base.controls[0], severity: "P2" }],
      evidence: [{ ...base.evidence[0], status: "UNVERIFIED" }],
      exceptions: [{
        id: "EXC-E2E",
        status: "APPROVED",
        control: "E2E-001",
        reason: "Temporary, bounded exception.",
        project_id: "e2e",
        change_id: "CHG-E2E",
        requested_by: "engineering",
        requested_at: "2026-01-01T00:00:00Z",
        approved_by: "security-owner",
        approved_at: "2026-01-02T00:00:00Z",
        expires_at: "2999-01-01T00:00:00Z",
      }],
    };
    await writeFile(path.join(root, ".governance", "governance-pack.json"), JSON.stringify(waivable));

    const catalogWith = (exceptionPolicy: string) => ({
      version: "1.0.0",
      catalog_id: "e2e-catalog",
      catalog_version: "0.1.0",
      description: "E2E catalog.",
      controls: [{
        id: "E2E-001",
        standard_id: "SEC-007",
        standard_version: "1.0.0",
        source_file: "07-security/07-security-engineering-standard.md",
        source_section: "1. Example",
        source_text: "an example requirement",
        title: "Blocker: an example requirement",
        description: "Blocks when this is present: an example requirement.",
        mandatory: true,
        severity: "P2",
        failure_decision: "NO-GO",
        verification_capabilities: [],
        required_evidence_classes: [],
        exception_policy: exceptionPolicy,
        owner: { name: "UNASSIGNED" },
        status: "DRAFT",
      }],
    });
    await mkdir(path.join(root, "catalog"), { recursive: true });

    // Without a catalog the exception waives the control, so the result is conditional.
    const baseline = await runCli(["check", root]);
    expect(baseline.exitCode).toBe(1);
    expect(baseline.stdout).toContain("Decision: GO_WITH_CONDITIONS");
    expect(baseline.stdout).toContain("EXCEPTION:EXC-E2E");

    await writeFile(path.join(root, "catalog", "allowed.json"), JSON.stringify(catalogWith("ALLOWED")));
    const allowed = await runCli(["check", root, "--catalog", "catalog/allowed.json"]);
    expect(allowed.exitCode).toBe(1);

    await writeFile(path.join(root, "catalog", "fixed.json"), JSON.stringify(catalogWith("NON_EXCEPTIONABLE")));
    const blocked = await runCli(["check", root, "--catalog", "catalog/fixed.json"]);
    expect(blocked.exitCode).toBe(2);
    expect(blocked.stdout).toContain("Decision: NO-GO");
    expect(blocked.stdout).toContain("non-exceptionable (EXC-021 section 7)");
  });

  it("an approved authority policy lets a P1 exception waiver hold, through the built CLI", async () => {
    const root = await createCompleteFixture();
    const base = pack() as Record<string, any>;
    // E2E-001 is already P1; make its evidence unverified so only the exception can waive it.
    const p1Waiver = {
      ...base,
      evidence: [{ ...base.evidence[0], status: "UNVERIFIED" }],
      exceptions: [{
        id: "EXC-E2E",
        status: "APPROVED",
        control: "E2E-001",
        reason: "Temporary, bounded exception.",
        project_id: "e2e",
        change_id: "CHG-E2E",
        requested_by: "Rita Requester",
        requested_at: "2026-01-01T00:00:00Z",
        approved_by: "Sam Senior",
        approver_role: "SENIOR_ENGINEERING_AUTHORITY",
        approved_at: "2026-01-02T00:00:00Z",
        expires_at: "2999-01-01T00:00:00Z",
      }],
    };
    await writeFile(path.join(root, ".governance", "governance-pack.json"), JSON.stringify(p1Waiver));

    const policyWith = (status: string, holder: string) => ({
      version: "1.0.0",
      policy_id: "e2e-authority",
      policy_version: "0.1.0",
      description: "E2E policy.",
      roles: [{
        id: "SENIOR_ENGINEERING_AUTHORITY",
        title: "Senior/Staff Engineering authority",
        severities: ["P1", "P2", "P3"],
        source_file: "21-exceptions/21-engineering-exception-standard.md",
        source_section: "15. Approval Authority",
        source_text: "| P1 | Senior/Staff Engineering authority |",
        holders: [{ name: holder }],
        status,
        ...(status === "APPROVED" ? { effective_from: "2026-11-17" } : {}),
      }],
    });
    await mkdir(path.join(root, "authority"), { recursive: true });
    const write = (name: string, value: unknown) => writeFile(path.join(root, "authority", name), JSON.stringify(value));
    await write("approved.json", policyWith("APPROVED", "Sam Senior"));
    await write("draft.json", policyWith("DRAFT", "Sam Senior"));
    await write("other-holder.json", policyWith("APPROVED", "Someone Else"));

    // No policy, or a draft one: a P1 waiver never holds.
    const none = await runCli(["check", root]);
    expect(none.exitCode).toBe(2);
    expect(none.stdout).toContain("without an approved approver-authority policy");
    const draft = await runCli(["check", root, "--authority", "authority/draft.json"]);
    expect(draft.exitCode).toBe(2);
    expect(draft.stdout).toContain("Authority: e2e-authority 0.1.0 (0 of 1 roles approved; none enforced)");

    // An approved policy whose role this approver holds: the waiver holds, visibly, as a condition.
    const ok = await runCli(["check", root, "--authority", "authority/approved.json"]);
    expect(ok.exitCode).toBe(1);
    expect(ok.stdout).toContain("Decision: GO_WITH_CONDITIONS");
    expect(ok.stdout).toContain("Authority: e2e-authority 0.1.0 (1 of 1 roles approved)");
    expect(ok.stdout).toContain("authority role SENIOR_ENGINEERING_AUTHORITY");

    // The same policy, but this approver is not a holder: refused.
    const other = await runCli(["check", root, "--authority", "authority/other-holder.json"]);
    expect(other.exitCode).toBe(2);
    expect(other.stdout).toContain("is not a holder of role SENIOR_ENGINEERING_AUTHORITY");
  });

  it("validate --authority checks the policy alone, and the flag is rejected on analyze", async () => {
    const root = await createCompleteFixture();
    const committed = await readFile(path.resolve("../model/authority/organization-authority.json"), "utf8");
    await mkdir(path.join(root, "authority"), { recursive: true });
    await writeFile(path.join(root, "authority", "policy.json"), committed);

    const ok = await runCli(["validate", root, "--authority", "authority/policy.json"]);
    expect(ok.exitCode).toBe(0);
    expect(ok.stdout).toContain("Valid: authority policy organization-authority 0.1.0 (3 roles, 0 approved)");

    const broken = JSON.parse(committed);
    broken.roles[0].severities = ["P0"];
    await writeFile(path.join(root, "authority", "policy.json"), JSON.stringify(broken));
    const bad = await runCli(["validate", root, "--authority", "authority/policy.json"]);
    expect(bad.exitCode).toBe(3);
    expect(bad.stdout).toBe("");
    expect(bad.stderr).toContain("Authority policy schema validation failed");

    const missing = await runCli(["validate", root, "--authority", "authority/nope.json"]);
    expect(missing.exitCode).toBe(3);
    expect(missing.stderr).toContain("Authority policy not found");

    const analyze = await runCli(["analyze", root, "--authority", "authority/policy.json"]);
    expect(analyze.exitCode).toBe(3);
    expect(analyze.stderr).toContain("--authority is only supported by the validate, check and report commands");
  });

  it("reports partial analysis in JSON and exits with the documented conditional status", async () => {
    const root = await createRoot("governance-cli-partial-");
    await writeFile(path.join(root, "main.go"), "package main\nfunc main() {}\n");

    const result = await runCli(["analyze", root, "--json"]);
    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout) as { context: { analysisStatus: string; unsupportedCapabilities: string[] } };
    expect(parsed.context.analysisStatus).toBe("PARTIAL");
    expect(parsed.context.unsupportedCapabilities).toContain("language-specific-analysis:go");
  });

  const invalidGovernanceInputs: Array<[string, (root: string) => Promise<string[]>, string]> = [
    ["a schema-invalid pack", async (root) => {
      const { project: _project, ...withoutProject } = pack();
      await writeFile(path.join(root, ".governance", "governance-pack.json"), JSON.stringify(withoutProject));
      return [];
    }, "required property 'project'"],
    ["a pack with a dangling standard reference", async (root) => {
      const dangling = {
        ...pack(),
        controls: [{ id: "C-1", standard: "NO-SUCH-STD", title: "t", severity: "P1", applies_when: [], required_evidence: [] }],
      };
      await writeFile(path.join(root, ".governance", "governance-pack.json"), JSON.stringify(dangling));
      return [];
    }, "NO-SUCH-STD"],
    ["a pack with duplicate evidence IDs", async (root) => {
      const item = { id: "EVD-1", type: "E3_AUTOMATED_ANALYSIS", status: "VERIFIED", description: "d", source: "s", freshness: "current", supports_controls: [] };
      await writeFile(path.join(root, ".governance", "governance-pack.json"), JSON.stringify({ ...pack(), evidence: [item, item] }));
      return [];
    }, "EVD-1"],
    ["a missing governance pack", async (root) => {
      await rm(path.join(root, ".governance", "governance-pack.json"));
      return [];
    }, "Governance CLI error:"],
    ["a malformed architecture profile", async (root) => {
      await mkdir(path.join(root, ".governance", "profiles"), { recursive: true });
      await writeFile(path.join(root, ".governance", "profiles", "bad.json"), '{"unexpected":true}');
      return ["--profile", ".governance/profiles/bad.json"];
    }, "Architecture profile validation failed"],
    ["a missing architecture profile", async () => ["--profile", ".governance/profiles/absent.json"], "Governance CLI error:"],
    ["a profile path that escapes the repository", async () => ["--profile", "../outside.json"], "Governance CLI error:"],
  ];

  it.each(invalidGovernanceInputs)(
    "exits 3 with a diagnostic and no decision output for %s in human and JSON modes",
    async (_label, arrange, diagnostic) => {
      const root = await createRoot("governance-cli-invalid-");
      await mkdir(path.join(root, ".governance"), { recursive: true });
      await writeFile(path.join(root, ".governance", "governance-pack.json"), JSON.stringify(pack()));
      const extraArgs = await arrange(root);

      for (const mode of [[], ["--json"]]) {
        const result = await runCli(["check", root, ...extraArgs, ...mode]);
        expect(result.exitCode).toBe(3);
        expect(result.stdout).toBe("");
        expect(result.stderr).toContain("Governance CLI error:");
        expect(result.stderr).toContain(diagnostic);
      }
    },
  );

  it("exits 3 when the repository root is a file, in human and JSON modes", async () => {
    const root = await createRoot("governance-cli-rootfile-");
    const file = path.join(root, "not-a-directory.txt");
    await writeFile(file, "x");

    for (const mode of [[], ["--json"]]) {
      const result = await runCli(["analyze", file, ...mode]);
      expect(result.exitCode).toBe(3);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("not a directory");
    }
  });

  it("renders the same NO-GO decision in human and JSON output", async () => {
    const root = await createCompleteFixture();
    await writeFile(path.join(root, ".governance", "governance-pack.json"), JSON.stringify(pack(true)));

    const human = await runCli(["check", root]);
    const json = await runCli(["check", root, "--json"]);

    expect(human.exitCode).toBe(2);
    expect(json.exitCode).toBe(2);
    expect(human.stdout).toContain("Decision: NO-GO");
    expect(JSON.parse(json.stdout).evaluation.decision.status).toBe("NO-GO");
  });
});
