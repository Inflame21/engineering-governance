import { describe, expect, it } from "vitest";
import { validateGovernancePackSemantics } from "../src/validation.js";
import type { GovernancePack } from "../src/types.js";

const validPack: GovernancePack = {
  version: "1.0.0",
  project: {
    id: "example",
    name: "Example",
    repository: "example/repo",
    environment: "production",
  },
  change: {
    id: "CHG-1",
    type: "feature",
    title: "Example change",
    risk_class: "B",
    files: ["src/example.ts"],
  },
  standards: [{
    id: "SEC-007",
    title: "Security",
    version: "1.0.0",
    source: "07-security/security.md",
  }],
  controls: [{
    id: "SEC-AUTH-001",
    standard: "SEC-007",
    title: "Protected resources require authorization",
    severity: "P1",
    required_evidence: ["EVD-AUTH"],
    failure_decision: "NO-GO",
  }],
  evidence: [{
    id: "EVD-AUTH",
    type: "E3_AUTOMATED_ANALYSIS",
    status: "VERIFIED",
    description: "Authorization was verified.",
    source: "test",
    freshness: "current",
    supports_controls: ["SEC-AUTH-001"],
  }],
  risks: [],
  decisions: [{
    id: "DEC-1",
    type: "PRODUCTION",
    status: "GO",
    evidence: ["EVD-AUTH"],
  }],
  findings: [{
    id: "FND-1",
    rule_id: "SEC-AUTH-001",
    severity: "P1",
    category: "security",
    message: "Authorization evidence is present.",
    status: "RESOLVED",
    evidence_refs: ["EVD-AUTH"],
  }],
  exceptions: [],
  debt: [],
};

describe("governance pack semantic validation", () => {
  it("accepts valid cross-references", () => {
    expect(validateGovernancePackSemantics(validPack)).toEqual([]);
  });

  it("reports dangling standards, evidence, and control references", () => {
    const invalidPack: GovernancePack = {
      ...validPack,
      controls: [{
        ...validPack.controls[0]!,
        standard: "SEC-UNKNOWN",
        required_evidence: ["EVD-MISSING"],
      }],
      evidence: [{
        ...validPack.evidence[0]!,
        supports_controls: ["SEC-UNKNOWN-CONTROL"],
      }],
      decisions: [{
        ...validPack.decisions[0]!,
        evidence: ["EVD-MISSING"],
      }],
      findings: [{
        ...validPack.findings![0]!,
        evidence_refs: ["EVD-MISSING"],
      }],
      exceptions: [{
        id: "EXC-1",
        status: "APPROVED",
        control: "SEC-UNKNOWN-CONTROL",
      }],
    };

    const issues = validateGovernancePackSemantics(invalidPack);
    expect(issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "UNKNOWN_STANDARD",
      "UNKNOWN_EVIDENCE",
      "UNKNOWN_CONTROL",
    ]));
  });


  it("rejects accepted risks without auditable, unexpired acceptance metadata", () => {
    const invalidPack: GovernancePack = {
      ...validPack,
      risks: [{
        id: "RSK-1",
        severity: "P1",
        title: "Unverified acceptance",
        status: "ACCEPTED",
      }],
    };

    expect(validateGovernancePackSemantics(invalidPack, "2026-10-13T00:00:00Z").map((issue) => issue.code))
      .toContain("INVALID_RISK_ACCEPTANCE");
  });

  it("rejects approved exceptions outside the active project/change scope", () => {
    const invalidPack: GovernancePack = {
      ...validPack,
      exceptions: [{
        id: "EXC-1",
        status: "APPROVED",
        control: "SEC-AUTH-001",
        reason: "Temporary exception.",
        project_id: "other-project",
        change_id: "CHG-1",
        requested_by: "engineering",
        requested_at: "2026-10-10T00:00:00Z",
        approved_by: "security-owner",
        approved_at: "2026-10-11T00:00:00Z",
        expires_at: "2026-10-20T00:00:00Z",
      }],
    };

    expect(validateGovernancePackSemantics(invalidPack, "2026-10-13T00:00:00Z").map((issue) => issue.code))
      .toContain("INVALID_EXCEPTION");
  });

  it("reports duplicate IDs within a collection", () => {
    const invalidPack: GovernancePack = {
      ...validPack,
      risks: [
        { id: "RSK-1", severity: "P2", title: "First", status: "OPEN" },
        { id: "RSK-1", severity: "P3", title: "Duplicate", status: "OPEN" },
      ],
    };

    expect(validateGovernancePackSemantics(invalidPack)).toEqual([
      expect.objectContaining({
        code: "DUPLICATE_ID",
        path: "/risks/1/id",
      }),
    ]);
  });
});
