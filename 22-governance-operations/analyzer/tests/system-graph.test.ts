import { describe, expect, it } from "vitest";
import { buildRepositorySystemGraph } from "../src/system-graph.js";
import type { RepositorySnapshot } from "../src/types.js";

const snapshot: RepositorySnapshot = {
  rootPath: "/repo",
  changedFiles: [],
  files: [
    "services/api/pyproject.toml",
    "services/api/api/routes.py",
    "services/api/events/publisher.py",
    "services/api/events/consumer.py",
  ],
  fileContents: {
    "services/api/pyproject.toml": '[project]\ndependencies = ["fastapi>=0.115", "sqlalchemy>=2.0"]',
    "services/api/api/routes.py": '@router.get("/users")\ndef list_users():\n    return []',
    "services/api/events/publisher.py": 'bus.publish("user.created", payload)',
    "services/api/events/consumer.py": 'bus.subscribe("user.created", handle_user_created)',
  },
};

describe("repository system graph", () => {
  it("models service, API, database, and event relationships with provenance", () => {
    const graph = buildRepositorySystemGraph(snapshot);

    expect(graph.status).toBe("COMPLETE");
    expect(graph.nodes.map((node) => node.type)).toEqual(expect.arrayContaining([
      "REPOSITORY",
      "PACKAGE",
      "SERVICE",
      "API_ENDPOINT",
      "DATABASE",
      "EVENT",
    ]));
    expect(graph.nodes.find((node) => node.type === "API_ENDPOINT")?.name).toBe("GET /users");
    expect(graph.nodes.find((node) => node.type === "DATABASE")?.name).toBe("sqlalchemy");
    const serviceNode = graph.nodes.find((node) => node.type === "SERVICE");
    expect(serviceNode).toBeDefined();
    expect(graph.evidence.find((item) => serviceNode?.evidenceRefs.includes(item.id))?.status)
      .toBe("PARTIALLY_VERIFIED");

    expect(graph.nodes.find((node) => node.type === "EVENT" && node.name === "user.created")?.evidenceRefs)
      .toHaveLength(2);
    expect(graph.edges.some((edge) => edge.type === "CONTAINS" && edge.targetId.startsWith("SERVICE:"))).toBe(true);
    expect(graph.edges.some((edge) => edge.type === "EXPOSES_API")).toBe(true);
    expect(graph.edges.some((edge) => edge.type === "USES_DATABASE")).toBe(true);
    expect(graph.edges.some((edge) => edge.type === "PUBLISHES_EVENT")).toBe(true);
    expect(graph.edges.some((edge) => edge.type === "SUBSCRIBES_EVENT")).toBe(true);
    expect(graph.edges.every((edge) => edge.evidenceRefs.length > 0)).toBe(true);
    expect(graph.evidence.every((item) => item.id.startsWith("EVD-SYSTEM-"))).toBe(true);
  });

  it("marks system graph coverage partial when source content is unavailable", () => {
    const incomplete: RepositorySnapshot = {
      rootPath: "/repo",
      changedFiles: [],
      files: ["services/api/pyproject.toml", "services/api/api/routes.py"],
      fileContents: {
        "services/api/pyproject.toml": '[project]\ndependencies = ["fastapi"]',
      },
    };

    const graph = buildRepositorySystemGraph(incomplete);
    expect(graph.status).toBe("PARTIAL");
    expect(graph.limitations.some((item) => item.includes("not inspected"))).toBe(true);
  });
});
