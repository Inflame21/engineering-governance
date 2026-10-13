# Governance CLI

The CLI is the local-first entry point for repository analysis and governance decisions. It is currently a development preview; do not treat its result as production approval until the required analyzers and architecture checks are implemented and verified.

## Build

From this directory:

```bash
npm install
npm run build
```

## Commands

Analyze a repository without a governance pack:

```bash
node dist/cli/src/index.js analyze ../..
node dist/cli/src/index.js analyze ../.. --json
```

Evaluate a repository against a governance pack:

```bash
node dist/cli/src/index.js check ../.. --pack 22-governance-operations/model/example-governance-pack.json
node dist/cli/src/index.js check ../.. --pack 22-governance-operations/model/example-governance-pack.json --json
```

The `--pack` path is relative to the repository being assessed. By default, `check` looks for `.governance/governance-pack.json` inside that repository.

For the repository containing this CLI, the example pack path is relative to the repository root, so use:

```bash
node 22-governance-operations/cli/dist/cli/src/index.js check . --pack 22-governance-operations/model/example-governance-pack.json
```

## Exit codes

| Code | Meaning |
|---:|---|
| `0` | `GO` or complete analysis |
| `1` | `GO WITH CONDITIONS` or partial analysis |
| `2` | `NO-GO` |
| `3` | Invalid arguments, invalid governance pack, or execution error |

A partial or failed analysis is surfaced explicitly. A partial analysis cannot produce an unconditional `GO`; failed analysis produces `NO-GO`.

## Safety and current limits

- Repository discovery skips common generated/dependency directories and does not traverse symlinks.
- Text files read for manifest detection are limited to 1 MB; discovery is limited to 50,000 files.
- Governance packs are validated against the canonical JSON Schema and cross-reference invariants before evaluation.
- Language/framework detection is heuristic. It is not yet a substitute for compiler, test, security-tool, or architecture-boundary verification.
- The current CLI does not yet compute a Git diff or validate changed-file scope.
