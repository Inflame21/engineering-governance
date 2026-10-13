# Phase 0 — Repository Audit Baseline

**Repository:** `Inflame21/engineering-governance`  
**Audit branch:** `audit/phase-0-baseline`  
**Audit status:** `IN_PROGRESS`  
**Scope:** Read-only source review and contract inspection; no production-readiness claim  
**Policy baseline:** GOV-000 through GOV-023 remain frozen unless a separately approved policy gap is found.

## 1. Executive summary

The executable foundation is materially more developed than the initial plan's status table suggests. The reviewed branch contains a rule engine with explicit applicability states, evidence freshness handling, risk/exception semantics, analyzer adapters, a repository system graph, architecture-profile validation, filesystem protections, governance-pack schema validation, and CLI command orchestration.

The audit has **not** established a reproducible build/test result or a verified end-to-end CLI run. Source inspection must not be represented as runtime verification.

## 2. Evidence reviewed

The audit inspected these areas on `audit/phase-0-baseline`:

- `22-governance-operations/MASTER-IMPLEMENTATION-PLAN.md`
- `22-governance-operations/model/governance-model.schema.json`
- `22-governance-operations/engine/src/types.ts`
- `22-governance-operations/engine/src/evaluator.ts`
- `22-governance-operations/engine/src/decision.ts`
- `22-governance-operations/engine/src/validation.ts`
- `22-governance-operations/engine/tests/evaluator.test.ts`
- `22-governance-operations/analyzer/src/detector.ts`
- `22-governance-operations/analyzer/src/manifest.ts`
- `22-governance-operations/analyzer/src/pipeline.ts`
- `22-governance-operations/analyzer/src/architecture.ts`
- `22-governance-operations/analyzer/src/adapters/frameworks.ts`
- `22-governance-operations/cli/src/filesystem.ts`
- `22-governance-operations/cli/src/config.ts`
- `22-governance-operations/cli/src/commands.ts`
- `22-governance-operations/cli/src/index.ts`
- package manifests and TypeScript configuration for engine, analyzer, and CLI.

This is a targeted source review, not yet a complete inventory of every file, import edge, package, or workflow.

## 3. Findings and verification status

### AUD-01 — Build, type-check, and test status not independently verified

**Status:** OPEN — verification gap  
**Priority:** P0 for release readiness

The audit session inspected source and package scripts but did not execute the packages' build, type-check, or test commands. There is no verified green CI result attached to this audit record.

**Required action**
- Run each package's `check`, `test`, and `build` scripts using the repository's documented installation process.
- Capture exact commands, commit SHA, exit codes, and summaries.
- Fix failures before changing behavior.

**Acceptance criteria**
- All required commands complete successfully against the audited commit, or failures are recorded with actionable logs.
- Results identify the exact commit SHA and toolchain.

### AUD-02 — Evidence authority and fail-closed behavior require executable verification

**Status:** SOURCE REVIEWED; runtime behavior not verified  
**Priority:** P0

The reviewed evaluator now derives effective control status from applicability and usable evidence. It treats non-verified, stale, expired, or otherwise unusable evidence as missing; a declared `PASS` does not override missing proof. It also treats unknown applicability conservatively when analysis is incomplete and requires evidence to be linked to a control when explicit evidence IDs are absent.

These are positive implementation signals, but tests must prove the full decision matrix, including contradictory evidence, duplicate evidence IDs, freshness boundaries, invalid timestamps, empty required-evidence configuration, explicit FAIL/WARN, and incomplete/failed analysis.

**Required action**
- Confirm every safety-critical branch has regression coverage.
- Run tests and inspect test output.
- Confirm that duplicate evidence identifiers cannot be silently resolved by map overwrite; reject duplicate IDs in pack validation before evaluation.

**Acceptance criteria**
- Missing or unusable evidence cannot yield PASS.
- Unknown applicability cannot be treated as proven non-applicability.
- Duplicate identifiers are rejected before the decision engine executes.
- The final decision is deterministic for a fixed input and evaluation timestamp.

### AUD-03 — Governance schema and semantic validation integration requires end-to-end verification

**Status:** SOURCE REVIEWED; runtime behavior not verified  
**Priority:** P1

The CLI config loader imports the governance JSON Schema and architecture-profile schema, uses Ajv, and invokes semantic validation. The engine semantic validator checks duplicate IDs and cross-references, including controls, standards, evidence, findings, decisions, exceptions, and risks.

**Required action**
- Run valid and invalid fixtures through the actual CLI configuration loader.
- Confirm malformed JSON, schema-invalid objects, unknown references, duplicate IDs, invalid risk acceptance, and invalid exceptions produce actionable errors and a non-zero CLI exit.
- Compare schema definitions against runtime interfaces for all model fields, including optionality and enum values.

**Acceptance criteria**
- The same fixture cannot be accepted by one validation path and rejected by another without an explicit, documented reason.
- Invalid configuration cannot continue into governance evaluation.

### AUD-04 — Repository fact merging and multi-package manifest behavior require verification

**Status:** SOURCE REVIEWED; targeted tests required  
**Priority:** P1

The reviewed analyzer pipeline uses field-specific set merging for repository facts, and the framework adapter iterates manifest paths in the snapshot rather than assuming a root-level manifest. This addresses the previously suspected overwrite and nested-manifest risks at the implementation level.

Remaining verification is required for:
- nested manifests in monorepos;
- malformed or unreadable manifests;
- multiple frameworks in one repository;
- package-scoped facts that must not be incorrectly attributed to unrelated packages;
- deterministic output ordering.

**Acceptance criteria**
- Fixture repositories prove the expected package-scoped languages/frameworks are detected.
- Partial or failed manifest analysis is represented as uncertainty, not as proof that a framework is absent.

### AUD-05 — Architecture profile validation and graph verification need adversarial tests

**Status:** SOURCE REVIEWED; runtime behavior not verified  
**Priority:** P1

The reviewed architecture validator checks allowed profile properties, required field formats, duplicate boundary-rule IDs, severity, optional pattern types, component mappings, and metadata shape. The analyzer also contains graph and architecture-verification logic.

**Required action**
- Add negative fixtures for unknown fields, duplicate IDs, invalid severity, malformed patterns, invalid component mappings, and invalid JSON types.
- Test unresolved imports, unsupported languages, source exclusions, ambiguous component mappings, and partial graph construction.
- Ensure declared architecture style is never presented as proof of conformance.

**Acceptance criteria**
- Invalid profiles fail validation.
- Partial graph coverage remains explicit and cannot produce an unconditional architecture-conformance claim.
- Every reported violation references inspectable source evidence.

### AUD-06 — Filesystem and tool-execution security requires adversarial verification

**Status:** SOURCE REVIEWED; runtime behavior not verified  
**Priority:** P1

The reviewed filesystem adapter includes repository-root confinement, symlink avoidance during discovery, ignored-directory handling, and file/source-content limits. The CLI exposes an opt-in `--run-tools` flag and documents that it does not install dependencies.

**Required action**
- Test path traversal, symlinked files/directories, oversized files, file-count limits, unreadable files, and malformed repository roots.
- Verify tool execution uses a fixed allowlist and argument arrays rather than shell-interpolated command strings.
- Confirm timeouts, output limits, working-directory confinement, and clear execution-failure reporting.
- Ensure the default command does not unexpectedly execute repository-provided code.

**Acceptance criteria**
- Repository-controlled paths cannot read or write outside the intended root through the loader.
- Tool execution is opt-in, bounded, and auditable.
- A tool crash is distinct from a detected code violation.

### AUD-07 — End-to-end CLI and exit-code contract not runtime verified

**Status:** OPEN — verification gap  
**Priority:** P0 for release readiness

The CLI entry point defines `check` and `analyze` commands, config loading, repository analysis, optional verification adapters, reporting, and documented exit codes. Source inspection does not prove that the built artifact starts or that all paths return the documented exit status.

**Required action**
- Build the CLI and invoke it against fixture repositories.
- Cover GO, GO_WITH_CONDITIONS, NO-GO, invalid configuration, missing configuration, analysis failure, and unsupported capabilities.
- Assert both JSON/human output and process exit code.

**Acceptance criteria**
- A built CLI executes from a clean checkout using documented commands.
- Exit codes match the documented contract.
- A NO-GO result cannot exit successfully; incomplete analysis cannot silently become GO.

### AUD-08 — CI workflow and branch-protection alignment not verified

**Status:** OPEN — external configuration verification gap  
**Priority:** P0 for merge/release readiness

The current audit did not obtain authoritative evidence for all active workflows, their emitted check names, and their alignment with required status checks on `main`. A workflow-run lookup that returns no pull-request runs is not proof that CI does not exist.

**Required action**
- Inspect workflow files and recent Actions runs.
- Record exact emitted check names and confirm they match the `main` ruleset.
- Confirm pull requests execute required checks and that failing checks block merges.

**Acceptance criteria**
- Every required ruleset status check maps to an existing, reproducible workflow check.
- A controlled failing test demonstrates that the merge gate blocks the PR.

## 4. Prioritized implementation sequence

1. **Complete the audit evidence:** inspect all package manifests, source/test files, workflow files, imports, and current branch/commit metadata.
2. **Run baseline checks:** install according to repository documentation; run type-check, tests, and builds for engine, analyzer, and CLI.
3. **Fix verified correctness/security defects:** prioritize evidence integrity, schema/semantic validation, and fail-closed decision behavior.
4. **Add adversarial regression fixtures:** cover incomplete analysis, malformed inputs, duplicate identifiers, nested monorepos, filesystem escape attempts, and tool failures.
5. **Verify the CLI end to end:** assert output and exit-code semantics for every governance outcome.
6. **Verify CI enforcement:** align workflow checks with the active `main` ruleset and capture evidence.
7. **Only then advance the master plan:** update workstream status using the repository's defined lifecycle; do not mark a task TEST_VERIFIED or ACCEPTED based on code presence alone.

## 5. Audit boundaries and non-claims

- No package build or test result is claimed by this document.
- No production approval is granted.
- No code behavior is considered runtime-verified solely from source inspection.
- Previously suspected issues that appear addressed in the reviewed branch are recorded as verification work rather than asserted as current defects.
- The audit must be refreshed if the branch changes before verification completes.

## 6. Definition of done for Phase 0

- [ ] Complete repository/package/file inventory.
- [ ] Import and package dependency map.
- [ ] Build, type-check, and test status tied to a commit SHA.
- [ ] Schema/runtime/semantic contract comparison.
- [ ] Decision/evidence matrix verified with regression tests.
- [ ] Analyzer registry, fact merging, and monorepo detection verified.
- [ ] Architecture-profile and graph coverage limitations verified.
- [ ] Filesystem/tool execution security tests completed.
- [ ] CLI end-to-end behavior and exit codes verified.
- [ ] GitHub Actions checks and `main` ruleset alignment verified.
- [ ] Findings dispositioned with evidence and an updated implementation sequence.

**Current conclusion:** Phase 0 remains `IN_PROGRESS`. The repository has substantial foundations; runtime verification and evidence-backed acceptance are the gating items.


## 7. Follow-up verification — package scripts, dependencies, and CI evidence

**Follow-up date:** 2026-10-13  
**Branch inspected:** `audit/phase-0-baseline`

### Package scripts verified from manifests

| Package | Scripts confirmed | Runtime dependencies | Development dependencies |
|---|---|---|---|
| `engine` | `check`: `tsc -p tsconfig.json --noEmit`; `test`: `vitest run`; `build`: `tsc -p tsconfig.json` | None declared | TypeScript `^5.9.2`, Vitest `^5.0.4` |
| `analyzer` | Same `check`, `test`, and `build` commands | Empty dependency object | TypeScript `^5.9.2`, Vitest `^5.0.4`, `@types/node ^22.15.30` |
| `cli` | Same `check`, `test`, and `build`; `start` and `governance` run `node dist/cli/src/index.js` | `ajv ^8.17.1`, `ajv-formats ^3.0.1` | TypeScript `^5.9.2`, Vitest `^5.0.4`, `@types/node ^22.15.30` |

Manifest links:
- [Engine package.json](https://github.com/Inflame21/engineering-governance/blob/audit/phase-0-baseline/22-governance-operations/engine/package.json)
- [Analyzer package.json](https://github.com/Inflame21/engineering-governance/blob/audit/phase-0-baseline/22-governance-operations/analyzer/package.json)
- [CLI package.json](https://github.com/Inflame21/engineering-governance/blob/audit/phase-0-baseline/22-governance-operations/cli/package.json)

All three TypeScript configurations enable `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`. The analyzer and CLI also enable JSON module resolution and include the upstream engine/analyzer source in their compilation scope.

### Dependency/install strategy observations

- No root `package.json`, root `package-lock.json`, `pnpm-workspace.yaml`, or root `bun.lock` was found at the inspected paths on this branch.
- Each package has its own `package.json`. The CLI README instructs users to run `npm install` and `npm run build` from the CLI directory.
- No package-level lockfile was confirmed during this follow-up. Without committed lockfiles, version ranges can resolve to different dependency graphs over time; reproducible dependency installation remains an open finding.
- Do not run `npm run check` or `npm test` from the repository root: the verified scripts are package-local.

### Existing CI run evidence

GitHub Actions run [#38368575027](https://github.com/Inflame21/engineering-governance/actions/runs/38368575027) completed successfully for the PR merge commit `7593746d2f98fdb962bf64d436717ebf018bed85` on 2026-10-13. Its engine, analyzer, and CLI jobs report successful dependency installation, dependency vulnerability reporting, type-check, tests, and builds. The CLI job's executable smoke test passed; the engine/analyzer smoke-test steps were skipped.

**Scope caveat:** This CI evidence is tied to that pull-request merge commit, not automatically to every later commit on `audit/phase-0-baseline`. It is valid evidence for the exact SHA above only. Re-run CI against the final audited commit before closing AUD-01. CI passing does not complete the adversarial security, branch-ruleset alignment, or production-approval gates.

### Updated disposition

- **AUD-01:** Partially satisfied by successful CI evidence on the recorded PR merge SHA; still open for exact-SHA alignment and lockfile/reproducibility assessment.
- **AUD-07:** CLI smoke test passed on the recorded PR merge SHA; full exit-code matrix remains unverified by the evidence inspected here.
- **AUD-08:** A successful workflow run is confirmed, but active workflow definitions and exact required status-check/ruleset alignment remain to be verified.
- **Dependency reproducibility:** Keep open until package lockfile strategy is explicitly chosen and CI installs dependencies reproducibly.

No production approval is granted by this follow-up.
