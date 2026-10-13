# Phase 0 — Consolidated Completion Plan

**Repository:** `Inflame21/engineering-governance`  
**Working branch:** `audit/phase-0-baseline`  
**Tracking:** PR #1; issue #2  
**Status:** `IN_PROGRESS` — this plan is not a production approval.

## Objective

Complete the Phase 0 audit as one coordinated implementation and verification batch. Avoid serial one-line edits. Group related code, tests, CI, and evidence updates, then verify the resulting exact commit SHA. Keep the PR and tracking issue open until every P0 acceptance criterion is evidenced.

## Guardrails

- Do not merge PR #1, close issue #2, or declare production readiness as part of this batch.
- Do not modify GitHub rulesets/branch protection without a separate explicit approval.
- Do not fabricate lockfiles or claim a reproducible install while CI uses unlocked dependency resolution.
- Preserve exact commit SHAs and distinguish source review, automated test evidence, runtime verification, and production approval.
- Any implementation change must have a regression test or an explicit reason a test cannot be added.
- Use one coherent implementation commit where practical; the GitHub Contents API creates one commit per file, so multiple-file work may require a branch-side workflow/PR rather than pretending separate file writes are one commit.

## Work packages and acceptance criteria

### WP0 — Baseline and branch scope
- [x] Compare audit branch against `main`.
- [x] Confirm branch is 357 commits ahead and 0 behind; merge base is `ca1ea5a4ef096ffefe74b2331cc8d8483d38bc9e`.
- [x] Confirm the comparison contains substantial implementation and test changes, not merely audit follow-ups.
- [ ] Review PR #1 file/commit scope and determine whether its history is intentionally the full 357-commit feature branch.
- [ ] Do not rewrite or squash history until PR intent and reviewability are clear.

### WP1 — Reproducible CI and toolchain (AUD-01, AUD-08)
- [x] Active workflow job names match required ruleset contexts: `Verify engine`, `Verify analyzer`, `Verify cli`.
- [x] CI passes all three package jobs on commit `5a63563ec4bb84ff5433ef9cd7ebc9af260188fc`.
- [x] Update workflow action versions and pin runner image to Ubuntu 24.04; verify CI after the change.
- [ ] Choose and document one dependency strategy for each independent package.
- [ ] Generate authentic lockfiles using npm, commit them, and replace `npm install` with `npm ci`.
- [ ] Ensure lockfile updates are deterministic and CI fails when manifests and locks disagree.
- [ ] Record Node, npm, action, runner, and exact SHA in the evidence report.

**Acceptance:** clean CI on the final SHA; no unlocked install path in required CI; exact check names match the ruleset.

### WP2 — Governance evidence integrity (AUD-02, AUD-03)
- [x] Public engine decision path rejects duplicate evidence IDs before evaluation.
- [x] Regression test covers duplicate evidence IDs at the direct engine API boundary.
- [ ] Add/verify table-driven tests for missing, unverified, stale, expired, invalid-timestamp, contradictory, and control-unlinked evidence.
- [ ] Prove unknown applicability and incomplete analysis cannot be converted into a PASS/GO by absence of evidence.
- [ ] Verify duplicate IDs and invalid cross-references fail consistently in CLI pack loading and direct engine entry points.
- [ ] Verify malformed JSON, schema-invalid pack, invalid exception/risk references, and invalid architecture profile fail with actionable diagnostics.

**Acceptance:** no unusable or ambiguous evidence can establish PASS; invalid governance input never reaches decision evaluation; results are deterministic for a fixed input and evaluation timestamp.

### WP3 — CLI contract and security boundaries (AUD-06, AUD-07)
- [x] CI smoke test builds and invokes the CLI for help/version/analyze/check and a seeded architecture violation.
- [x] CI asserts invalid-option and missing-pack failures return exit code 3 and expected diagnostics.
- [ ] Expand exit-code matrix for GO (0), GO_WITH_CONDITIONS (1), NO-GO (2), and execution/configuration errors (3), using stable fixtures.
- [ ] Assert JSON and human-readable output contracts for success and failure paths.
- [ ] Adversarially test path traversal, symlinks, unreadable/oversized files, file-count limits, malformed roots, and repository-controlled execution.
- [ ] Verify optional tool execution is opt-in, allowlisted, bounded by timeout/output limits, and never shell-interpolates repository-controlled strings.

**Acceptance:** exit codes match the documented contract; NO-GO cannot exit 0; analysis/tool failure cannot silently become GO; filesystem access remains confined to the intended repository.

### WP4 — Analyzer and architecture graph
- [ ] Test nested/multiple manifests and package-scoped fact attribution.
- [ ] Test malformed/unreadable manifests, mixed framework/language repositories, deterministic ordering, unresolved imports, unsupported languages, exclusions, ambiguous component mappings, and partial graph construction.
- [ ] Validate malformed profiles (unknown fields, duplicate IDs, severity, pattern types, mappings, JSON types).
- [ ] Ensure incomplete graph coverage is explicit and every architecture violation carries inspectable source evidence.

**Acceptance:** uncertainty is preserved rather than interpreted as absence or conformance; invalid profiles fail closed.

### WP5 — Ruleset policy and merge readiness (AUD-08)
- [x] Verify active ruleset targets `main` and requires the three workflow job names.
- [x] Verify one approving review, stale review dismissal, latest-push approval, review-thread resolution, and deletion/force-push restrictions.
- [x] Record current policy choices: administrator bypass is always allowed; strict up-to-date check is disabled.
- [ ] Decide these policy exceptions separately; do not change them in this audit batch without explicit authorization.
- [ ] Verify enforcement with a safe test of required-check failure behavior if available without weakening `main` protections.
- [ ] Record the limitation that legacy branch-protection endpoint access returned 403.

**Acceptance:** documented enforcement matches intended policy; unverified settings remain explicit risks, not presumed safe.

### WP6 — Evidence and closure
- [ ] Update the repository audit with links to CI runs, exact SHA, test matrix, remaining risks, and evidence boundaries.
- [ ] Re-run all required checks after the final implementation changes and verify each job's conclusion.
- [ ] Confirm the PR diff and issue checklist are complete.
- [ ] Keep Phase 0 open if any P0 criterion is unmet or evidence is not tied to the final SHA.

## Current verified evidence

- CI run [38384895443](https://github.com/Inflame21/engineering-governance/actions/runs/38384895443): all engine, analyzer, and CLI jobs succeeded after the action/runner update; CLI smoke test succeeded.
- Workflow commit: [5a63563ec4bb84ff5433ef9cd7ebc9af260188fc](https://github.com/Inflame21/engineering-governance/commit/5a63563ec4bb84ff5433ef9cd7ebc9af260188fc).
- Earlier CLI exit-path smoke-test commit: [8426a96cae2e9edd54bda2d13d6ca25b588391ba](https://github.com/Inflame21/engineering-governance/commit/8426a96cae2e9edd54bda2d13d6ca25b588391ba).
- Duplicate evidence ID guard/test passed in CI before the latest workflow-only update.
- Branch comparison: 357 commits ahead, 0 behind; this count is branch divergence, not a count of commits made during this audit.

## Execution order

1. Finish baseline/PR scope review.
2. Close evidence-engine and CLI P0 test gaps in a single code/test batch.
3. Generate real package lockfiles and switch CI to `npm ci` only after lockfiles exist.
4. Complete analyzer/filesystem adversarial tests.
5. Run the complete CI matrix on the final batch SHA.
6. Update audit evidence and issue checklist; present residual risks and request review.
