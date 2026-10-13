import path from "node:path";
import type { GovernanceEvidence, GovernanceFinding } from "../../engine/src/types.js";
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
  uninspectedSourceFiles: string[];
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

const allowedProfileProperties = new Set([
  "id",
  "version",
  "name",
  "description",
  "styles",
  "boundaryRules",
  "requiredControls",
  "capabilities",
  "componentMappings",
  "metadata",
]);

export function validateArchitectureProfile(value: unknown): ArchitectureProfileValidation {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { valid: false, errors: ["Architecture profile must be a JSON object."] };
  }

  const profile = value as Record<string, unknown>;
  for (const property of Object.keys(profile)) {
    if (!allowedProfileProperties.has(property)) {
      errors.push(`/${property} is not an allowed profile property.`);
    }
  }

  if (typeof profile.id !== "string" || !/^[a-z][a-z0-9-]*$/.test(profile.id)) {
    errors.push("/id must be a lowercase identifier.");
  }
  if (typeof profile.version !== "string" || !/^\d+\.\d+\.\d+$/.test(profile.version)) {
    errors.push("/version must use semantic version format X.Y.Z.");
  }
  if (typeof profile.name !== "string" || profile.name.trim().length === 0) {
    errors.push("/name must be a non-empty string.");
  }
  if (
    profile.description !== undefined &&
    (typeof profile.description !== "string")
  ) {
    errors.push("/description must be a string.");
  }

  const validateStringArray = (key: string, required: boolean): void => {
    const candidate = profile[key];
    if (candidate === undefined && !required) return;
    if (
      !Array.isArray(candidate) ||
      candidate.some((item) => typeof item !== "string" || item.trim().length === 0)
    ) {
      errors.push(`/${key} must be an array of non-empty strings.`);
      return;
    }
    if (new Set(candidate).size !== candidate.length) {
      errors.push(`/${key} must not contain duplicates.`);
    }
  };

  validateStringArray("styles", true);
  validateStringArray("requiredControls", true);
  validateStringArray("capabilities", false);

  if (!Array.isArray(profile.boundaryRules)) {
    errors.push("/boundaryRules must be an array.");
  } else {
    const ruleIds = new Set<string>();
    const allowedRuleProperties = new Set([
      "id", "description", "severity", "sourcePattern", "targetPattern", "allowed",
    ]);
    profile.boundaryRules.forEach((candidate, index) => {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
        errors.push(`/boundaryRules/${index} must be an object.`);
        return;
      }
      const rule = candidate as Record<string, unknown>;
      for (const property of Object.keys(rule)) {
        if (!allowedRuleProperties.has(property)) {
          errors.push(`/boundaryRules/${index}/${property} is not allowed.`);
        }
      }
      if (typeof rule.id !== "string" || !/^[A-Z0-9][A-Z0-9-]*$/.test(rule.id)) {
        errors.push(`/boundaryRules/${index}/id must be an uppercase rule identifier.`);
      } else if (ruleIds.has(rule.id)) {
        errors.push(`/boundaryRules contains duplicate rule id '${rule.id}'.`);
      } else {
        ruleIds.add(rule.id);
      }
      if (typeof rule.description !== "string" || rule.description.trim().length === 0) {
        errors.push(`/boundaryRules/${index}/description must be a non-empty string.`);
      }
      if (!["P0", "P1", "P2", "P3"].includes(String(rule.severity))) {
        errors.push(`/boundaryRules/${index}/severity must be P0, P1, P2, or P3.`);
      }
      for (const key of ["sourcePattern", "targetPattern"] as const) {
        if (rule[key] !== undefined && (typeof rule[key] !== "string" || rule[key].trim().length === 0)) {
          errors.push(`/boundaryRules/${index}/${key} must be a non-empty string when provided.`);
        }
      }
      if (rule.allowed !== undefined && typeof rule.allowed !== "boolean") {
        errors.push(`/boundaryRules/${index}/allowed must be a boolean when provided.`);
      }
    });
  }

  if (profile.componentMappings !== undefined) {
    if (!profile.componentMappings || typeof profile.componentMappings !== "object" || Array.isArray(profile.componentMappings)) {
      errors.push("/componentMappings must be an object mapping roles to path-pattern arrays.");
    } else {
      for (const [role, patterns] of Object.entries(profile.componentMappings as Record<string, unknown>)) {
        if (!role.trim() || !Array.isArray(patterns) || patterns.length === 0 ||
          patterns.some((pattern) => typeof pattern !== "string" || pattern.trim().length === 0)) {
          errors.push(`/componentMappings/${role} must be a non-empty array of path patterns.`);
        }
      }
    }
  }

  if (profile.metadata !== undefined && (!profile.metadata || typeof profile.metadata !== "object" || Array.isArray(profile.metadata))) {
    errors.push("/metadata must be an object when provided.");
  }

  return { valid: errors.length === 0, errors };
}

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

  const uninspectedSourceFiles = sourceFiles
    .filter((file) => {
      const language = languageForFile(file);
      return Boolean(language && graphableLanguages.has(language) && sourceContent[file] === undefined);
    })
    .sort();
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
    uninspectedSourceFiles,
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

  if (graph.uninspectedSourceFiles.length > 0) {
    limitations.push(`${graph.uninspectedSourceFiles.length} source file(s) were not inspected for dependencies.`);
    unsupportedCapabilities.push("architecture:source-content");
  }

  if (snapshot.contentLimitations?.length) {
    limitations.push(...snapshot.contentLimitations);
    unsupportedCapabilities.push("repository:content-limits");
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
        const componentId = source.roles.find((role) => sourceRoles.includes(role));
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
          ...(componentId ? { component_id: componentId } : {}),
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
