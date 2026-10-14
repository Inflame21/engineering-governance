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
      name: "an empty styles array",
      profile: { ...cleanArchitecture, styles: [] },
    },
    {
      name: "duplicate architecture styles",
      profile: { ...cleanArchitecture, styles: [...cleanArchitecture.styles, cleanArchitecture.styles[0]!] },
    },
    {
      name: "an empty component mapping pattern list",
      profile: { ...cleanArchitecture, componentMappings: { domain: [] } },
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
