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

Check a governance pack against the control catalog (see `model/catalog/README.md`). `--catalog` takes one catalog file. The pack must define every mandatory catalog control under the same id and may not weaken it (lower severity, softer failure decision, different standard). `APPROVED` controls missing or weakened give `NO-GO`; `DRAFT` controls give one `GO WITH CONDITIONS` condition and are not enforced. A control the catalog marks `NON_EXCEPTIONABLE` can never be waived by an exception, whatever severity the pack gives it. `validate --catalog` checks the catalog file alone:

```bash
node dist/cli/src/index.js validate ../.. --catalog 22-governance-operations/model/catalog/organization-controls.json
node dist/cli/src/index.js check ../.. --catalog 22-governance-operations/model/catalog/organization-controls.json
```

Apply an approver-authority policy (see `model/authority/README.md`). `--authority` takes one policy file. Only `APPROVED` roles with a named holder confer authority; they let an exception waiver or risk acceptance for a P1 control or risk hold when its approver holds a role that covers P1 (named in `approver_role` or `acceptance_role`). P0 never holds. Without approved roles, P1 waivers and acceptances never hold, so passing a draft policy changes no result. `validate --authority` checks the file alone:

```bash
node dist/cli/src/index.js validate ../.. --authority 22-governance-operations/model/authority/organization-authority.json
node dist/cli/src/index.js check ../.. --authority 22-governance-operations/model/authority/organization-authority.json
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

Run the CLI in CI for another repository with the reusable workflow in `.github/workflows/governance-check.yml`; see [templates/README.md](../templates/README.md). `npm run test:e2e` also tests the script behind it, `.github/scripts/governance-check.sh`, which needs bash (it runs on Linux CI; on Windows set `GOVERNANCE_TEST_BASH` to a Git Bash path to run it locally, otherwise those tests are skipped).

Run the built-artifact CLI contract suite after building:

```bash
npm run test:e2e
```

The `--pack` and `--profile` paths are relative to the repository being assessed. By default, `check` looks for `.governance/governance-pack.json` inside that repository. The optional `--profile` flag loads a validated architecture profile and inspects source dependencies against its component mappings and boundary rules. The repository includes Clean Architecture and Hexagonal Architecture profiles plus a two-feature modular-boundary example; component mappings must be reviewed and customized for the target repository before enforcing a profile. The optional `--base origin/main` flag computes changed files from the merge base between that Git revision and `HEAD`, then includes staged/unstaged tracked changes and non-ignored untracked files from the working tree. If `--base` is omitted or the requested scope cannot be verified, the governance decision is conditional rather than silently treated as a complete change review.

For the repository containing this CLI, the example pack path is relative to the repository root, so use:

```bash
node 22-governance-operations/cli/dist/cli/src/index.js check . --pack 22-governance-operations/model/example-governance-pack.json --profile 22-governance-operations/model/architecture-profile-clean-architecture.json --base origin/main --run-tools
```

## Verification result states

With `--run-tools`, each local check ends in one of seven states. The engine maps each to the GOV-023 section 20 evidence state it can support through an explicit table, so a tool that did not pass can never be recorded as proof:

| Tool result | Meaning | Evidence status it supports |
|---|---|---|
| `PASS` | The check ran and found no problem. | `VERIFIED` |
| `WARN` | The check ran and passed with non-blocking warnings. | `PARTIALLY_VERIFIED` |
| `FAIL` | The check ran and found a problem. A finding is raised. | `UNVERIFIED` |
| `SKIPPED` | Deliberately not run, for example a safety or scan limit was reached. | `UNVERIFIED` |
| `UNSUPPORTED` | Cannot run here, for example no project configuration or no tool installed. | `UNVERIFIED` |
| `UNVERIFIED` | Ran, but could not establish the property, for example coverage was incomplete. | `UNVERIFIED` |
| `ERROR` | The tool failed, timed out or returned output that cannot be trusted. | `UNVERIFIED` |

Evidence produced by a check records its result in `result_status`. A governance pack whose evidence claims a stronger status than its recorded result allows (for example `VERIFIED` for a `SKIPPED` check) is rejected as invalid. Results that never ran produce no evidence at all, and the report shows how many results ended in each state (`Results: 1 PASS, 1 UNSUPPORTED`). The dependency scan (OSV-Scanner) and static analysis (Semgrep) can produce `WARN` (ADR-0001): they end in `WARN` when they ran, found issues, and none is P1. A `WARN` result is partial evidence, and the engine does not accept partial evidence as proof of a control (DEBT-GOV-009), so no adapter links its evidence to a control yet.

## Starting a project: `init`

```bash
node dist/cli/src/index.js init <repository> [--id <slug>] [--name <text>] [--repo <owner/name>] [--environment <name>] [--pack <relative-path>]
```

`init` creates `.governance/governance-pack.json` (or the `--pack` path) with the project record filled in and **nothing else**: no controls, evidence, risks, decisions, exceptions or standards. A pack that asserts nothing cannot claim anything the project has not shown, so `check` on it returns `NO-GO` (`SCOPE:NO_APPLICABLE_CONTROLS`: no control applied, nothing was evaluated) until the project owner adds real controls and evidence.

- `--id` defaults to a slug of the directory name (lowercase letters, digits, `.`, `_`, `-`); `--name` to the directory name; `--repo` to `UNSET`; `--environment` to `development`. Fill in `project.repository` and the `change` by hand.
- It never overwrites: an existing file, or a symlink at the target, is an error (exit `3`) and is left untouched. There is no `--force`.
- The write is confined to the repository root. A path that escapes it, or a parent directory that is a symlink or not a directory, is refused. Missing parent directories are created.
- The generated pack is validated with the CLI's own loader before anything is written, so `init` never writes a pack that `validate` would reject.
- `model/example-governance-pack.json` is a worked example for a fictional change. Do not copy it into a real project: its evidence is declared, not real, and the engine takes declared evidence at face value.

## Finding repositories: `discover`

```bash
node dist/cli/src/index.js discover <folder> [--json]
```

`discover` finds the git repositories in a folder and reports facts about each: branch, head commit, uncommitted changes, origin (with any credentials removed), package manager, `package.json` scripts, the single-line `run:` commands of CI workflows, guidance documents, and whether a pack already exists. It is read-only: it runs only `git` with fixed arguments, never follows symlinks, never enters `node_modules` or a repository it has already found, searches three levels deep, and executes nothing the repositories define. It exits `0` even when it finds none. The plugin's `setup` and `review` commands use it so repository facts come from code.

## Saving the assessment: `report --write`

`governance report <repository> --write` prints the assessment report and also saves the same Markdown to `.governance/reports/report-<date>.md`. It never overwrites: a second report the same day is `-2`. The exit code is still the decision's. `--write` cannot be combined with `--format json`.

## Assessment history: `--record`, `history`, `diff`

```powershell
node dist/cli/src/index.js check <repository> --record
node dist/cli/src/index.js history <repository> [--json]
node dist/cli/src/index.js diff [<repository>] <a> <b> [--json]
```

`check --record` and `report --record` append one line to `.governance/history/assessments.jsonl` (never rewritten): the decision and reason, every violation and finding with its severity and status, each evidence item's status, the SHA-256 of the pack file and the git HEAD. Each record carries the previous record's hash and its own, so `history` can detect an edited, removed or reordered record and refuses to continue (exit 3); `--record` also refuses to extend a broken chain. `history` lists the assessments and, for every issue, when it was first seen, last seen, resolved (first assessment without it) and whether it came back. `diff <a> <b>` compares two numbered assessments: decision, resolved and introduced issues, and evidence that changed status. Each record also stores the repository fingerprint (a SHA-256 over file paths and the content of source files and manifests, excluding `.governance/history/` and `.governance/reports/`). Evidence that names a `repository_fingerprint` counts only while it equals the fingerprint of the code being assessed, so evidence produced against older code stops counting once the code changes. Commit the file to keep the history with the code. The chain shows tampering by accident or carelessness, not by someone who can rewrite the whole file (DEBT-GOV-017).

## Which architecture does this repository follow? `architecture`

```powershell
node dist/cli/src/index.js architecture <repository> [--json]
node dist/cli/src/index.js architecture --list [--json]
```

`architecture --list` prints a reference of nine styles (simple monolith, layered, MVC, Clean, Hexagonal, modular monolith, microservices, event-driven, serverless) with an example folder layout, strengths, weaknesses, when each fits and when to avoid it, first steps, and whether a bundled profile can enforce it (source: `model/architecture-catalog.json`).

`architecture <repository>` reviews one repository in three parts:

1. **What it looks like:** source files, deployables (Dockerfiles, compose services, folders under `services/` or `apps/` that have a manifest), languages and frameworks, and the styles it resembles, best fit first, each with the evidence found and what is missing. A style is reported only when at least two of its signals are present, a folder counts only if it holds code or view templates, and test folders, dependency folders and build output are ignored. "No clear architecture detected" is a valid answer.
2. **What it suggests:** one style with its reasons, things to watch out for, and one or two alternatives. Roughly: a strong match is "keep it and enforce it"; a partial match is "the closest is X and completing it is the natural next step"; with no match, under 40 source files is "keep it simple", a large unstructured repository (300 or more files) is "feature modules", a Django project is MVC, and otherwise layered. Microservices with several deployables and little code, and layered or MVC at 300 files or more, get a warning.
3. **How to get there:** the worked reference for the suggested style, and the `--profile` that enforces its dependency rules when one exists (Clean, Hexagonal, Microservices and a Modular example).

It is advice from folder names, manifests and counts. It cannot see whether the code's dependencies follow a style (`check --profile` does that), nor the team, the load or the domain. The thresholds are rules of thumb, not research. See DEBT-GOV-023.

## Technical debt

A pack's `debt` records now feed the decision and the reports (DEBT-020, OPS-04). Each record may carry `owner`, `target_date` and `last_reviewed` (dates as `YYYY-MM-DD`) and `controls`, the ids of the pack's controls it is recorded against:

```json
{ "id": "DEBT-12", "severity": "P1", "status": "ACCEPTED", "title": "Hand-rolled session store",
  "owner": "Rita Owner", "target_date": "2027-03-31", "last_reviewed": "2026-11-19", "controls": ["SEC-AUTH-001"] }
```

| Situation | Effect |
|---|---|
| P0 or P1 debt with no named owner (blank or `UNASSIGNED`) | **NO-GO** (sections 15 and 29) |
| Unresolved P0 debt, in any status including ACCEPTED | **NO-GO** (sections 9 and 17) |
| P1 debt that is OPEN, PLANNED or IN_PROGRESS | condition: it has no recorded acceptance |
| Debt past `target_date` (the whole target day is allowed) | condition, at any severity |
| ACCEPTED debt with no `last_reviewed` | condition: unreviewed (section 18) |
| Anything else: P2 and P3 debt, accepted and reviewed P1, RESOLVED debt | counted only |

`check` prints a totals line, `report` adds a table (severity, status, owner, target, the status of the controls it is recorded against, and what it needs), `summarize` has a Technical debt section, and the JSON report has `evaluation.debt` with the same data. A pack with no debt shows nothing. A control id in `controls` that the pack does not define is rejected. Two of these rules are judgement calls awaiting owner approval: see DEBT-GOV-022.

## History integrity: checkpoints and required signatures

```powershell
node dist/cli/src/index.js checkpoint <repository> --sign <gpg-key>
node dist/cli/src/index.js history <repository> --authority <policy>
```

The hash chain shows an edit in the middle of the history, but not that the newest records were deleted or that the whole chain was recomputed. `checkpoint` GPG-signs the newest record's sequence number and hash into `.governance/history/checkpoints/<n>.asc` (never replacing one). `history --authority` then verifies each checkpoint against the keys the policy registers (`key_fingerprint` on holders of APPROVED roles) and exits 3 if a checkpoint vouches for a record that is missing, does not verify over the current record, or is signed by an unregistered key. Without `--authority` only the chain is checked.

An authority policy can set `require_signed_approvals: true`. Then every approved exception's signature is verified whenever the policy is applied and an unsigned approval does not hold, with no flag to turn that off. The reusable CI workflow takes the policy from the pinned governance baseline, so the assessed project cannot change it. The workflow also records every check (`record_history`) and uploads the history as an artifact. Retention, access control and what this does not stop are in [ADR-0005](../decisions/ADR-0005-audit-history-integrity.md) and DEBT-GOV-021.

## Exception lifecycle and signed approvals

```powershell
node dist/cli/src/index.js exception request <repository> --id EXC-001 --control SEC-AUTH-001 --reason "Bounded, tracked in TICKET-1" --by "Rita Requester"
node dist/cli/src/index.js exception approve <repository> --id EXC-001 --by "Sam Senior" --role SENIOR_ENGINEERING_AUTHORITY --expires 2026-12-31 --sign <gpg-key-id>
node dist/cli/src/index.js exception renew   <repository> --id EXC-001 --by "Sam Senior" --role SENIOR_ENGINEERING_AUTHORITY --expires 2027-03-31 --sign <gpg-key-id>
node dist/cli/src/index.js exception expire  <repository>
node dist/cli/src/index.js exception list    <repository> [--authority <policy>] [--json]
node dist/cli/src/index.js check <repository> --authority <policy> --verify-signatures
```

These edit the governance pack (the result is validated before it is written) and never take a decision by themselves; `check` still decides. `request` adds a REQUESTED exception for the pack's project and change. `approve` records the approver, role and an expiry (a date means the end of that day, UTC; it must be in the future, and the requester cannot approve their own request). `renew` is a fresh approval with a later expiry for an APPROVED or EXPIRED exception; it discards the earlier signature. `expire` marks every APPROVED exception whose time has passed as EXPIRED (an expired exception stops holding at check time either way). `list` shows days left and, with `--authority`, whether each signature verifies.

Reports warn when an active exception is within 14 days of expiring ("expiring in N days"), in `check` and `report`.

**Signed approvals.** `--sign` signs the approval (its id, control, scope, reason, requester, approver, role and dates) with GnuPG and saves a detached signature to `.governance/approvals/<id>.asc`. Put each approver's full key fingerprint in the authority policy (`key_fingerprint` on the holder). With `check --authority <policy> --verify-signatures`, an approval holds only if its signature is good, covers the current terms and was made by a key registered for that approver; an unsigned, altered or wrongly signed approval does not waive the control and the report says why. Without `--verify-signatures` the approval is trusted as declared, and the report says it is not authenticated. Needs `gpg` on the PATH. Limits are in DEBT-GOV-018.

## One status report per repository: `summarize`

```bash
node dist/cli/src/index.js summarize <repository> [--json] [--write]
```

`summarize` builds a status report for the repository at `<repository>` (its top level): the snapshot (commit, uncommitted changes), the decision and its blocking violations and conditions, every control with its status and missing evidence, open findings by severity, and a table of the eight review areas (`security`, `architecture`, `api`, `data`, `testing`, `cicd`, `frontend`, `observability`) showing the latest review, the controls and open findings for the area, and a "possible gap" flag where a repository signal (a `migrations/`, `contracts/` or `tests/` directory, a test script, CI workflows) is present but the pack has no control for the area. Everything is computed from the repository, its pack and its saved review reports under `.governance/reports/`; nothing is estimated, and a repository with no pack is reported as not assessed.

Without `--write` it prints Markdown (or JSON with `--json`) and writes nothing. With `--write` it creates `.governance/reports/summary-<date>.md`, never overwriting: a second run the same day writes `-2`. It exits `0`, or `3` for a folder that is not a repository root. The plugin's `summary` command uses it and appends AI suggestions in a separate section.

## Exit codes

| Code | Meaning |
|---:|---|
| `0` | `GO`, complete analysis, or a pack created by `init` |
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
- `--run-tools` is opt-in. It runs the local TypeScript compiler, the Python syntax parser and, from `PATH`, the scanners `osv-scanner` (when lockfiles are present), `gitleaks` (any repository) and `semgrep` (when source code is present), never package scripts or dependency installation. Use it only for repositories you trust, or inside a sandbox; a local compiler package is still executable code. A scanner that is not installed is `UNSUPPORTED` and makes the analysis `PARTIAL`; it never passes. `osv-scanner` looks up lockfile package names and versions on the public osv.dev service, so it needs network access (without it the result is `ERROR`). `gitleaks` is read for its exit code only, so a secret can never reach a report, and its findings carry no location. `semgrep` runs only the reviewed rules in `.governance/semgrep/` with metrics and the version check off, never registry rules; without that directory it is `UNSUPPORTED`. The runner does not forward proxy variables.
- With `--base`, the CLI verifies the Git change scope and compares it with the governance pack's declared `change.files`; a mismatch blocks approval. Without `--base`, change scope is reported as `NOT_REQUESTED` and the decision remains conditional rather than implying a complete change review.
- Nested manifests produce package-scoped facts, and the architecture graph records cross-package imports for supported TypeScript/JavaScript and Python dependency edges. A separate typed system graph infers service, API endpoint, database-driver, and event relationships from manifests and static source patterns. Dynamic route/event names, runtime topology, and components without recognized package roots may remain unassigned; treat these relationships as evidence-backed inferences, not runtime proof.
