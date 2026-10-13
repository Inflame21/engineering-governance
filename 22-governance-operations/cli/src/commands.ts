import { analyzeRepository } from "../../analyzer/src/pipeline.js";
import type { ArchitectureProfile } from "../../analyzer/src/architecture.js";
import { toGovernanceContext } from "../../analyzer/src/normalize.js";
import { evaluateGovernance } from "../../engine/src/decision.js";
import type { GovernancePack } from "../../engine/src/types.js";
import { formatAnalysisResult, formatHumanResult, formatJsonResult } from "./output.js";

export interface AnalyzeCommandInput {
  snapshot: Parameters<typeof analyzeRepository>[0];
  governancePack: GovernancePack;
  json?: boolean;
  architectureProfile?: ArchitectureProfile;
}

export async function runGovernanceCommand(input: AnalyzeCommandInput) {
  const analysis = await analyzeRepository(input.snapshot, undefined, input.architectureProfile);
  const context = toGovernanceContext(analysis);
  const evaluation = evaluateGovernance(input.governancePack, context);
  const output = input.json
    ? formatJsonResult(analysis, evaluation, context)
    : formatHumanResult(analysis, evaluation, context);

  return { analysis, context, evaluation, output };
}

export async function runAnalyzeCommand(input: AnalyzeCommandInput): Promise<string> {
  return (await runGovernanceCommand(input)).output;
}

export async function runRepositoryAnalysisCommand(
  snapshot: Parameters<typeof analyzeRepository>[0],
  json = false,
  architectureProfile?: ArchitectureProfile,
) {
  const analysis = await analyzeRepository(snapshot, undefined, architectureProfile);
  const context = toGovernanceContext(analysis);
  return {
    analysis,
    context,
    output: formatAnalysisResult(analysis, context, json),
  };
}
