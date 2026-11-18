import { lstat, mkdir, open, realpath, stat } from "node:fs/promises";
import path from "node:path";
import type { GovernancePack } from "../../engine/src/types.js";
import { loadGovernancePack } from "./config.js";

export interface InitOptions {
  repositoryPath: string;
  /** Pack path relative to the repository root. */
  packPath: string;
  id?: string;
  name?: string;
  repository?: string;
  environment?: string;
}

export interface InitResult {
  packPath: string;
  project: GovernancePack["project"];
}

const PROJECT_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;
const UNSET_REPOSITORY = "UNSET";
const DEFAULT_ENVIRONMENT = "development";

/** A schema-valid project id derived from a directory name, or undefined when nothing usable remains. */
export function slugifyProjectId(value: string): string | undefined {
  const slug = value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^[^a-z0-9]+/, "").replace(/-+$/, "");
  return PROJECT_ID_PATTERN.test(slug) ? slug : undefined;
}

/**
 * A pack that asserts nothing. It declares no control, evidence, risk or decision, so it cannot
 * claim anything the project has not shown: until real controls are added, `check` returns NO-GO
 * because no control applied and nothing was evaluated (GOV-022 section 10).
 */
export function buildGovernancePackSkeleton(project: GovernancePack["project"]): GovernancePack {
  return {
    version: "1.0.0",
    project,
    change: {
      id: "CHG-UNSPECIFIED",
      type: "configuration",
      title: "Governance baseline (change not yet described)",
      risk_class: "C",
      files: [],
    },
    standards: [],
    controls: [],
    evidence: [],
    risks: [],
    decisions: [],
    exceptions: [],
    debt: [],
  };
}

function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

/**
 * Create a file that must not already exist, confined to the repository root. Parent directories are
 * created one level at a time and each existing one must be a plain directory, never a symlink, so the
 * write cannot be redirected outside the repository. The final open is exclusive: an existing file or
 * link is never overwritten or followed.
 */
export async function createNewFile(rootPath: string, relativePath: string, content: string): Promise<void> {
  const root = await realpath(rootPath);
  const target = path.resolve(root, relativePath);
  if (!isInside(root, target)) throw new Error(`Path escapes repository root: ${relativePath}`);

  let directory = root;
  for (const part of path.relative(root, path.dirname(target)).split(path.sep).filter(Boolean)) {
    directory = path.join(directory, part);
    try {
      const info = await lstat(directory);
      if (info.isSymbolicLink() || !info.isDirectory()) {
        throw new Error(`Refusing to write through ${path.relative(root, directory)}: it is not a plain directory.`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await mkdir(directory);
    }
  }

  let handle;
  try {
    handle = await open(target, "wx");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error(`${relativePath} already exists; it was not overwritten.`);
    }
    throw error;
  }
  try {
    await handle.writeFile(content, "utf8");
  } finally {
    await handle.close();
  }
}

export async function initializeGovernancePack(options: InitOptions): Promise<InitResult> {
  const repositoryPath = path.resolve(options.repositoryPath);
  let info;
  try {
    info = await stat(repositoryPath);
  } catch {
    throw new Error(`Repository not found: ${options.repositoryPath}`);
  }
  if (!info.isDirectory()) throw new Error(`Repository is not a directory: ${options.repositoryPath}`);

  const id = options.id ?? slugifyProjectId(path.basename(repositoryPath));
  if (id === undefined || !PROJECT_ID_PATTERN.test(id)) {
    throw new Error(
      options.id === undefined
        ? "Could not derive a project id from the directory name; pass --id <lowercase-slug>."
        : `Invalid --id '${options.id}': use lowercase letters, digits, '.', '_' or '-', starting with a letter or digit.`,
    );
  }
  const project: GovernancePack["project"] = {
    id,
    name: options.name?.trim() || path.basename(repositoryPath) || id,
    repository: options.repository?.trim() || UNSET_REPOSITORY,
    environment: options.environment?.trim() || DEFAULT_ENVIRONMENT,
  };

  // Never write a pack the CLI itself would reject.
  const content = `${JSON.stringify(buildGovernancePackSkeleton(project), null, 2)}\n`;
  await loadGovernancePack(repositoryPath, options.packPath, { readTextFile: async () => content });

  await createNewFile(repositoryPath, options.packPath, content);
  return { packPath: options.packPath.replaceAll("\\", "/"), project };
}

export function formatInitResult(result: InitResult): string {
  const { project } = result;
  return [
    `Created ${result.packPath} for project "${project.id}".`,
    "",
    "This pack asserts nothing. It has no controls, evidence, risks or decisions, so",
    "`governance check` returns NO-GO (no control applied, nothing was evaluated) until real ones are added.",
    "",
    "Fill in:",
    `  project.repository   currently "${project.repository}"`,
    `  project.environment  currently "${project.environment}"`,
    "  change               the change being assessed: id, type, title, risk class and files",
    "",
    "Then:",
    "  1. Add the controls that apply to this project, each tied to a standard, and the evidence that supports them.",
    "     Declared status is not proof: evidence must come from real checks or reviews.",
    "  2. governance validate <repository>",
    "  3. governance check <repository>",
  ].join("\n");
}
