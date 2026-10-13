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
});
