# Governance CLI

The CLI is the local-first entry point for repository analysis and governance decisions. It is a development preview: the current engine, analyzer, CLI, Clean Architecture profile, and Hexagonal Architecture profile are covered by CI, but remaining analyzers, dynamic-resolution coverage, and production runtime checks are not complete. Do not treat a result as production approval.

## Build

From this directory:

```bash
npm ci
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

Validate a governance pack (and optionally an architecture profile) without analyzing the repository. This is quick and suited to pre-commit hooks; it exits `0` when valid and `3` when not:

```bash
node dist/cli/src/index.js validate ../.. --pack 22-governance-operations/model/example-governance-pack.json
```

Validate project registration records (the proposed project registry; see `registry/projects/README.md`). `--registry` takes one `.json` file or a directory of records, and validates against `model/project-registration.schema.json`. It also checks that project ids and repositories are unique across records and that the architecture profile exists. Used alone it skips the governance-pack check; add `--pack` to validate both. An empty registry fails, because validating nothing is not a pass:

```bash
node dist/cli/src/index.js validate ../.. --registry 22-governance-operations/registry/projects
```

Render the same assessment as `check` as a report. The default format is Markdown, which suits pull-request comments and job summaries; `--format json` emits the same JSON as `check --json`. Exit codes are identical to `check`:

```bash
node dist/cli/src/index.js report ../.. --pack 22-governance-operations/model/example-governance-pack.json
node dist/cli/src/index.js report ../.. --pack 22-governance-operations/model/example-governance-pack.json --format json
```

Check a governance pack against the control catalog (see `model/catalog/README.md`). `--catalog` takes one catalog file. The pack must define every mandatory catalog control under the same id and may not weaken it (lower severity, softer failure decision, different standard). `APPROVED` controls missing or weakened give `NO-GO`; `DRAFT` controls give one `GO WITH CONDITIONS` condition and are not enforced. `validate --catalog` checks the catalog file alone:

```bash
node dist/cli/src/index.js validate ../.. --catalog 22-governance-operations/model/catalog/organization-controls.json
node dist/cli/src/index.js check ../.. --catalog 22-governance-operations/model/catalog/organization-controls.json
```

Assess a registered project. With `--registry`, `check` and `report` look the project up in the registry and let the record decide which governance pack and architecture profile apply:

```bash
node dist/cli/src/index.js check ../.. --registry 22-governance-operations/registry/projects --project example-saas
```

- **Selection:** `--project <id>` picks the record. Without it, the registry must hold exactly one project; several is an error, never a guess.
- **Pack and profile:** the record's `governance_pack` and `profiles.architecture` are used. An explicit `--pack` or `--profile` wins. The named architecture profile is applied exactly like `--profile`, so a profile whose component mappings match nothing in the repository leaves boundary rules unverifiable, and the result is conditional rather than an unconditional `GO`.
- **The pack must belong to the project:** its `project.id` must equal the record's `id`, and its `project.repository` must be one of the record's repositories (case-insensitive). Otherwise the command exits `3` with no decision.
- **`RETIRED` projects** cannot be assessed (exit `3`).
- **Ownership gaps:** an `UNASSIGNED` technical owner or governance representative is reported as a `REGISTRY:<id>:OWNERSHIP-GAP` condition, so an otherwise passing assessment exits `1`, not `0`. It never turns a `NO-GO` into anything better.
- **Output:** a `Project:` line in human and Markdown output, and `report.project` in JSON.

Run the built-artifact CLI contract suite after building:

```bash
npm run test:e2e
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
