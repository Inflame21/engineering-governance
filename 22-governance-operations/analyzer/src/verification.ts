import type {
  GovernanceEvidence,
  GovernanceFinding,
} from "../../engine/src/types.js";
import type { RepositorySnapshot, RepositoryAdapterResult } from "./types.js";

export type VerificationToolName = "typescript" | "python3" | "python";
export type VerificationToolStatus = "PASS" | "FAIL" | "UNVERIFIED" | "ERROR";

export interface VerificationProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs?: number;
}

export interface VerificationToolRunner {
  isAvailable(
    tool: VerificationToolName,
    repositoryRoot: string,
    workingDirectory: string,
  ): Promise<boolean>;
  run(
    tool: VerificationToolName,
    args: string[],
    repositoryRoot: string,
    workingDirectory: string,
    timeoutMs: number,
  ): Promise<VerificationProcessResult>;
}

export interface VerificationToolResult {
  tool: string;
  status: VerificationToolStatus;
  command: string[];
  exitCode?: number;
  summary: string;
  evidenceId?: string;
  findings: GovernanceFinding[];
  limitations: string[];
}

export interface VerificationReport {
  status: "COMPLETE" | "PARTIAL";
  results: VerificationToolResult[];
  evidence: GovernanceEvidence[];
  findings: GovernanceFinding[];
  adapterResults: RepositoryAdapterResult[];
}

const MAX_TYPESCRIPT_PROJECTS = 20;
const MAX_PYTHON_FILES = 500;
const TOOL_TIMEOUT_MS = 60_000;

function stableId(value: string): string {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

function basename(file: string): string {
  return file.split("/").at(-1) ?? file;
}

function directoryname(file: string): string {
  const index = file.lastIndexOf("/");
  return index < 0 ? "." : file.slice(0, index) || ".";
}

function compactOutput(stdout: string, stderr: string): string {
  return [stdout.trim(), stderr.trim()].filter(Boolean).join("\n").slice(0, 4_000);
}

function typescriptFindings(output: string, evidenceId: string): GovernanceFinding[] {
  const findings: GovernanceFinding[] = [];
  const diagnosticPattern = /^(.+?)\((\d+),(\d+)\): error TS\d+: (.+)$/gm;
  for (const match of output.matchAll(diagnosticPattern)) {
    findings.push({
      id: `FND-TSC-${stableId(`${match[1]}:${match[2]}:${match[3]}:${match[4]}`)}`,
      rule_id: "TSC-TYPECHECK",
      severity: "P1",
      category: "static-analysis",
      message: match[4] ?? "TypeScript compiler reported an error.",
      status: "OPEN",
      evidence_refs: [evidenceId],
      source_location: {
        file: match[1] ?? "unknown",
        start_line: Number(match[2]),
        start_column: Number(match[3]),
      },
      confidence: 0.98,
      remediation: "Resolve the TypeScript compiler diagnostic and rerun the type check.",
    });
  }

  if (findings.length === 0 && output.trim()) {
    findings.push({
      id: `FND-TSC-${stableId(output)}`,
      rule_id: "TSC-TYPECHECK",
      severity: "P1",
      category: "static-analysis",
      message: output.trim().slice(0, 1_000),
      status: "OPEN",
      evidence_refs: [evidenceId],
      confidence: 0.9,
      remediation: "Review the TypeScript compiler output and resolve the reported failure.",
    });
  }
  return findings;
}

function pythonFindings(
  errors: Array<{ file?: string; line?: number; message?: string }>,
  evidenceId: string,
): GovernanceFinding[] {
  return errors.map((error, index) => ({
    id: `FND-PY-SYNTAX-${stableId(`${error.file ?? "unknown"}:${error.line ?? 0}:${error.message ?? index}`)}`,
    rule_id: "PYTHON-SYNTAX",
    severity: "P1",
    category: "static-analysis",
    message: `${error.message ?? "Python syntax error"} (${error.file ?? "unknown"})`,
    status: "OPEN",
    evidence_refs: [evidenceId],
    ...(error.file ? {
      source_location: {
        file: error.file,
        ...(error.line ? { start_line: error.line } : {}),
      },
    } : {}),
    confidence: 0.98,
    remediation: "Correct the Python syntax error and rerun syntax verification.",
  }));
}

export async function runVerificationAdapters(
  snapshot: RepositorySnapshot,
  runner: VerificationToolRunner,
): Promise<VerificationReport> {
  const results: VerificationToolResult[] = [];
  const evidence: GovernanceEvidence[] = [];
  const findings: GovernanceFinding[] = [];
  const adapterResults: RepositoryAdapterResult[] = [];
  const files = snapshot.files.map((file) => file.replaceAll("\\", "/"));
  const pythonFiles = files.filter((file) => file.endsWith(".py")).sort();
  const typescriptFiles = files.filter((file) => /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(file)).sort();
  const tsconfigs = files.filter((file) => basename(file) === "tsconfig.json").sort();

  if (typescriptFiles.length > 0) {
    const evidenceId = "EVD-TSC-TYPECHECK";
    if (tsconfigs.length === 0) {
      results.push({
        tool: "typescript",
        status: "UNVERIFIED",
        command: ["tsc", "--noEmit"],
        summary: "TypeScript files were found, but no tsconfig.json was discovered.",
        findings: [],
        limitations: ["TypeScript type checking requires a project configuration; no compiler command was executed."],
      });
      adapterResults.push({
        adapterId: "typescript-typecheck",
        version: "0.1.0",
        executionStatus: "PARTIAL",
        supportedCapabilities: [],
        unsupportedCapabilities: ["verification:typescript-typecheck"],
        evidenceRefs: [],
        limitations: ["No tsconfig.json was found; TypeScript type checking was not run."],
      });
    } else if (tsconfigs.length > MAX_TYPESCRIPT_PROJECTS) {
      results.push({
        tool: "typescript",
        status: "UNVERIFIED",
        command: ["tsc", "--noEmit"],
        summary: `Found ${tsconfigs.length} TypeScript projects; the safety limit is ${MAX_TYPESCRIPT_PROJECTS}.`,
        findings: [],
        limitations: ["Not all TypeScript projects were verified."],
      });
      adapterResults.push({
        adapterId: "typescript-typecheck",
        version: "0.1.0",
        executionStatus: "PARTIAL",
        supportedCapabilities: [],
        unsupportedCapabilities: ["verification:typescript-project-limit"],
        evidenceRefs: [],
        limitations: ["TypeScript project count exceeded the verification limit."],
      });
    } else {
      const unavailable = [];
      const processResults: VerificationProcessResult[] = [];
      const errors: string[] = [];
      for (const configPath of tsconfigs) {
        const workingDirectory = directoryname(configPath);
        if (!(await runner.isAvailable("typescript", snapshot.rootPath, workingDirectory))) {
          unavailable.push(configPath);
          continue;
        }
        try {
          processResults.push(await runner.run(
            "typescript",
            ["--noEmit", "--pretty", "false", "--project", "tsconfig.json"],
            snapshot.rootPath,
            workingDirectory,
            TOOL_TIMEOUT_MS,
          ));
        } catch (error) {
          errors.push(`${configPath}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      if (processResults.length === 0) {
        const limitations = [
          ...(unavailable.length ? [`TypeScript compiler unavailable for: ${unavailable.join(", ")}.`] : []),
          ...errors,
        ];
        results.push({
          tool: "typescript",
          status: errors.length > 0 ? "ERROR" : "UNVERIFIED",
          command: ["tsc", "--noEmit", "--pretty", "false"],
          summary: limitations.join(" ") || "No TypeScript project could be verified.",
          findings: [],
          limitations,
        });
        adapterResults.push({
          adapterId: "typescript-typecheck",
          version: "0.1.0",
          executionStatus: errors.length > 0 ? "FAILED" : "PARTIAL",
          supportedCapabilities: [],
          unsupportedCapabilities: ["verification:typescript-typecheck"],
          evidenceRefs: [],
          limitations,
        });
      } else {
        const failures = processResults.filter((result) => result.exitCode !== 0);
        const output = processResults.map((result) => compactOutput(result.stdout, result.stderr)).filter(Boolean).join("\n");
        const toolFindings = failures.flatMap((result) => typescriptFindings(
          compactOutput(result.stdout, result.stderr) || `TypeScript compiler exited with code ${result.exitCode} without diagnostics.`,
          evidenceId,
        ));
        const limitations = [
          ...unavailable.map((configPath) => `TypeScript compiler unavailable for ${configPath}.`),
          ...errors,
        ];
        const hasLimitations = limitations.length > 0;
        const status: VerificationToolStatus = failures.length > 0 ? "FAIL" : hasLimitations ? "UNVERIFIED" : "PASS";
        const toolEvidence: GovernanceEvidence = {
          id: evidenceId,
          type: "E3_AUTOMATED_ANALYSIS",
          status: status === "PASS" ? "VERIFIED" : "PARTIALLY_VERIFIED",
          description: failures.length > 0
            ? `TypeScript type checking failed in ${failures.length} project(s).`
            : hasLimitations
              ? `TypeScript type checking completed for ${processResults.length} project(s), but some projects were not verified.`
              : `TypeScript type checking passed for ${tsconfigs.length} project(s).`,
          source: "typescript-compiler-adapter",
          freshness: "current",
          supports_controls: [],
        };
        evidence.push(toolEvidence);
        findings.push(...toolFindings);
        results.push({
          tool: "typescript",
          status,
          command: ["tsc", "--noEmit", "--pretty", "false", "--project", "<each tsconfig.json>"],
          ...(failures.length > 0 ? { exitCode: 1 } : hasLimitations ? {} : { exitCode: 0 }),
          summary: failures.length > 0
            ? `TypeScript type checking failed in ${failures.length} project(s).`
            : hasLimitations
              ? "TypeScript type checking is incomplete; one or more projects could not be verified."
              : "TypeScript type checking passed.",
          evidenceId,
          findings: toolFindings,
          limitations,
        });
        adapterResults.push({
          adapterId: "typescript-typecheck",
          version: "0.1.0",
          executionStatus: hasLimitations ? "PARTIAL" : "SUCCESS",
          supportedCapabilities: ["verification:typescript-typecheck"],
          unsupportedCapabilities: hasLimitations ? ["verification:typescript-project-execution"] : [],
          evidenceRefs: [evidenceId],
          limitations,
        });
        if (output && failures.length > 0) {
          results[results.length - 1]!.summary += ` Diagnostics: ${output.slice(0, 1_000)}`;
        }
      }
    }
  }

  if (pythonFiles.length > 0) {
    const evidenceId = "EVD-PYTHON-SYNTAX";
    if (pythonFiles.length > MAX_PYTHON_FILES) {
      results.push({
        tool: "python",
        status: "UNVERIFIED",
        command: ["python", "-c", "ast.parse(...)"],
        summary: `Found ${pythonFiles.length} Python files; the safety limit is ${MAX_PYTHON_FILES}.`,
        findings: [],
        limitations: ["Not all Python files were verified."],
      });
      adapterResults.push({
        adapterId: "python-syntax",
        version: "0.1.0",
        executionStatus: "PARTIAL",
        supportedCapabilities: [],
        unsupportedCapabilities: ["verification:python-file-limit"],
        evidenceRefs: [],
        limitations: ["Python file count exceeded the verification limit."],
      });
    } else {
      const tool: VerificationToolName | undefined =
        (await runner.isAvailable("python3", snapshot.rootPath, ".")) ? "python3"
          : (await runner.isAvailable("python", snapshot.rootPath, ".")) ? "python"
            : undefined;
      if (!tool) {
        const limitation = "Neither python3 nor python was available; Python syntax was not checked.";
        results.push({
          tool: "python",
          status: "UNVERIFIED",
          command: ["python", "-c", "ast.parse(...)"],
          summary: limitation,
          findings: [],
          limitations: [limitation],
        });
        adapterResults.push({
          adapterId: "python-syntax",
          version: "0.1.0",
          executionStatus: "PARTIAL",
          supportedCapabilities: [],
          unsupportedCapabilities: ["verification:python-syntax"],
          evidenceRefs: [],
          limitations: [limitation],
        });
      } else {
        const script = [
          "import ast, json, pathlib, sys",
          "errors = []",
          "for name in sys.argv[1:]:",
          " try:",
          "  ast.parse(pathlib.Path(name).read_text(encoding='utf-8'), filename=name)",
          " except (SyntaxError, UnicodeError, OSError) as exc:",
          "  errors.append({'file': name, 'line': getattr(exc, 'lineno', None), 'message': str(exc)})",
          "print(json.dumps({'errors': errors}))",
          "sys.exit(1 if errors else 0)",
        ].join("\n");
        try {
          const processResult = await runner.run(
            tool,
            ["-c", script, ...pythonFiles],
            snapshot.rootPath,
            ".",
            TOOL_TIMEOUT_MS,
          );
          let parsedErrors: Array<{ file?: string; line?: number; message?: string }> = [];
          let invalidToolOutput = false;
          try {
            const parsed = JSON.parse(processResult.stdout) as { errors?: Array<{ file?: string; line?: number; message?: string }> };
            if (!parsed || !Array.isArray(parsed.errors)) throw new Error("Python syntax runner returned an invalid result shape.");
            parsedErrors = parsed.errors;
          } catch {
            invalidToolOutput = true;
            if (processResult.exitCode !== 0) {
              parsedErrors = [{
                message: compactOutput(processResult.stdout, processResult.stderr) || "Python syntax verification failed without diagnostics.",
              }];
            }
          }

          const status: VerificationToolStatus = invalidToolOutput && processResult.exitCode === 0
            ? "ERROR"
            : processResult.exitCode !== 0 || parsedErrors.length > 0
              ? "FAIL"
              : "PASS";
          const toolFindings = status === "FAIL" ? pythonFindings(parsedErrors, evidenceId) : [];
          evidence.push({
            id: evidenceId,
            type: "E3_AUTOMATED_ANALYSIS",
            status: status === "PASS" ? "VERIFIED" : "PARTIALLY_VERIFIED",
            description: status === "PASS"
              ? `Python syntax verification passed for ${pythonFiles.length} file(s).`
              : status === "FAIL"
                ? `Python syntax verification found ${parsedErrors.length || 1} failure(s).`
                : "Python syntax runner returned invalid output; verification could not be trusted.",
            source: "python-ast-adapter",
            freshness: "current",
            supports_controls: [],
          });
          findings.push(...toolFindings);
          results.push({
            tool: "python",
            status,
            command: [tool, "-c", "ast.parse(...)", `<${pythonFiles.length} source files>`],
            exitCode: processResult.exitCode,
            summary: status === "PASS"
              ? `Python syntax passed for ${pythonFiles.length} file(s).`
              : status === "FAIL"
                ? `Python syntax failed for ${parsedErrors.length || 1} file(s).`
                : "Python syntax runner returned invalid output.",
            evidenceId,
            findings: toolFindings,
            limitations: status === "ERROR" ? ["Python syntax runner returned invalid JSON or an invalid result shape."] : [],
          });
          adapterResults.push({
            adapterId: "python-syntax",
            version: "0.1.0",
            executionStatus: status === "ERROR" ? "FAILED" : "SUCCESS",
            supportedCapabilities: status === "ERROR" ? [] : ["verification:python-syntax"],
            unsupportedCapabilities: status === "ERROR" ? ["verification:python-syntax-output"] : [],
            evidenceRefs: [evidenceId],
            limitations: status === "ERROR" ? ["Python syntax runner returned invalid JSON or an invalid result shape."] : [],
          });
        } catch (error) {
          const limitation = `Python syntax runner failed: ${error instanceof Error ? error.message : String(error)}`;
          results.push({
            tool: "python",
            status: "ERROR",
            command: [tool, "-c", "ast.parse(...)"],
            summary: limitation,
            findings: [],
            limitations: [limitation],
          });
          adapterResults.push({
            adapterId: "python-syntax",
            version: "0.1.0",
            executionStatus: "FAILED",
            supportedCapabilities: [],
            unsupportedCapabilities: ["verification:python-syntax"],
            evidenceRefs: [],
            limitations: [limitation],
          });
        }
      }
    }
  }

  const status = adapterResults.some((result) => result.executionStatus === "PARTIAL" || result.executionStatus === "FAILED")
    ? "PARTIAL"
    : "COMPLETE";

  return { status, results, evidence, findings, adapterResults };
}
