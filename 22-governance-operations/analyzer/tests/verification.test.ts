import { describe, expect, it } from "vitest";
import { evidenceStatusForResult } from "../../engine/src/evidence-policy.js";
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
    expect(report.evidence[0]?.result_status).toBe("PASS");
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
    // A failed check is not partial verification: the evidence is UNVERIFIED and the finding blocks.
    expect(report.evidence[0]?.status).toBe("UNVERIFIED");
    expect(report.evidence[0]?.result_status).toBe("FAIL");
  });

  it("does not claim a TypeScript check passed when the compiler is unavailable", async () => {
    const report = await runVerificationAdapters({
      rootPath: "/repo",
      changedFiles: [],
      files: ["src/main.ts", "tsconfig.json"],
      fileContents: { "tsconfig.json": '{"compilerOptions":{"strict":true}}' },
    }, runner({ typescriptAvailable: false }));

    expect(report.status).toBe("PARTIAL");
    expect(report.results[0]?.status).toBe("UNSUPPORTED");
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
    expect(report.evidence[0]?.status).toBe("UNVERIFIED");
    expect(report.evidence[0]?.result_status).toBe("FAIL");
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

describe("tool result states", () => {
  const pass = { exitCode: 0, stdout: JSON.stringify({ errors: [] }), stderr: "" };
  const tsconfig = '{"compilerOptions":{"strict":true}}';

  it("reports UNSUPPORTED when TypeScript has no project configuration to check", async () => {
    const report = await runVerificationAdapters(
      { rootPath: "/repo", changedFiles: [], files: ["src/main.ts"], fileContents: {} },
      runner({ typescriptAvailable: true }),
    );
    expect(report.results[0]).toMatchObject({ tool: "typescript", status: "UNSUPPORTED" });
    expect(report.evidence).toEqual([]);
  });

  it("reports SKIPPED when the TypeScript project limit stops the check from running", async () => {
    const configs = Array.from({ length: 21 }, (_, i) => `apps/p${i}/tsconfig.json`);
    const report = await runVerificationAdapters(
      { rootPath: "/repo", changedFiles: [], files: ["src/main.ts", ...configs], fileContents: Object.fromEntries(configs.map((c) => [c, tsconfig])) },
      runner({ typescriptAvailable: true }),
    );
    expect(report.results[0]).toMatchObject({ tool: "typescript", status: "SKIPPED" });
    expect(report.evidence).toEqual([]);
  });

  it("reports SKIPPED when the Python file limit or the ingestion budget stops the check", async () => {
    const many = Array.from({ length: 501 }, (_, i) => `m${i}.py`);
    const overLimit = await runVerificationAdapters(
      { rootPath: "/repo", changedFiles: [], files: many, fileContents: Object.fromEntries(many.map((f) => [f, "x = 1"])) },
      runner({ python3Available: true }),
    );
    expect(overLimit.results[0]).toMatchObject({ tool: "python", status: "SKIPPED" });

    const notIngested = await runVerificationAdapters(
      { rootPath: "/repo", changedFiles: [], files: ["main.py"], fileContents: {} },
      runner({ python3Available: true }),
    );
    expect(notIngested.results[0]).toMatchObject({ tool: "python", status: "SKIPPED" });
  });

  it("reports UNSUPPORTED when no Python interpreter is available", async () => {
    const report = await runVerificationAdapters(
      { rootPath: "/repo", changedFiles: [], files: ["main.py"], fileContents: { "main.py": "x = 1" } },
      runner(),
    );
    expect(report.results[0]).toMatchObject({ tool: "python", status: "UNSUPPORTED" });
    expect(report.evidence).toEqual([]);
  });

  it("never lets a result that is not PASS or WARN produce VERIFIED evidence, and records every result", async () => {
    const scenarios: Array<{ files: string[]; contents: Record<string, string>; r: ReturnType<typeof runner>; expectedResult: string }> = [
      { files: ["main.py"], contents: { "main.py": "x = 1" }, r: runner({ python3Available: true, results: [pass] }), expectedResult: "PASS" },
      {
        files: ["main.py"],
        contents: { "main.py": "x = " },
        r: runner({ python3Available: true, results: [{ exitCode: 1, stdout: JSON.stringify({ errors: [{ file: "main.py", line: 1, message: "invalid syntax" }] }), stderr: "" }] }),
        expectedResult: "FAIL",
      },
      { files: ["main.py"], contents: { "main.py": "x = 1" }, r: runner({ python3Available: true, results: [{ exitCode: 0, stdout: "not json", stderr: "" }] }), expectedResult: "ERROR" },
    ];
    for (const { files, contents, r, expectedResult } of scenarios) {
      const report = await runVerificationAdapters({ rootPath: "/repo", changedFiles: [], files, fileContents: contents }, r);
      expect(report.results[0]?.status).toBe(expectedResult);
      for (const item of report.evidence) {
        expect(item.result_status).toBe(expectedResult);
        expect(item.status).toBe(evidenceStatusForResult(item.result_status!));
        if (item.result_status !== "PASS") expect(item.status).not.toBe("VERIFIED");
      }
    }
  });
});
