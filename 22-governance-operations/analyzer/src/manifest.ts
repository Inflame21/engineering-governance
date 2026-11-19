export function parsePackageJson(content: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(content);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("package.json must contain a JSON object");
  }
  return parsed as Record<string, unknown>;
}

export function hasPackageDependency(
  packageJson: Record<string, unknown>,
  packageName: string,
): boolean {
  for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
    const value = packageJson[field];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (packageName in value) return true;
    }
  }
  return false;
}

/** Detect a package name in common requirements.txt and pyproject.toml declarations. */
export function hasPythonDependency(content: string | undefined, packageName: string): boolean {
  if (!content) return false;
  const escaped = packageName.replace(/[.*+?^{}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[\\s=<>~!"',\\[])${escaped}(?:[\\s=<>~!"',;\\[\\]]|$)`, "im").test(content);
}

export interface GoMod {
  /** The module path declared by the `module` directive, such as github.com/acme/app. */
  module?: string;
  /** The Go language version from the `go` directive. */
  goVersion?: string;
  /** Module paths required directly: every `require` entry not marked `// indirect`. */
  requires: string[];
  /** Module paths required only through another module (`// indirect`). */
  indirect: string[];
}

/**
 * Read the parts of a go.mod this analyzer needs. It understands the `module`, `go` and `require`
 * directives in both the single-line and the block form, quoted module paths and comments, and ignores
 * everything else (`replace`, `exclude`, `retract`, `toolchain`). It never throws: a malformed file
 * yields what could be read.
 */
export function parseGoMod(content: string): GoMod {
  const result: GoMod = { requires: [], indirect: [] };
  let inRequireBlock = false;
  const unquote = (value: string): string => value.replace(/^["`]|["`]$/g, "");

  for (const rawLine of content.split(/\r?\n/)) {
    const comment = rawLine.indexOf("//");
    const code = (comment >= 0 ? rawLine.slice(0, comment) : rawLine).trim();
    const indirect = comment >= 0 && /^\s*indirect\b/.test(rawLine.slice(comment + 2));
    if (code === "") continue;

    if (inRequireBlock) {
      if (code === ")") {
        inRequireBlock = false;
        continue;
      }
      const [modulePath] = code.split(/\s+/);
      if (modulePath) (indirect ? result.indirect : result.requires).push(unquote(modulePath));
      continue;
    }

    const module = /^module\s+(\S+)/.exec(code);
    if (module) {
      result.module = unquote(module[1]!);
      continue;
    }
    const goVersion = /^go\s+(\d+(?:\.\d+)*)/.exec(code);
    if (goVersion) {
      result.goVersion = goVersion[1]!;
      continue;
    }
    if (/^require\s*\(\s*$/.test(code)) {
      inRequireBlock = true;
      continue;
    }
    const single = /^require\s+(\S+)\s+\S+/.exec(code);
    if (single) (indirect ? result.indirect : result.requires).push(unquote(single[1]!));
  }
  return result;
}

/**
 * Frameworks recognised from a go.mod's direct requirements. A repository that uses only the standard
 * library (net/http, database/sql) simply has none.
 */
const GO_FRAMEWORKS: ReadonlyArray<readonly [modulePath: string, framework: string]> = [
  ["github.com/gin-gonic/gin", "gin"],
  ["github.com/labstack/echo", "echo"],
  ["github.com/gofiber/fiber", "fiber"],
  ["github.com/go-chi/chi", "chi"],
  ["github.com/gorilla/mux", "gorilla-mux"],
  ["google.golang.org/grpc", "grpc"],
];

/** The framework names a go.mod's direct requirements identify, sorted. */
export function goFrameworks(goMod: GoMod): string[] {
  return GO_FRAMEWORKS.filter(([modulePath]) => hasGoRequirement(goMod, modulePath)).map(([, framework]) => framework).sort();
}

/** True when a module path, or a major-version suffixed form of it (/v2), is a direct requirement. */
export function hasGoRequirement(goMod: GoMod, modulePath: string): boolean {
  return goMod.requires.some((required) => required === modulePath || required.startsWith(`${modulePath}/v`));
}
