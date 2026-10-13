import path from "node:path";
import { detectRepositoryFacts } from "./detector.js";
import { hasPackageDependency, hasPythonDependency, parsePackageJson } from "./manifest.js";
import type { RepositoryEvidence, RepositorySnapshot } from "./types.js";

export type SystemGraphNodeType =
  | "REPOSITORY"
  | "PACKAGE"
  | "SERVICE"
  | "API_ENDPOINT"
  | "DATABASE"
  | "EVENT";

export type SystemGraphRelationshipType =
  | "CONTAINS"
  | "IMPLEMENTED_BY"
  | "EXPOSES_API"
  | "USES_DATABASE"
  | "PUBLISHES_EVENT"
  | "SUBSCRIBES_EVENT";

export interface SystemGraphNode {
  id: string;
  type: SystemGraphNodeType;
  name: string;
  packageId?: string;
  sourceLocation?: { file: string; line: number };
  confidence: number;
  evidenceRefs: string[];
}

export interface SystemGraphEdge {
  id: string;
  type: SystemGraphRelationshipType;
  sourceId: string;
  targetId: string;
  sourceLocation?: { file: string; line: number };
  confidence: number;
  evidenceRefs: string[];
}

export interface RepositorySystemGraph {
  status: "COMPLETE" | "PARTIAL";
  nodes: SystemGraphNode[];
  edges: SystemGraphEdge[];
  evidence: RepositoryEvidence[];
  limitations: string[];
}

interface SourceMatch {
  file: string;
  line: number;
  value: string;
  method?: string;
}

function stableId(value: string): string {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

function sourceMatches(
  file: string,
  content: string,
  pattern: RegExp,
  hasMethod = false,
): SourceMatch[] {
  const matches: SourceMatch[] = [];
  for (const match of content.matchAll(pattern)) {
    const index = match.index ?? 0;
    matches.push({
      file,
      line: content.slice(0, index).split("\n").length,
      value: hasMethod ? match[2] ?? "" : match[1] ?? "",
      ...(hasMethod ? { method: (match[1] ?? "").toUpperCase() } : {}),
    });
  }
  return matches;
}

function databaseDrivers(snapshot: RepositorySnapshot, manifestPaths: readonly string[]): string[] {
  const drivers = new Set<string>();
  const jsDrivers: Array<[string, string]> = [
    ["pg", "postgresql"],
    ["mysql2", "mysql"],
    ["mongoose", "mongodb"],
    ["mongodb", "mongodb"],
    ["prisma", "prisma"],
    ["sequelize", "sequelize"],
    ["typeorm", "typeorm"],
    ["knex", "knex"],
  ];
  const pythonDrivers: Array<[string, string]> = [
    ["sqlalchemy", "sqlalchemy"],
    ["psycopg", "postgresql"],
    ["psycopg2", "postgresql"],
    ["asyncpg", "postgresql"],
    ["pymongo", "mongodb"],
    ["motor", "mongodb"],
    ["sqlite3", "sqlite"],
  ];

  for (const manifestPath of manifestPaths) {
    const content = snapshot.fileContents?.[manifestPath];
    if (!content) continue;
    const basename = path.posix.basename(manifestPath);
    if (basename === "package.json") {
      try {
        const packageJson = parsePackageJson(content);
        for (const [dependency, driver] of jsDrivers) {
          if (hasPackageDependency(packageJson, dependency)) drivers.add(driver);
        }
      } catch {
        // Manifest parsing failures are reported by the framework adapter.
      }
    } else if (basename === "pyproject.toml" || basename === "requirements.txt") {
      for (const [dependency, driver] of pythonDrivers) {
        if (hasPythonDependency(content, dependency)) drivers.add(driver);
      }
    }
  }
  return [...drivers].sort();
}

/**
 * Builds a deterministic, heuristic system graph from package manifests and
 * explicit source patterns. Each inferred relationship carries evidence and
 * source provenance; dynamic registration and computed names remain unsupported.
 */
export function buildRepositorySystemGraph(snapshot: RepositorySnapshot): RepositorySystemGraph {
  const packages = detectRepositoryFacts(snapshot).packages ?? [];
  const nodes: SystemGraphNode[] = [];
  const edges: SystemGraphEdge[] = [];
  const evidenceById = new Map<string, RepositoryEvidence>();
  const limitations = [
    "API routes, database drivers, and event names are inferred from supported static patterns; dynamic registration and computed names may be missed.",
  ];

  const addEvidence = (
    id: string,
    status: RepositoryEvidence["status"],
    description: string,
    source: string,
  ): string => {
    if (!evidenceById.has(id)) {
      evidenceById.set(id, {
        id,
        type: "E3_AUTOMATED_ANALYSIS",
        status,
        description,
        source,
        freshness: "current",
        supports_controls: [],
      });
    }
    return id;
  };

  const addNode = (node: SystemGraphNode) => {
    const existing = nodes.find((item) => item.id === node.id);
    if (!existing) {
      nodes.push(node);
      return;
    }
    existing.evidenceRefs = [...new Set([...existing.evidenceRefs, ...node.evidenceRefs])].sort();
    existing.confidence = Math.min(existing.confidence, node.confidence);
    if (existing.packageId && node.packageId && existing.packageId !== node.packageId) {
      delete existing.packageId;
    }
    if (!existing.sourceLocation && node.sourceLocation) existing.sourceLocation = node.sourceLocation;
  };

  const addEdge = (edge: SystemGraphEdge) => {
    const existing = edges.find((item) => item.id === edge.id);
    if (!existing) edges.push(edge);
  };

  const rootEvidence = addEvidence(
    "EVD-SYSTEM-REPOSITORY",
    "VERIFIED",
    "Repository root was established from the inspected snapshot.",
    "repository-system-graph",
  );
  addNode({
    id: "REPO:ROOT",
    type: "REPOSITORY",
    name: "repository",
    confidence: 1,
    evidenceRefs: [rootEvidence],
  });

  for (const projectPackage of packages) {
    const packageEvidence = addEvidence(
      `EVD-SYSTEM-PACKAGE-${stableId(projectPackage.id)}`,
      "VERIFIED",
      `Package ownership was derived from manifest roots for '${projectPackage.root}'.`,
      projectPackage.manifestPaths[0] ?? "repository-snapshot",
    );
    addNode({
      id: projectPackage.id,
      type: "PACKAGE",
      name: projectPackage.root === "." ? "root" : path.posix.basename(projectPackage.root),
      packageId: projectPackage.id,
      confidence: 1,
      evidenceRefs: [packageEvidence],
    });
    addEdge({
      id: `SYS-EDGE-${stableId(`contains:${projectPackage.id}`)}`,
      type: "CONTAINS",
      sourceId: "REPO:ROOT",
      targetId: projectPackage.id,
      confidence: 1,
      evidenceRefs: [packageEvidence],
    });

    const firstSegment = projectPackage.root.split("/")[0] ?? "";
    if (projectPackage.root !== "." && ["services", "service", "backend", "workers", "worker"].includes(firstSegment)) {
      const serviceId = `SERVICE:${stableId(projectPackage.root)}`;
      addNode({
        id: serviceId,
        type: "SERVICE",
        name: path.posix.basename(projectPackage.root),
        packageId: projectPackage.id,
        confidence: 0.85,
        evidenceRefs: [packageEvidence],
      });
      addEdge({
        id: `SYS-EDGE-${stableId(`contains-service:${serviceId}`)}`,
        type: "CONTAINS",
        sourceId: "REPO:ROOT",
        targetId: serviceId,
        confidence: 0.85,
        evidenceRefs: [packageEvidence],
      });
      addEdge({
        id: `SYS-EDGE-${stableId(`service-package:${serviceId}:${projectPackage.id}`)}`,
        type: "IMPLEMENTED_BY",
        sourceId: serviceId,
        targetId: projectPackage.id,
        confidence: 0.85,
        evidenceRefs: [packageEvidence],
      });
    }

    const manifestPaths = projectPackage.manifestPaths;
    const drivers = databaseDrivers(snapshot, manifestPaths);
    for (const driver of drivers) {
      const evidenceId = addEvidence(
        `EVD-SYSTEM-DB-${stableId(`${projectPackage.id}:${driver}`)}`,
        "VERIFIED",
        `Database driver '${driver}' was found in a project manifest.`,
        manifestPaths.join(", ") || "repository-snapshot",
      );
      const databaseId = `DATABASE:${stableId(`${projectPackage.id}:${driver}`)}`;
      addNode({
        id: databaseId,
        type: "DATABASE",
        name: driver,
        packageId: projectPackage.id,
        confidence: 0.95,
        evidenceRefs: [evidenceId],
      });
      addEdge({
        id: `SYS-EDGE-${stableId(`database:${projectPackage.id}:${driver}`)}`,
        type: "USES_DATABASE",
        sourceId: projectPackage.id,
        targetId: databaseId,
        confidence: 0.95,
        evidenceRefs: [evidenceId],
      });
    }
  }

  const orderedPackages = [...packages].sort((left, right) => right.root.length - left.root.length);
  const packageForFile = (file: string) => orderedPackages.find(
    (item) => item.root === "." || file === item.root || file.startsWith(`${item.root}/`),
  );

  const sourceFiles = snapshot.files
    .filter((file) => /\.(py|ts|tsx|js|jsx|mjs|cjs)$/.test(file))
    .sort();

  for (const file of sourceFiles) {
    const content = snapshot.fileContents?.[file];
    if (content === undefined) continue;
    const projectPackage = packageForFile(file);
    if (!projectPackage) continue;

    const apiMatches = file.endsWith(".py")
      ? sourceMatches(file, content, /@(?:\w+)\.(get|post|put|patch|delete|options|head)\s*\(\s*["']([^"']+)["']/gi, true)
      : sourceMatches(file, content, /\b(?:app|router)\.(get|post|put|patch|delete|options|head)\s*\(\s*["']([^"']+)["']/gi, true);

    for (const match of apiMatches) {
      const method = match.method ?? "GET";
      const endpointName = `${method} ${match.value}`;
      const evidenceId = addEvidence(
        `EVD-SYSTEM-API-${stableId(`${file}:${match.line}:${endpointName}`)}`,
        "VERIFIED",
        `A static HTTP route registration for '${endpointName}' was found.`,
        `${file}:${match.line}`,
      );
      const apiId = `API:${stableId(`${projectPackage.id}:${endpointName}`)}`;
      addNode({
        id: apiId,
        type: "API_ENDPOINT",
        name: endpointName,
        packageId: projectPackage.id,
        sourceLocation: { file, line: match.line },
        confidence: 0.95,
        evidenceRefs: [evidenceId],
      });
      addEdge({
        id: `SYS-EDGE-${stableId(`api:${projectPackage.id}:${file}:${match.line}`)}`,
        type: "EXPOSES_API",
        sourceId: projectPackage.id,
        targetId: apiId,
        sourceLocation: { file, line: match.line },
        confidence: 0.95,
        evidenceRefs: [evidenceId],
      });
    }

    const eventPatterns: Array<{ type: "PUBLISHES_EVENT" | "SUBSCRIBES_EVENT"; pattern: RegExp }> = [
      { type: "PUBLISHES_EVENT", pattern: /\b(?:emit|publish|dispatch|sendToQueue)\s*\(\s*["']([^"']+)["']/g },
      { type: "SUBSCRIBES_EVENT", pattern: /\b(?:subscribe|consume)\s*\(\s*["']([^"']+)["']/g },
    ];
    for (const eventPattern of eventPatterns) {
      for (const match of sourceMatches(file, content, eventPattern.pattern)) {
        const eventName = match.value;
        const evidenceId = addEvidence(
          `EVD-SYSTEM-EVENT-${stableId(`${file}:${match.line}:${eventPattern.type}:${eventName}`)}`,
          "PARTIALLY_VERIFIED",
          `A static event ${eventPattern.type === "PUBLISHES_EVENT" ? "publisher" : "subscriber"} call for '${eventName}' was found; runtime delivery is not verified.`,
          `${file}:${match.line}`,
        );
        const eventId = `EVENT:${stableId(eventName)}`;
        addNode({
          id: eventId,
          type: "EVENT",
          name: eventName,
          sourceLocation: { file, line: match.line },
          confidence: 0.65,
          evidenceRefs: [evidenceId],
        });
        addEdge({
          id: `SYS-EDGE-${stableId(`event:${projectPackage.id}:${file}:${match.line}:${eventPattern.type}`)}`,
          type: eventPattern.type,
          sourceId: projectPackage.id,
          targetId: eventId,
          sourceLocation: { file, line: match.line },
          confidence: 0.65,
          evidenceRefs: [evidenceId],
        });
      }
    }
  }

  const contentLimitations = snapshot.contentLimitations ?? [];
  const unreadSourceFiles = sourceFiles.filter((file) => snapshot.fileContents?.[file] === undefined);
  const manifestPaths = packages.flatMap((item) => item.manifestPaths);
  const unreadManifestPaths = manifestPaths.filter((file) => snapshot.fileContents?.[file] === undefined);
  if (contentLimitations.length > 0 || unreadSourceFiles.length > 0 || unreadManifestPaths.length > 0) {
    limitations.push(...contentLimitations);
    if (unreadSourceFiles.length > 0) {
      limitations.push(`System relationships were not inspected in ${unreadSourceFiles.length} source file(s).`);
    }
    if (unreadManifestPaths.length > 0) {
      limitations.push(`Package manifests were not inspected for system relationships: ${unreadManifestPaths.join(", ")}.`);
    }
  }

  return {
    status: contentLimitations.length > 0 || unreadSourceFiles.length > 0 || unreadManifestPaths.length > 0 ? "PARTIAL" : "COMPLETE",
    nodes: nodes.sort((a, b) => a.id.localeCompare(b.id)),
    edges: edges.sort((a, b) => a.id.localeCompare(b.id)),
    evidence: [...evidenceById.values()].sort((a, b) => a.id.localeCompare(b.id)),
    limitations: [...new Set(limitations)].sort(),
  };
}
