import { describe, expect, it } from "vitest";
import { loadArchitectureProfile, loadGovernancePack } from "../src/config.js";
import cleanArchitecture from "../../model/architecture-profile-clean-architecture.json" with { type: "json" };
import examplePack from "../../model/example-governance-pack.json" with { type: "json" };

function memoryFileSystem(content: string | undefined, profileContent?: string) {
  return {
    async readTextFile(_rootPath: string, path: string) {
      if (path === "governance.json") return content;
      if (path === "architecture.json") return profileContent;
      return undefined;
    },
  };
}

describe("governance pack loader", () => {
  it("loads a schema-valid pack with valid semantic references", async () => {
    const pack = await loadGovernancePack(
      "/repo",
      "governance.json",
      memoryFileSystem(JSON.stringify(examplePack)),
    );

    expect(pack.project.id).toBe(examplePack.project.id);
    expect(pack.controls).toHaveLength(examplePack.controls.length);
  });


  it("accepts structured provenance metadata on generated evidence", async () => {
    const candidate = JSON.parse(JSON.stringify(examplePack)) as {
      evidence: Array<Record<string, unknown>>;
    };
    Object.assign(candidate.evidence[0]!, {
      tool_version: "TypeScript 5.9.2",
      generated_at: "2026-10-13T08:00:00.000Z",
      repository_fingerprint: `sha256:${"a".repeat(64)}`,
      duration_ms: 1200,
      exit_code: 0,
      command: ["tsc", "--noEmit"],
    });

    const pack = await loadGovernancePack(
      "/repo",
      "governance.json",
      memoryFileSystem(JSON.stringify(candidate)),
    );
    expect(pack.evidence[0]?.tool_version).toBe("TypeScript 5.9.2");
    expect(pack.evidence[0]?.repository_fingerprint).toBe(`sha256:${"a".repeat(64)}`);
  });


  it("validates freshness states and maximum evidence age policies", async () => {
    const candidate = JSON.parse(JSON.stringify(examplePack)) as {
      controls: Array<Record<string, unknown>>;
      evidence: Array<Record<string, unknown>>;
    };
    candidate.controls[0]!["max_evidence_age_seconds"] = 3600;
    candidate.evidence[0]!["freshness_status"] = "current";

    const pack = await loadGovernancePack(
      "/repo",
      "governance.json",
      memoryFileSystem(JSON.stringify(candidate)),
    );
    expect(pack.controls[0]?.max_evidence_age_seconds).toBe(3600);

    candidate.evidence[0]!["freshness_status"] = "brand-new";
    await expect(
      loadGovernancePack("/repo", "governance.json", memoryFileSystem(JSON.stringify(candidate))),
    ).rejects.toThrow("schema validation failed");
  });

  it("rejects a missing governance pack", async () => {
    await expect(
      loadGovernancePack("/repo", "governance.json", memoryFileSystem(undefined)),
    ).rejects.toThrow("Governance pack not found");
  });

  it("rejects malformed JSON", async () => {
    await expect(
      loadGovernancePack("/repo", "governance.json", memoryFileSystem("{not-json")),
    ).rejects.toThrow("not valid JSON");
  });

  it("rejects structurally invalid governance packs", async () => {
    const invalid = JSON.parse(JSON.stringify(examplePack)) as Record<string, unknown>;
    invalid["version"] = 12;

    await expect(
      loadGovernancePack("/repo", "governance.json", memoryFileSystem(JSON.stringify(invalid))),
    ).rejects.toThrow("schema validation failed");
  });


  it("accepts both supported applies_when schema forms", async () => {
    for (const appliesWhen of ["production", ["production", "staging"]]) {
      const candidate = JSON.parse(JSON.stringify(examplePack)) as {
        controls: Array<Record<string, unknown>>;
      };
      candidate.controls[0]!["applies_when"] = appliesWhen;
      const pack = await loadGovernancePack(
        "/repo",
        "governance.json",
        memoryFileSystem(JSON.stringify(candidate)),
      );
      expect(pack.controls[0]?.applies_when).toEqual(appliesWhen);
    }
  });

  it.each([
    ["change type enum", (candidate: Record<string, unknown>) => {
      (candidate["change"] as Record<string, unknown>)["type"] = "unknown";
    }],
    ["change risk class enum", (candidate: Record<string, unknown>) => {
      (candidate["change"] as Record<string, unknown>)["risk_class"] = "E";
    }],
    ["control severity enum", (candidate: Record<string, unknown>) => {
      (candidate["controls"] as Array<Record<string, unknown>>)[0]!["severity"] = "P9";
    }],
    ["control status enum", (candidate: Record<string, unknown>) => {
      (candidate["controls"] as Array<Record<string, unknown>>)[0]!["status"] = "UNKNOWN";
    }],
    ["control failure decision enum", (candidate: Record<string, unknown>) => {
      (candidate["controls"] as Array<Record<string, unknown>>)[0]!["failure_decision"] = "ALLOW";
    }],
    ["evidence type enum", (candidate: Record<string, unknown>) => {
      (candidate["evidence"] as Array<Record<string, unknown>>)[0]!["type"] = "E99";
    }],
    ["evidence status enum", (candidate: Record<string, unknown>) => {
      (candidate["evidence"] as Array<Record<string, unknown>>)[0]!["status"] = "APPROVED";
    }],
    ["evidence freshness status enum", (candidate: Record<string, unknown>) => {
      (candidate["evidence"] as Array<Record<string, unknown>>)[0]!["freshness_status"] = "fresh";
    }],
    ["risk severity enum", (candidate: Record<string, unknown>) => {
      (candidate["risks"] as Array<Record<string, unknown>>)[0]!["severity"] = "P9";
    }],
    ["risk status enum", (candidate: Record<string, unknown>) => {
      (candidate["risks"] as Array<Record<string, unknown>>)[0]!["status"] = "RESOLVED";
    }],
    ["decision type enum", (candidate: Record<string, unknown>) => {
      (candidate["decisions"] as Array<Record<string, unknown>>)[0]!["type"] = "DEPLOY";
    }],
    ["decision status enum", (candidate: Record<string, unknown>) => {
      (candidate["decisions"] as Array<Record<string, unknown>>)[0]!["status"] = "MAYBE";
    }],
    ["exception status enum", (candidate: Record<string, unknown>) => {
      candidate["exceptions"] = [{ id: "EXC-ENUM", status: "UNKNOWN" }];
    }],
    ["debt severity enum", (candidate: Record<string, unknown>) => {
      candidate["debt"] = [{ id: "DEBT-ENUM", severity: "P9", status: "OPEN" }];
    }],
    ["debt status enum", (candidate: Record<string, unknown>) => {
      candidate["debt"] = [{ id: "DEBT-ENUM", severity: "P1", status: "UNKNOWN" }];
    }],
    ["finding severity enum", (candidate: Record<string, unknown>) => {
      candidate["findings"] = [{
        id: "FND-ENUM", rule_id: "RULE-1", severity: "P9", category: "contract",
        message: "invalid severity", status: "OPEN", evidence_refs: [],
      }];
    }],
    ["finding status enum", (candidate: Record<string, unknown>) => {
      candidate["findings"] = [{
        id: "FND-ENUM", rule_id: "RULE-1", severity: "P1", category: "contract",
        message: "invalid status", status: "UNKNOWN", evidence_refs: [],
      }];
    }],
  ])("rejects invalid enum value: %s", async (_name, mutate) => {
    const candidate = JSON.parse(JSON.stringify(examplePack)) as Record<string, unknown>;
    mutate(candidate);
    await expect(
      loadGovernancePack("/repo", "governance.json", memoryFileSystem(JSON.stringify(candidate))),
    ).rejects.toThrow("schema validation failed");
  });

  it("requires every conditional field for accepted risks and requested/approved exceptions", async () => {
    const acceptedRisk = {
      id: "RSK-CONTRACT",
      severity: "P1",
      title: "Accepted risk",
      status: "ACCEPTED",
      accepted_by: "risk-owner",
      accepted_at: "2026-10-14T08:00:00Z",
      acceptance_expires_at: "2026-11-14T08:00:00Z",
      acceptance_reason: "Temporary acceptance with an expiry.",
    };
    const requestedException = {
      id: "EXC-CONTRACT",
      status: "REQUESTED",
      control: "SEC-AUTH-001",
      reason: "Temporary exception request.",
      project_id: "example-saas",
      change_id: "CHG-EMPLOYEE-BULK-IMPORT",
      requested_by: "engineering",
      requested_at: "2026-10-14T08:00:00Z",
    };
    const approvedException = {
      ...requestedException,
      status: "APPROVED",
      approved_by: "security-owner",
      approved_at: "2026-10-14T09:00:00Z",
      expires_at: "2026-11-14T08:00:00Z",
    };
    const cases = [
      {
        label: "accepted risk",
        value: acceptedRisk as Record<string, unknown>,
        required: ["accepted_by", "accepted_at", "acceptance_expires_at", "acceptance_reason"],
        assign: (candidate: Record<string, unknown>, value: Record<string, unknown>) => { candidate["risks"] = [value]; },
      },
      {
        label: "requested exception",
        value: requestedException as Record<string, unknown>,
        required: ["control", "reason", "project_id", "change_id", "requested_by", "requested_at"],
        assign: (candidate: Record<string, unknown>, value: Record<string, unknown>) => { candidate["exceptions"] = [value]; },
      },
      {
        label: "approved exception",
        value: approvedException as Record<string, unknown>,
        required: ["control", "reason", "project_id", "change_id", "requested_by", "requested_at", "approved_by", "approved_at", "expires_at"],
        assign: (candidate: Record<string, unknown>, value: Record<string, unknown>) => { candidate["exceptions"] = [value]; },
      },
    ];
    for (const item of cases) {
      for (const field of item.required) {
        const candidate = JSON.parse(JSON.stringify(examplePack)) as Record<string, unknown>;
        const value = JSON.parse(JSON.stringify(item.value)) as Record<string, unknown>;
        delete value[field];
        item.assign(candidate, value);
        await expect(
          loadGovernancePack("/repo", "governance.json", memoryFileSystem(JSON.stringify(candidate))),
          `${item.label} should require ${field}`,
        ).rejects.toThrow("schema validation failed");
      }
    }
  });

  it.each([
    ["accepted risk accepted_at date-time format", (candidate: Record<string, unknown>) => {
      candidate["risks"] = [{
        id: "RSK-DATE", severity: "P1", title: "Accepted risk", status: "ACCEPTED",
        accepted_by: "risk-owner", accepted_at: "yesterday",
        acceptance_expires_at: "2026-11-14T08:00:00Z", acceptance_reason: "Temporary acceptance.",
      }];
    }],
    ["accepted risk expiry date-time format", (candidate: Record<string, unknown>) => {
      candidate["risks"] = [{
        id: "RSK-DATE", severity: "P1", title: "Accepted risk", status: "ACCEPTED",
        accepted_by: "risk-owner", accepted_at: "2026-10-14T08:00:00Z",
        acceptance_expires_at: "tomorrow", acceptance_reason: "Temporary acceptance.",
      }];
    }],
    ["decision timestamp date-time format", (candidate: Record<string, unknown>) => {
      (candidate["decisions"] as Array<Record<string, unknown>>)[0]!["timestamp"] = "not-a-date";
    }],
    ["requested exception requested_at date-time format", (candidate: Record<string, unknown>) => {
      candidate["exceptions"] = [{
        id: "EXC-DATE", status: "REQUESTED", control: "SEC-AUTH-001",
        reason: "Temporary exception.", project_id: "example-saas",
        change_id: "CHG-EMPLOYEE-BULK-IMPORT", requested_by: "engineering",
        requested_at: "not-a-date",
      }];
    }],
    ["approved exception approved_at date-time format", (candidate: Record<string, unknown>) => {
      candidate["exceptions"] = [{
        id: "EXC-DATE", status: "APPROVED", control: "SEC-AUTH-001",
        reason: "Temporary exception.", project_id: "example-saas",
        change_id: "CHG-EMPLOYEE-BULK-IMPORT", requested_by: "engineering",
        requested_at: "2026-10-14T08:00:00Z", approved_by: "security-owner",
        approved_at: "not-a-date", expires_at: "2026-11-14T08:00:00Z",
      }];
    }],
    ["approved exception expiry date-time format", (candidate: Record<string, unknown>) => {
      candidate["exceptions"] = [{
        id: "EXC-DATE", status: "APPROVED", control: "SEC-AUTH-001",
        reason: "Temporary exception.", project_id: "example-saas",
        change_id: "CHG-EMPLOYEE-BULK-IMPORT", requested_by: "engineering",
        requested_at: "2026-10-14T08:00:00Z", approved_by: "security-owner",
        approved_at: "2026-10-14T09:00:00Z", expires_at: "not-a-date",
      }];
    }],
    ["finding source location start_line minimum", (candidate: Record<string, unknown>) => {
      candidate["findings"] = [{
        id: "FND-LINE", rule_id: "RULE-1", severity: "P1", category: "contract",
        message: "invalid line", status: "OPEN", evidence_refs: [],
        source_location: { file: "src/app.ts", start_line: 0 },
      }];
    }],
    ["finding source location end_line minimum", (candidate: Record<string, unknown>) => {
      candidate["findings"] = [{
        id: "FND-LINE", rule_id: "RULE-1", severity: "P1", category: "contract",
        message: "invalid line", status: "OPEN", evidence_refs: [],
        source_location: { file: "src/app.ts", start_line: 1, end_line: 0 },
      }];
    }],
    ["finding source location start_column minimum", (candidate: Record<string, unknown>) => {
      candidate["findings"] = [{
        id: "FND-COLUMN", rule_id: "RULE-1", severity: "P1", category: "contract",
        message: "invalid column", status: "OPEN", evidence_refs: [],
        source_location: { file: "src/app.ts", start_column: 0 },
      }];
    }],
    ["finding source location end_column minimum", (candidate: Record<string, unknown>) => {
      candidate["findings"] = [{
        id: "FND-COLUMN", rule_id: "RULE-1", severity: "P1", category: "contract",
        message: "invalid column", status: "OPEN", evidence_refs: [],
        source_location: { file: "src/app.ts", start_column: 1, end_column: 0 },
      }];
    }],
  ])("rejects invalid schema constraint: %s", async (_name, mutate) => {
    const candidate = JSON.parse(JSON.stringify(examplePack)) as Record<string, unknown>;
    mutate(candidate);
    await expect(
      loadGovernancePack("/repo", "governance.json", memoryFileSystem(JSON.stringify(candidate))),
    ).rejects.toThrow("schema validation failed");
  });

  it.each([
    ["standard identifier pattern", (candidate: Record<string, unknown>) => {
      ((candidate["standards"] as Array<Record<string, unknown>>)[0]!)["id"] = "bad-standard";
    }],
    ["control identifier pattern", (candidate: Record<string, unknown>) => {
      ((candidate["controls"] as Array<Record<string, unknown>>)[0]!)["id"] = "bad control";
    }],
    ["evidence identifier pattern", (candidate: Record<string, unknown>) => {
      ((candidate["evidence"] as Array<Record<string, unknown>>)[0]!)["id"] = "EVIDENCE-1";
    }],
    ["risk identifier pattern", (candidate: Record<string, unknown>) => {
      ((candidate["risks"] as Array<Record<string, unknown>>)[0]!)["id"] = "risk-1";
    }],
    ["decision identifier pattern", (candidate: Record<string, unknown>) => {
      ((candidate["decisions"] as Array<Record<string, unknown>>)[0]!)["id"] = "decision-1";
    }],
    ["exception identifier pattern", (candidate: Record<string, unknown>) => {
      candidate["exceptions"] = [{ id: "exception-1", status: "REJECTED" }];
    }],
    ["exception change identifier pattern", (candidate: Record<string, unknown>) => {
      candidate["exceptions"] = [{
        id: "EXC-REGEX", status: "REQUESTED", control: "SEC-AUTH-001",
        reason: "Temporary exception.", project_id: "example-saas",
        change_id: "change-1", requested_by: "engineering",
        requested_at: "2026-10-14T08:00:00Z",
      }];
    }],
    ["debt identifier pattern", (candidate: Record<string, unknown>) => {
      candidate["debt"] = [{ id: "debt-1", severity: "P1", status: "OPEN" }];
    }],
  ])("rejects invalid identifier pattern: %s", async (_name, mutate) => {
    const candidate = JSON.parse(JSON.stringify(examplePack)) as Record<string, unknown>;
    mutate(candidate);
    await expect(
      loadGovernancePack("/repo", "governance.json", memoryFileSystem(JSON.stringify(candidate))),
    ).rejects.toThrow("schema validation failed");
  });

  it.each([
    ["version semver pattern", (candidate: Record<string, unknown>) => { candidate["version"] = "v1"; }],
    ["project identifier pattern", (candidate: Record<string, unknown>) => {
      (candidate["project"] as Record<string, unknown>)["id"] = "Invalid Project ID";
    }],
    ["change identifier pattern", (candidate: Record<string, unknown>) => {
      (candidate["change"] as Record<string, unknown>)["id"] = "change-1";
    }],
    ["applies_when violates its string-or-string-array oneOf", (candidate: Record<string, unknown>) => {
      (candidate["controls"] as Array<Record<string, unknown>>)[0]!["applies_when"] = { environment: "production" };
    }],
    ["negative maximum evidence age", (candidate: Record<string, unknown>) => {
      (candidate["controls"] as Array<Record<string, unknown>>)[0]!["max_evidence_age_seconds"] = -1;
    }],
    ["invalid evidence date-time", (candidate: Record<string, unknown>) => {
      (candidate["evidence"] as Array<Record<string, unknown>>)[0]!["generated_at"] = "yesterday";
    }],
    ["invalid repository fingerprint", (candidate: Record<string, unknown>) => {
      (candidate["evidence"] as Array<Record<string, unknown>>)[0]!["repository_fingerprint"] = "sha256:bad";
    }],
    ["negative evidence duration", (candidate: Record<string, unknown>) => {
      (candidate["evidence"] as Array<Record<string, unknown>>)[0]!["duration_ms"] = -1;
    }],
    ["unknown nested project property", (candidate: Record<string, unknown>) => {
      (candidate["project"] as Record<string, unknown>)["unexpected"] = true;
    }],
    ["accepted risk missing conditional acceptance metadata", (candidate: Record<string, unknown>) => {
      candidate["risks"] = [{ id: "RSK-CONTRACT", severity: "P1", title: "accepted risk", status: "ACCEPTED" }];
    }],
    ["requested exception missing conditional request metadata", (candidate: Record<string, unknown>) => {
      candidate["exceptions"] = [{ id: "EXC-CONTRACT", status: "REQUESTED" }];
    }],
    ["finding confidence outside the allowed range", (candidate: Record<string, unknown>) => {
      candidate["findings"] = [{
        id: "FND-CONTRACT", rule_id: "RULE-1", severity: "P1", category: "contract",
        message: "invalid confidence", status: "OPEN", evidence_refs: [], confidence: 1.1,
      }];
    }],
    ["duplicate finding evidence references", (candidate: Record<string, unknown>) => {
      candidate["findings"] = [{
        id: "FND-CONTRACT", rule_id: "RULE-1", severity: "P1", category: "contract",
        message: "duplicate references", status: "OPEN", evidence_refs: ["EVD-1", "EVD-1"],
      }];
    }],
  ])("rejects schema constraint violation: %s", async (_name, mutate) => {
    const candidate = JSON.parse(JSON.stringify(examplePack)) as Record<string, unknown>;
    mutate(candidate);
    await expect(
      loadGovernancePack("/repo", "governance.json", memoryFileSystem(JSON.stringify(candidate))),
    ).rejects.toThrow("schema validation failed");
  });

  it("rejects dangling cross-references even when JSON shape is valid", async () => {
    const invalid = JSON.parse(JSON.stringify(examplePack)) as {
      controls: Array<Record<string, unknown>>;
    };
    invalid.controls[0]!["standard"] = "UNKNOWN-STANDARD";

    await expect(
      loadGovernancePack("/repo", "governance.json", memoryFileSystem(JSON.stringify(invalid))),
    ).rejects.toThrow("semantic validation failed");
  });
});


describe("architecture profile loader", () => {
  it("loads a valid profile with explicit component mappings", async () => {
    const profile = await loadArchitectureProfile(
      "/repo",
      "architecture.json",
      memoryFileSystem(undefined, JSON.stringify(cleanArchitecture)),
    );

    expect(profile.id).toBe("clean-architecture");
    expect(profile.componentMappings?.domain).toContain("src/domain/**");
  });

  it("rejects an invalid architecture profile", async () => {
    await expect(
      loadArchitectureProfile(
        "/repo",
        "architecture.json",
        memoryFileSystem(undefined, JSON.stringify({ id: "invalid" })),
      ),
    ).rejects.toThrow("Architecture profile validation failed");
  });

  it.each([
    {
      name: "an invalid profile identifier pattern",
      profile: { ...cleanArchitecture, id: "Invalid Profile ID" },
    },
    {
      name: "an invalid profile version pattern",
      profile: { ...cleanArchitecture, version: "v1" },
    },
    {
      name: "an invalid boundary-rule identifier pattern",
      profile: {
        ...cleanArchitecture,
        boundaryRules: [{ ...cleanArchitecture.boundaryRules[0]!, id: "bad rule id" }],
      },
    },
    {
      name: "an empty styles array",
      profile: { ...cleanArchitecture, styles: [] },
    },
    {
      name: "duplicate architecture styles",
      profile: { ...cleanArchitecture, styles: [...cleanArchitecture.styles, cleanArchitecture.styles[0]!] },
    },
    {
      name: "duplicate required controls",
      profile: {
        ...cleanArchitecture,
        requiredControls: [...cleanArchitecture.requiredControls, cleanArchitecture.requiredControls[0]!],
      },
    },
    {
      name: "duplicate capabilities",
      profile: {
        ...cleanArchitecture,
        capabilities: [...(cleanArchitecture.capabilities ?? []), cleanArchitecture.capabilities![0]!],
      },
    },
    {
      name: "an empty component mapping pattern list",
      profile: { ...cleanArchitecture, componentMappings: { domain: [] } },
    },
    {
      name: "an empty component mapping pattern",
      profile: { ...cleanArchitecture, componentMappings: { domain: [""] } },
    },
    {
      name: "an unknown nested boundary-rule property",
      profile: {
        ...cleanArchitecture,
        boundaryRules: [{ ...cleanArchitecture.boundaryRules[0]!, unexpected: true }],
      },
    },
  ])("rejects schema constraint violation: $name", async ({ profile }) => {
    await expect(
      loadArchitectureProfile(
        "/repo",
        "architecture.json",
        memoryFileSystem(undefined, JSON.stringify(profile)),
      ),
    ).rejects.toThrow("Architecture profile validation failed");
  });

  it.each([
    {
      name: "a duplicate boundary-rule identifier",
      profile: {
        ...cleanArchitecture,
        boundaryRules: [...cleanArchitecture.boundaryRules, { ...cleanArchitecture.boundaryRules[0]! }],
      },
      diagnostic: "duplicate rule id",
    },
    {
      name: "an invalid component-mapping role",
      profile: {
        ...cleanArchitecture,
        componentMappings: { "Domain Layer": ["src/domain/**"] },
      },
      diagnostic: "lowercase role identifier",
    },
    {
      name: "duplicate component-mapping patterns",
      profile: {
        ...cleanArchitecture,
        componentMappings: { domain: ["src/domain/**", "src/domain/**"] },
      },
      diagnostic: "must not contain duplicate path patterns",
    },
  ])("rejects $name through the CLI profile loader", async ({ profile, diagnostic }) => {
    await expect(
      loadArchitectureProfile(
        "/repo",
        "architecture.json",
        memoryFileSystem(undefined, JSON.stringify(profile)),
      ),
    ).rejects.toThrow(diagnostic);
  });
});
