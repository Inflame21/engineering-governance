import { execFile } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ARCHITECTURE_CATALOG, LARGE_SOURCE_FILES, SMALL_SOURCE_FILES, adviseArchitecture, formatAdvice, formatCatalog,
} from "../src/architecture-advice.js";
import { parseCliArguments, runCli } from "../src/index.js";

const run = promisify(execFile);

/** A snapshot from a map of path to content. */
const advise = (files: Record<string, string>, frameworks: string[] = []) =>
  adviseArchitecture({ rootPath: "/repo", changedFiles: [], files: Object.keys(files), fileContents: files }, { languages: ["typescript"], frameworks });

const code = (...paths: string[]): Record<string, string> => Object.fromEntries(paths.map((p) => [p, "export {};\n"]));
const ids = (advice: ReturnType<typeof advise>) => advice.detected.map((item) => item.id);

describe("the reference catalog", () => {
  it("describes every style completely, with unique ids", () => {
    expect(ARCHITECTURE_CATALOG.map((s) => s.id)).toEqual(["simple-monolith", "layered", "mvc", "clean", "hexagonal", "modular-monolith", "microservices", "event-driven", "serverless"]);
    expect(new Set(ARCHITECTURE_CATALOG.map((s) => s.id)).size).toBe(ARCHITECTURE_CATALOG.length);
    for (const style of ARCHITECTURE_CATALOG) {
      for (const field of ["name", "summary"] as const) expect(style[field].trim(), `${style.id}.${field}`).not.toBe("");
      for (const field of ["structure", "strengths", "weaknesses", "bestWhen", "avoidWhen", "firstSteps"] as const) {
        expect(style[field].length, `${style.id}.${field}`).toBeGreaterThan(0);
      }
    }
  });

  it("only names bundled profiles that exist, and every bundled profile is reachable from some style", () => {
    const model = path.resolve("../model");
    const bundled = readdirSync(model).filter((f) => /^architecture-profile-.*\.json$/.test(f) && !f.includes("schema"))
      .map((f) => (JSON.parse(readFileSync(path.join(model, f), "utf8")) as { id: string }).id);
    const named = ARCHITECTURE_CATALOG.flatMap((s) => (s.profile ? [s.profile] : []));
    for (const id of named) expect(bundled, id).toContain(id);
    for (const id of bundled) expect(named, id).toContain(id);
  });

  it("renders as a reference with a table and an example layout for every style", () => {
    const text = formatCatalog();
    for (const style of ARCHITECTURE_CATALOG) {
      expect(text).toContain(`## ${style.name}`);
      expect(text).toContain(style.structure[0]!);
    }
    expect(text).toContain("| Style | In one line | Enforceable |");
    expect(text).toContain("`clean-architecture` profile");
  });
});

describe("detecting the style", () => {
  it.each([
    ["layered", code("src/controllers/a.ts", "src/services/b.ts", "src/repositories/c.ts")],
    ["mvc", { ...code("app/models/user.ts", "app/controllers/users.ts"), "app/views/index.html": "<p></p>" }],
    ["clean", code("src/domain/user.ts", "src/application/usecases/create.ts", "src/infrastructure/db.ts")],
    ["hexagonal", code("src/domain/user.ts", "src/application/ports/inbound/create.ts", "src/adapters/outbound/db.ts")],
    ["modular-monolith", code("src/modules/orders/a.ts", "src/modules/billing/b.ts", "src/modules/catalog/c.ts", "src/shared/util.ts")],
    ["event-driven", { ...code("src/events/created.ts", "src/consumers/a.ts", "src/sagas/order.ts"), "package.json": JSON.stringify({ dependencies: { kafkajs: "^2" } }) }],
    ["serverless", { ...code("functions/create/index.ts"), "serverless.yml": "service: x\n", "package.json": JSON.stringify({ devDependencies: { serverless: "^3" } }) }],
  ] as const)("recognises %s as the best fit with a strong match", (id, files) => {
    const advice = advise({ ...files });
    expect(advice.detected[0], JSON.stringify(ids(advice))).toMatchObject({ id, fit: "strong" });
    expect(advice.recommendation).toMatchObject({ styleId: id });
    expect(advice.recommendation!.headline).toMatch(/^Keep following/);
  });

  it("recognises microservices from separate deployables, services, a compose file and a gateway", () => {
    const advice = advise({
      ...code("services/orders/src/a.ts", "services/billing/src/b.ts", "gateway/index.ts"),
      "services/orders/package.json": "{}", "services/billing/package.json": "{}",
      "services/orders/Dockerfile": "FROM node", "services/billing/Dockerfile": "FROM node",
      "docker-compose.yml": "services:\n  orders:\n    build: ./services/orders\n  billing:\n    build: ./services/billing\n",
    });
    expect(advice.shape.deployables).toBe(2);
    expect(advice.detected[0]).toMatchObject({ id: "microservices", fit: "strong" });
  });

  it("reports the evidence it matched and what it did not find", () => {
    const advice = advise(code("src/controllers/a.ts", "src/services/b.ts"));
    expect(advice.detected[0]).toMatchObject({ id: "layered", fit: "moderate", score: 0.67 });
    expect(advice.detected[0]!.matched.join(" ")).toContain("controllers/ (src/controllers)");
    expect(advice.detected[0]!.missing.join(" ")).toContain("a data-access layer");
  });

  it("ranks a closer relative above a looser one, and lists both", () => {
    const advice = advise(code("src/domain/user.ts", "src/application/ports/inbound/a.ts", "src/adapters/outbound/db.ts"));
    expect(ids(advice).slice(0, 2)).toEqual(["hexagonal", "clean"]);
  });

  it("does not count folders that hold no code, such as JSON schemas or documents", () => {
    const advice = advise({ "model/schema.json": "{}", "templates/readme.md": "x", "controllers/notes.md": "x", ...code("src/main.ts") });
    expect(advice.detected).toEqual([]);
  });

  it("does not count test folders, even when they mirror a style", () => {
    expect(advise(code("tests/controllers/a.ts", "tests/services/b.ts", "tests/repositories/c.ts", "src/main.ts")).detected).toEqual([]);
  });

  it("ignores dependency and build output", () => {
    expect(advise(code("node_modules/x/controllers/a.ts", "node_modules/x/services/b.ts", "dist/repositories/c.ts", "src/main.ts")).detected).toEqual([]);
  });

  it("needs three modules before calling it modular, and a required signal before reporting microservices", () => {
    expect(ids(advise(code("src/modules/orders/a.ts", "src/modules/billing/b.ts", "src/shared/u.ts")))).not.toContain("modular-monolith");
    expect(ids(advise({ ...code("services/a/x.ts", "services/b/y.ts", "gateway/z.ts") }))).not.toContain("microservices");
  });

  it("reads Windows-style paths the same way", () => {
    expect(ids(advise(code("src\\controllers\\a.ts", "src\\services\\b.ts", "src\\repositories\\c.ts")))).toEqual(["layered"]);
  });
});

describe("the suggestion", () => {
  const files = (n: number, dir = "src/misc") => code(...Array.from({ length: n }, (_v, i) => `${dir}/f${i}.ts`));

  it("keeps a small flat project simple", () => {
    const advice = advise({ ...files(5), "Dockerfile": "FROM node" });
    expect(advice.detected).toEqual([]);
    expect(advice.recommendation).toMatchObject({ styleId: "simple-monolith" });
    expect(advice.recommendation!.why.join(" ")).toContain("Only 5 source files in one deployable");
  });

  it("suggests layered for a mid-sized single deployable with no structure", () => {
    expect(advise({ ...files(SMALL_SOURCE_FILES + 10), "Dockerfile": "x" }).recommendation).toMatchObject({ styleId: "layered" });
  });

  it("suggests feature modules for a large unstructured one", () => {
    expect(advise({ ...files(LARGE_SOURCE_FILES + 5), "Dockerfile": "x" }).recommendation).toMatchObject({ styleId: "modular-monolith" });
  });

  it("follows the framework's own convention for Django", () => {
    expect(advise({ ...files(SMALL_SOURCE_FILES + 10), "Dockerfile": "x" }, ["django"]).recommendation).toMatchObject({ styleId: "mvc" });
  });

  it("asks separate deployables to get their own structure", () => {
    const advice = advise({ ...files(SMALL_SOURCE_FILES + 10, "svc"), "a/Dockerfile": "x", "b/Dockerfile": "x" });
    expect(advice.recommendation).toMatchObject({ styleId: "layered" });
    expect(advice.recommendation!.why.join(" ")).toContain("2 separate deployables");
  });

  it("calls a partial match the closest one rather than telling the user to adopt it", () => {
    const advice = advise({ ...code("src/controllers/a.ts", "src/services/b.ts") });
    expect(advice.recommendation!.headline).toMatch(/closest match is Layered .* only partly there/);
    expect(advice.recommendation!.why.join(" ")).toContain("Missing: a data-access layer");
  });

  it("warns when microservices look heavy for the code, and when layers have outgrown a large codebase", () => {
    const micro = advise({
      ...code("services/a/x.ts", "services/b/y.ts", "services/c/z.ts", "gateway/g.ts"),
      "services/a/Dockerfile": "x", "services/b/Dockerfile": "x", "services/c/Dockerfile": "x",
    });
    expect(micro.recommendation!.caveats.join(" ")).toContain("3 deployables for only 4 source files");
    const big = advise({ ...code("src/controllers/a.ts", "src/services/b.ts", "src/repositories/c.ts"), ...files(LARGE_SOURCE_FILES, "src/other") });
    expect(big.recommendation).toMatchObject({ styleId: "layered" });
    expect(big.recommendation!.caveats.join(" ")).toContain("modular monolith");
    expect(big.recommendation!.alsoConsider.map((o) => o.styleId)).toEqual(["modular-monolith", "clean"]);
  });

  it("says when the repository looks like a library, and when there is no code to judge", () => {
    expect(advise(files(60)).recommendation!.caveats.join(" ")).toContain("may be a library or a tool");
    expect(adviseArchitecture({ rootPath: "/r", changedFiles: [], files: ["README.md"] }, { languages: [], frameworks: [] }).recommendation).toBeUndefined();
  });

  it("always states its limits, and adds one about the user interface for a front-end framework", () => {
    const backend = advise(files(5));
    expect(backend.limits).toHaveLength(3);
    expect(backend.limits.join(" ")).toContain("cannot see whether the code's dependencies actually follow a style");
    expect(advise(files(5), ["react"]).limits.join(" ")).toContain("front-end framework");
  });

  it("is deterministic", () => {
    const input = { ...code("src/controllers/a.ts", "src/services/b.ts", "src/repositories/c.ts"), ...files(20) };
    expect(JSON.stringify(advise(input))).toBe(JSON.stringify(advise({ ...input })));
  });
});

describe("the report", () => {
  it("shows what the repository looks like, the suggestion with its reasons, a worked reference and the limits", () => {
    const text = formatAdvice("/repo", advise(code("src/controllers/a.ts", "src/services/b.ts", "src/repositories/c.ts")));
    expect(text).toContain("# Architecture review: /repo");
    expect(text).toContain("| Layered (n-tier) | strong (100%) |");
    expect(text).toContain("**Layered (n-tier).** Keep following Layered (n-tier), and enforce it.");
    expect(text).toContain("### Layered (n-tier)");
    expect(text).toContain("Example layout:");
    expect(text).toContain("## Limits");
  });

  it("says plainly when nothing was recognised", () => {
    expect(formatAdvice("/repo", advise(code("src/main.ts")))).toContain("**No clear architecture detected.**");
  });

  it("points to the bundled profile that enforces a style, or says there is none", () => {
    expect(formatAdvice("/r", advise(code("src/domain/a.ts", "src/application/usecases/b.ts", "src/infrastructure/c.ts")))).toContain("`clean-architecture` profile");
    expect(formatAdvice("/r", advise(code("src/controllers/a.ts", "src/services/b.ts", "src/repositories/c.ts")))).toContain("no bundled profile");
  });
});

describe("governance architecture", () => {
  const roots: string[] = [];
  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true })));
  });
  const cli = async (args: string[]) => {
    const out: string[] = [];
    const err: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((c: string | Uint8Array) => { out.push(String(c)); return true; });
    vi.spyOn(process.stderr, "write").mockImplementation((c: string | Uint8Array) => { err.push(String(c)); return true; });
    return { exitCode: await runCli(args), out: () => out.join(""), err: () => err.join("") };
  };

  it("parses --list for this command only, and rejects options it does not use", () => {
    expect(parseCliArguments(["architecture", "--list"]).list).toBe(true);
    expect(parseCliArguments(["architecture", "repo", "--json"]).json).toBe(true);
    expect(() => parseCliArguments(["check", ".", "--list"])).toThrow(/only supported by the architecture command/);
    expect(() => parseCliArguments(["architecture", ".", "--pack", "x.json"])).toThrow(/not supported by the architecture command/);
  });

  it("prints the reference, as text and as JSON", async () => {
    const text = await cli(["architecture", "--list"]);
    expect(text.exitCode).toBe(0);
    expect(text.out()).toContain("# Architecture styles: a reference");
    expect(text.out()).toContain("## Microservices");
    vi.restoreAllMocks();
    const json = await cli(["architecture", "--list", "--json"]);
    expect((JSON.parse(json.out()) as { styles: unknown[] }).styles).toHaveLength(9);
  });

  it("reviews a real repository on disk", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "governance-arch-"));
    roots.push(dir);
    for (const file of ["src/controllers/users.ts", "src/services/users.ts", "src/repositories/users.ts"]) {
      await mkdir(path.dirname(path.join(dir, file)), { recursive: true });
      await writeFile(path.join(dir, file), "export const a = 1;\n");
    }
    await writeFile(path.join(dir, "package.json"), JSON.stringify({ dependencies: { express: "^4" } }));
    await run("git", ["init", "--quiet"], { cwd: dir });
    const text = await cli(["architecture", dir]);
    expect(text.exitCode).toBe(0);
    expect(text.out()).toContain("| Layered (n-tier) | strong (100%) |");
    vi.restoreAllMocks();
    const json = await cli(["architecture", dir, "--json"]);
    const parsed = JSON.parse(json.out()) as { detected: { id: string }[]; recommendation: { styleId: string }; shape: { frameworks: string[] } };
    expect(parsed.detected[0]!.id).toBe("layered");
    expect(parsed.recommendation.styleId).toBe("layered");
    expect(parsed.shape.frameworks).toContain("express");
  }, 60_000);
});
