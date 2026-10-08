import type { RepositoryAnalyzerAdapter } from "../types.js";
import { frameworkAdapter } from "./frameworks.js";
import { genericRepositoryAdapter } from "./generic.js";
import { pythonAdapter } from "./python.js";
import { typescriptAdapter } from "./typescript.js";

export const defaultAnalyzerAdapters: readonly RepositoryAnalyzerAdapter[] = [
  genericRepositoryAdapter,
  frameworkAdapter,
  typescriptAdapter,
  pythonAdapter,
];

export function selectAnalyzerAdapters(
  adapters: readonly RepositoryAnalyzerAdapter[],
  languages: readonly string[],
): RepositoryAnalyzerAdapter[] {
  const detected = new Set(languages);
  return adapters.filter(
    (adapter) =>
      adapter.languages.length === 0 ||
      adapter.languages.some((language) => detected.has(language)),
  );
}
