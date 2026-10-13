import { describe, expect, it } from "vitest";
import { loadGovernancePack } from "../src/config.js";
import examplePack from "../../model/example-governance-pack.json" with { type: "json" };

function memoryFileSystem(content: string | undefined) {
  return {
    async readTextFile(_rootPath: string, path: string) {
      return path === "governance.json" ? content : undefined;
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
