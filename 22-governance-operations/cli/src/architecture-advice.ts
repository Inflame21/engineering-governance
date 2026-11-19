import type { RepositoryFacts, RepositorySnapshot } from "../../analyzer/src/types.js";
import catalogJson from "../../model/architecture-catalog.json" with { type: "json" };

/**
 * `governance architecture`: a reference of architecture styles, a guess at which one a repository follows,
 * and a suggestion for what it could follow instead. All of it is advice computed from names and counts
 * (folder names, manifests, how many things deploy); it cannot see whether the code's dependencies really
 * follow a style, nor the team, the load or the domain. Where a bundled profile exists, `check --profile`
 * is what verifies dependencies.
 */

export interface ArchitectureStyle {
  id: string;
  name: string;
  summary: string;
  structure: string[];
  strengths: string[];
  weaknesses: string[];
  bestWhen: string[];
  avoidWhen: string[];
  firstSteps: string[];
  /** Id of a bundled architecture profile that can enforce this style's dependency rules. */
  profile?: string;
}

export const ARCHITECTURE_CATALOG: readonly ArchitectureStyle[] = (catalogJson as { styles: ArchitectureStyle[] }).styles;
const styleById = (id: string): ArchitectureStyle => {
  const style = ARCHITECTURE_CATALOG.find((item) => item.id === id);
  if (!style) throw new Error(`Unknown architecture style: ${id}`);
  return style;
};

/** Heuristic thresholds, not research: below SMALL a simple layout is fine, from LARGE up boundaries matter. */
export const SMALL_SOURCE_FILES = 40;
export const LARGE_SOURCE_FILES = 300;
const MICROSERVICES_MINIMUM_SOURCE_FILES = 150;

export type Fit = "strong" | "moderate" | "weak";

export interface StyleDetection {
  id: string;
  name: string;
  fit: Fit;
  /** Share of this style's signals that were found, 0 to 1. */
  score: number;
  matched: string[];
  missing: string[];
}

export interface RepositoryShape {
  sourceFiles: number;
  deployables: number;
  languages: string[];
  frameworks: string[];
}

export interface Recommendation {
  styleId: string;
  headline: string;
  why: string[];
  caveats: string[];
  alsoConsider: { styleId: string; reason: string }[];
}

export interface ArchitectureAdvice {
  shape: RepositoryShape;
  /** Styles whose signals were found, best fit first. A repository can legitimately match several. */
  detected: StyleDetection[];
  recommendation?: Recommendation;
  limits: string[];
}

const IGNORED_SEGMENTS = new Set(["node_modules", "dist", "build", "out", "target", ".git", ".github", ".governance", "vendor", "__pycache__", ".venv", "venv", "coverage", ".next", ".nuxt"]);
const TEST_SEGMENTS = new Set(["test", "tests", "__tests__", "spec", "specs", "e2e", "__mocks__", "fixtures"]);
const SOURCE_EXTENSION = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|py|go|java|rs|cs|rb|php|kt|swift|c|h|cc|cpp|hpp)$/i;
/** View templates are code for the purpose of recognising a folder as one that holds the application. */
const TEMPLATE_EXTENSION = /\.(html?|ejs|hbs|handlebars|jinja2?|j2|twig|erb|cshtml|razor|vue|svelte|pug|njk|tpl)$/i;
const MANIFEST = /^(package\.json|requirements\.txt|pyproject\.toml|go\.mod|pom\.xml|build\.gradle(\.kts)?|cargo\.toml|pipfile|composer\.json)$/i;
const SERVICE_MANIFEST = /^(package\.json|pyproject\.toml|go\.mod|pom\.xml|build\.gradle(\.kts)?|cargo\.toml|requirements\.txt|.*\.csproj)$/i;

interface Context {
  /** Directory name (lower case) to example paths, for non-test, non-ignored source areas. */
  dirs: Map<string, string[]>;
  basenames: Map<string, string[]>;
  /** Distinct child directory names under each directory whose name is in `tokens`. */
  childrenOf(tokens: readonly string[]): { container: string; children: string[] } | undefined;
  manifestText: string;
  shape: RepositoryShape;
  deployableNames: string[];
}

interface Group {
  label: string;
  /** Without every required group a style is not reported. */
  required?: boolean;
  /** The evidence found, or undefined when the signal is absent. */
  find(context: Context): string | undefined;
}

const dirGroup = (label: string, tokens: readonly string[], required = false): Group => ({
  label,
  required,
  find: ({ dirs }) => {
    for (const token of tokens) {
      const examples = dirs.get(token);
      if (examples) return `${token}/ (${examples[0]})`;
    }
    return undefined;
  },
});

const dependencyGroup = (label: string, pattern: RegExp): Group => ({
  label,
  find: ({ manifestText }) => {
    const found = pattern.exec(manifestText);
    return found ? `a dependency on ${found[1]!.toLowerCase()}` : undefined;
  },
});

const STYLE_SIGNALS: Record<string, Group[]> = {
  layered: [
    dirGroup("a presentation layer (controllers/, routes/, api/, web/)", ["controllers", "controller", "routes", "presentation", "web", "api"]),
    dirGroup("a business layer (services/, business/)", ["services", "service", "business", "businesslogic", "logic"]),
    dirGroup("a data-access layer (repositories/, dao/, persistence/)", ["repositories", "repository", "dao", "persistence", "dataaccess", "data-access", "data_access", "db", "database"]),
  ],
  mvc: [
    dirGroup("models/", ["models", "model"]),
    dirGroup("views/ or templates/", ["views", "view", "templates"]),
    dirGroup("controllers/", ["controllers", "controller"]),
  ],
  clean: [
    dirGroup("a domain or entities folder", ["domain", "entities", "enterprise"]),
    dirGroup("use cases (usecases/, interactors/, application/)", ["usecases", "use_cases", "use-cases", "interactors", "application"]),
    dirGroup("an outer ring (infrastructure/, frameworks/, interfaces/)", ["infrastructure", "infra", "frameworks", "gateways", "presentation", "interfaces"]),
  ],
  hexagonal: [
    dirGroup("ports/", ["ports", "port"]),
    dirGroup("adapters/", ["adapters", "adapter"]),
    dirGroup("a core (domain/, core/, application/)", ["domain", "core", "application"]),
    dirGroup("direction names (inbound/, outbound/, driving/, driven/)", ["inbound", "outbound", "driving", "driven", "primary", "secondary"]),
  ],
  "modular-monolith": [
    {
      label: "three or more feature modules (modules/, features/, domains/, contexts/)",
      required: true,
      find: ({ childrenOf }) => {
        const found = childrenOf(["modules", "features", "domains", "contexts", "bounded-contexts", "bounded_contexts"]);
        return found && found.children.length >= 3 ? `${found.container}/ has ${found.children.length} modules (${found.children.slice(0, 4).join(", ")})` : undefined;
      },
    },
    { label: "a single deployable", find: ({ shape }) => (shape.deployables <= 1 ? "one deployable" : undefined) },
    dirGroup("a small shared kernel (shared/, common/)", ["shared", "common", "kernel", "sharedkernel", "shared-kernel"]),
  ],
  microservices: [
    {
      label: "two or more separately deployable services",
      required: true,
      find: ({ shape, deployableNames }) => (shape.deployables >= 2 ? `${shape.deployables} deployables (${deployableNames.slice(0, 4).join(", ")})` : undefined),
    },
    {
      label: "service folders (services/ with two or more services)",
      find: ({ childrenOf }) => {
        const found = childrenOf(["services", "microservices"]);
        return found && found.children.length >= 2 ? `${found.container}/ has ${found.children.length} services (${found.children.slice(0, 4).join(", ")})` : undefined;
      },
    },
    dirGroup("a gateway or shared contracts (gateway/, proto/, contracts/)", ["gateway", "api-gateway", "apigateway", "gateways", "proto", "protos", "contracts", "openapi"]),
    {
      label: "orchestration (docker-compose, k8s/, helm/)",
      find: ({ dirs, basenames }) => {
        const compose = [...basenames.keys()].find((name) => /^docker-compose.*\.ya?ml$/.test(name));
        if (compose) return compose;
        const dir = ["k8s", "kubernetes", "helm", "charts", "deploy", "deployment", "manifests"].find((name) => dirs.has(name));
        return dir ? `${dir}/ (${dirs.get(dir)![0]})` : undefined;
      },
    },
  ],
  "event-driven": [
    dirGroup("event folders (events/, consumers/, producers/, subscribers/)", ["events", "event", "consumers", "producers", "subscribers", "listeners", "publishers", "messaging", "queues", "topics"]),
    dependencyGroup("a message-broker dependency (Kafka, RabbitMQ, NATS, SQS, ...)", /(kafka|rabbitmq|amqp|nats|sqs|sns|pubsub|eventbridge|bullmq|celery|kombu|redis-stream|pulsar|servicebus)/i),
    dirGroup("event patterns (sagas/, outbox/, projections/, cqrs/)", ["sagas", "saga", "outbox", "projections", "eventstore", "event-store", "event_store", "cqrs", "commands", "queries"]),
  ],
  serverless: [
    {
      label: "a serverless configuration file",
      find: ({ basenames }) => {
        const file = ["serverless.yml", "serverless.yaml", "serverless.ts", "serverless.js", "samconfig.toml", "netlify.toml", "vercel.json", "firebase.json", "host.json", "function.json"].find((name) => basenames.has(name));
        return file ? file : undefined;
      },
    },
    dirGroup("functions/ or lambdas/", ["functions", "lambdas", "lambda"]),
    dependencyGroup("a serverless runtime dependency", /(aws-lambda|serverless|@vercel\/node|azure-functions|firebase-functions|@netlify\/functions|functions-framework|mangum|zappa)/i),
  ],
};

function fitFor(score: number): Fit {
  return score >= 0.75 ? "strong" : score >= 0.5 ? "moderate" : "weak";
}

function buildContext(snapshot: RepositorySnapshot, facts: Pick<RepositoryFacts, "languages" | "frameworks">): Context {
  const dirs = new Map<string, string[]>();
  const basenames = new Map<string, string[]>();
  const childIndex = new Map<string, Set<string>>();
  const dockerDirs = new Set<string>();
  const serviceDirs = new Set<string>();
  // A folder only counts as a signal if it holds code or view templates. A models/ folder of JSON schemas or a
  // templates/ folder of documents is not an MVC layer.
  const codePrefixes = new Set<string>();
  for (const raw of snapshot.files) {
    const segments = raw.replaceAll("\\", "/").split("/");
    const base = segments[segments.length - 1]!;
    const directories = segments.slice(0, -1);
    if (segments.some((segment) => IGNORED_SEGMENTS.has(segment.toLowerCase())) || directories.some((segment) => TEST_SEGMENTS.has(segment.toLowerCase()))) continue;
    if (SOURCE_EXTENSION.test(base) || TEMPLATE_EXTENSION.test(base)) {
      directories.forEach((_segment, index) => codePrefixes.add(directories.slice(0, index + 1).join("/")));
    }
  }
  let composeServices = 0;
  let manifestText = "";
  let sourceFiles = 0;

  for (const raw of snapshot.files) {
    const file = raw.replaceAll("\\", "/");
    const segments = file.split("/");
    if (segments.some((segment) => IGNORED_SEGMENTS.has(segment.toLowerCase()))) continue;
    const base = segments[segments.length - 1]!;
    const lowerBase = base.toLowerCase();
    const directories = segments.slice(0, -1);
    const inTests = directories.some((segment) => TEST_SEGMENTS.has(segment.toLowerCase()));

    // Deployables and manifests count wherever they are, including a Dockerfile inside a tests folder being ignored.
    if (/^dockerfile(\..+)?$|\.dockerfile$/.test(lowerBase) && !inTests) dockerDirs.add(directories.join("/") || ".");
    if (/^docker-compose.*\.ya?ml$/.test(lowerBase)) {
      const text = snapshot.fileContents?.[raw] ?? snapshot.fileContents?.[file];
      const block = text ? /^services:\s*\n((?:[ \t]+.*\n?|\s*\n)*)/m.exec(text) : null;
      if (block) composeServices = Math.max(composeServices, (block[1]!.match(/^ {1,4}[A-Za-z0-9_.-]+:\s*$/gm) ?? []).length);
    }
    if (MANIFEST.test(base)) manifestText += `\n${snapshot.fileContents?.[raw] ?? snapshot.fileContents?.[file] ?? ""}`;
    const serviceRoot = directories.findIndex((segment) => ["services", "apps", "microservices"].includes(segment.toLowerCase()));
    if (serviceRoot >= 0 && directories.length === serviceRoot + 2 && SERVICE_MANIFEST.test(base)) serviceDirs.add(directories.join("/"));

    if (inTests) continue;
    if (SOURCE_EXTENSION.test(base)) sourceFiles += 1;
    (basenames.get(lowerBase) ?? basenames.set(lowerBase, []).get(lowerBase)!).push(file);
    directories.forEach((segment, index) => {
      const name = segment.toLowerCase();
      const path = directories.slice(0, index + 1).join("/");
      if (!codePrefixes.has(path)) return;
      const examples = dirs.get(name) ?? [];
      if (!examples.includes(path) && examples.length < 3) examples.push(path);
      dirs.set(name, examples);
      const next = directories[index + 1];
      if (next !== undefined && codePrefixes.has(`${path}/${next}`)) {
        const key = `${name}\u0000${path}`;
        (childIndex.get(key) ?? childIndex.set(key, new Set()).get(key)!).add(next);
      }
    });
  }

  const deployableNames = [...new Set([...dockerDirs, ...serviceDirs])].sort();
  const deployables = Math.max(dockerDirs.size, serviceDirs.size, composeServices);
  const childrenOf = (tokens: readonly string[]) => {
    let best: { container: string; children: string[] } | undefined;
    for (const [key, children] of childIndex) {
      const name = key.split("\u0000")[0]!;
      if (tokens.includes(name) && (!best || children.size > best.children.length)) best = { container: name, children: [...children].sort() };
    }
    return best;
  };

  return {
    dirs,
    basenames,
    childrenOf,
    manifestText,
    shape: { sourceFiles, deployables, languages: [...facts.languages], frameworks: [...facts.frameworks] },
    deployableNames,
  };
}

/** Score every style against the repository. A style is reported only with its required signals and at least two. */
function detectStyles(context: Context): StyleDetection[] {
  const detections: StyleDetection[] = [];
  for (const style of ARCHITECTURE_CATALOG) {
    const groups = STYLE_SIGNALS[style.id];
    if (!groups) continue;
    const results = groups.map((group) => ({ group, evidence: group.find(context) }));
    const matched = results.filter((result) => result.evidence !== undefined);
    if (matched.length < 2 || results.some((result) => result.group.required && result.evidence === undefined)) continue;
    const score = matched.length / groups.length;
    detections.push({
      id: style.id,
      name: style.name,
      fit: fitFor(score),
      score: Math.round(score * 100) / 100,
      matched: matched.map((result) => `${result.group.label}: ${result.evidence}`),
      missing: results.filter((result) => result.evidence === undefined).map((result) => result.group.label),
    });
  }
  const order = new Map(ARCHITECTURE_CATALOG.map((style, index) => [style.id, index]));
  return detections.sort((a, b) => b.score - a.score || order.get(a.id)! - order.get(b.id)!);
}

const ALSO_CONSIDER: Record<string, { styleId: string; reason: string }[]> = {
  "simple-monolith": [{ styleId: "layered", reason: "the first structure to add once the code outgrows one folder" }],
  layered: [
    { styleId: "modular-monolith", reason: "groups code by feature instead of by technical layer, which limits how far a change spreads" },
    { styleId: "clean", reason: "keeps business rules independent of the database and framework if the domain is complex" },
  ],
  mvc: [{ styleId: "modular-monolith", reason: "gives a growing application feature boundaries that MVC alone does not" }],
  clean: [{ styleId: "hexagonal", reason: "a close relative that fits better when there are many integrations in and out" }],
  hexagonal: [{ styleId: "clean", reason: "a close relative with use cases at its centre, suited to a rich domain" }],
  "modular-monolith": [{ styleId: "microservices", reason: "only if separate teams, scaling needs or release cadence justify the operating cost" }],
  microservices: [{ styleId: "modular-monolith", reason: "keeps the boundaries without the cost of running and monitoring many services" }],
  "event-driven": [{ styleId: "modular-monolith", reason: "a simpler base if the event flows are few and stay inside one deployable" }],
  serverless: [{ styleId: "layered", reason: "a conventional server application if the load is steady or the functions are long-running" }],
};

const MVC_FRAMEWORKS = new Set(["django"]);

function recommend(detected: StyleDetection[], shape: RepositoryShape): Recommendation | undefined {
  if (shape.sourceFiles === 0) return undefined;
  const best = detected[0];
  const caveats: string[] = [];
  let styleId: string;
  let headline: string;
  const why: string[] = [];

  if (best && best.fit === "strong") {
    styleId = best.id;
    headline = `Keep following ${best.name}, and enforce it.`;
    why.push(`The structure matches it closely (${best.matched.length} of ${best.matched.length + best.missing.length} signals).`);
    if (best.id === "microservices" && shape.deployables >= 3 && shape.sourceFiles < MICROSERVICES_MINIMUM_SOURCE_FILES) {
      caveats.push(`${shape.deployables} deployables for only ${shape.sourceFiles} source files: check that each service earns its own deployment; a modular monolith costs less to run.`);
    }
    if ((best.id === "layered" || best.id === "mvc") && shape.sourceFiles >= LARGE_SOURCE_FILES) {
      caveats.push(`At ${shape.sourceFiles} source files a layer-by-technology layout tends to couple features together; a modular monolith would give you feature boundaries.`);
    }
  } else if (best && best.score >= 0.5 && best.matched.length >= 2) {
    styleId = best.id;
    headline = `The closest match is ${best.name}, and it is only partly there; completing it is the natural next step.`;
    why.push(`Found: ${best.matched.map((item) => item.split(":")[0]).join("; ")}.`, `Missing: ${best.missing.join("; ")}.`);
  } else if (shape.sourceFiles < SMALL_SOURCE_FILES && shape.deployables <= 1) {
    styleId = "simple-monolith";
    headline = "Keep it simple: this is small enough not to need a named architecture yet.";
    why.push(`Only ${shape.sourceFiles} source files${shape.deployables === 1 ? " in one deployable" : ""}, with no layers or modules to speak of.`);
  } else if (shape.deployables >= 2) {
    styleId = "layered";
    headline = "Give each deployable its own clear structure; layered is the simplest start.";
    why.push(`${shape.deployables} separate deployables were found, but no recognisable structure inside them.`);
  } else if (shape.frameworks.some((framework) => MVC_FRAMEWORKS.has(framework))) {
    styleId = "mvc";
    headline = "Follow your framework's MVC layout.";
    why.push(`The ${shape.frameworks.filter((framework) => MVC_FRAMEWORKS.has(framework)).join(", ")} framework is built around it, so its conventions and tooling will help.`);
  } else if (shape.sourceFiles >= LARGE_SOURCE_FILES) {
    styleId = "modular-monolith";
    headline = "Introduce feature modules: this is large enough that boundaries matter.";
    why.push(`${shape.sourceFiles} source files${shape.deployables === 1 ? " in one deployable" : ""} with no recognisable structure.`);
  } else {
    styleId = "layered";
    headline = "Start with a layered structure.";
    why.push(`${shape.sourceFiles} source files${shape.deployables === 1 ? " in one deployable" : ""} with no recognisable structure: layered is the simplest layout that fits a typical back end.`);
  }

  if (shape.deployables === 0 && shape.frameworks.length === 0) {
    caveats.push("No deployable (Dockerfile, compose service) and no web framework was found, so this may be a library or a tool. These styles describe applications and services and fit a library only loosely.");
  }
  return { styleId, headline, why, caveats, alsoConsider: ALSO_CONSIDER[styleId] ?? [] };
}

const LIMITS = [
  "This reads folder names, manifests and counts. It cannot see whether the code's dependencies actually follow a style: for Clean, Hexagonal, Microservices and Modular, `governance check --profile <profile>` does that.",
  "It cannot see the team size, the load, the release process or how complicated the domain is, and those matter more than structure. Treat the suggestion as a starting point for a decision, not the decision.",
  "A repository can match several styles at once (for example modular inside, microservices outside), and a style can be present in name only.",
];

export function adviseArchitecture(snapshot: RepositorySnapshot, facts: Pick<RepositoryFacts, "languages" | "frameworks">): ArchitectureAdvice {
  const context = buildContext(snapshot, facts);
  const detected = detectStyles(context);
  const limits = [...LIMITS];
  if (context.shape.frameworks.some((framework) => ["react", "angular", "nextjs", "nuxt", "vite"].includes(framework))) {
    limits.push("A front-end framework was found. How to structure a user interface (components, state, routing) is not covered by this reference, which describes the back end and system shape.");
  }
  const recommendation = recommend(detected, context.shape);
  return { shape: context.shape, detected, ...(recommendation ? { recommendation } : {}), limits };
}

const bullets = (items: readonly string[], indent = ""): string[] => items.map((item) => `${indent}- ${item}`);

function styleReference(style: ArchitectureStyle, heading: string): string[] {
  return [
    `${heading} ${style.name}`,
    "",
    style.summary,
    "",
    "Example layout:",
    "",
    "```text",
    ...style.structure,
    "```",
    "",
    "Strengths:",
    ...bullets(style.strengths),
    "",
    "Weaknesses:",
    ...bullets(style.weaknesses),
    "",
    "Fits when:",
    ...bullets(style.bestWhen),
    "",
    "Avoid when:",
    ...bullets(style.avoidWhen),
    "",
    "First steps:",
    ...bullets(style.firstSteps),
    "",
    style.profile
      ? `Enforceable: yes, with the bundled \`${style.profile}\` profile (\`governance check --profile\`).`
      : "Enforceable: not yet; there is no bundled profile, so only the structure can be reviewed by eye.",
  ];
}

/** The whole catalog as a Markdown reference. */
export function formatCatalog(): string {
  return [
    "# Architecture styles: a reference",
    "",
    (catalogJson as { description: string }).description,
    "",
    "| Style | In one line | Enforceable |",
    "|---|---|---|",
    ...ARCHITECTURE_CATALOG.map((style) => `| ${style.name} | ${style.summary.split(". ")[0]!.replace(/\.$/, "")} | ${style.profile ? "yes" : "no"} |`),
    "",
    ...ARCHITECTURE_CATALOG.flatMap((style) => [...styleReference(style, "##"), ""]),
  ].join("\n").trimEnd();
}

export function formatAdvice(repository: string, advice: ArchitectureAdvice): string {
  const { shape, detected, recommendation } = advice;
  const lines = [
    `# Architecture review: ${repository}`,
    "",
    "Advisory. Computed from folder names, manifests and counts; see the limits at the end.",
    "",
    "## What the repository looks like",
    "",
    `${shape.sourceFiles} source file${shape.sourceFiles === 1 ? "" : "s"}, ${shape.deployables} deployable${shape.deployables === 1 ? "" : "s"}${shape.languages.length ? `, ${shape.languages.join(", ")}` : ""}${shape.frameworks.length ? ` (${shape.frameworks.join(", ")})` : ""}.`,
    "",
  ];
  if (detected.length === 0) {
    lines.push("**No clear architecture detected.** None of the styles in the reference has enough of its signals in this repository.", "");
  } else {
    lines.push("Styles this repository resembles, best fit first:", "", "| Style | Fit | Found | Missing |", "|---|---|---|---|");
    for (const item of detected) {
      lines.push(`| ${item.name} | ${item.fit} (${Math.round(item.score * 100)}%) | ${item.matched.map((m) => m.replace(/\|/g, "\\|")).join("<br>")} | ${item.missing.length ? item.missing.join("<br>") : "nothing"} |`);
    }
    lines.push("");
  }

  lines.push("## What I would suggest", "");
  if (!recommendation) {
    lines.push("There is no source code to judge.", "");
  } else {
    const style = styleById(recommendation.styleId);
    lines.push(`**${style.name}.** ${recommendation.headline}`, "", ...bullets(recommendation.why), "");
    if (recommendation.caveats.length > 0) lines.push("Watch out:", ...bullets(recommendation.caveats), "");
    if (recommendation.alsoConsider.length > 0) {
      lines.push("Also consider:", ...recommendation.alsoConsider.map((option) => `- **${styleById(option.styleId).name}**: ${option.reason}`), "");
    }
    lines.push(...styleReference(style, "###"), "");
  }

  lines.push("## Limits", "", ...bullets(advice.limits), "", "Run `governance architecture --list` for the whole reference.");
  return lines.join("\n");
}
