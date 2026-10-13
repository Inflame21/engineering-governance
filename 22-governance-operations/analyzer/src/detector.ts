import type { RepositoryFacts, RepositorySnapshot } from "./types.js";

const languageByExtension: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".py": "python",
  ".go": "go",
  ".java": "java",
  ".rs": "rust",
  ".cs": "csharp",
  ".rb": "ruby",
  ".php": "php",
  ".kt": "kotlin",
  ".swift": "swift",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".c": "c",
};

const frameworkMarkers: Record<string, string> = {
  "next.config.js": "nextjs",
  "next.config.mjs": "nextjs",
  "next.config.ts": "nextjs",
  "vite.config.ts": "vite",
  "vite.config.js": "vite",
  "angular.json": "angular",
  "nuxt.config.ts": "nuxt",
  "manage.py": "django",
};

const packageManagerMarkers: Record<string, string> = {
  "package-lock.json": "npm",
  "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn",
  "bun.lock": "bun",
  "bun.lockb": "bun",
  "poetry.lock": "poetry",
  "uv.lock": "uv",
  "Pipfile.lock": "pipenv",
  "go.sum": "go",
  "Cargo.lock": "cargo",
};

export function detectRepositoryFacts(
  snapshot: RepositorySnapshot,
): RepositoryFacts {
  const files = new Set(snapshot.files);
  const hasBasename = (name: string): boolean =>
    snapshot.files.some((file) => file.split("/").at(-1) === name);
  const hasDirectory = (name: string): boolean =>
    snapshot.files.some((file) => file.split("/").includes(name));
  const languages = new Set<string>();
  const frameworks = new Set<string>();
  const packageManagers = new Set<string>();

  for (const file of snapshot.files) {
    const lower = file.toLowerCase();
    const dot = lower.lastIndexOf(".");
    if (dot >= 0) {
      const language = languageByExtension[lower.slice(dot)];
      if (language) languages.add(language);
    }
  }

  // A Go module is authoritative enough to identify Go even when the module
  // contains no tracked .go source in the current snapshot.
  if (hasBasename("go.mod")) languages.add("go");

  for (const [marker, framework] of Object.entries(frameworkMarkers)) {
    if (hasBasename(marker)) frameworks.add(framework);
  }

  for (const [marker, manager] of Object.entries(packageManagerMarkers)) {
    if (hasBasename(marker)) packageManagers.add(manager);
  }

  const buildSystems = new Set<string>();
  if (hasBasename("Makefile")) buildSystems.add("make");
  if (hasBasename("Dockerfile")) buildSystems.add("docker");
  if (hasBasename("docker-compose.yml") || hasBasename("docker-compose.yaml")) {
    buildSystems.add("docker-compose");
  }

  const infrastructureSystems = new Set<string>();
  if (hasDirectory("terraform") || snapshot.files.some((file) => file.endsWith(".tf"))) {
    infrastructureSystems.add("terraform");
  }
  if (hasDirectory("k8s") || hasDirectory("kubernetes")) {
    infrastructureSystems.add("kubernetes");
  }

  const testSystems = new Set<string>();
  if ([...files].some((file) => /(^|\/)(vitest|jest).config\./.test(file))) {
    testSystems.add("javascript-test-runner");
  }
  if ([...files].some((file) => /(^|\/)(pytest.ini|conftest.py)$/.test(file))) {
    testSystems.add("pytest");
  }
  if ([...files].some((file) => file.endsWith("_test.go"))) {
    testSystems.add("go-test");
  }

  return {
    languages: [...languages].sort(),
    frameworks: [...frameworks].sort(),
    packageManagers: [...packageManagers].sort(),
    buildSystems: [...buildSystems].sort(),
    infrastructureSystems: [...infrastructureSystems].sort(),
    testSystems: [...testSystems].sort(),
  };
}
