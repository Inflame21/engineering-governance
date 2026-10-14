# Phase 0 — Repository Audit

**Repository:** `Inflame21/engineering-governance`  
**Audit branch:** `audit/phase-0-baseline`  
**Plan of record:** `22-governance-operations/MASTER-IMPLEMENTATION-PLAN.md`  
**Status:** `IN_PROGRESS` — source inspection performed; runtime verification outstanding  
**Policy baseline:** GOV-000 through GOV-023 remain frozen unless a separately approved policy gap is found.

## 1. Purpose and audit boundaries

Establish a source-backed baseline before additional implementation. This audit records findings from inspecting the engine evaluator and decision engine, engine types and tests, analyzer pipeline and manifest detection, architecture profile validation, filesystem loader, CLI configuration/commands, and governance JSON Schema.

This is not yet a complete repository-wide audit. The GitHub connector allows source inspection and repository writes in this workflow, but no local checkout/build/test execution was performed in this audit session. Build, type-check, test, runtime, and CI status therefore remain **unverified**.

## 2. Current-state observations

| Area | Source-backed observation | Verification status |
|---|---|---|
| Governance decision engine | Evaluation derives control results from evidence, considers analysis completeness, findings, change-scope state, risks, and exceptions. | Source inspected; tests not executed here |
| Evidence gating | A declared `PASS` does not override missing/unusable required evidence in the current evaluator. Empty required-evidence lists require evidence linked to the control. | Source inspected; runtime unverified |
| Applicability | Missing applicability signals are treated as unknown unless analysis is explicitly complete. | Source inspected; runtime unverified |
| Architecture profiles | Validator checks allowed properties, identifiers, field types, duplicate rule IDs, arrays, component mappings, and metadata. | Source inspected; adversarial test execution unverified |
| Analyzer fact merge | Pipeline merges known fact fields by union/deduplication instead of blindly replacing base facts. | Source inspected; runtime unverified |
| Monorepo manifests | Framework adapter iterates readable manifest contents by path and basename; filesystem loader discovers nested manifests. | Source inspected; runtime unverified |
| CLI configuration | JSON Schema validation and semantic cross-reference validation are integrated in the configuration loader. | Source inspected; runtime unverified |
| Filesystem safety | Loader has ignored-directory and size/count limits, rejects root-escaping paths, and does not traverse symlinks during discovery. | Source inspected; adversarial test execution unverified |
| CI enforcement | The available commit-workflow lookup returned no pull-request workflow runs for the inspected commit. This does not prove that no other workflow runs or checks exist. | Unverified |

## 3. Findings requiring follow-up

### AUD-11 — Evidence freshness may fail open when only the legacy freshness field is populated

**Priority:** High  
**Area:** `22-governance-operations/engine/src/evaluator.ts`

The current evidence usability check rejects a non-current `freshness_status` when that field is present. However, it does not interpret the existing `freshness` string when `freshness_status` is absent. A record with `status: VERIFIED` and `freshness: "stale"` but no `freshness_status` may therefore be accepted, including when the control has no explicit maximum evidence age.

**Acceptance criteria**
- Define and document canonical freshness semantics for legacy and normalized fields.
- Treat explicit stale/expired/unknown freshness as unusable evidence.
- Add regression tests for current, stale, expired, unknown, missing freshness status, invalid timestamps, future timestamps, and max-age boundaries.
- Preserve deterministic evaluation by supplying an evaluation timestamp in tests and production evaluation context.

### AUD-12 — Required evidence is not checked for control ownership during evaluation

**Priority:** High  
**Area:** `22-governance-operations/engine/src/evaluator.ts` and `22-governance-operations/engine/src/validation.ts`

The evaluator resolves required evidence by ID and checks usability, but the inspected path does not verify that each evidence record lists the evaluated control in `supports_controls`. Semantic validation checks that referenced control IDs exist; it does not establish that the relationship is bidirectionally consistent.

**Acceptance criteria**
- Decide whether `required_evidence` alone establishes the association or whether both sides must agree.
- Prefer an explicit, documented invariant; reject or flag contradictory references rather than silently accepting them.
- Add tests for evidence linked to the right control, evidence linked to another control, and contradictory references.
- Ensure findings explain which evidence/control relationship is invalid.

### AUD-13 — Runtime model and JSON Schema parity still needs a mechanical contract test

**Priority:** Medium  
**Area:** `22-governance-operations/model/governance-model.schema.json`, `22-governance-operations/engine/src/types.ts`, and `22-governance-operations/cli/src/config.ts`

Schema validation is integrated, but source inspection alone does not prove that TypeScript interfaces and JSON Schema agree on required fields, optionality, enum values, and additional properties. Types are not a runtime validation mechanism.

**Acceptance criteria**
- Add valid and invalid governance-pack fixtures covering every model section.
- Verify that fixtures accepted by the schema can be represented by the runtime types without casts that hide mismatches.
- Verify that semantic cross-reference rules are tested separately from structural schema rules.
- Treat the JSON Schema as the runtime contract of record and document any intentional type-only fields.

### AUD-14 — Repository audit and execution evidence remain incomplete

**Priority:** High  
**Area:** repository-wide verification and CI

The source inspection is selective, and no reproducible build, type-check, test, or CLI run was executed in this session. The absence of results must not be recorded as a pass.

**Acceptance criteria**
- Inventory all packages, scripts, workflows, and relevant configuration files.
- Run the documented build, type-check, and test commands in a real checkout/CI environment.
- Capture exact commands, exit codes, and failing output; distinguish unavailable execution from failure.
- Verify the CLI against valid, invalid, partial, and unsupported repository scenarios.
- Verify required GitHub status checks against actual workflow check names before relying on branch protection.

## 4. Previously observed issues — revalidation on this branch

Some issues identified in earlier inspection of the default branch appear addressed in `audit/phase-0-baseline` and must not be carried forward as active defects without rechecking:

- Declared `PASS` overriding missing evidence: current evaluator derives pass from usable evidence.
- Missing analysis being treated as non-applicability: current evaluator uses an explicit analysis-completeness state.
- Blind analyzer fact overwrites: current pipeline unions and deduplicates known fact fields.
- Nested manifest lookup: current framework adapter iterates manifest paths.
- Minimal architecture-profile validation: current validator checks more fields and constraints.

These are source-inspection observations only; their regression tests still need execution.

## 5. Required next sequence

1. Finish the file/package/workflow inventory and review remaining CLI, analyzer, architecture graph, and decision paths.
2. Reconcile the JSON Schema, TypeScript model, example pack, and profile model.
3. Run all package checks in CI or a real local checkout and record results without inferring success.
4. Add regression tests for AUD-11 and AUD-12 before changing evidence semantics.
5. Fix confirmed issues in small commits on this audit branch; keep standards frozen.
6. Re-run the full test matrix, inspect the diff, and open a pull request for review. Do not merge or mark production-ready solely because code was committed.

## 6. Acceptance gate for Phase 0

Phase 0 is complete only when:
- [ ] Repository/package/workflow inventory is recorded.
- [ ] Imports and package dependencies are mapped sufficiently to identify package boundaries.
- [ ] Schema/type/fixture parity is checked.
- [ ] Build, type-check, and test outcomes are recorded with evidence.
- [ ] Engine, analyzer, architecture, CLI, filesystem, and CI findings are prioritized and linked to exact paths.
- [ ] The implementation sequence is updated from verified findings.
- [ ] No claim of `TEST_VERIFIED`, `RUNTIME_VERIFIED`, or `ACCEPTED` is made without corresponding evidence.

**Current gate:** Not complete.