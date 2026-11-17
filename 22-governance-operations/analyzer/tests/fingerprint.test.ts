import { describe, expect, it } from "vitest";
import { fingerprintRepositorySnapshot } from "../src/fingerprint.js";

describe("repository snapshot fingerprint", () => {
  it("is deterministic for identical path and ingested-content inputs", () => {
    const snapshot = {
      rootPath: "/repo",
      changedFiles: [],
      files: ["src/main.ts", "package.json"],
      fileContents: {
        "src/main.ts": "export const value = 1;",
        "package.json": '{"name":"sample"}',
      },
    };

    expect(fingerprintRepositorySnapshot(snapshot)).toEqual(fingerprintRepositorySnapshot(snapshot));
  });

  it("changes when ingested source content changes", () => {
    const base = {
      rootPath: "/repo",
      changedFiles: [],
      files: ["src/main.ts"],
      fileContents: { "src/main.ts": "export const value = 1;" },
    };
    const changed = {
      ...base,
      fileContents: { "src/main.ts": "export const value = 2;" },
    };

    expect(fingerprintRepositorySnapshot(base).digest).not.toBe(fingerprintRepositorySnapshot(changed).digest);
  });

  it("marks fingerprints partial when source content was skipped", () => {
    const result = fingerprintRepositorySnapshot({
      rootPath: "/repo",
      changedFiles: [],
      files: ["src/main.py", "src/other.py"],
      fileContents: { "src/main.py": "print('ok')" },
      contentLimitations: ["Source ingestion limit reached before src/other.py."],
    });

    expect(result.sourceContentStatus).toBe("PARTIAL");
    expect(result.sourceFileCount).toBe(2);
    expect(result.inspectedSourceFileCount).toBe(1);
    expect(result.limitations).toContain("Source ingestion limit reached before src/other.py.");
  });
});
