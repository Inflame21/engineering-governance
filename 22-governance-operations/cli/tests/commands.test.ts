import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runAnalyzeCommand, runGovernanceCommand } from "../src/commands.js";
import type { GovernancePack } from "../../engine/src/types.js";
import type { AuthorityPolicy, CatalogControl, ControlCatalog, ProjectRegistration } from "../src/config.js";

const pack: GovernancePack = {
  version: "1.0.0",
  project: { id: "demo", name: "Demo", repository: "demo/repo", environment: "production" },
  change: { id: "CHG-1", type: "feature", title: "API change", risk_class: "B", files: ["main.py"] },
  standards: [{
    id: "API-006",
    title: "API Governance",
    version: "1.0.0",
    source: "06-api/06-api-governance-standard.md",
  }],
  controls: [{
    id: "API-001",
    standard: "API-006",
    title: "API changes require API capability",
    severity: "P1",
    applies_when: ["capability:http-api"],
    required_evidence: ["EVD-API-CAPABILITY"],
    failure_decision: "NO-GO",
  }],
  evidence: [{
    id: "EVD-API-CAPABILITY",
    type: "E3_AUTOMATED_ANALYSIS",
    status: "VERIFIED",
    description: "API capability detected from the declared framework dependency.",
    source: "test",
    freshness: "current",
    supports_controls: ["API-001"],
  }],
  risks: [],
  decisions: [],
};

describe("analyze command", () => {



  it("blocks approval when the declared change files differ from the verified Git diff", async () => {
    const result = await runGovernanceCommand({
      snapshot: {
        rootPath: "/repo",
        changedFiles: ["src/changed.py"],
        changeScope: {
          status: "VERIFIED",
          baseRef: "origin/main",
          headRef: "head-sha",
          files: ["src/changed.py"],
        },
        files: ["main.py", "src/changed.py", "pyproject.toml"],
        fileContents: {
          "pyproject.toml": '[project]\\ndependencies = ["fastapi>=0.115"]',
          "main.py": "print('ok')",
          "src/changed.py": "print('changed')",
        },
      },
      governancePack: pack,
    });

    expect(result.evaluation.decision.status).toBe("NO-GO");
    expect(result.evaluation.decision.blockingViolations.some(
      (item) => item.controlId === "CHANGE-SCOPE:DECLARATION-MISMATCH",
    )).toBe(true);
    expect(result.evaluation.decision.reason).toContain("does not match the verified diff");
  });


  it("allows an unconditional decision when the verified Git scope matches the change manifest", async () => {
    const result = await runGovernanceCommand({
      snapshot: {
        rootPath: "/repo",
        changedFiles: ["main.py"],
        changeScope: {
          status: "VERIFIED",
          baseRef: "origin/main",
          headRef: "head-sha",
          files: ["main.py"],
        },
        files: ["main.py", "routers/users.py", "pyproject.toml"],
        fileContents: {
          "pyproject.toml": '[project]\ndependencies = ["fastapi>=0.115"]',
          "main.py": "print('ok')",
          "routers/users.py": "from fastapi import APIRouter",
        },
      },
      governancePack: pack,
    });

    expect(result.evaluation.decision.status).toBe("GO");
    expect(result.evaluation.decision.warnings).toEqual([]);
  });

  it("adds executed Python syntax evidence to the governance assessment when explicitly enabled", async () => {
    const result = await runGovernanceCommand({
      snapshot: {
        rootPath: "/repo",
        changedFiles: [],
        files: ["main.py", "routers/users.py", "pyproject.toml"],
        fileContents: {
          "pyproject.toml": '[project]\\ndependencies = ["fastapi>=0.115"]',
          "main.py": "print('ok')",
          "routers/users.py": "from fastapi import APIRouter",
        },
      },
      governancePack: pack,
      verificationRunner: {
        async isAvailable(tool) {
          return tool === "python3";
        },
        async run() {
          return {
            exitCode: 0,
            stdout: JSON.stringify({ errors: [] }),
            stderr: "",
          };
        },
      },
    });

    expect(result.analysis.verification?.results[0]?.status).toBe("PASS");
    expect(result.analysis.evidence.some((item) => item.id === "EVD-PYTHON-SYNTAX")).toBe(true);
    expect(result.evaluation.decision.status).toBe("GO_WITH_CONDITIONS");
  });

  it("blocks production when an opt-in verification tool finds a syntax error", async () => {
    const result = await runGovernanceCommand({
      snapshot: {
        rootPath: "/repo",
        changedFiles: [],
        files: ["main.py", "routers/users.py", "pyproject.toml"],
        fileContents: {
          "pyproject.toml": '[project]\\ndependencies = ["fastapi>=0.115"]',
          "main.py": "if True print('broken')",
          "routers/users.py": "from fastapi import APIRouter",
        },
      },
      governancePack: pack,
      verificationRunner: {
        async isAvailable(tool) {
          return tool === "python3";
        },
        async run() {
          return {
            exitCode: 1,
            stdout: JSON.stringify({
              errors: [{ file: "main.py", line: 1, message: "invalid syntax" }],
            }),
            stderr: "",
          };
        },
      },
    });

    expect(result.analysis.verification?.results[0]?.status).toBe("FAIL");
    expect(result.evaluation.decision.status).toBe("NO-GO");
    expect(result.evaluation.decision.blockingViolations.some(
      (item) => item.controlId.startsWith("FINDING:FND-PY-SYNTAX-"),
    )).toBe(true);
  });

  it("blocks approval when a selected architecture profile requires missing governance controls", async () => {
    const result = await runGovernanceCommand({
      snapshot: {
        rootPath: "/repo",
        changedFiles: [],
        files: ["src/domain/user.ts"],
        fileContents: { "src/domain/user.ts": "export const user = true;" },
      },
      governancePack: pack,
      architectureProfile: {
        id: "clean-architecture",
        version: "1.0.0",
        name: "Clean Architecture",
        styles: ["clean-architecture"],
        boundaryRules: [],
        requiredControls: ["ARCH-REQUIRED-001"],
      },
    });

    expect(result.evaluation.decision.status).toBe("NO-GO");
    expect(result.evaluation.decision.blockingViolations.some(
      (item) => item.controlId === "PROFILE:clean-architecture:REQUIRED-CONTROL:ARCH-REQUIRED-001",
    )).toBe(true);
  });

  it("connects repository analysis to governance evaluation", async () => {
    const result = await runAnalyzeCommand({
      snapshot: {
        rootPath: "/repo",
        changedFiles: ["main.py"],
        files: ["main.py", "routers/users.py", "pyproject.toml"],
        fileContents: {
          "pyproject.toml": '[project]\ndependencies = ["fastapi>=0.115"]',
        },
      },
      governancePack: pack,
    });

    expect(result).toContain("Decision: GO_WITH_CONDITIONS");
    expect(result).toContain("CHANGE-SCOPE:NOT-REQUESTED");
    expect(result).toContain("fastapi");
    expect(result).toContain("Blocking violations: 0");
  });
});

describe("registry ownership gap", () => {
  const example = JSON.parse(
    readFileSync(new URL("../../model/example-project-registration.json", import.meta.url), "utf8"),
  ) as ProjectRegistration;
  const registration = (owners: Partial<ProjectRegistration["owners"]> = {}): ProjectRegistration => ({
    ...example,
    id: "demo",
    repositories: [{ name: "demo/repo" }],
    owners: {
      technical_owner: { name: "Tech Owner" },
      governance_representative: { name: "Gov Rep" },
      escalation_contact: { name: "Escalation" },
      ...owners,
    },
  });
  const snapshot = {
    rootPath: "/repo",
    changedFiles: ["main.py"],
    changeScope: { status: "VERIFIED" as const, baseRef: "origin/main", headRef: "head-sha", files: ["main.py"] },
    files: ["main.py", "routers/users.py", "pyproject.toml"],
    fileContents: {
      "pyproject.toml": '[project]\ndependencies = ["fastapi>=0.115"]',
      "main.py": "print('ok')",
      "routers/users.py": "from fastapi import APIRouter",
    },
  };

  it("keeps an unconditional GO when every accountable owner is named", async () => {
    const result = await runGovernanceCommand({ snapshot, governancePack: pack, registration: registration() });
    expect(result.evaluation.decision.status).toBe("GO");
    expect(result.evaluation.decision.warnings).toEqual([]);
    expect(result.output).toContain("Project: demo (ONBOARDING");
  });

  it.each([
    ["technical owner", { technical_owner: { name: "UNASSIGNED" } }],
    ["governance representative", { governance_representative: { name: "UNASSIGNED" } }],
  ])("downgrades GO to GO_WITH_CONDITIONS when the %s is UNASSIGNED", async (role, owners) => {
    const result = await runGovernanceCommand({ snapshot, governancePack: pack, registration: registration(owners) });
    const { decision } = result.evaluation;
    expect(decision.status).toBe("GO_WITH_CONDITIONS");
    expect(decision.blockingViolations).toEqual([]);
    expect(decision.warnings.map((w) => w.controlId)).toEqual(["REGISTRY:demo:OWNERSHIP-GAP"]);
    expect(decision.warnings[0]?.message).toContain(role);
    expect(decision.reason).toContain("Registry ownership gap");
  });

  it("does not hide a NO-GO behind the ownership gap, and still reports the gap", async () => {
    const blocked = { ...pack, risks: [{ id: "RSK-1", severity: "P1" as const, title: "Open risk", status: "OPEN" as const }] };
    const result = await runGovernanceCommand({
      snapshot,
      governancePack: blocked,
      registration: registration({ technical_owner: { name: "UNASSIGNED" } }),
    });
    expect(result.evaluation.decision.status).toBe("NO-GO");
    expect(result.evaluation.decision.warnings.map((w) => w.controlId)).toContain("REGISTRY:demo:OWNERSHIP-GAP");
  });

  it("is unchanged when no registration is supplied", async () => {
    const result = await runGovernanceCommand({ snapshot, governancePack: pack });
    expect(result.evaluation.decision.status).toBe("GO");
    expect(result.output).not.toContain("Project:");
  });

  it("labels the project in markdown and JSON output", async () => {
    const markdown = await runGovernanceCommand({ snapshot, governancePack: pack, registration: registration(), markdown: true });
    expect(markdown.output).toContain("**Project:** demo (ONBOARDING, criticality HIGH, data CONFIDENTIAL)");
    const json = await runGovernanceCommand({ snapshot, governancePack: pack, registration: registration(), json: true });
    expect(JSON.parse(json.output).report.project).toMatchObject({ id: "demo", status: "ONBOARDING", criticality: "HIGH" });
  });
});

describe("control catalog", () => {
  const snapshot = {
    rootPath: "/repo",
    changedFiles: ["main.py"],
    changeScope: { status: "VERIFIED" as const, baseRef: "origin/main", headRef: "head-sha", files: ["main.py"] },
    files: ["main.py", "routers/users.py", "pyproject.toml"],
    fileContents: {
      "pyproject.toml": '[project]\ndependencies = ["fastapi>=0.115"]',
      "main.py": "print('ok')",
      "routers/users.py": "from fastapi import APIRouter",
    },
  };
  const control = (overrides: Partial<CatalogControl> = {}): CatalogControl => ({
    id: "API-001",
    standard_id: "API-006",
    standard_version: "1.0.0",
    source_file: "06-api/06-api-governance-standard.md",
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
  });
  const catalog = (...controls: CatalogControl[]): ControlCatalog => ({
    version: "1.0.0",
    catalog_id: "test-catalog",
    catalog_version: "0.1.0",
    description: "Test catalog.",
    controls,
  });
  const approved = { status: "APPROVED" as const, effective_from: "2026-11-17", owner: { name: "Control Owner" } };

  it("is unchanged when no catalog is supplied", async () => {
    const result = await runGovernanceCommand({ snapshot, governancePack: pack });
    expect(result.evaluation.decision.status).toBe("GO");
    expect(result.output).not.toContain("Catalog:");
  });

  it("keeps GO when the pack defines every approved control without weakening it", async () => {
    const result = await runGovernanceCommand({ snapshot, governancePack: pack, controlCatalog: catalog(control(approved)) });
    expect(result.evaluation.decision.status).toBe("GO");
    expect(result.evaluation.decision.warnings).toEqual([]);
    expect(result.output).toContain("Catalog: test-catalog 0.1.0 (1 controls)");
  });

  it("downgrades GO to GO_WITH_CONDITIONS for DRAFT controls the pack does not define, without blocking", async () => {
    const result = await runGovernanceCommand({ snapshot, governancePack: pack, controlCatalog: catalog(control({ id: "NEW-001" })) });
    const { decision } = result.evaluation;
    expect(decision.status).toBe("GO_WITH_CONDITIONS");
    expect(decision.blockingViolations).toEqual([]);
    expect(decision.warnings.map((w) => w.controlId)).toEqual(["CATALOG:test-catalog:DRAFT-CONTROLS-NOT-DEFINED"]);
    expect(decision.reason).toContain("Draft catalog controls are not satisfied");
  });

  it("blocks when an APPROVED control is missing from the pack", async () => {
    const result = await runGovernanceCommand({ snapshot, governancePack: pack, controlCatalog: catalog(control({ id: "NEW-001", ...approved })) });
    const { decision } = result.evaluation;
    expect(decision.status).toBe("NO-GO");
    expect(decision.blockingViolations.map((v) => v.controlId)).toEqual(["CATALOG:NEW-001:NOT-DEFINED"]);
    expect(decision.reason).toContain("APPROVED catalog control(s) are missing from, or weakened by");
  });

  it("blocks when the pack weakens an APPROVED control", async () => {
    const result = await runGovernanceCommand({ snapshot, governancePack: pack, controlCatalog: catalog(control({ severity: "P0", ...approved })) });
    expect(result.evaluation.decision.status).toBe("NO-GO");
    expect(result.evaluation.decision.blockingViolations.map((v) => v.controlId)).toEqual(["CATALOG:API-001:WEAKENED"]);
  });

  it("never softens a NO-GO, and still reports the draft conditions", async () => {
    const blocked = { ...pack, risks: [{ id: "RSK-1", severity: "P1" as const, title: "Open risk", status: "OPEN" as const }] };
    const result = await runGovernanceCommand({ snapshot, governancePack: blocked, controlCatalog: catalog(control({ id: "NEW-001" })) });
    expect(result.evaluation.decision.status).toBe("NO-GO");
    expect(result.evaluation.decision.warnings.map((w) => w.controlId)).toContain("CATALOG:test-catalog:DRAFT-CONTROLS-NOT-DEFINED");
  });

  it("records the catalog in markdown and JSON output", async () => {
    const markdown = await runGovernanceCommand({ snapshot, governancePack: pack, controlCatalog: catalog(control(approved)), markdown: true });
    expect(markdown.output).toContain("**Catalog:** test-catalog 0.1.0 (1 controls)");
    const json = await runGovernanceCommand({ snapshot, governancePack: pack, controlCatalog: catalog(control(approved)), json: true });
    expect(JSON.parse(json.output).report.catalog).toEqual({ id: "test-catalog", version: "0.1.0", controls: 1 });
  });
});

describe("non-exceptionable catalog controls", () => {
  const snapshot = {
    rootPath: "/repo",
    changedFiles: ["main.py"],
    changeScope: { status: "VERIFIED" as const, baseRef: "origin/main", headRef: "head-sha", files: ["main.py"] },
    files: ["main.py", "routers/users.py", "pyproject.toml"],
    fileContents: {
      "pyproject.toml": '[project]\ndependencies = ["fastapi>=0.115"]',
      "main.py": "print('ok')",
      "routers/users.py": "from fastapi import APIRouter",
    },
  };
  // API-001 is an unverified P2 control with a complete, current exception: waivable on its own.
  const waivable: GovernancePack = {
    ...pack,
    controls: [{ ...pack.controls[0]!, severity: "P2" }],
    evidence: [{ ...pack.evidence[0]!, status: "UNVERIFIED" }],
    exceptions: [{
      id: "EXC-1",
      status: "APPROVED",
      control: "API-001",
      reason: "Temporary, bounded exception.",
      project_id: "demo",
      change_id: "CHG-1",
      requested_by: "engineering",
      requested_at: "2026-01-01T00:00:00Z",
      approved_by: "security-owner",
      approved_at: "2026-01-02T00:00:00Z",
      expires_at: "2999-01-01T00:00:00Z",
    }],
  };
  const control = (overrides: Partial<CatalogControl> = {}): CatalogControl => ({
    id: "API-001",
    standard_id: "API-006",
    standard_version: "1.0.0",
    source_file: "06-api/06-api-governance-standard.md",
    source_section: "1. Example",
    source_text: "an example requirement",
    title: "Blocker: an example requirement",
    description: "Blocks when this is present: an example requirement.",
    mandatory: true,
    severity: "P2",
    failure_decision: "NO-GO",
    verification_capabilities: [],
    required_evidence_classes: [],
    exception_policy: "ALLOWED",
    owner: { name: "UNASSIGNED" },
    status: "DRAFT",
    ...overrides,
  });
  const catalog = (entry: CatalogControl): ControlCatalog => ({
    version: "1.0.0",
    catalog_id: "test-catalog",
    catalog_version: "0.1.0",
    description: "Test catalog.",
    controls: [entry],
  });

  it("baseline: without a catalog the exception waives the control", async () => {
    const result = await runGovernanceCommand({ snapshot, governancePack: waivable });
    expect(result.evaluation.decision.status).toBe("GO_WITH_CONDITIONS");
    expect(result.evaluation.decision.blockingViolations).toEqual([]);
  });

  it("an ALLOWED catalog control can still be waived", async () => {
    const result = await runGovernanceCommand({ snapshot, governancePack: waivable, controlCatalog: catalog(control()) });
    expect(result.evaluation.decision.status).toBe("GO_WITH_CONDITIONS");
  });

  it.each(["DRAFT", "APPROVED"] as const)("a NON_EXCEPTIONABLE %s catalog control can never be waived", async (status) => {
    const entry = control({
      exception_policy: "NON_EXCEPTIONABLE",
      status,
      ...(status === "APPROVED" ? { effective_from: "2026-11-17", owner: { name: "Control Owner" } } : {}),
    });
    const result = await runGovernanceCommand({ snapshot, governancePack: waivable, controlCatalog: catalog(entry) });
    const { decision } = result.evaluation;
    expect(decision.status).toBe("NO-GO");
    expect(decision.blockingViolations.map((v) => v.controlId)).toContain("API-001");
    expect(decision.warnings.find((w) => w.controlId === "EXCEPTION:EXC-1")?.message).toContain("non-exceptionable (EXC-021 section 7)");
  });

  it("ignores a NON_EXCEPTIONABLE control that is RETIRED or DEPRECATED", async () => {
    for (const status of ["RETIRED", "DEPRECATED"] as const) {
      const entry = control({ exception_policy: "NON_EXCEPTIONABLE", status, ...(status === "RETIRED" ? { retired_at: "2026-11-17" } : {}) });
      const result = await runGovernanceCommand({ snapshot, governancePack: waivable, controlCatalog: catalog(entry) });
      expect(result.evaluation.decision.status).toBe("GO_WITH_CONDITIONS");
    }
  });

  it("lists the non-exceptionable ids in the JSON report context", async () => {
    const entry = control({ exception_policy: "NON_EXCEPTIONABLE" });
    const result = await runGovernanceCommand({ snapshot, governancePack: waivable, controlCatalog: catalog(entry), json: true });
    expect(JSON.parse(result.output).context.nonExceptionableControls).toEqual(["API-001"]);
  });
});

describe("approver authority", () => {
  const snapshot = {
    rootPath: "/repo",
    changedFiles: ["main.py"],
    changeScope: { status: "VERIFIED" as const, baseRef: "origin/main", headRef: "head-sha", files: ["main.py"] },
    files: ["main.py", "routers/users.py", "pyproject.toml"],
    fileContents: {
      "pyproject.toml": '[project]\ndependencies = ["fastapi>=0.115"]',
      "main.py": "print('ok')",
      "routers/users.py": "from fastapi import APIRouter",
    },
  };
  // API-001 is an unverified P1 control with a complete, current exception naming an authority role.
  const p1Waiver = (overrides: Record<string, unknown> = {}): GovernancePack => ({
    ...pack,
    evidence: [{ ...pack.evidence[0]!, status: "UNVERIFIED" }],
    exceptions: [{
      id: "EXC-1",
      status: "APPROVED",
      control: "API-001",
      reason: "Temporary, bounded exception.",
      project_id: "demo",
      change_id: "CHG-1",
      requested_by: "Rita Requester",
      requested_at: "2026-01-01T00:00:00Z",
      approved_by: "Sam Senior",
      approver_role: "SENIOR_ENGINEERING_AUTHORITY",
      approved_at: "2026-01-02T00:00:00Z",
      expires_at: "2999-01-01T00:00:00Z",
      ...overrides,
    }],
  });
  const policy = (status: "DRAFT" | "APPROVED", holder = "Sam Senior"): AuthorityPolicy => ({
    version: "1.0.0",
    policy_id: "test-authority",
    policy_version: "0.1.0",
    description: "Test policy.",
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

  it("baseline: a P1 waiver is refused when no authority policy is supplied", async () => {
    const result = await runGovernanceCommand({ snapshot, governancePack: p1Waiver() });
    expect(result.evaluation.decision.status).toBe("NO-GO");
    expect(result.output).not.toContain("Authority:");
  });

  it("a DRAFT policy confers nothing: the waiver is still refused, and the report says none is enforced", async () => {
    const result = await runGovernanceCommand({ snapshot, governancePack: p1Waiver(), authorityPolicy: policy("DRAFT") });
    expect(result.evaluation.decision.status).toBe("NO-GO");
    expect(result.output).toContain("Authority: test-authority 0.1.0 (0 of 1 roles approved; none enforced)");
  });

  it("an APPROVED policy lets a holder's P1 waiver hold, as a visible condition", async () => {
    const result = await runGovernanceCommand({ snapshot, governancePack: p1Waiver(), authorityPolicy: policy("APPROVED") });
    const { decision } = result.evaluation;
    expect(decision.status).toBe("GO_WITH_CONDITIONS");
    expect(decision.blockingViolations).toEqual([]);
    expect(decision.warnings.find((w) => w.controlId === "EXCEPTION:EXC-1")?.message).toContain("authority role SENIOR_ENGINEERING_AUTHORITY");
    expect(result.output).toContain("Authority: test-authority 0.1.0 (1 of 1 roles approved)");
  });

  it("an APPROVED policy still refuses an approver who is not a holder", async () => {
    const result = await runGovernanceCommand({ snapshot, governancePack: p1Waiver(), authorityPolicy: policy("APPROVED", "Someone Else") });
    expect(result.evaluation.decision.status).toBe("NO-GO");
    expect(result.evaluation.decision.warnings.find((w) => w.controlId === "EXCEPTION:EXC-1")?.message).toContain("is not a holder");
  });

  it("an APPROVED policy never lets the requester approve their own exception", async () => {
    const result = await runGovernanceCommand({
      snapshot,
      governancePack: p1Waiver({ requested_by: "Sam Senior" }),
      authorityPolicy: policy("APPROVED"),
    });
    expect(result.evaluation.decision.status).toBe("NO-GO");
  });

  it("records the policy in markdown and JSON output", async () => {
    const markdown = await runGovernanceCommand({ snapshot, governancePack: p1Waiver(), authorityPolicy: policy("APPROVED"), markdown: true });
    expect(markdown.output).toContain("**Authority:** test-authority 0.1.0 (1 of 1 roles approved)");
    const json = await runGovernanceCommand({ snapshot, governancePack: p1Waiver(), authorityPolicy: policy("APPROVED"), json: true });
    expect(JSON.parse(json.output).report.authority).toEqual({ id: "test-authority", version: "0.1.0", roles: 1, approved: 1 });
    expect(JSON.parse(json.output).context.approverAuthority).toEqual([
      { role: "SENIOR_ENGINEERING_AUTHORITY", severities: ["P1", "P2", "P3"], holders: ["Sam Senior"] },
    ]);
  });
});
