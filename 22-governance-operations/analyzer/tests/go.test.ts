import { describe, expect, it } from "vitest";
import { defaultAnalyzerAdapters, selectAnalyzerAdapters } from "../src/adapters/registry.js";
import { goAdapter } from "../src/adapters/go.js";
import { buildArchitectureDependencyGraph, goImports, verifyArchitectureProfile } from "../src/architecture.js";
import type { ArchitectureProfile } from "../src/architecture.js";
import { hasGoRequirement, parseGoMod } from "../src/manifest.js";
import { toGovernanceContext } from "../src/normalize.js";
import { analyzeRepository } from "../src/pipeline.js";
import type { RepositorySnapshot } from "../src/types.js";

// ADP-06: Go support, added as an adapter, a manifest parser and a language in the dependency graph,
// without touching the engine or the universal rules.

const snapshot = (files: Record<string, string>): RepositorySnapshot => ({ rootPath: "/repo", changedFiles: [], files: Object.keys(files), fileContents: files });

describe("parseGoMod", () => {
  it("reads the module path, the Go version and direct and indirect requirements, in block and single-line form", () => {
    const goMod = parseGoMod([
      "// a comment",
      'module "github.com/acme/app"',
      "",
      "go 1.22.1",
      "toolchain go1.22.3",
      "",
      "require github.com/single/dep v1.0.0",
      "require (",
      "\tgithub.com/gin-gonic/gin v1.9.1",
      "\tgolang.org/x/net v0.20.0 // indirect",
      "\t// github.com/commented/out v0.0.1",
      "\texample.com/quoted/mod v2.0.0+incompatible // pinned",
      ")",
      "replace github.com/old => ../old",
    ].join("\n"));
    expect(goMod).toEqual({
      module: "github.com/acme/app",
      goVersion: "1.22.1",
      requires: ["github.com/single/dep", "github.com/gin-gonic/gin", "example.com/quoted/mod"],
      indirect: ["golang.org/x/net"],
    });
  });

  it("copes with CRLF line endings, an empty file and garbage, never throwing", () => {
    expect(parseGoMod("module a/b\r\n\r\ngo 1.21\r\nrequire (\r\n\tc/d v1\r\n)\r\n")).toMatchObject({ module: "a/b", requires: ["c/d"] });
    expect(parseGoMod("")).toEqual({ requires: [], indirect: [] });
    expect(() => parseGoMod("}{ not a go.mod ((( \n require (\n")).not.toThrow();
  });

  it("matches a requirement by module path or by its major-version form, but not by a longer name", () => {
    const goMod = parseGoMod("module m\nrequire (\n\tgithub.com/labstack/echo/v4 v4.11.0\n\tgithub.com/gin-gonic/gin v1.9.1\n)\n");
    expect(hasGoRequirement(goMod, "github.com/labstack/echo")).toBe(true);
    expect(hasGoRequirement(goMod, "github.com/gin-gonic/gin")).toBe(true);
    expect(hasGoRequirement(goMod, "github.com/gin-gonic/gi")).toBe(false);
    expect(hasGoRequirement(goMod, "github.com/gin-gonic/gin-contrib")).toBe(false);
  });
});

describe("goImports", () => {
  it("reads single imports, import blocks and aliases, with their line numbers", () => {
    const source = [
      "package main",
      "",
      'import "fmt"',
      'import alias "github.com/acme/app/internal/a"',
      "import (",
      '\t"os"',
      '\tdb "github.com/acme/app/internal/db"',
      '\t_ "github.com/lib/pq"',
      '\t. "github.com/acme/app/internal/dot"',
      ")",
    ].join("\n");
    expect(goImports(source)).toEqual([
      { specifier: "fmt", line: 3 },
      { specifier: "github.com/acme/app/internal/a", line: 4 },
      { specifier: "os", line: 6 },
      { specifier: "github.com/acme/app/internal/db", line: 7 },
      { specifier: "github.com/lib/pq", line: 8 },
      { specifier: "github.com/acme/app/internal/dot", line: 9 },
    ]);
  });

  it("ignores comments, commented-out imports, cgo's import \"C\" and strings in code", () => {
    const source = [
      "package main",
      '// import "ignored/line"',
      "/* import \"ignored/block\"",
      '   import "ignored/multi" */',
      'import "C"',
      "import (",
      '\t"kept" // trailing comment',
      '\t/* inline */ "also/kept"',
      ")",
      'var s = "import \\"not/an/import\\""',
    ].join("\n");
    expect(goImports(source).map((item) => item.specifier)).toEqual(["kept", "also/kept"]);
  });
});

describe("the Go adapter", () => {
  const analyze = (files: Record<string, string>) => goAdapter.analyze(snapshot(files));

  it("is registered and selected only for a Go repository", () => {
    expect(defaultAnalyzerAdapters.map((adapter) => adapter.id)).toContain("go");
    expect(selectAnalyzerAdapters(defaultAnalyzerAdapters, ["go"]).map((a) => a.id)).toContain("go");
    expect(selectAnalyzerAdapters(defaultAnalyzerAdapters, ["python"]).map((a) => a.id)).not.toContain("go");
    expect(goAdapter.supports(snapshot({ "main.go": "" }))).toBe(true);
    expect(goAdapter.supports(snapshot({ "go.mod": "module m" }))).toBe(true);
    expect(goAdapter.supports(snapshot({ "main.py": "" }))).toBe(false);
  });

  it("recognises frameworks from direct requirements only, and an HTTP framework implies an HTTP API", async () => {
    const result = await analyze({ "go.mod": "module m\nrequire (\n\tgithub.com/gin-gonic/gin v1.9.1\n\tgoogle.golang.org/grpc v1.60.0\n\tgithub.com/go-chi/chi/v5 v5.0.0 // indirect\n)\n", "main.go": "package main" });
    expect(result.facts).toEqual({ frameworks: ["gin", "grpc"] });
    expect(result.signals).toEqual(expect.arrayContaining(["framework:gin", "framework:grpc", "capability:http-api"]));
    expect(result.signals).not.toContain("framework:chi");
  });

  it("finds the frameworks of every go.mod in a monorepo", async () => {
    const result = await analyze({
      "svc/a/go.mod": "module a\nrequire github.com/labstack/echo/v4 v4.1.0\n",
      "svc/b/go.mod": "module b\nrequire github.com/gofiber/fiber/v2 v2.0.0\n",
    });
    expect(result.facts).toEqual({ frameworks: ["echo", "fiber"] });
  });

  it("treats a standard-library-only repository as normal: no frameworks, and no invented API", async () => {
    const result = await analyze({ "go.mod": "module m\ngo 1.22\n", "main.go": "package main" });
    expect(result.facts).toEqual({});
    expect(result.signals).toEqual([]);
  });

  it("derives API, database and test signals from the layout", async () => {
    const result = await analyze({ "internal/handlers/user.go": "", "internal/repository/user.go": "", "internal/repository/user_test.go": "" });
    expect(result.signals).toEqual(["capability:database-access", "capability:http-api", "tests:go"]);
  });

  it("does not mistake an unrelated directory for an API or a database", async () => {
    expect((await analyze({ "internal/billing/invoice.go": "", "cmd/app/main.go": "" })).signals).toEqual([]);
  });
});

const profile: ArchitectureProfile = {
  id: "go-layers",
  version: "1.0.0",
  name: "Go layers",
  styles: ["clean-architecture"],
  componentMappings: { domain: ["internal/domain/**"], infrastructure: ["internal/infrastructure/**"], app: ["internal/app/**"] },
  boundaryRules: [{ id: "ARCH-001", description: "Domain cannot depend on infrastructure.", severity: "P1", sourcePattern: "domain", targetPattern: "infrastructure", allowed: false }],
  requiredControls: [],
};

describe("Go in the architecture dependency graph", () => {
  const module = "module github.com/acme/app\n\ngo 1.22\n";

  it("turns an import of a package inside the module into an edge to that package's first non-test file", () => {
    const graph = buildArchitectureDependencyGraph(snapshot({
      "go.mod": module,
      "internal/domain/user.go": 'package domain\n\nimport (\n\t"fmt"\n\t"github.com/acme/app/internal/infrastructure"\n\t"github.com/google/uuid"\n)\n',
      "internal/infrastructure/b_store.go": "package infrastructure",
      "internal/infrastructure/a_store.go": "package infrastructure",
      "internal/infrastructure/a_store_test.go": "package infrastructure",
    }), profile);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toMatchObject({
      sourceId: "FILE:internal/domain/user.go",
      targetId: "FILE:internal/infrastructure/a_store.go",
      importSpecifier: "github.com/acme/app/internal/infrastructure",
      sourceLocation: { file: "internal/domain/user.go", line: 5 },
    });
    expect(graph.unsupportedLanguages).not.toContain("go");
  });

  it("does not treat the standard library or a dependency as local, nor report them unresolved", () => {
    const graph = buildArchitectureDependencyGraph(snapshot({
      "go.mod": module,
      "main.go": 'package main\n\nimport (\n\t"net/http"\n\t"github.com/gin-gonic/gin"\n)\n',
    }));
    expect(graph.edges).toEqual([]);
    expect(graph.unresolvedRelativeImports).toEqual([]);
  });

  it("reports an import of an in-module package that has no files as unresolved", () => {
    const graph = buildArchitectureDependencyGraph(snapshot({
      "go.mod": module,
      "main.go": 'package main\n\nimport "github.com/acme/app/internal/missing"\n',
    }));
    expect(graph.unresolvedRelativeImports).toEqual([{ file: "main.go", line: 3, specifier: "github.com/acme/app/internal/missing" }]);
  });

  it("resolves the module root and nested modules using the nearest go.mod", () => {
    const graph = buildArchitectureDependencyGraph(snapshot({
      "go.mod": module,
      "app.go": "package app",
      "cmd/tool.go": 'package main\n\nimport "github.com/acme/app"\n',
      "svc/go.mod": "module github.com/acme/svc\n",
      "svc/cmd/main.go": 'package main\n\nimport (\n\t"github.com/acme/svc/internal/core"\n\t"github.com/acme/app/internal/other"\n)\n',
      "svc/internal/core/core.go": "package core",
      "internal/other/o.go": "package other",
    }));
    const edges = graph.edges.map((edge) => `${edge.sourceId.slice(5)} -> ${edge.targetId.slice(5)}`);
    expect(edges).toEqual(["cmd/tool.go -> app.go", "svc/cmd/main.go -> svc/internal/core/core.go"]);
    // The other module's path is not this module's: it is a dependency, not a local import.
    expect(graph.unresolvedRelativeImports).toEqual([]);
  });

  it("cannot resolve imports without a go.mod, and does not guess", () => {
    const graph = buildArchitectureDependencyGraph(snapshot({
      "internal/domain/user.go": 'package domain\n\nimport "github.com/acme/app/internal/infrastructure"\n',
      "internal/infrastructure/store.go": "package infrastructure",
    }));
    expect(graph.edges).toEqual([]);
    expect(graph.unresolvedRelativeImports).toEqual([]);
  });

  it("verifies a boundary rule on Go code: domain importing infrastructure is a P1 finding", () => {
    const result = verifyArchitectureProfile(snapshot({
      "go.mod": module,
      "internal/domain/user.go": 'package domain\n\nimport "github.com/acme/app/internal/infrastructure"\n',
      "internal/infrastructure/store.go": "package infrastructure",
      "internal/app/service.go": 'package app\n\nimport "github.com/acme/app/internal/domain"\n',
    }), profile);
    expect(result.findings.map((finding) => [finding.rule_id, finding.severity])).toEqual([["ARCH-001", "P1"]]);
    expect(result.findings[0]!.message).toContain("internal/domain/user.go");
    expect(result.status).toBe("COMPLETE");
    expect(result.limitations.join(" ")).toContain("Go imports name a package, not a file");
    expect(result.limitations.join(" ")).not.toContain("not implemented for: go");
  });

  it("passes a Go repository whose dependencies point the right way", () => {
    const result = verifyArchitectureProfile(snapshot({
      "go.mod": module,
      "internal/domain/user.go": "package domain",
      "internal/infrastructure/store.go": 'package infrastructure\n\nimport "github.com/acme/app/internal/domain"\n',
    }), profile);
    expect(result.findings).toEqual([]);
  });
});

describe("a whole Go repository through the pipeline", () => {
  it("is analysed as Go with its frameworks and signals", async () => {
    const analysis = await analyzeRepository(snapshot({
      "go.mod": "module github.com/acme/app\n\ngo 1.22\n\nrequire github.com/gin-gonic/gin v1.9.1\n",
      "cmd/app/main.go": "package main",
      "internal/handlers/health.go": "package handlers",
      "internal/handlers/health_test.go": "package handlers",
    }));
    expect(analysis.facts.languages).toContain("go");
    expect(analysis.facts.frameworks).toContain("gin");
    expect(analysis.signals).toEqual(expect.arrayContaining(["framework:gin", "capability:http-api", "tests:go"]));
    expect(analysis.adapterResults.map((result) => result.adapterId)).toContain("go");
  });

  it("is COMPLETE once its framework is recognised: the universal framework-detection adapter reads go.mod", async () => {
    const analysis = await analyzeRepository(snapshot({
      "go.mod": "module github.com/acme/app\n\ngo 1.22\n\nrequire github.com/gin-gonic/gin v1.9.1\n",
      "main.go": "package main",
    }));
    const framework = analysis.adapterResults.find((result) => result.adapterId === "framework-detection");
    expect(framework?.executionStatus).toBe("SUCCESS");
    expect(toGovernanceContext(analysis).analysisStatus).toBe("COMPLETE");
  });

  it("treats a standard-library-only repository like any other with no recognised framework: partial, with that stated", async () => {
    // The same rule already applies to a plain TypeScript or Python repository (see the pipeline tests);
    // Go is not singled out, and the universal rule is unchanged by ADP-06.
    const go = await analyzeRepository(snapshot({ "go.mod": "module m\n\ngo 1.22\n", "main.go": "package main" }));
    const plainTypeScript = await analyzeRepository(snapshot({ "package.json": JSON.stringify({ name: "lib" }), "index.ts": "export {};" }));
    expect(toGovernanceContext(go).analysisStatus).toBe("PARTIAL");
    expect(toGovernanceContext(plainTypeScript).analysisStatus).toBe("PARTIAL");
    expect(go.adapterResults.find((result) => result.adapterId === "framework-detection")?.limitations.join(" "))
      .toContain("no recognized framework dependency was found");
    expect(toGovernanceContext(go).unsupportedCapabilities).not.toContain("language-specific-analysis:go");
  });

  it("makes a monorepo with several go.mod files visible to framework detection", async () => {
    const analysis = await analyzeRepository(snapshot({
      "svc/a/go.mod": "module a\n\nrequire github.com/labstack/echo/v4 v4.1.0\n",
      "svc/a/main.go": "package main",
      "svc/b/go.mod": "module b\n\nrequire github.com/go-chi/chi/v5 v5.0.0\n",
      "svc/b/main.go": "package main",
    }));
    expect(analysis.facts.frameworks).toEqual(expect.arrayContaining(["echo", "chi"]));
  });
});
