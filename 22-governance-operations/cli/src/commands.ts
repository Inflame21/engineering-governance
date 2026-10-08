import { analyzeRepository } from "../../analyzer/src/pipeline.js";
import { evaluateGovernance } from "../../engine/src/decision.js";
import type { GovernancePack } from "../../engine/src/types.js";
import { formatHumanResult, formatJsonResult } from "./output.js";

export interface AnalyzeCommandInput {
  snapshot: Parameters<typeof analyzeRepository>[0];
  governancePack: GovernancePack;
  json?: boolean;
}

export async function runAnalyzeCommand(input: AnalyzeCommandInput): Promise<string> {
  const analysis = await analyzeRepository(input.snapshot);
  const evaluation = evaluateGovernance(input.governancePack, {
    signals: analysis.signals,
    facts: analysis.facts,
  });

  return input.json
    ? formatJsonResult(analysis, evaluation)
    : formatHumanResult(analysis, evaluation);
}
