import path from "node:path";
import { detectRepositoryFacts } from "./detector.js";
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
  packageId?: string;
  packageRoot?: string;
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

export interface ArchitectureGraphComponent {
  id: string;
  role: string;
  files: string[];
}

export interface ArchitectureComponentEdge {
  id: string;
  sourceComponentId: string;
  targetComponentId: string;
  sourceFile: string;
  targetFile: string;
  sourceLocation: { file: string; line: number };
  evidenceRef: string;
}

export interface ArchitectureChangeImpact {
  status: "NOT_REQUESTED" | "VERIFIED" | "PARTIAL" | "UNVERIFIED";
  changedFiles: string[];
  changedComponents: string[];
  impactedFiles: string[];
  impactedComponents: string[];
  unmappedChangedFiles: string[];
  unresolvedChangedFiles: string[];
  limitations: string[];
}

export interface ArchitecturePackageEdge {
  id: string;
  sourcePackageId: string;
  targetPackageId: string;
  sourceFile: string;
  targetFile: string;
  sourceLocation: { file: string; line: number };
  evidenceRef: string;
}

export interface ArchitectureDependencyGraph {
  nodes: ArchitectureGraphNode[];
  edges: ArchitectureGraphEdge[];
  components: ArchitectureGraphComponent[];
  componentEdges: ArchitectureComponentEdge[];
  packageEdges: ArchitecturePackageEdge[];
  changeImpact: ArchitectureChangeImpact;
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
  if (Array.isArray(profile.styles) && profile.styles.length === 0) {
    errors.push("/styles must contain at least one architecture style.");
  }
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
        if (!/^[a-z][a-z0-9-]*$/.test(role)) {
          errors.push(`/componentMappings/${role} must use a lowercase role identifier.`);
        }
        if (!Array.isArray(patterns) || patterns.length === 0 ||
          patterns.some((pattern) => typeof pattern !== "string" || pattern.trim().length === 0)) {
          errors.push(`/componentMappings/${role} must be a non-empty array of path patterns.`);
        } else if (new Set(patterns).size !== patterns.length) {
          errors.push(`/componentMappings/${role} must not contain duplicate path patterns.`);
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
  const packageFacts = [...(detectRepositoryFacts(snapshot).packages ?? [])]
    .sort((left, right) => right.root.length - left.root.length);
  const packageForFile = (file: string) => packageFacts.find(
    (item) => item.root === "." || file === item.root || file.startsWith(`${item.root}/`),
  );
  const nodes: ArchitectureGraphNode[] = sourceFiles.map((file) => {
    const projectPackage = packageForFile(file);
    return {
      id: `FILE:${file}`,
      path: file,
      language: languageForFile(file) ?? "unknown",
      roles: mapRoles(file, profile?.componentMappings),
      ...(projectPackage ? { packageId: projectPackage.id, packageRoot: projectPackage.root } : {}),
    };
  });
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
        // Common alias conventions are potentially local. Until tsconfig/jsconfig
        // path mappings are resolved, do not silently treat them as external.
        looksLocal =
          item.specifier.startsWith(".") ||
          item.specifier.startsWith("@/") ||
          item.specifier.startsWith("~/") ||
          item.specifier.startsWith("src/") ||
          item.specifier.startsWith("app/") ||
          item.specifier.startsWith("#");
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

  const componentFiles = new Map<string, string[]>();
  for (const node of nodes) {
    for (const role of node.roles) {
      const filesForRole = componentFiles.get(role) ?? [];
      filesForRole.push(node.path);
      componentFiles.set(role, filesForRole);
    }
  }
  const components: ArchitectureGraphComponent[] = [...componentFiles.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([role, filesForRole]) => ({
      id: `COMP:${role}`,
      role,
      files: [...filesForRole].sort(),
    }));
  const nodeByPath = new Map(nodes.map((node) => [node.path, node]));
  const componentEdges: ArchitectureComponentEdge[] = [];
  for (const edge of edges) {
    const source = nodeByPath.get(edge.sourceId.slice("FILE:".length));
    const target = nodeByPath.get(edge.targetId.slice("FILE:".length));
    for (const sourceRole of source?.roles ?? []) {
      for (const targetRole of target?.roles ?? []) {
        componentEdges.push({
          id: `COMPEDGE:${stableId(`${sourceRole}:${targetRole}:${edge.id}`)}`,
          sourceComponentId: `COMP:${sourceRole}`,
          targetComponentId: `COMP:${targetRole}`,
          sourceFile: source?.path ?? "",
          targetFile: target?.path ?? "",
          sourceLocation: edge.sourceLocation,
          evidenceRef: edge.evidenceRef,
        });
      }
    }
  }

  const normalizedChangedFiles = [...new Set(
    (snapshot.changeScope?.status === "VERIFIED"
      ? snapshot.changeScope.files
      : snapshot.changedFiles)
      .map((file) => file.replaceAll("\\", "/").replace(/^\.\//, "")),
  )].sort();
  const changeImpactLimitations: string[] = [];
  let changeImpactStatus: ArchitectureChangeImpact["status"] = snapshot.changeScope?.status === "VERIFIED" ? "VERIFIED" : "NOT_REQUESTED";
  const changedComponents = new Set<string>();
  const impactedFileSet = new Set<string>();
  const unresolvedChangedFiles: string[] = [];
  const unmappedChangedFiles: string[] = [];

  if (snapshot.changeScope?.status === "UNVERIFIED") {
    changeImpactStatus = "UNVERIFIED";
    changeImpactLimitations.push(
      snapshot.changeScope.reason ?? "Changed-file scope could not be verified against Git.",
    );
  } else if (normalizedChangedFiles.length > 0) {
    changeImpactStatus = snapshot.changeScope?.status === "VERIFIED" ? "VERIFIED" : "UNVERIFIED";
    if (changeImpactStatus === "UNVERIFIED") {
      changeImpactLimitations.push("Changed files were supplied without a verified Git change scope.");
    }

    const reverseFileDependencies = new Map<string, Set<string>>();
    for (const edge of edges) {
      const source = edge.sourceId.slice("FILE:".length);
      const target = edge.targetId.slice("FILE:".length);
      const dependents = reverseFileDependencies.get(target) ?? new Set<string>();
      dependents.add(source);
      reverseFileDependencies.set(target, dependents);
    }

    const queue: string[] = [];
    for (const changedFile of normalizedChangedFiles) {
      if (!fileSet.has(changedFile)) {
        // Only source files represented by this graph affect architecture impact.
        if (languageForFile(changedFile)) unresolvedChangedFiles.push(changedFile);
        continue;
      }
      impactedFileSet.add(changedFile);
      queue.push(changedFile);
      const node = nodeByPath.get(changedFile);
      if (!node || node.roles.length === 0) unmappedChangedFiles.push(changedFile);
      for (const role of node?.roles ?? []) changedComponents.add(`COMP:${role}`);
    }

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const changedDependency = queue[cursor]!;
      for (const dependent of reverseFileDependencies.get(changedDependency) ?? []) {
        if (impactedFileSet.has(dependent)) continue;
        impactedFileSet.add(dependent);
        queue.push(dependent);
      }
    }

    if (unresolvedChangedFiles.length > 0) {
      changeImpactStatus = "PARTIAL";
      changeImpactLimitations.push(
        `Changed source file(s) were not present in the inspected snapshot: ${unresolvedChangedFiles.join(", ")}.`,
      );
    }
    if (unmappedChangedFiles.length > 0) {
      changeImpactStatus = "PARTIAL";
      changeImpactLimitations.push(
        `Changed source file(s) have no architecture role mapping: ${unmappedChangedFiles.join(", ")}.`,
      );
    }
    if (graphableLanguages.size > 0 && uninspectedSourceFiles.length > 0) {
      changeImpactStatus = "PARTIAL";
      changeImpactLimitations.push(
        "Some source files were not inspected, so reverse-dependency impact may be incomplete.",
      );
    }
  }

  const impactedComponents = new Set<string>();
  for (const file of impactedFileSet) {
    for (const role of nodeByPath.get(file)?.roles ?? []) impactedComponents.add(`COMP:${role}`);
  }

  const packageEdges: ArchitecturePackageEdge[] = [];
  for (const edge of edges) {
    const source = nodeByPath.get(edge.sourceId.slice("FILE:".length));
    const target = nodeByPath.get(edge.targetId.slice("FILE:".length));
    if (!source?.packageId || !target?.packageId || source.packageId === target.packageId) continue;
    packageEdges.push({
      id: `PKGEDGE:${stableId(`${source.packageId}:${target.packageId}:${edge.id}`)}`,
      sourcePackageId: source.packageId,
      targetPackageId: target.packageId,
      sourceFile: source.path,
      targetFile: target.path,
      sourceLocation: edge.sourceLocation,
      evidenceRef: edge.evidenceRef,
    });
  }

  const changeImpact: ArchitectureChangeImpact = {
    status: changeImpactStatus,
    changedFiles: normalizedChangedFiles,
    changedComponents: [...changedComponents].sort(),
    impactedFiles: [...impactedFileSet].sort(),
    impactedComponents: [...impactedComponents].sort(),
    unmappedChangedFiles: [...new Set(unmappedChangedFiles)].sort(),
    unresolvedChangedFiles: [...new Set(unresolvedChangedFiles)].sort(),
    limitations: [...new Set(changeImpactLimitations)].sort(),
  };

  return {
    nodes,
    edges: edges.sort((a, b) =>
      a.sourceId.localeCompare(b.sourceId) ||
      a.sourceLocation.line - b.sourceLocation.line ||
      a.targetId.localeCompare(b.targetId),
    ),
    components,
    componentEdges: componentEdges.sort((a, b) =>
      a.sourceComponentId.localeCompare(b.sourceComponentId) ||
      a.targetComponentId.localeCompare(b.targetComponentId) ||
      a.sourceFile.localeCompare(b.sourceFile),
    ),
    packageEdges: packageEdges.sort((a, b) =>
      a.sourcePackageId.localeCompare(b.sourcePackageId) ||
      a.targetPackageId.localeCompare(b.targetPackageId) ||
      a.sourceFile.localeCompare(b.sourceFile),
    ),
    changeImpact,
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
  const allowedRules = profile.boundaryRules.filter((rule) => rule.allowed === true);
  for (const rule of allowedRules) {
    const sourceRoles = roleAlternatives(rule.sourcePattern);
    const targetRoles = roleAlternatives(rule.targetPattern);
    if (sourceRoles.length === 0 || targetRoles.length === 0) {
      unverifiedRules += 1;
      limitations.push(`Allowed dependency rule ${rule.id} is missing a sourcePattern or targetPattern and cannot act as an exception.`);
      continue;
    }
    const matchingSources = graph.nodes.some((node) => node.roles.some((role) => sourceRoles.includes(role)));
    const matchingTargets = graph.nodes.some((node) => node.roles.some((role) => targetRoles.includes(role)));
    if (!matchingSources || !matchingTargets) {
      unverifiedRules += 1;
      limitations.push(`Allowed dependency rule ${rule.id} could not be verified because its source or target role has no matched files.`);
    }
  }

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
        const explicitlyAllowed = allowedRules.some((allowRule) => {
          const allowedSourceRoles = roleAlternatives(allowRule.sourcePattern);
          const allowedTargetRoles = roleAlternatives(allowRule.targetPattern);
          return (
            source.roles.some((role) => allowedSourceRoles.includes(role)) &&
            target.roles.some((role) => allowedTargetRoles.includes(role))
          );
        });
        if (explicitlyAllowed) continue;

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
