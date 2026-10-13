import path from "node:path";
import { hasPackageDependency, hasPythonDependency, parsePackageJson } from "./manifest.js";
import type { RepositoryFacts, RepositoryPackageFacts, RepositorySnapshot } from "./types.js";

const languageByExtension: Record<string, string> = {
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

const manifestNames = new Set([
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "go.mod",
  "Cargo.toml",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
]);

const sourceExtensions = new Set(Object.keys(languageByExtension));

function normalizedPath(file: string): string {
  return file.replaceAll("\\", "/").replace(/^\.\//, "");
}

function directoryOf(file: string): string {
  const directory = path.posix.dirname(file);
  return directory === "." ? "." : directory;
}

function isWithinRoot(file: string, root: string): boolean {
  return root === "." || file === root || file.startsWith(`${root}/`);
}

function languageFor(file: string): string | undefined {
  return languageByExtension[path.posix.extname(file).toLowerCase()];
}

function packageScopedFacts(snapshot: RepositorySnapshot): RepositoryPackageFacts[] {
  const files = snapshot.files.map(normalizedPath).sort();
  const manifests = files.filter((file) => manifestNames.has(path.posix.basename(file)));
  const roots = new Set(manifests.map(directoryOf));
  const hasRootLockfile = files.some((file) =>
    directoryOf(file) === "." && Object.hasOwn(packageManagerMarkers, path.posix.basename(file)),
  );
  const hasRootMarkers = files.some((file) =>
    directoryOf(file) === "." &&
    (
      Object.hasOwn(frameworkMarkers, path.posix.basename(file)) ||
      ["Dockerfile", "docker-compose.yml", "docker-compose.yaml", "Makefile"].includes(path.posix.basename(file))
    ),
  );

  // A synthetic root package keeps unowned top-level source and infrastructure visible
  // without assigning nested package files to the root when a more specific manifest exists.
  const hasUnownedSource = files.some((file) =>
    sourceExtensions.has(path.posix.extname(file).toLowerCase()) &&
    ![...roots].some((root) => isWithinRoot(file, root)),
  );
  if (hasRootLockfile || hasRootMarkers || hasUnownedSource || roots.size === 0) roots.add(".");

  const orderedRoots = [...roots].sort((a, b) => {
    if (a === ".") return -1;
    if (b === ".") return 1;
    return a.localeCompare(b);
  });
  const ownedByRoot = new Map<string, string[]>();
  for (const root of orderedRoots) ownedByRoot.set(root, []);

  for (const file of files) {
    const owner = orderedRoots
      .filter((root) => isWithinRoot(file, root))
      .sort((a, b) => b.length - a.length)[0];
    if (owner) ownedByRoot.get(owner)!.push(file);
  }

  const rootPackageManagers = new Set(
    files
      .filter((file) => directoryOf(file) === ".")
      .map((file) => packageManagerMarkers[path.posix.basename(file)])
      .filter((value): value is string => Boolean(value)),
  );

  return orderedRoots.map((root) => {
    const packageFiles = ownedByRoot.get(root) ?? [];
    const manifestPaths = manifests.filter((file) => directoryOf(file) === root);
    const languages = new Set<string>();
    const frameworks = new Set<string>();
    const packageManagers = new Set<string>();
    const buildSystems = new Set<string>();
    const infrastructureSystems = new Set<string>();
    const testSystems = new Set<string>();

    for (const file of packageFiles) {
      const language = languageFor(file);
      if (language) languages.add(language);

      const basename = path.posix.basename(file);
      const markerFramework = frameworkMarkers[basename];
      if (markerFramework && directoryOf(file) === root) frameworks.add(markerFramework);

      const manager = packageManagerMarkers[basename];
      if (manager && directoryOf(file) === root) packageManagers.add(manager);

      if (basename === "Makefile") buildSystems.add("make");
      if (basename === "Dockerfile") buildSystems.add("docker");
      if (basename === "docker-compose.yml" || basename === "docker-compose.yaml") {
        buildSystems.add("docker-compose");
      }
      if (file.endsWith(".tf") || packageFiles.some((item) => item.startsWith(root === "." ? "terraform/" : `${root}/terraform/`))) {
        infrastructureSystems.add("terraform");
      }
      if (packageFiles.some((item) => {
        const relative = root === "." ? item : item.slice(root.length + 1);
        return relative.split("/").some((segment) => segment === "k8s" || segment === "kubernetes");
      })) {
        infrastructureSystems.add("kubernetes");
      }
      if (/(^|\/)(vitest|jest)\.config\./.test(file)) testSystems.add("javascript-test-runner");
      if (basename === "pytest.ini" || basename === "conftest.py") testSystems.add("pytest");
      if (file.endsWith("_test.go")) testSystems.add("go-test");
    }

    // Root lockfiles often govern nested workspace packages; inherit the manager
    // only when a root-level manager is present and the package has no local lockfile.
    if (root !== "." && packageManagers.size === 0) {
      for (const manager of rootPackageManagers) packageManagers.add(manager);
    }

    for (const manifestPath of manifestPaths) {
      const content = snapshot.fileContents?.[manifestPath];
      if (content === undefined) continue;
      const basename = path.posix.basename(manifestPath);
      if (basename === "package.json") {
        // Invalid manifests are reported by the adapter pipeline; detection must
        // remain available so one malformed package cannot abort all repository analysis.
        try {
          const packageJson = parsePackageJson(content);
          const packages: Array<[string, string]> = [
            ["next", "nextjs"],
            ["react", "react"],
            ["express", "express"],
            ["@nestjs/core", "nestjs"],
            ["vite", "vite"],
          ];
          for (const [dependency, framework] of packages) {
            if (hasPackageDependency(packageJson, dependency)) frameworks.add(framework);
          }
        } catch {
          // Leave framework identity unknown for this package; the adapter records the failure.
        }
      } else if (basename === "pyproject.toml" || basename === "requirements.txt") {
        if (hasPythonDependency(content, "fastapi")) frameworks.add("fastapi");
        if (hasPythonDependency(content, "django")) frameworks.add("django");
      }
    }

    return {
      id: root === "." ? "package:root" : `package:${root}`,
      root,
      manifestPaths,
      sourceFiles: packageFiles.filter((file) => sourceExtensions.has(path.posix.extname(file).toLowerCase())),
      languages: [...languages].sort(),
      frameworks: [...frameworks].sort(),
      packageManagers: [...packageManagers].sort(),
      buildSystems: [...buildSystems].sort(),
      infrastructureSystems: [...infrastructureSystems].sort(),
      testSystems: [...testSystems].sort(),
    };
  }).filter((item) =>
    item.manifestPaths.length > 0 ||
    item.sourceFiles.length > 0 ||
    item.packageManagers.length > 0 ||
    item.buildSystems.length > 0 ||
    item.infrastructureSystems.length > 0,
  );
}

export function detectRepositoryFacts(
  snapshot: RepositorySnapshot,
): RepositoryFacts {
  const files = new Set(snapshot.files.map(normalizedPath));
  const hasBasename = (name: string): boolean =>
    [...files].some((file) => path.posix.basename(file) === name);
  const hasDirectory = (name: string): boolean =>
    [...files].some((file) => file.split("/").includes(name));
  const languages = new Set<string>();
  const frameworks = new Set<string>();
  const packageManagers = new Set<string>();

  for (const file of files) {
    const language = languageFor(file);
    if (language) languages.add(language);
  }

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
  if (hasDirectory("terraform") || [...files].some((file) => file.endsWith(".tf"))) {
    infrastructureSystems.add("terraform");
  }
  if (hasDirectory("k8s") || hasDirectory("kubernetes")) {
    infrastructureSystems.add("kubernetes");
  }

  const testSystems = new Set<string>();
  if ([...files].some((file) => /(^|\/)(vitest|jest)\.config\./.test(file))) {
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
    packages: packageScopedFacts(snapshot),
  };
}
