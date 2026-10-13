import { mergeAnalyzerOutputs } from "../../engine/src/analyzer.js";
import type { AnalyzerOutput } from "../../engine/src/types.js";
import { detectRepositoryFacts } from "./detector.js";
import { defaultAnalyzerAdapters } from "./adapters/registry.js";
import { toGovernanceContext } from "./normalize.js";
import { verifyArchitectureProfile } from "./architecture.js";
import { fingerprintRepositorySnapshot } from "./fingerprint.js";
import { buildRepositorySystemGraph } from "./system-graph.js";
import type { ArchitectureProfile } from "./architecture.js";
import type {
  RepositoryAdapterResult,
  RepositoryAnalysis,
  RepositoryFacts,
  RepositoryAnalyzerAdapter,
  RepositorySnapshot,
} from "./types.js";

const factKeys = [
  "languages",
  "frameworks",
  "packageManagers",
  "buildSystems",
  "infrastructureSystems",
  "testSystems",
] as const;

function mergeRepositoryFacts(
  baseFacts: RepositoryFacts,
  outputs: readonly AnalyzerOutput[],
): RepositoryFacts {
  const merged = { ...baseFacts };

  for (const key of factKeys) {
    const adapterValues = outputs.flatMap((output) => {
      const value = output.facts?.[key];
      return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
    });
    merged[key] = [...new Set([...baseFacts[key], ...adapterValues])].sort();
  }

  return merged;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function analyzeRepository(
  snapshot: RepositorySnapshot,
  adapters: readonly RepositoryAnalyzerAdapter[] = defaultAnalyzerAdapters,
  architectureProfile?: ArchitectureProfile,
): Promise<RepositoryAnalysis> {
  const baseFacts = detectRepositoryFacts(snapshot);
  const detectedLanguages = new Set(baseFacts.languages);
  const registeredLanguages = new Set(adapters.flatMap((adapter) => adapter.languages));
  const outputs: AnalyzerOutput[] = [];
  const adapterResults: RepositoryAdapterResult[] = [];
  const findings: RepositoryAnalysis["findings"] = [];

  // Keep language-relevant adapters in the result even when they cannot run.
  // A skipped/failed analyzer is not equivalent to a clean analysis.
  const relevantAdapters = adapters.filter((adapter) =>
    adapter.supports(snapshot) ||
    adapter.languages.some((language) => detectedLanguages.has(language)) ||
    adapter.languages.length === 0,
  );

  for (const adapter of relevantAdapters) {
    if (!adapter.supports(snapshot)) {
      adapterResults.push({
        adapterId: adapter.id,
        version: adapter.version,
        executionStatus: "SKIPPED",
        supportedCapabilities: [],
        unsupportedCapabilities: [...adapter.capabilities],
        evidenceRefs: [],
        limitations: ["Adapter was relevant to the detected repository but could not run on the available snapshot."],
      });
      continue;
    }

    try {
      const result = await adapter.analyze(snapshot);
      const executionStatus = result.executionStatus ?? "SUCCESS";
      const supportedCapabilities = result.supportedCapabilities ?? [...adapter.capabilities];
      const unsupportedCapabilities = result.unsupportedCapabilities ?? [];
      const limitations = result.limitations ?? [];

      outputs.push({
        signals: result.signals,
        ...(result.facts ? { facts: result.facts } : {}),
        evidence: result.evidence ?? [],
      });
      findings.push(...(result.findings ?? []));
      adapterResults.push({
        adapterId: adapter.id,
        version: adapter.version,
        executionStatus,
        supportedCapabilities,
        unsupportedCapabilities,
        evidenceRefs: (result.evidence ?? []).map((item) => item.id),
        limitations,
      });
    } catch (error) {
      adapterResults.push({
        adapterId: adapter.id,
        version: adapter.version,
        executionStatus: "FAILED",
        supportedCapabilities: [],
        unsupportedCapabilities: [...adapter.capabilities],
        evidenceRefs: [],
        limitations: [`Adapter execution failed: ${errorMessage(error)}`],
      });
    }
  }

  const uncoveredLanguages = [...detectedLanguages].filter(
    (language) => !registeredLanguages.has(language),
  );
  if (uncoveredLanguages.length > 0) {
    adapterResults.push({
      adapterId: "language-coverage",
      version: "0.1.0",
      executionStatus: "PARTIAL",
      supportedCapabilities: [],
      unsupportedCapabilities: uncoveredLanguages.map((language) => `language-specific-analysis:${language}`),
      evidenceRefs: [],
      limitations: [`No language-specific adapter is registered for: ${uncoveredLanguages.join(", ")}.`],
    });
  }

  if (snapshot.contentLimitations?.length) {
    adapterResults.push({
      adapterId: "repository-snapshot",
      version: "0.1.0",
      executionStatus: "PARTIAL",
      supportedCapabilities: [],
      unsupportedCapabilities: ["repository:source-content"],
      evidenceRefs: [],
      limitations: [...snapshot.contentLimitations],
    });
  }

  const merged = mergeAnalyzerOutputs(outputs);
  const snapshotFingerprint = fingerprintRepositorySnapshot(snapshot);
  const generatedAt = new Date().toISOString();
  const architecture = architectureProfile
    ? verifyArchitectureProfile(snapshot, architectureProfile)
    : undefined;
  const systemGraph = buildRepositorySystemGraph(snapshot);

  adapterResults.push({
    adapterId: "system-graph",
    version: "0.1.0",
    executionStatus: systemGraph.status === "PARTIAL" ? "PARTIAL" : "SUCCESS",
    supportedCapabilities: ["system-graph:package", "system-graph:api", "system-graph:database", "system-graph:event"],
    unsupportedCapabilities: systemGraph.status === "PARTIAL" ? ["system-graph:source-coverage"] : [],
    evidenceRefs: systemGraph.evidence.map((item) => item.id),
    limitations: systemGraph.limitations,
  });

  if (architecture) {
    findings.push(...architecture.findings);
    adapterResults.push({
      adapterId: `architecture-profile:${architecture.profileId}`,
      version: architectureProfile?.version ?? "unknown",
      executionStatus: architecture.status === "FAILED" ? "FAILED" : architecture.status === "PARTIAL" ? "PARTIAL" : "SUCCESS",
      supportedCapabilities: architecture.supportedCapabilities,
      unsupportedCapabilities: architecture.unsupportedCapabilities,
      evidenceRefs: architecture.evidence.map((item) => item.id),
      limitations: architecture.limitations,
    });
  }

  const analysis: RepositoryAnalysis = {
    facts: mergeRepositoryFacts(baseFacts, outputs),
    signals: merged.signals,
    evidence: [...(merged.evidence ?? []), ...(architecture?.evidence ?? []), ...systemGraph.evidence].map((item) => ({
      ...item,
      generated_at: item.generated_at ?? generatedAt,
      repository_fingerprint: item.repository_fingerprint ?? snapshotFingerprint.digest,
    })),
    findings,
    adapterResults,
    ...(architecture ? { architecture } : {}),
    systemGraph,
    ...(snapshot.changeScope ? { changeScope: snapshot.changeScope } : {}),
    snapshotFingerprint,
  };

  // Validate that the normalization path is executable and deterministic.
  toGovernanceContext(analysis);

  return analysis;
}
