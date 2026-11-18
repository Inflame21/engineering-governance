// Builds the single-file CLI bundle that the Claude Code plugin ships.
//
// A marketplace install copies only the plugin directory, so the CLI cannot depend on this repository's
// sibling packages or node_modules. This bundles the CLI, the engine, the analyzer, the JSON schemas
// and ajv into plugins/engineering-governance/bundle/governance.mjs.
//
// Usage: node scripts/bundle-plugin.mjs [--out <file>]
// With --out only the bundle is written (used by the staleness test); without it the plugin's bundle
// and starter templates are refreshed.

import { build } from "esbuild";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cliDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(cliDirectory, "../..");
const pluginDirectory = path.join(repositoryRoot, "plugins", "engineering-governance");

const outIndex = process.argv.indexOf("--out");
const customOut = outIndex >= 0 ? process.argv[outIndex + 1] : undefined;
if (outIndex >= 0 && !customOut) throw new Error("--out requires a file path.");
const outfile = customOut ? path.resolve(customOut) : path.join(pluginDirectory, "bundle", "governance.mjs");

// config.ts loads ajv through `createRequire(import.meta.url)`, which a bundler cannot follow. Removing
// that shim at build time turns `require("ajv/...")` into a plain require the bundler inlines. The
// source is left untouched. If the source changes shape this fails loudly instead of shipping a
// bundle that cannot find ajv.
const REQUIRE_IMPORT = 'import { createRequire } from "node:module";';
const REQUIRE_SHIM = "const require = createRequire(import.meta.url);";

const inlineAjv = {
  name: "inline-ajv",
  setup(builder) {
    builder.onLoad({ filter: /[\\/]cli[\\/]src[\\/]config\.ts$/ }, async ({ path: file }) => {
      const source = await readFile(file, "utf8");
      if (!source.includes(REQUIRE_IMPORT) || !source.includes(REQUIRE_SHIM)) {
        throw new Error("cli/src/config.ts no longer loads ajv through createRequire; update scripts/bundle-plugin.mjs.");
      }
      return { contents: source.replace(REQUIRE_IMPORT, "").replace(REQUIRE_SHIM, ""), loader: "ts" };
    });
  },
};

await build({
  absWorkingDir: cliDirectory,
  entryPoints: ["src/index.ts"],
  outfile,
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  legalComments: "none",
  logLevel: "warning",
  plugins: [inlineAjv],
});

if (!customOut) {
  // Starter files users copy into their own repository. The source of truth stays in model/.
  const templates = path.join(pluginDirectory, "templates");
  await mkdir(templates, { recursive: true });
  await copyFile(
    path.join(repositoryRoot, "22-governance-operations", "model", "example-governance-pack.json"),
    path.join(templates, "governance-pack.example.json"),
  );
  await copyFile(
    path.join(repositoryRoot, "22-governance-operations", "model", "architecture-profile-clean-architecture.json"),
    path.join(templates, "architecture-profile-clean-architecture.json"),
  );
}

console.log(`Wrote ${path.relative(repositoryRoot, outfile)}`);
