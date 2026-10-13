import { describe, expect, it } from "vitest";
import { nodeVerificationToolRunner } from "../src/verification-runner.js";

describe("node verification tool runner", () => {
  it("rejects a runtime tool name outside the fixed allowlist before execution", async () => {
    await expect(
      nodeVerificationToolRunner.run(
        "cmd" as never,
        ["/c", "echo", "unexpected"],
        process.cwd(),
        ".",
        1_000,
      ),
    ).rejects.toThrow("not allowlisted");
  });

  it("rejects a lexical working-directory traversal before execution", async () => {
    await expect(
      nodeVerificationToolRunner.run(
        "typescript",
        ["--version"],
        process.cwd(),
        "..",
        1_000,
      ),
    ).rejects.toThrow("escapes repository root");
  });
});
