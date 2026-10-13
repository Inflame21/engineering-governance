import { describe, expect, it } from "vitest";
import { parseCliArguments } from "../src/index.js";

describe("CLI argument parser", () => {
  it("defaults to the current repository and standard governance pack", () => {
    expect(parseCliArguments(["check"])).toMatchObject({
      command: "check",
      packPath: ".governance/governance-pack.json",
      json: false,
    });
  });

  it("accepts an explicit repository, pack path, and JSON output", () => {
    expect(parseCliArguments([
      "check",
      "../service",
      "--pack",
      "config/governance.json",
      "--profile",
      "config/architecture.json",
      "--json",
    ])).toMatchObject({
      command: "check",
      packPath: "config/governance.json",
      profilePath: "config/architecture.json",
      json: true,
    });
  });

  it("supports analysis without a governance pack", () => {
    expect(parseCliArguments(["analyze", ".", "--json"])).toMatchObject({
      command: "analyze",
      json: true,
    });
  });

  it("rejects missing pack paths and unknown options", () => {
    expect(() => parseCliArguments(["check", "--pack"])).toThrow("--pack requires");
    expect(() => parseCliArguments(["check", "--force"])).toThrow("Unknown option");
  });

  it("supports help and version without a repository argument", () => {
    expect(parseCliArguments(["--help"]).command).toBe("help");
    expect(parseCliArguments(["--version"]).command).toBe("version");
  });
});
