import { createRequire } from "node:module";
import path from "node:path";
import type { GovernanceEvidence, GovernanceFinding } from "../../engine/src/types.js";
import architectureProfileSchema from "../../model/architecture-profile.schema.json" with { type: "json" };
import type { RepositorySnapshot } from "./types.js";

export interface ArchitectureBoundaryRule {
  id: string;
  description: string;
  severity: "P0" | "P1" | "P2" | "P3";
  sourcePattern?: string;
  targetPattern?: string;
  allowed?: boolean;
}

export interface ArchitectureProfile {
  id: string;
  version: string;
  name: string;
  description?: string;
  styles: string[];
  boundaryRules: ArchitectureBoundaryRule[];
  requiredControls: string[];
  capabilities?: string[];
  componentMappings?: Record<string, string[]>;
  metadata?: Record<string, unknown>;
}

export interface ArchitectureProfileValidation {
  valid: boolean;
  errors: string[];
}

export interface ArchitectureGraphNode {
  id: string;
  path: string;
  language: string;
  roles: string[];
}

export interface ArchitectureGraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  importSpecifier: string;
  sourceLocation: { file: string; line: number };
  evidenceRef: string;
  confidence: number;
}

export interface ArchitectureDependencyGraph {
  nodes: ArchitectureGraphNode[];
  edges: ArchitectureGraphEdge[];
  unresolvedRelativeImports: Array<{ file: string; line: number; specifier: string }>;
  unsupportedLanguages: string[];
}

export interface ArchitectureVerificationResult {
  profileId: string;
  status: "COMPLETE" | "PARTIAL" | "FAILED";
  graph: ArchitectureDependencyGraph;
  evidence: GovernanceEvidence[];
  findings: GovernanceFinding[];
  limitations: string[];
  supportedCapabilities: string[];
  unsupportedCapabilities: string[];
}

interface SchemaError {
  instancePath?: string;
  message?: string;
}

interface SchemaValidator {
  (value: unknown): boolean;
  errors: SchemaError[] | null;
}

interface AjvInstance {
  compile(schema: unknown): SchemaValidator;
}

type AjvConstructor = new (options: { allErrors: boolean; strict: boolean }) => AjvInstance;

const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020.js") as AjvConstructor;
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateSchema = ajv.compile(architectureProfileSchema);

const sourceExtensions: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".go": "go",
  ".java": "java",
  ".rs": "rust",
  ".cs": "csharp",
  ".rb": "ruby",
  ".php": "php",
  ".kt": "kotlin",
  ".swift": "swift",
  ".c": "c",
  ".h": "c",
  ".cc": "cpp",
  ".cpp": "cpp",
  ".hpp": "cpp",
};

const graphableLanguages = new Set(["typescript", "javascript", "python"]);
const resolutionExtensions = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".py"];

export function validateArchitectureProfile(value: unknown): ArchitectureProfileValidation {
  if (!validateSchema(value)) {
    const errors = (validateSchema.errors ?? []).map((error) => {
      const location = error.instancePath || "/";
      return `${location} ${error.message ?? "is invalid"}`;
    });
    return { valid: false, errors };
  }

  const profile = value as ArchitectureProfile;
  const ruleIds = new Set<string>();
  const errors: string[] = [];

  for (const rule of profile.boundaryRules) {
    if (ruleIds.has(rule.id)) errors.push(`/boundaryRules contains duplicate rule id '${rule.id}'.`);
    ruleIds.add(rule.id);
  }

  return { valid: errors.length === 0, errors };
}

export function architectureSignals(profile: ArchitectureProfile): string[] {
  return [
    ...new Set([
      ...profile.styles.map((style) => `architecture:${style}`),
      `architecture-profile:${profile.id}`,
    ]),
  ].sort();
}

function languageForFile(file: string): string | undefined {
  return sourceExtensions[path.posix.extname(file).toLowerCase()];
}

function globToRegExp(pattern: string): RegExp {
  let source = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index]!;
    if (character === "*") {
      if (pattern[index + 1] === "*") {
        source += ".*";
        index += 1;
      } else {
        source += "[^/]*";
      }
    } else if (character === "?") {
      source += "[^/]";
    } else {
      source += character.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
    }
  }
  return new RegExp(`${source}$`);
}

function mapRoles(file: string, mappings: Record<string, string[]> | undefined): string[] {
  if (!mappings) return [];
  return Object.entries(mappings)
    .filter(([, patterns]) => patterns.some((pattern) => globToRegExp(pattern).test(file)))
    .map(([role]) => role)
    .sort();
}

function importsForFile(file: string, content: string): Array<{ specifier: string; line: number }> {
  const results: Array<{ specifier: string; line: number }> = [];
  const language = languageForFile(file);
  const patterns = language === "python"
    ? [
        /^(\s*)from\s+(\.{1,}[\w.]*)\s+import\s+[^\n]+/gm,
        /^(\s*)from\s+([\w.]+)\s+import\s+[^\n]+/gm,
        /^(\s*)import\s+([\w.]+)(?:\s+as\s+\w+)?/gm,
      ]
    : [
        /\b(?:import|export)\s+(?:type\s+)?(?:[^;"']*?\s+from\s+)?["']([^"']+)["']/g,
        /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
      ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      const specifier = language === "python" ? match[2] : match[1];
      if (!specifier) continue;
      const start = match.index ?? 0;
      const line = content.slice(0, start).split("\n").length;
      results.push({ specifier, line });
    }
  }

  const unique = new Map<string, { specifier: string; line: number }>();
  for (const item of results) unique.set(`${item.line}: ${item.specifier}`, item);
  return [...unique.values()].sort((a, b) => a.line - b.line || a.specifier.localeCompare(b.specifier));
}

function resolveTypeScriptImport(
  sourceFile: string,
  specifier: string,
  fileSet: Set<string>,
): string | undefined {
  if (!specifier.startsWith(".")) return undefined;
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(sourceFile), specifier));
  const sourceExtension = path.posix.extname(base);
  const extensionlessBase = sourceExtension ? base.slice(0, -sourceExtension.length) : base;
  const candidates = [
    base,
    ...resolutionExtensions.map((extension) => `${base}${extension}`),
    ...(sourceExtension ? resolutionExtensions.map((extension) => `${extensionlessBase}${extension}`) : []),
  ];
  for (const extension of resolutionExtensions) candidates.push(path.posix.join(base, `index${extension}`));
  return candidates.find((candidate) => fileSet.has(candidate));
}

function resolvePythonImport(
  sourceFile: string,
  specifier: string,
  fileSet: Set<string>,
  topLevelModules: Set<string>,
): { target?: string; looksLocal: boolean } {
  const isRelative = specifier.startsWith(".");
  const segments = specifier.split(".");
  let base: string;

  if (isRelative) {
    const dots = specifier.match(/^\.+/)?.[0].length ?? 1;
    const moduleParts = specifier.slice(dots).split(".").filter(Boolean);
    let directory = path.posix.dirname(sourceFile);
    for (let level = 1; level < dots; level += 1) directory = path.posix.dirname(directory);
    base = path.posix.join(directory, ...moduleParts);
  } else {
    base = path.posix.join(...segments);
  }

  const candidates = [`${base}.py`, path.posix.join(base, "__init__.py")];
  const target = candidates.find((candidate) => fileSet.has(candidate));
  if (target) return { target, looksLocal: true };
  const first = segments.find(Boolean) ?? "";
  return { looksLocal: isRelative || topLevelModules.has(first) };
}

function stableId(value: string): string {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

export function buildArchitectureDependencyGraph(
  snapshot: RepositorySnapshot,
  profile?: ArchitectureProfile,
): ArchitectureDependencyGraph {
  const sourceFiles = snapshot.files
    .filter((file) => languageForFile(file) !== undefined)
    .map((file) => file.replaceAll("\\", "/"))
    .sort();
  const fileSet = new Set(sourceFiles);
  const sourceContent = snapshot.fileContents ?? {};
  const topLevelModules = new Set(sourceFiles.map((file) => file.split("/")[0]?.replace(/\.py$/, "") ?? ""));
  const nodes: ArchitectureGraphNode[] = sourceFiles.map((file) => ({
    id: `FILE:${file}`,
    path: file,
    language: languageForFile(file) ?? "unknown",
    roles: mapRoles(file, profile?.componentMappings),
  }));
  const nodeIds = new Set(nodes.map((node) => node.path));
  const edges: ArchitectureGraphEdge[] = [];
  const unresolvedRelativeImports: ArchitectureDependencyGraph["unresolvedRelativeImports"] = [];

  for (const sourceFile of sourceFiles) {
    const content = sourceContent[sourceFile];
    if (content === undefined) continue;
    const language = languageForFile(sourceFile);
    if (!language || !graphableLanguages.has(language)) continue;

    for (const item of importsForFile(sourceFile, content)) {
      let target: string | undefined;
      let looksLocal = false;
      if (language === "python") {
        const resolved = resolvePythonImport(sourceFile, item.specifier, fileSet, topLevelModules);
        target = resolved.target;
        looksLocal = resolved.looksLocal;
      } else {
        target = resolveTypeScriptImport(sourceFile, item.specifier, fileSet);
        looksLocal = item.specifier.startsWith(".");
      }

      if (!target) {
        if (looksLocal) unresolvedRelativeImports.push({
          file: sourceFile,
          line: item.line,
          specifier: item.specifier,
        });
        continue;
      }

      if (!nodeIds.has(target)) continue;
      const evidenceRef = `EVD-ARCH-${stableId(`${sourceFile}:${item.line}:${item.specifier}:${target}`)}`;
      edges.push({
        id: `EDGE-${stableId(`${sourceFile}:${item.line}:${item.specifier}:${target}`)}`,
        sourceId: `FILE:${sourceFile}`,
        targetId: `FILE:${target}`,
        importSpecifier: item.specifier,
        sourceLocation: { file: sourceFile, line: item.line },
        evidenceRef,
        confidence: 0.9,
      });
    }
  }

  const unsupportedLanguages = [...new Set(
    sourceFiles
      .map((file) => languageForFile(file))
      .filter((language): language is string => Boolean(language) && !graphableLanguages.has(language!)),
  )].sort();

  return {
    nodes,
    edges: edges.sort((a, b) =>
      a.sourceId.localeCompare(b.sourceId) ||
      a.sourceLocation.line - b.sourceLocation.line ||
      a.targetId.localeCompare(b.targetId),
    ),
    unresolvedRelativeImports: unresolvedRelativeImports.sort((a, b) =>
      a.file.localeCompare(b.file) || a.line - b.line,
    ),
    unsupportedLanguages,
  };
}

function roleAlternatives(pattern: string | undefined): string[] {
  return pattern ? pattern.split("|").map((role) => role.trim()).filter(Boolean) : [];
}

export function verifyArchitectureProfile(
  snapshot: RepositorySnapshot,
  profile: ArchitectureProfile,
): ArchitectureVerificationResult {
  const graph = buildArchitectureDependencyGraph(snapshot, profile);
  const limitations: string[] = [];
  const unsupportedCapabilities: string[] = [];
  const supportedCapabilities = ["dependency-graph:typescript", "dependency-graph:javascript", "dependency-graph:python"];
  const evidence: GovernanceEvidence[] = [];
  const findings: GovernanceFinding[] = [];
  const nodeByPath = new Map(graph.nodes.map((node) => [node.path, node]));

  if (!profile.componentMappings || Object.keys(profile.componentMappings).length === 0) {
    limitations.push("The profile has no componentMappings; declared boundary rules cannot be checked against repository paths.");
    unsupportedCapabilities.push("architecture:component-role-mapping");
  }

  if (graph.unsupportedLanguages.length > 0) {
    limitations.push(`Dependency graph extraction is not implemented for: ${graph.unsupportedLanguages.join(", ")}.`);
    unsupportedCapabilities.push(...graph.unsupportedLanguages.map((language) => `architecture:dependency-graph:${language}`));
  }

  if (graph.unresolvedRelativeImports.length > 0) {
    limitations.push(`${graph.unresolvedRelativeImports.length} local import(s) could not be resolved; boundary verification may be incomplete.`);
    unsupportedCapabilities.push("architecture:resolve-local-imports");
  }

  for (const edge of graph.edges) {
    evidence.push({
      id: edge.evidenceRef,
      type: "E3_AUTOMATED_ANALYSIS",
      status: "VERIFIED",
      description: `Static import edge ${edge.sourceId} -> ${edge.targetId} was extracted from source code.`,
      source: `${edge.sourceLocation.file}:${edge.sourceLocation.line}`,
      freshness: "current",
      supports_controls: [],
    });
  }

  let unverifiedRules = 0;
  for (const rule of profile.boundaryRules) {
    if (rule.allowed === true) continue;
    const sourceRoles = roleAlternatives(rule.sourcePattern);
    const targetRoles = roleAlternatives(rule.targetPattern);
    if (sourceRoles.length === 0 || targetRoles.length === 0) {
      unverifiedRules += 1;
      limitations.push(`Boundary rule ${rule.id} is missing a sourcePattern or targetPattern.`);
      continue;
    }

    const matchingSources = graph.nodes.filter((node) => node.roles.some((role) => sourceRoles.includes(role)));
    const matchingTargets = graph.nodes.filter((node) => node.roles.some((role) => targetRoles.includes(role)));
    if (matchingSources.length === 0 || matchingTargets.length === 0) {
      unverifiedRules += 1;
      limitations.push(`Boundary rule ${rule.id} could not be verified because a mapped source or target role has no matched files.`);
      continue;
    }

    for (const edge of graph.edges) {
      const source = nodeByPath.get(edge.sourceId.slice("FILE:".length));
      const target = nodeByPath.get(edge.targetId.slice("FILE:".length));
      if (
        source?.roles.some((role) => sourceRoles.includes(role)) &&
        target?.roles.some((role) => targetRoles.includes(role))
      ) {
        findings.push({
          id: `FND-ARCH-${stableId(`${rule.id}:${edge.id}`)}`,
          rule_id: rule.id,
          severity: rule.severity,
          category: "architecture-boundary",
          message: `${rule.description} Found dependency ${source.path} -> ${target.path}.`,
          status: "OPEN",
          evidence_refs: [edge.evidenceRef],
          source_location: {
            file: edge.sourceLocation.file,
            start_line: edge.sourceLocation.line,
          },
          component_id: source.roles.find((role) => sourceRoles.includes(role)),
          confidence: edge.confidence,
          remediation: `Remove or invert the dependency from ${source.path} to ${target.path}.`,
        });
      }
    }
  }

  if (unverifiedRules > 0) unsupportedCapabilities.push("architecture:boundary-rule-verification");
  if (findings.length > 0) {
    // Findings are verification results; they do not imply graph extraction failed.
  }

  const status =
    unsupportedCapabilities.length > 0 || unverifiedRules > 0
      ? "PARTIAL"
      : "COMPLETE";

  return {
    profileId: profile.id,
    status,
    graph,
    evidence,
    findings,
    limitations: [...new Set(limitations)],
    supportedCapabilities,
    unsupportedCapabilities: [...new Set(unsupportedCapabilities)].sort(),
  };
}
