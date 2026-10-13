import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import type { RepositoryChangeScope, RepositorySnapshot } from "../../analyzer/src/types.js";

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

const ignoredDirectories = new Set([
  ".git", "node_modules", "dist", "build", "coverage", ".next", ".nuxt",
  ".venv", "venv", "__pycache__", ".pytest_cache", ".mypy_cache", ".tox",
]);

const MAX_FILES = 50_000;
const MAX_TEXT_FILE_BYTES = 1_000_000;
const MAX_SOURCE_FILES_FOR_ANALYSIS = 5_000;
const MAX_TOTAL_SOURCE_CONTENT_CHARS = 20_000_000;
const sourceExtensions = new Set([
  ".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".go", ".java", ".rs", ".cs", ".rb", ".php", ".kt", ".swift",
  ".c", ".h", ".cc", ".cpp", ".hpp",
]);

function normalizedRelativePath(filePath: string): string {
  return filePath.replaceAll("\\", "/").replace(/^\.\//, "");
}

function resolveConfinedPath(rootPath: string, relativePath: string): string {
  const root = path.resolve(rootPath);
  const target = path.resolve(root, relativePath);
  const relative = path.relative(root, target);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Path escapes repository root: ${relativePath}`);
  }
  return target;
}

/** Node filesystem adapter. Symlinks are not traversed during repository discovery. */
export const nodeFileSystem: FileSystemPort = {
  async listFiles(rootPath: string): Promise<string[]> {
    const root = await realpath(rootPath);
    const rootInfo = await lstat(root);
    if (!rootInfo.isDirectory()) throw new Error(`Repository root is not a directory: ${rootPath}`);

    const files: string[] = [];
    async function walk(directory: string, relativeDirectory: string): Promise<void> {
      const entries = await readdir(directory, { withFileTypes: true });
      entries.sort((a, b) => a.name.localeCompare(b.name));

      for (const entry of entries) {
        if (entry.isSymbolicLink()) continue;
        const relativePath = relativeDirectory
          ? path.posix.join(relativeDirectory, entry.name)
          : entry.name;

        if (entry.isDirectory()) {
          if (!ignoredDirectories.has(entry.name)) await walk(path.join(directory, entry.name), relativePath);
          continue;
        }

        if (entry.isFile()) {
          files.push(relativePath);
          if (files.length > MAX_FILES) {
            throw new Error(`Repository scan exceeded the ${MAX_FILES.toLocaleString()} file limit.`);
          }
        }
      }
    }

    await walk(root, "");
    return files;
  },

  async readTextFile(rootPath: string, relativePath: string): Promise<string | undefined> {
    const root = await realpath(rootPath);
    const target = resolveConfinedPath(root, relativePath);
    let targetInfo;
    try {
      targetInfo = await lstat(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }

    // Do not follow symlinks, devices, or paths whose parent symlink resolves outside the root.
    if (!targetInfo.isFile() || targetInfo.isSymbolicLink()) return undefined;
    const canonicalTarget = await realpath(target);
    const relativeCanonicalTarget = path.relative(root, canonicalTarget);
    if (
      relativeCanonicalTarget === ".." ||
      relativeCanonicalTarget.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativeCanonicalTarget)
    ) {
      throw new Error(`Resolved file escapes repository root: ${relativePath}`);
    }
    if (targetInfo.size > MAX_TEXT_FILE_BYTES) {
      throw new Error(`Refusing to read ${relativePath}: file exceeds ${MAX_TEXT_FILE_BYTES} bytes.`);
    }

    const content = await readFile(target, "utf8");
    return content;
  },
};

export async function loadRepositorySnapshot(
  rootPath: string,
  fs: FileSystemPort,
  changedFiles: readonly string[] = [],
  changeScope?: RepositoryChangeScope,
): Promise<RepositorySnapshot> {
  const files = (await fs.listFiles(rootPath))
    .map(normalizedRelativePath)
    .filter((file) => file.length > 0)
    .sort();

  const manifestPaths = files.filter((file) => {
    const basename = path.posix.basename(file);
    return manifestNames.has(basename);
  });
  const sourcePaths = files.filter((file) => sourceExtensions.has(path.posix.extname(file).toLowerCase()));
  const sourcePathSet = new Set(sourcePaths);
  const manifestPathSet = new Set(manifestPaths);
  const contentPaths = [...new Set([...manifestPaths, ...sourcePaths])];
  const fileContents: Record<string, string> = {};
  const contentLimitations: string[] = [];
  let sourceFilesLoaded = 0;
  let totalSourceContentChars = 0;

  // Read manifests first, then bounded source content for dependency analysis.
  for (const relativePath of contentPaths) {
    const isSource = sourcePathSet.has(relativePath);
    if (
      isSource &&
      (sourceFilesLoaded >= MAX_SOURCE_FILES_FOR_ANALYSIS ||
        totalSourceContentChars >= MAX_TOTAL_SOURCE_CONTENT_CHARS)
    ) {
      contentLimitations.push(
        `Source-content limits reached; ${relativePath} and later source files were not inspected.`,
      );
      break;
    }

    const content = await fs.readTextFile(rootPath, relativePath);
    if (content === undefined) {
      if (isSource || manifestPathSet.has(relativePath)) {
        contentLimitations.push(
          `Content unavailable for ${relativePath}; dependent analysis may be incomplete.`,
        );
      }
      continue;
    }

    if (isSource && totalSourceContentChars + content.length > MAX_TOTAL_SOURCE_CONTENT_CHARS) {
      contentLimitations.push(
        `Source-content character limit reached before ${relativePath}; this and later source files were not inspected.`,
      );
      break;
    }

    fileContents[relativePath] = content;
    if (isSource) {
      sourceFilesLoaded += 1;
      totalSourceContentChars += content.length;
    }
  }

  return {
    rootPath: path.resolve(rootPath),
    files,
    changedFiles: (changeScope?.files ?? [...changedFiles]).map(normalizedRelativePath),
    fileContents,
    ...(contentLimitations.length > 0 ? { contentLimitations } : {}),
    ...(changeScope ? { changeScope } : {}),
  };
}
