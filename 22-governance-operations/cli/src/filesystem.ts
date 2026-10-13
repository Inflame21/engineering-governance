import type { RepositorySnapshot } from "../../analyzer/src/types.js";

export interface FileSystemPort {
  listFiles(rootPath: string): Promise<string[]>;
  readTextFile(rootPath: string, relativePath: string): Promise<string | undefined>;
}

const manifestNames = new Set([
  "package.json", "pyproject.toml", "requirements.txt", "go.mod", "Cargo.toml",
  "pom.xml", "build.gradle", "build.gradle.kts", "Dockerfile", "docker-compose.yml",
  "docker-compose.yaml", "Makefile", "package-lock.json", "pnpm-lock.yaml",
  "yarn.lock", "bun.lock", "bun.lockb", "poetry.lock", "uv.lock", "Pipfile.lock",
]);

export async function loadRepositorySnapshot(
  rootPath: string,
  fs: FileSystemPort,
  changedFiles: readonly string[] = [],
): Promise<RepositorySnapshot> {
  const files = (await fs.listFiles(rootPath))
    .map((file) => file.replaceAll("\\", "/").replace(/^\.\//, ""))
    .filter((file) => file.length > 0)
    .sort();

  const manifestPaths = files.filter((file) =>
    manifestNames.has(file) ||
    file.endsWith("/package.json") ||
    file.endsWith("/pyproject.toml") ||
    file.endsWith("/requirements.txt"),
  );

  const entries = await Promise.all(
    manifestPaths.map(async (path) => [path, await fs.readTextFile(rootPath, path)] as const),
  );
  const fileContents: Record<string, string> = {};
  for (const [path, content] of entries) {
    if (content !== undefined) fileContents[path] = content;
  }

  return {
    rootPath,
    files,
    changedFiles: [...changedFiles],
    fileContents,
  };
}
