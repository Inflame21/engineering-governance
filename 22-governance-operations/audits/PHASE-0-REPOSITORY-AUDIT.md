# Phase 0 — Repository Audit Baseline

**Repository:** `Inflame21/engineering-governance`  
**Audit branch:** `audit/phase-0-baseline`  
**Audit status:** `IN_PROGRESS`  
**Scope:** The initial pass was a read-only source review and contract inspection. Follow-up sections record later CI runs, repository edits, and GitHub metadata updates; no production-readiness claim.  
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

> **Historical baseline:** The AUD-01/AUD-07/AUD-08 statuses and verification gaps in this section describe the initial pass. Later evidence and dispositions supersede them where explicitly recorded in §10.3 and §§11–14. Do not read this section's original `OPEN` labels as the current disposition without checking those later sections.

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
- [x] Build, type-check, and test status tied to a commit SHA. (evidence: Section 10, tested SHA `02beafc`)
- [ ] Schema/runtime/semantic contract comparison.
- [x] Decision/evidence matrix verified with regression tests. (evidence: Section 10, tested SHA `02beafc`)
- [x] Analyzer registry, fact merging, and monorepo detection verified. (evidence: Section 10, tested SHA `02beafc`)
- [x] Architecture-profile and graph coverage limitations verified. (evidence: Section 10, tested SHA `02beafc`)
- [x] Filesystem/tool execution security tests completed. (evidence: Section 10, tested SHA `02beafc`)
- [x] CLI end-to-end behavior and exit codes verified. (evidence: Section 10, tested SHA `02beafc`)
- [ ] GitHub Actions checks and `main` ruleset alignment verified.
- [x] Findings dispositioned with evidence and an updated implementation sequence. (evidence: §10.3 and follow-up sections; unresolved verification work remains tracked below.)

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


## 8. Follow-up verification — active workflow and `main` ruleset

**Follow-up date:** 2026-10-13  
**Branch inspected:** `audit/phase-0-baseline`  
**Ruleset inspected:** `main-engineering-governance` (ID `24978229`)

### Active workflow and check-name alignment

The repository API confirms that the active workflow is `.github/workflows/governance-operations.yml`. It runs on pull requests that change `22-governance-operations/**` or the workflow itself, on pushes to `main` affecting those paths, and on manual dispatch. Its matrix jobs are named `Verify engine`, `Verify analyzer`, and `Verify cli`.

The active `main` ruleset requires the exact corresponding check contexts:
- `Verify analyzer`
- `Verify cli`
- `Verify engine`

The check-runs API for audit-branch SHA `59381c69fca7587bfa08353cca4f48aeb2300d7f` reports all three checks completed with conclusion `success`:
- [Verify cli](https://github.com/Inflame21/engineering-governance/actions/runs/38381785937/job/115243744314)
- [Verify analyzer](https://github.com/Inflame21/engineering-governance/actions/runs/38381785937/job/115243744155)
- [Verify engine](https://github.com/Inflame21/engineering-governance/actions/runs/38381785937/job/115243743655)

**Evidence scope:** this verifies emitted check names and successful results for the exact audit-branch SHA above, which preceded this documentation-only follow-up commit. The follow-up commit is `c20266090e788450cb7d7e951fdd30c3343e779a`; its check-runs endpoint had not yet returned checks at the time of this edit. It does not prove that a deliberately failing check blocks merging; that enforcement test remains outstanding.

### Active ruleset settings observed through the API

The ruleset is active and targets only `refs/heads/main`. It requires one approving review, dismisses stale approvals after new pushes, requires approval of the latest reviewable push, requires review-thread resolution, blocks branch deletion and force pushes, and permits administrator bypass with mode `always`.

Two policy details must remain explicit:
- `strict_required_status_checks_policy` is `false`; the ruleset does not require the branch to be up to date with its base before merging.
- `require_extra_approval_for_unattributed_changes` is `true`. This is separate from the ordinary required approving review. Confirm the intended behavior in the GitHub UI before changing it; this audit does not change ruleset configuration.

The direct branch-protection endpoint returned HTTP 403 for this connection. The ruleset itself was readable and verified; legacy branch-protection settings outside the ruleset could not be independently inspected.

### Dependency reproducibility discrepancy

The engine manifest differs across branches:
- `main`: Vitest `^3.2.4`
- `audit/phase-0-baseline`: Vitest `^5.0.4`

This confirms dependency-version drift between the base branch and audit branch. The workflow currently uses `npm install`, and no committed package lockfiles were confirmed in the inspected package directories. Resolve the intended Vitest version and commit lockfiles before treating dependency installation as reproducible. Do not infer the cause or compatibility impact from version strings alone.

### Updated disposition

- **AUD-01:** CI evidence exists for audit-branch SHA `59381c69fca7587bfa08353cca4f48aeb2300d7f`; CI must also pass on the documentation follow-up commit `c20266090e788450cb7d7e951fdd30c3343e779a`. Reproducible dependency resolution remains open.
- **AUD-07:** The current workflow's CLI smoke test is present and the CLI check passed, but the complete documented exit-code/error matrix remains unverified.
- **AUD-08:** Active workflow and exact required check-name alignment are verified. Enforcement against a deliberately failing check remains unverified. The strict up-to-date policy is disabled and should be an explicit governance decision.
- **Ruleset administration:** Active ruleset and administrator bypass are API-verified. No ruleset settings were changed during this audit.

Phase 0 remains `IN_PROGRESS`; this evidence does not grant runtime verification or production approval.


## 9. Consolidated completion pass — 2026-10-13

> **Superseded in part by Section 10.** Statements below about open lockfiles, `npm install`, and the 357-commit divergence describe the state at that time and are no longer current.

**Execution plan:** [Phase 0 Consolidated Completion Plan](./PHASE-0-CONSOLIDATED-COMPLETION-PLAN.md)  
**Current state:** `IN_PROGRESS` — not production-approved.

### Verified CI after workflow maintenance

Workflow commit: [`5a63563ec4bb84ff5433ef9cd7ebc9af260188fc`](https://github.com/Inflame21/engineering-governance/commit/5a63563ec4bb84ff5433ef9cd7ebc9af260188fc)  
CI run: [#38384895443](https://github.com/Inflame21/engineering-governance/actions/runs/38384895443)

All three jobs completed successfully on that commit:
- `Verify engine`: check, tests, and build passed.
- `Verify analyzer`: check, tests, and build passed.
- `Verify cli`: check, tests, build, and executable CLI smoke test passed.

The workflow now pins `ubuntu-24.04`, uses `actions/checkout@v7` and `actions/setup-node@v7`, and still selects Node.js 22 for the project. This verifies the updated workflow on the recorded SHA. It does not establish a reproducible dependency install: the workflow still uses `npm install` and package lockfiles have not yet been committed.

### Implemented regression protection

- The public engine decision function invokes semantic validation and rejects duplicate evidence IDs before evaluation. Regression coverage asserts that a direct engine caller cannot bypass this invariant.
- The CI CLI smoke test asserts that an unknown option returns exit code 3 and prints the expected diagnostic.
- The CI CLI smoke test asserts that a missing governance pack returns exit code 3 and prints the expected CLI error prefix.

The CLI failure-path tests passed in [run #38384766645](https://github.com/Inflame21/engineering-governance/actions/runs/38384766645). The duplicate-ID test also passed in that run. The subsequent workflow-only update passed all three package jobs in run #38384895443.

### Branch scope finding

GitHub's compare endpoint reports:
- Audit branch: `audit/phase-0-baseline`
- Base: `main`
- Ahead: 357 commits
- Behind: 0 commits
- Merge base: `ca1ea5a4ef096ffefe74b2331cc8d8483d38bc9e`

The count above is a historical snapshot of branch divergence, not a count of commits created by this audit session. For the current ahead/behind/file comparison, use PR #1's live compare view and latest PR description; historical counts in this audit are not authoritative for current scope. The comparison contains extensive implementation, tests, models, workflow, and documentation. Before considering history consolidation, review PR #1's intended scope and confirm that the feature branch is intentionally the complete proposed change set. No history rewrite or merge is authorized by this audit.

### Remaining P0/P1 work

- **AUD-01 — OPEN:** latest workflow SHA passes, but package installs are not yet reproducible until genuine lockfiles are committed and CI uses `npm ci`.
- **AUD-02 — PARTIALLY VERIFIED:** duplicate evidence IDs are rejected at the direct engine boundary; full adversarial evidence/freshness/contradiction matrix remains to be verified.
- **AUD-03 — OPEN:** schema and semantic validation still need a systematic valid/invalid fixture matrix through the actual CLI path.
- **AUD-04 — OPEN:** nested-manifest and package-scoped fact merging need adversarial fixture verification.
- **AUD-05 — OPEN:** malformed profiles and incomplete/ambiguous graph coverage need adversarial tests.
- **AUD-06 — OPEN:** filesystem confinement and opt-in tool execution require adversarial verification.
- **AUD-07 — PARTIALLY VERIFIED:** built CLI smoke tests and two execution-error exit-code cases pass; GO, GO_WITH_CONDITIONS, NO-GO, and additional failure paths need exact exit-code assertions.
- **AUD-08 — PARTIALLY VERIFIED:** active workflow names align with required ruleset contexts and the latest workflow run passes. Enforcement under a deliberately failing required check remains unverified. The ruleset's administrator bypass and disabled strict-up-to-date policy remain documented policy risks. No ruleset settings were changed.

### Closure rule

Do not close Phase 0 or issue #2 until all P0 acceptance criteria are supported by reproducible evidence tied to the final audited SHA. CI success is necessary but does not by itself establish security assurance, runtime verification, or production approval.

## 10. Final Phase 0 closure pass — 2026-10-13

**Status:** `IN_PROGRESS` — **not** complete and **not** production-approved. See the recommendation at the end of this section.

### 10.1 Tested commit and environment

| Item | Value |
|---|---|
| Tested code SHA | [`02beafc8ec6558f21c50cb343da54af6a8ed3fdf`](https://github.com/Inflame21/engineering-governance/commit/02beafc8ec6558f21c50cb343da54af6a8ed3fdf) |
| CI run (PR, `Governance Operations Verification`) | [#38396121321](https://github.com/Inflame21/engineering-governance/actions/runs/38396121321) — all three jobs `success` |
| `Verify engine` | `success` — [job](https://github.com/Inflame21/engineering-governance/actions/runs/38396121321/job/115291663639) |
| `Verify analyzer` | `success` — [job](https://github.com/Inflame21/engineering-governance/actions/runs/38396121321/job/115291663675) |
| `Verify cli` | `success` — [job](https://github.com/Inflame21/engineering-governance/actions/runs/38396121321/job/115291663515); install, type-check, tests, build, CLI e2e, and smoke steps all `success` |
| CI runner / Node | `ubuntu-24.04`; Node major selector `22`. Exact Node/npm values were not captured in the §10 baseline run; a later CI log was recorded in §12 as Node `v22.23.3`, npm `10.9.9` (reviewer authentication of those values remains unconfirmed) |
| Local clean-room toolchain | Node v24.18.0, npm 12.0.1, Windows 11 |

A documentation-only commit follows the tested SHA. It changes no code; its own CI run is separate evidence. Earlier runs on `f2ce620` (success) and `f839f0b` (**failure**, see 10.4) remain in the branch history.

### 10.2 Commands executed

Local clean-room (fresh `git clone` of the pushed branch at `f839f0b`, no pre-existing `node_modules` or `dist`), for each package `engine`, `analyzer`, `cli`:

```
npm ci --no-audit --no-fund
npm run check
npm test
npm run build
# cli only:
npm run test:e2e
bash <smoke-test step extracted verbatim from .github/workflows/governance-operations.yml>
```

Results: engine 63/63, analyzer 63/63, cli 60 passed + 1 skipped (see 10.4), cli e2e 11/11, smoke test passed (`invalid_args=3 missing_pack=3`). The final one-assertion test fix `02beafc` was verified by CI run #38396121321, not re-run locally.

Lockfile evidence:
- `npm ci` succeeded for all three packages in the clean clone.
- `npm install --package-lock-only` produced no content change to any lockfile (empty git diff). A raw byte comparison on this Windows checkout differed only by CRLF line endings.
- Negative control: changing the engine manifest to `typescript@^4.0.0` makes `npm ci` exit 1 (`EUSAGE ... lock file's typescript@5.9.3 does not satisfy typescript@4.9.5`). A manifest/lock disagreement therefore fails the install step.
- CI uses `npm ci` with `cache-dependency-path` pointing at each package lock (workflow, commit `b403f38`).

### 10.3 Findings disposition

| ID | Disposition | Evidence |
|---|---|---|
| AUD-01 | **Closed for the tested SHA.** Check, test, and build pass in CI and a clean clone; lockfiles committed; `npm ci` enforced. | 10.1, 10.2 |
| AUD-02 | **Verified, with one defect fixed.** The matrix covers missing, duplicate, stale, expired, invalid-timestamp, future-dated, contradictory, unverified, and unlinked evidence; unknown applicability and partial or failed analysis never yield GO. **Defect found:** evidence listed in a control's `required_evidence` satisfied it even when the record's `supports_controls` named only a different control. Fixed in `8efb6fe`; the regression test fails without the fix. Determinism (same result regardless of evidence order) is tested. | `engine/tests/evaluator.test.ts` |
| AUD-03 | **Partially verified.** Malformed JSON, schema-invalid, dangling-reference, and duplicate-ID packs exit 3 through the built CLI with empty stdout and a diagnostic in both human and `--json` modes. **Not done:** a field-by-field comparison of the JSON Schema against the runtime TypeScript interfaces. | `cli/tests/end-to-end.test.ts`, `cli/tests/config.test.ts` |
| AUD-04 | **Verified by fixtures.** Nested manifests, package-scoped facts, a malformed manifest alongside valid ones, unsupported languages. | `analyzer/tests/adapters.test.ts`, `detector.test.ts`, `pipeline.test.ts` |
| AUD-05 | **Verified by fixtures.** Malformed profile shapes and types, duplicate rule IDs, unresolved alias and relative imports, and absent or ambiguous role mappings stay `PARTIAL`; every finding carries a source location and a resolvable evidence reference. | `analyzer/tests/architecture.test.ts`, `polyglot-graph.test.ts` |
| AUD-06 | **Verified, one platform gap.** Traversal, directory-link escape, working-directory link escape, size and file-count limits, missing and non-directory roots, metacharacter file names, tool allowlist, verbatim (non-shell) arguments, scrubbed environment, timeout, and output-limit behaviour are tested. The file-symlink test is skipped on Windows (no symlink privilege); it is expected to run on Linux CI. | `cli/tests/node-filesystem.test.ts`, `verification-runner.test.ts` |
| AUD-07 | **Verified.** The built CLI returns 0 / 1 / 2 / 3 for GO / GO_WITH_CONDITIONS / NO-GO / errors; NO-GO renders identically in human and JSON output; invalid pack, invalid profile, profile path escape, missing pack, missing root, and root-is-a-file all exit 3. | `cli/tests/end-to-end.test.ts` |
| AUD-08 | **Partially verified.** Check names align with the ruleset (Section 8). Enforcement of a *failing* required check was **not** tested: that needs a deliberately failing PR, and ruleset changes are out of scope. Administrator bypass and disabled strict up-to-date remain policy risks. | Section 8 |

### 10.4 Verification history worth keeping

- `f2ce620`: the earlier e2e test needed `dist/`, but CI runs `npm test` before `Build`. `npm test` now excludes the e2e file; the dedicated step runs it after the build.
- `f839f0b` failed CI: a new test expected `readTextFile` to *reject* a file symlink pointing outside the root. The code deliberately returns `undefined` for symlink leaves (content is never read). The test was corrected to assert that; no security behaviour changed.
- That test is skipped on the Windows development machine; its skip status in CI was not inspected.

### 10.5 Real-repository run

> **Superseded by §14:** This is the state at the time of the initial §10 pass. §14 subsequently records a real-repository `analyze` and `check` run using the example governance pack. The example pack is an integration fixture, not a project-specific governance assessment; framework-detection support remains unresolved.

### 10.6 Branch scope (needs human review)

PR #1 reports 364 commits and 76 changed files against `main`; the compare endpoint reported 363 ahead at the time of this pass. The branch is the whole feature history, not an audit-only change. Whether PR #1 is intentionally the full change set is **not established**. No history was merged or squashed by this pass. Reviewers should also know that the four commits after `016ec95` (now `b403f38`, `9c2a563`, `a864326`, `538d79b`) were re-authored and force-pushed once at the repository owner's request (author identity and commit trailer only; file content unchanged). Their earlier hashes (`0b72dda`, `1dc70e9`, `5e0ed66`, `b29dd88`) are no longer reachable on the branch.

### 10.7 Remaining blockers and accepted limitations

1. AUD-08 failing-check enforcement is untested (needs an approved approach).
2. AUD-03 schema-versus-runtime-type comparison had not been performed at the time of §10; §11 later added a partial field/requiredness/enum comparison. The full type/constraint/conditional matrix remains open.
3. At the time of §10, exact CI Node/npm patch versions were not recorded; §12 later records values reported by the CI log. Independent reviewer authentication of those log values is not established here.
4. PR #1's description and issue #2's checklist had not been updated at the time of §10. They were subsequently updated; use their current bodies for the latest reconciliation. This sentence records the historical limitation of that pass.
5. Runtime verification beyond tests and the CI smoke test, and any production approval, were not performed.
6. Unsupported analysis remains: languages other than TypeScript/JavaScript and Python; verification adapters are limited to TypeScript type-checking and Python syntax checks.

### 10.8 Recommendation

**`CONTINUE AUDIT`.** CI is green on the tested SHA and the engine defect found in this pass is fixed, but P0 items AUD-08 (enforcement) and AUD-03 (schema/type comparison) remain unevidenced, and PR scope needs a human decision. Do not close issue #2 or mark Phase 0 complete.


## 11. Schema/TypeScript contract comparison — 2026-10-13

**Status:** AUD-03 improved but remains **PARTIALLY VERIFIED**. This section records a structural contract test added after the Section 10 pass; it does not close all schema-constraint parity work.

### Evidence

- Contract test: [`cli/tests/schema-types.contract.test.ts`](https://github.com/Inflame21/engineering-governance/blob/audit/phase-0-baseline/22-governance-operations/cli/tests/schema-types.contract.test.ts)
- Test commit: [`9884a1a9f77f71d7575d9c628ec4e5e515b35078`](https://github.com/Inflame21/engineering-governance/commit/9884a1a9f77f71d7575d9c628ec4e5e515b35078)
- CI run: [#38397574762](https://github.com/Inflame21/engineering-governance/actions/runs/38397574762) — `Verify engine`, `Verify analyzer`, and `Verify cli` all succeeded. CLI type-check, tests, build, E2E contract tests, and smoke test succeeded.

### Comparison results

- Governance pack and entity field names are checked against the TypeScript interfaces: pack, project, change, standard, control, evidence, risk, decision, exception, debt, and finding.
- Required/optional field parity is checked for those entities.
- Architecture profile and boundary-rule field names and required/optional parity are checked.
- Thirteen governance enum sets are checked against the corresponding TypeScript unions and schema enums.
- Compile-time assertions ensure the field-presence maps are exhaustive for their TypeScript interfaces; runtime assertions compare them with the imported schema.

### Remaining limits

1. The follow-up `JSON Schema constraint inventory` test now asserts representative primitive types, regexes, date-time formats, string/numeric bounds, array uniqueness, object policies, and risk/exception conditional required sets for governance packs and architecture profiles. It is a targeted schema-shape contract, not yet a complete recursive constraint inventory or a valid/invalid runtime fixture for every rule. TypeScript interfaces cannot express many JSON Schema restrictions; the JSON Schema and AJV validation remain authoritative at the input boundary.
2. The schema currently does not set `additionalProperties: false` at the top-level governance-pack object, while nested entity definitions generally do. That may be intentional extensibility, but the policy is not documented or tested as an explicit decision. Do not change it without deciding whether top-level extensions are supported.
3. Status-dependent risk/exception requirements are enforced by JSON Schema and semantic validation rather than by the plain TypeScript interfaces. The current contract test confirms the schema's conditional rules exist, but does not compare every condition branch to the semantic validator.
4. A complete constraint-by-constraint matrix, including deliberate valid/invalid fixtures for every schema rule and verification through the actual loader/CLI runtime path, remains outstanding. The new static assertions are partial evidence only.

### Disposition

The structural field/requiredness/enum checks and a targeted schema-constraint inventory are now automated. CI run [#38401267284](https://github.com/Inflame21/engineering-governance/actions/runs/38401267284) subsequently passed all three jobs for the schema-constraint follow-up recorded in §15. Keep AUD-03 **open/partial** until the complete constraint/conditional matrix and representative runtime validation fixtures are covered or explicitly recorded as accepted design limitations. Phase 0 remains `IN_PROGRESS`.


## 12. CI toolchain version capture — 2026-10-13

**Workflow change:** [`4ad5f58c4bbca04b30880649fea14bd79d50e79a`](https://github.com/Inflame21/engineering-governance/commit/4ad5f58c4bbca04b30880649fea14bd79d50e79a) adds a `Record runtime toolchain versions` step to each package job.

**CI run:** [#38397850555](https://github.com/Inflame21/engineering-governance/actions/runs/38397850555). All three jobs (`Verify engine`, `Verify analyzer`, `Verify cli`) succeeded, including `npm ci`, type-check, tests, and builds; the CLI E2E and smoke-test steps also succeeded.

The engine job log records:
- Runner OS: `Linux`
- Node.js: `v22.23.3`
- npm: `10.9.9`

The same version-reporting step ran successfully in all three matrix jobs. This resolves the exact CI Node/npm version capture item for this workflow run. The workflow still selects Node major version 22; future runs can resolve a different patch version, so the emitted log remains the evidence for each run.

This change records the versions but does not pin the Node patch version. Pinning an exact runtime version is a separate reproducibility policy decision and has not been introduced by this audit.


## 13. Current branch-scope recheck — 2026-10-13

At the time of this snapshot, after the schema-contract and CI-toolchain follow-ups, GitHub's compare endpoint reported:

- Base: `main`
- Audit branch: `audit/phase-0-baseline`
- Ahead: **374 commits**
- Behind: **0 commits**
- Merge base: `ca1ea5a4ef096ffefe74b2331cc8d8483d38bc9e`
- Changed files: **77**

This is a historical snapshot, not a current scope claim. Use PR #1's live compare view for current ahead/behind/file counts. The increase at that time included follow-up commits and a new schema contract test; it does not mean all 374 commits were authored during this audit. The branch still represents the full feature history rather than an audit-only diff. Human review must decide whether this entire scope is intended for PR #1 and inspect the previously recorded force-push/re-authorship event. No merge or history rewrite was performed as part of this recheck.

PR head at the time of this historical recheck: [`f3c46990f302504cb36917d9ddc36381036ddb70`](https://github.com/Inflame21/engineering-governance/commit/f3c46990f302504cb36917d9ddc36381036ddb70). The current head's workflow run [#38397958132](https://github.com/Inflame21/engineering-governance/actions/runs/38397958132) passed all three package jobs.


## 14. Real-repository CLI integration smoke — 2026-10-13

**Workflow change:** [`cbaade822b1341e534afde13a76d1aeaaad3c10a`](https://github.com/Inflame21/engineering-governance/commit/cbaade822b1341e534afde13a76d1aeaaad3c10a) extends the CLI smoke test to run both `governance analyze` and `governance check` against the checked-out repository. The check uses the repository's existing example governance pack at `22-governance-operations/model/example-governance-pack.json`.

**CI run:** [#38398216932](https://github.com/Inflame21/engineering-governance/actions/runs/38398216932) — all three jobs succeeded; the CLI E2E and smoke-test steps passed.

Observed repository integration result:
- `governance analyze "$GITHUB_WORKSPACE" --json`: exit 1, analysis status `PARTIAL`.
- `governance check "$GITHUB_WORKSPACE" --pack 22-governance-operations/model/example-governance-pack.json --json`: decision `NO-GO`, analysis status `PARTIAL`.
- The smoke test explicitly fails if analysis is not `PARTIAL`, if check loses that `PARTIAL` status, or if the decision is `GO`.

**Evidence boundary:** the example pack is a structural integration fixture, not a project-specific governance pack and not a production assessment. This closes the gap that the CLI `check` command had never been executed against the real repository filesystem. The assertion that analysis must remain `PARTIAL` is a **temporary regression guard** tied to the open framework-detection investigation, not a permanent expected outcome; revise the assertion and its test when framework detection is implemented, while continuing to assert that uncertainty is preserved and the example-pack result cannot yield `GO`. This smoke test does not supply a tailored pack or grant approval.

**Review limitation:** the Node/npm values recorded in §12 are reported from the CI log by the audit author. A separate reviewer who cannot authenticate or inspect that log should treat the exact values as author-recorded, not independently verified. The workflow selects Node major 22 rather than pinning the exact patch. Provenance for edits authored under the repository owner's identity should be evaluated from commit and Actions records; author identity alone does not establish who operated the session.

### Current scope snapshot after this follow-up

At the time of this historical snapshot, GitHub compare reported **377 commits ahead, 0 behind, 77 changed files**, with merge base `ca1ea5a4ef096ffefe74b2331cc8d8483d38bc9e`. The PR head then was [`cbaade822b1341e534afde13a76d1aeaaad3c10a`](https://github.com/Inflame21/engineering-governance/commit/cbaade822b1341e534afde13a76d1aeaaad3c10a); CI run #38398216932 passed all three jobs. For current scope review, use [PR #1's live compare view](https://github.com/Inflame21/engineering-governance/compare/main...audit/phase-0-baseline).

Phase 0 remains `IN_PROGRESS`. The outstanding blockers include the complete schema constraint/conditional-rule matrix, safe required-check enforcement evidence, the unsupported framework-detection investigation, and human review of branch scope/history.


## 15. Schema constraint follow-up — 2026-10-13

**Test changes:** commit [`6489c72`](https://github.com/Inflame21/engineering-governance/commit/6489c72a8d27aeb33d8f4e7e0a8c9060bdf184a6) adds targeted schema-shape assertions for representative primitive types, regexes, date-time formats, string/numeric bounds, uniqueness rules, object policies, and risk/exception conditional requirements in governance packs and architecture profiles. Commit [`2205102`](https://github.com/Inflame21/engineering-governance/commit/220510242522f10ab4ca3ecf30ce165d7155238b) adds actual loader-level invalid-input fixtures for governance-pack patterns, formats, bounds, nested additional properties, risk/exception conditional requirements, finding confidence/uniqueness, and architecture-profile constraints.

**CI:** [run #38401267284](https://github.com/Inflame21/engineering-governance/actions/runs/38401267284) on head [`d308148`](https://github.com/Inflame21/engineering-governance/commit/d30814884eda295a0ab297b029e5c550510a1dec) completed with all three required jobs successful: `Verify engine`, `Verify analyzer`, and `Verify cli`. The first attempt at the conditional assertions failed because the test's expected list was not sorted; this was corrected in `6489c72` and the subsequent complete run passed.

**Follow-up — 2026-10-14:** commit [`b221152`](https://github.com/Inflame21/engineering-governance/commit/b221152ece91b82e064d59dd65bf5159378ddb6c) adds valid-path coverage for both supported `applies_when` forms (string and string array), plus a loader-level invalid object case for its `oneOf` constraint; [run #38524392190](https://github.com/Inflame21/engineering-governance/actions/runs/38524392190) passed all three required jobs. Commit [`0e18280`](https://github.com/Inflame21/engineering-governance/commit/0e182807bf0b919e3824d336f52a3195668a2b60) adds invalid enum fixtures across 17 governance fields and checks every conditionally required field across accepted-risk, requested-exception, and approved-exception branches (19 missing-field cases); [run #38525808102](https://github.com/Inflame21/engineering-governance/actions/runs/38525808102) passed all three jobs. Commit [`523f5c9`](https://github.com/Inflame21/engineering-governance/commit/523f5c91225042c498c7e20a84f1431c7f69817c) adds date-time format failures for conditional metadata and decision timestamps, plus non-positive source-location line/column fixtures. Commit [`3dd00cb`](https://github.com/Inflame21/engineering-governance/commit/3dd00cb8991208429b817671ca5ab005054a2561) adds architecture-profile uniqueness tests for required controls/capabilities and rejects empty component-mapping patterns. The complete required CI run [#38525898164](https://github.com/Inflame21/engineering-governance/actions/runs/38525898164) on head `3dd00cb8991208429b817671ca5ab005054a2561` passed `Verify engine`, `Verify analyzer`, and `Verify cli`. A subsequent regex-focused commit [`aa6d7ab`](https://github.com/Inflame21/engineering-governance/commit/aa6d7ab7af23b1db82d0256e170d6347f6e41f9a) adds invalid fixtures for the remaining distinct governance identifier patterns (standard, control, evidence, risk, decision, exception, exception change reference, and debt) and architecture profile version/boundary-rule identifiers. It supplements the existing version, project, change, fingerprint, and profile-ID tests, bringing every distinct `pattern` keyword in both schemas under at least one invalid runtime fixture. [CI run #38526086417](https://github.com/Inflame21/engineering-governance/actions/runs/38526086417) passed all three required jobs on `aa6d7ab`. Commit [`1654c08`](https://github.com/Inflame21/engineering-governance/commit/1654c08dbf9d222ee8c36308fbded1db78be0d17) adds empty-string fixtures for every distinct `minLength` field in both schemas, including conditional risk/exception metadata, finding fields, architecture profile fields, and nested array/component-mapping values. [CI run #38526291642](https://github.com/Inflame21/engineering-governance/actions/runs/38526291642) passed all three required jobs on `1654c08`. Commit [`f6e4657`](https://github.com/Inflame21/engineering-governance/commit/f6e4657ee314a330a604f41a26bf6bf195a60156) adds a table-driven runtime omission test for all 52 required properties across the root governance pack, all `$defs` objects, and the nested finding source-location object. [CI run #38526530261](https://github.com/Inflame21/engineering-governance/actions/runs/38526530261) passed all three required jobs on `f6e4657`.

**Remaining limit:** coverage is substantially broader, but this is not yet proof that every schema keyword/constraint has a paired valid/invalid runtime fixture or that every cross-field semantic rule has an end-to-end test. AUD-03 remains **PARTIAL/OPEN**. A recursive constraint-to-fixture inventory and an explicit decision on the top-level governance-pack `additionalProperties` policy are still required; no schema policy was changed.


## 16. Framework-detection limitation and required-check probe constraints — 2026-10-13

### Framework detection

The framework adapter is registered and runs when supported manifest files are present. Its current dependency detector recognizes Next.js, React, Express, NestJS, and Vite from `package.json`, and FastAPI/Django from `pyproject.toml` or `requirements.txt`. It deliberately reports `PARTIAL` with unsupported capability `framework-detection` when readable manifests contain no recognized framework dependency; this avoids treating an unrecognized ecosystem as proof that no framework is present. The repository's own package manifests do not establish a supported application framework, so the smoke test's `PARTIAL` outcome is consistent with current adapter scope rather than proof the adapter failed to execute.

**Required follow-up:** either expand framework/package-manager recognition with explicit supported-framework fixtures and adapter tests, or keep unknown/unrecognized frameworks as a documented partial result. Do not change the smoke test to expect a clean/success result until that support decision is implemented and verified. Any test that currently expects `PARTIAL` should then be revised to assert the intended capability-specific behavior rather than freeze the old status forever.

### AUD-08 safe required-check enforcement probe

A read-only lookup of `.github/workflows/governance-operations.yml` on `main` returned 404; the workflow is introduced by PR #1. A temporary PR created from `main` therefore cannot simply inherit this workflow and deliberately fail one of its required job contexts. A probe based on the audit branch would carry the entire large feature history and is not an isolated test. The audit has **not** run a failing-check probe and has not changed any ruleset.

**Platform documentation reviewed:** GitHub documents required workflow check names as job names and states that required-check matching does not distinguish workflow, matrix, or event-trigger types ([ruleset troubleshooting](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/troubleshooting-rules)). GitHub also documents that when a check and a commit status share a required name, both must pass ([required-status-check troubleshooting](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks)). These rules establish source association and a naming-collision risk, but do **not** by themselves prove the merge result for two same-named GitHub Actions check runs. The active ruleset's required contexts are associated with GitHub Actions integration `15368`; this association was confirmed by a read-only ruleset/check-run lookup. Direct enforcement evidence is still absent.

**Isolated probe executed — 2026-10-14:** temporary PR [#3](https://github.com/Inflame21/engineering-governance/pull/3), based directly on `main`, added only `.github/workflows/aud08-required-check-probe.yml` on branch `audit/aud08-required-check-probe`. The workflow was intentionally limited to the isolated branch's `push` event so its checks could be attached to the tested PR head without depending on a workflow file that is absent from `main`. On head [`b3e8358`](https://github.com/Inflame21/engineering-governance/commit/b3e835836648c2bc9aaed4ebc7ade0c1b27c441c), [run #38524643959](https://github.com/Inflame21/engineering-governance/actions/runs/38524643959) produced the exact three required contexts from GitHub Actions integration `15368`: `Verify analyzer` **success**, `Verify engine` **success**, and `Verify cli` **failure** (the failure was deliberate). The PR API reported `mergeable_state=blocked` while the required `Verify cli` check was failing. The active ruleset remained unchanged.

**Evidence boundary:** this is direct evidence that the required-name checks are emitted by the expected integration and that the PR is blocked with one required context failing. The PR also lacks the separately required approving review, so the API's `blocked` state alone does not isolate the failing check as the sole blocker. No merge was attempted. GitHub's published documentation independently states that duplicate job names across workflows can make required checks ambiguous and block merges ([protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)). Close only temporary PR #3 after preserving this evidence; never merge it. AUD-08 remains **PARTIAL/OPEN** pending an independently attributable merge-gate observation or policy-owner acceptance of the evidence boundary.
