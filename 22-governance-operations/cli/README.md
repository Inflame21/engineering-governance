# Governance CLI

The CLI is the local-first entry point for repository analysis and governance decisions. It is a development preview: the current engine, analyzer, CLI, Clean Architecture profile, and Hexagonal Architecture profile are covered by CI, but remaining analyzers, dynamic-resolution coverage, and production runtime checks are not complete. Do not treat a result as production approval.

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

The `--pack` and `--profile` paths are relative to the repository being assessed. By default, `check` looks for `.governance/governance-pack.json` inside that repository. The optional `--profile` flag loads a validated architecture profile and inspects source dependencies against its component mappings and boundary rules. The repository includes Clean Architecture and Hexagonal Architecture profiles plus a two-feature modular-boundary example; component mappings must be reviewed and customized for the target repository before enforcing a profile. The optional `--base origin/main` flag computes changed files from the merge base between that Git revision and `HEAD`, then includes staged/unstaged tracked changes and non-ignored untracked files from the working tree. If `--base` is omitted or the requested scope cannot be verified, the governance decision is conditional rather than silently treated as a complete change review.

For the repository containing this CLI, the example pack path is relative to the repository root, so use:

```bash
node 22-governance-operations/cli/dist/cli/src/index.js check . --pack 22-governance-operations/model/example-governance-pack.json --profile 22-governance-operations/model/architecture-profile-clean-architecture.json --base origin/main --run-tools
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
- Text files read for manifest detection are limited to 1 MB; discovery is limited to 50,000 files. Reports include a SHA-256 snapshot fingerprint over the path inventory and ingested content. Source-content coverage is reported explicitly; when ingestion limits are reached, this is not a full-tree content hash.
- Governance packs are validated against the canonical JSON Schema and cross-reference invariants before evaluation.
- Generated evidence records include a generation timestamp and snapshot fingerprint; executed local checks also record tool version, command, exit code, and duration when available. Set `freshness_status` to `current`, `stale`, `expired`, or `unknown` to record freshness explicitly; legacy `freshness` text is preserved for compatibility. Set `max_evidence_age_seconds` to require a valid, non-future timestamp within a defined age window.
- Language/framework detection is heuristic. Architecture dependency extraction currently supports relative TypeScript/JavaScript imports and Python imports; other languages are reported as unsupported rather than treated as verified. Alias imports, dynamic resolution, and full AST/type-aware analysis are not implemented yet. It is not a substitute for compiler, test, or security-tool verification.
- `--run-tools` is opt-in. It runs only the local TypeScript compiler and Python syntax parser, never package scripts or dependency installation. Use it only for repositories you trust, or inside a sandbox; a local compiler package is still executable code.
- With `--base`, the CLI verifies the Git change scope and compares it with the governance pack's declared `change.files`; a mismatch blocks approval. Without `--base`, change scope is reported as `NOT_REQUESTED` and the decision remains conditional rather than implying a complete change review.
- Nested manifests produce package-scoped facts, and the architecture graph records cross-package imports for supported TypeScript/JavaScript and Python dependency edges. A separate typed system graph infers service, API endpoint, database-driver, and event relationships from manifests and static source patterns. Dynamic route/event names, runtime topology, and components without recognized package roots may remain unassigned; treat these relationships as evidence-backed inferences, not runtime proof.
