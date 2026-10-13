import { describe, expect, it } from "vitest";
import { runVerificationAdapters, type VerificationToolRunner } from "../src/verification.js";

function runner(options: {
  typescriptAvailable?: boolean;
  python3Available?: boolean;
  pythonAvailable?: boolean;
  results?: Array<{ exitCode: number; stdout: string; stderr: string }>;
  version?: string;
} = {}): VerificationToolRunner {
  const results = [...(options.results ?? [])];
  return {
    async isAvailable(tool) {
      if (tool === "typescript") return options.typescriptAvailable ?? false;
      if (tool === "python3") return options.python3Available ?? false;
      return options.pythonAvailable ?? false;
    },
    async getVersion() {
      return options.version;
    },
    async run() {
      const result = results.shift();
      if (!result) throw new Error("No fake process result configured.");
      return result;
    },
  };
}

describe("opt-in verification adapters", () => {
  it("records verified Python syntax evidence when AST parsing passes", async () => {
    const report = await runVerificationAdapters({
      rootPath: "/repo",
      changedFiles: [],
      files: ["app/main.py"],
      fileContents: { "app/main.py": "print('hello')" },
    }, runner({
      python3Available: true,
      version: "Python 3.12.0",
      results: [{ exitCode: 0, stdout: JSON.stringify({ errors: [] }), stderr: "" }],
    }));

    expect(report.status).toBe("COMPLETE");
    expect(report.results[0]).toMatchObject({ tool: "python", status: "PASS", evidenceId: "EVD-PYTHON-SYNTAX" });
    expect(report.evidence[0]?.status).toBe("VERIFIED");
    expect(report.evidence[0]?.tool_version).toBe("Python 3.12.0");
    expect(report.evidence[0]?.repository_fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(report.evidence[0]?.generated_at).toBeTruthy();
    expect(report.findings).toEqual([]);
  });

  it("emits a source finding when Python syntax verification fails", async () => {
    const report = await runVerificationAdapters({
      rootPath: "/repo",
      changedFiles: [],
      files: ["app/main.py"],
      fileContents: { "app/main.py": "if True print('broken')" },
    }, runner({
      python3Available: true,
      results: [{
        exitCode: 1,
        stdout: JSON.stringify({ errors: [{ file: "app/main.py", line: 1, message: "invalid syntax" }] }),
        stderr: "",
      }],
    }));

    expect(report.results[0]?.status).toBe("FAIL");
    expect(report.findings[0]).toMatchObject({
      rule_id: "PYTHON-SYNTAX",
      severity: "P1",
      source_location: { file: "app/main.py", start_line: 1 },
    });
    expect(report.evidence[0]?.status).toBe("PARTIALLY_VERIFIED");
  });

  it("does not claim a TypeScript check passed when the compiler is unavailable", async () => {
    const report = await runVerificationAdapters({
      rootPath: "/repo",
      changedFiles: [],
      files: ["src/main.ts", "tsconfig.json"],
      fileContents: { "tsconfig.json": '{"compilerOptions":{"strict":true}}' },
    }, runner({ typescriptAvailable: false }));

    expect(report.status).toBe("PARTIAL");
    expect(report.results[0]?.status).toBe("UNVERIFIED");
    expect(report.adapterResults[0]?.unsupportedCapabilities).toContain("verification:typescript-typecheck");
    expect(report.evidence).toEqual([]);
  });

  it("parses TypeScript diagnostics into line-addressable findings", async () => {
    const report = await runVerificationAdapters({
      rootPath: "/repo",
      changedFiles: [],
      files: ["src/main.ts", "tsconfig.json"],
      fileContents: { "tsconfig.json": '{"compilerOptions":{"strict":true}}' },
    }, runner({
      typescriptAvailable: true,
      results: [{
        exitCode: 2,
        stdout: "src/main.ts(8,4): error TS2322: Type 'string' is not assignable to type 'number'.",
        stderr: "",
      }],
    }));

    expect(report.results[0]?.status).toBe("FAIL");
    expect(report.findings[0]).toMatchObject({
      rule_id: "TSC-TYPECHECK",
      source_location: { file: "src/main.ts", start_line: 8, start_column: 4 },
    });
  });


  it("preserves a failed TypeScript exit code when another project is unverified", async () => {
    const results = [{ exitCode: 2, stdout: "apps/one/src/main.ts(3,1): error TS2322: Type 'string' is not assignable to type 'number'.", stderr: "" }];
    const mixedAvailabilityRunner: VerificationToolRunner = {
      async isAvailable(tool, _rootPath, workingDirectory) {
        return tool === "typescript" && workingDirectory === "apps/one";
      },
      async getVersion() {
        return "Version 5.9.2";
      },
      async run() {
        const result = results.shift();
        if (!result) throw new Error("No fake process result configured.");
        return result;
      },
    };
    const report = await runVerificationAdapters({
      rootPath: "/repo",
      changedFiles: [],
      files: [
        "apps/one/tsconfig.json",
        "apps/one/src/main.ts",
        "apps/two/tsconfig.json",
        "apps/two/src/main.ts",
      ],
      fileContents: {
        "apps/one/tsconfig.json": '{"compilerOptions":{"strict":true}}',
        "apps/two/tsconfig.json": '{"compilerOptions":{"strict":true}}',
      },
    }, mixedAvailabilityRunner);

    expect(report.results[0]?.status).toBe("FAIL");
    expect(report.results[0]?.limitations).toContain("TypeScript compiler unavailable for apps/two/tsconfig.json.");
    expect(report.evidence[0]?.exit_code).toBe(1);
    expect(report.evidence[0]?.status).toBe("PARTIALLY_VERIFIED");
  });

  it("creates a blocking finding when TypeScript exits non-zero without diagnostics", async () => {
    const report = await runVerificationAdapters({
      rootPath: "/repo",
      changedFiles: [],
      files: ["src/main.ts", "tsconfig.json"],
      fileContents: { "tsconfig.json": '{"compilerOptions":{"strict":true}}' },
    }, runner({
      typescriptAvailable: true,
      results: [{ exitCode: 2, stdout: "", stderr: "" }],
    }));

    expect(report.results[0]?.status).toBe("FAIL");
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.message).toContain("without diagnostics");
  });

  it("does not treat malformed Python verifier output as a pass", async () => {
    const report = await runVerificationAdapters({
      rootPath: "/repo",
      changedFiles: [],
      files: ["main.py"],
      fileContents: { "main.py": "print('ok')" },
    }, runner({
      python3Available: true,
      results: [{ exitCode: 0, stdout: "not-json", stderr: "" }],
    }));

    expect(report.status).toBe("PARTIAL");
    expect(report.results[0]?.status).toBe("ERROR");
    expect(report.adapterResults[0]?.executionStatus).toBe("FAILED");
  });


  it("classifies a non-zero Python verifier exit without diagnostics as a tool error", async () => {
    const report = await runVerificationAdapters({
      rootPath: "/repo",
      changedFiles: [],
      files: ["main.py"],
      fileContents: { "main.py": "print('ok')" },
    }, runner({
      python3Available: true,
      results: [{ exitCode: 2, stdout: JSON.stringify({ errors: [] }), stderr: "interpreter failure" }],
    }));

    expect(report.results[0]?.status).toBe("ERROR");
    expect(report.results[0]?.summary).toContain("invalid output");
    expect(report.findings).toEqual([]);
    expect(report.adapterResults[0]?.executionStatus).toBe("FAILED");
    expect(report.status).toBe("PARTIAL");
  });

  it("classifies syntax diagnostics paired with a zero exit code as a tool error", async () => {
    const report = await runVerificationAdapters({
      rootPath: "/repo",
      changedFiles: [],
      files: ["main.py"],
      fileContents: { "main.py": "if True print('broken')" },
    }, runner({
      python3Available: true,
      results: [{
        exitCode: 0,
        stdout: JSON.stringify({ errors: [{ file: "main.py", line: 1, message: "invalid syntax" }] }),
        stderr: "",
      }],
    }));

    expect(report.results[0]?.status).toBe("ERROR");
    expect(report.findings).toEqual([]);
    expect(report.adapterResults[0]?.executionStatus).toBe("FAILED");
  });

  it("does not parse Python files that were excluded by source-content limits", async () => {
    const report = await runVerificationAdapters({
      rootPath: "/repo",
      changedFiles: [],
      files: ["main.py", "other.py"],
      fileContents: { "main.py": "print('ok')" },
      contentLimitations: ["Source ingestion budget reached before other.py."],
    }, runner({
      python3Available: true,
      results: [{ exitCode: 0, stdout: JSON.stringify({ errors: [] }), stderr: "" }],
    }));

    expect(report.results[0]?.status).toBe("UNVERIFIED");
    expect(report.adapterResults[0]?.executionStatus).toBe("PARTIAL");
    expect(report.results[0]?.limitations.join(" ")).toContain("other.py");
  });

  it("does not invoke unrelated tools for repositories without matching source files", async () => {
    const report = await runVerificationAdapters({
      rootPath: "/repo",
      changedFiles: [],
      files: ["README.md"],
    }, runner());

    expect(report.status).toBe("COMPLETE");
    expect(report.results).toEqual([]);
    expect(report.adapterResults).toEqual([]);
  });
});
