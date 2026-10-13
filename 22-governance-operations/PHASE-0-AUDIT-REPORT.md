# Phase 0 — Repository Audit Report

**Repository:** `Inflame21/engineering-governance`  
**Audited ref:** `main` at commit `ca1ea5a4ef096ffefe74b2331cc8d8483d38bc9e`  
**Audit branch:** `audit/phase-0-baseline`  
**Audit date:** 2026-10-13  
**Status:** Initial source audit completed. Subsequent remediation and GitHub Actions verification are recorded in Section 7.

## 1. Executive Summary

The repository has a useful starting foundation: governance standards GOV-000 through GOV-023, a governance-pack schema and example, a TypeScript control engine, repository detection/adapters, architecture-profile examples, and CLI-oriented functions/tests.

The current executable foundation is **not yet a verified runnable governance CLI**. Source inspection identified a fail-open evidence evaluation defect, a mismatch between the declared decision type and CLI output usage, TypeScript package-boundary risks, schema/type contract drift, and gaps between planned and actual CLI/CI capabilities.

No source-code changes were made during the audit inspection. This report is the Phase 0 baseline artifact. Findings marked “static inference” need confirmation by running the repository in a reproducible environment.

## 2. Scope and Method

Inspected the recursive Git tree and the following areas:

- Engine types, control evaluator, decision engine, analyzer-output merge.
- Analyzer types, detection, framework and language adapters, registry, pipeline, architecture-profile validator.
- CLI package scripts, TypeScript configuration, command/output/config/filesystem abstractions, and tests.
- Governance model JSON Schema, architecture-profile schema/examples, example governance pack.
- Root README and AGENTS.md.
- Presence of package/workspace manifests and GitHub Actions workflow files.

The GitHub tree contains 109 entries at the audited commit. No root `package.json`, workspace manifest, or `.github/workflows/` directory was present in the inspected tree.

**Initial execution limitation:** The source audit began through GitHub repository access without a local checkout. A verification workflow was then added and executed on GitHub Actions. Its successful results and remaining limitations are recorded in Section 7. No runtime or production verification is implied.

## 3. Prioritized Defect Register

### AUD-F01 — Required evidence can be bypassed by declared PASS

**Priority:** P0 — governance correctness  
**Location:** `22-governance-operations/engine/src/evaluator.ts`

The evaluator derives status using:

```ts
const status = control.status ?? (missing.length > 0 ? "UNVERIFIED" : "PASS");
```

This lets a declared status take precedence over evidence completeness. In addition, `evidenceForControl` treats only absent evidence and `UNVERIFIED` evidence as missing. `PARTIALLY_VERIFIED` and `NOT_APPLICABLE` evidence can currently be counted as supporting evidence for a required evidence item.

**Impact:** A control can be reported as passing even when its required proof is absent, partial, or not applicable. That undermines the platform's core approval guarantee.

**Required resolution:**
- Make evidence/verification results authoritative over a declared status.
- Treat partial evidence as insufficient for a mandatory fully verified requirement unless a control explicitly defines an acceptable partial-evidence policy.
- Do not treat NOT_APPLICABLE evidence as proof of a required check.
- Preserve the distinction between FAIL and UNVERIFIED.
- Add regression tests for declared PASS + missing evidence, declared PASS + unverified evidence, partial evidence, not-applicable evidence, contradictory declared status, and verified evidence.
- Verify the final decision for mandatory controls and each severity/failure-decision combination.

### AUD-F02 — Decision model and CLI output contract disagree

**Priority:** P1 — likely type-check blocker  
**Locations:** `22-governance-operations/engine/src/types.ts`, `engine/src/decision.ts`, `cli/src/output.ts`

The declared `GovernanceDecision` type contains `status`, `reason`, `blockingViolations`, and `warnings`. The CLI output reads `evaluation.decision.openRisks`, and a CLI output test also supplies `openRisks`. The decision engine does not populate that property.

**Impact:** The output layer and decision contract disagree. This is expected to cause a TypeScript type-check error and would otherwise render the open-risk count as undefined.

**Required resolution:** Decide whether open risks belong in the canonical decision result or should be computed from a separate evaluation field. Align the type, decision construction, formatter, JSON output, and tests. Do not add a field only to silence the compiler without defining its semantics.

### AUD-F03 — Package TypeScript root boundaries include sibling source trees

**Priority:** P1 — likely build blocker  
**Locations:** `22-governance-operations/analyzer/tsconfig.json`, `22-governance-operations/cli/tsconfig.json`

The analyzer includes `../engine/src/**/*.ts` while setting `rootDir` to the analyzer package directory. The CLI includes engine and analyzer sources while setting `rootDir` to the CLI package directory.

**Impact:** TypeScript commonly reports TS6059 when included source files fall outside the configured root directory. The current setup also blurs package ownership and duplicates compilation across packages.

**Required resolution:** Confirm compiler behavior with the actual toolchain. Then establish a deliberate package/workspace strategy: build engine as a package and consume its output, or configure a shared build layout with explicit project references. Do not rely on accidental cross-package source inclusion.

### AUD-F04 — Governance JSON Schema and TypeScript interfaces drift

**Priority:** P1 — contract integrity  
**Locations:** `22-governance-operations/model/governance-model.schema.json`, `engine/src/types.ts`

Examples observed:
- Schema requires control `status`, while TypeScript makes it optional.
- Schema permits project `repository` and `environment` to be absent, while the TypeScript project type requires both.
- Schema does not require change `risk_class` and `files`, while TypeScript requires them.
- Schema requires only evidence `id`, `type`, `status`, and `description`; TypeScript also requires `source`, `freshness`, and `supports_controls`.

**Impact:** A pack can pass schema validation yet fail the runtime type contract, or satisfy the TypeScript interface while failing schema validation.

**Required resolution:** Define one canonical contract and align schema and runtime types intentionally. Document any fields that are optional at ingestion but normalized into required runtime fields. Add valid/invalid fixture tests for both schema and semantic constraints.

### AUD-F05 — Framework adapter facts overwrite base framework detection

**Priority:** P1 — incorrect repository facts  
**Location:** `22-governance-operations/analyzer/src/pipeline.ts`

The final facts object spreads adapter facts after base facts. When an adapter emits `frameworks`, its array replaces the complete base `frameworks` array instead of merging the observations. The detector uses markers such as `package.json` and `pyproject.toml`, while the framework adapter derives names such as React, Vite, FastAPI, and Django.

**Impact:** Some base-detected facts can disappear when an adapter emits a value for the same field. This may lead to incorrect applicability and incomplete reports.

**Required resolution:** Define field-specific merge behavior. Set-like facts such as languages, frameworks, package managers, build systems, infrastructure systems, and test systems should merge and deduplicate deterministically where appropriate. Conflicting scalar facts should preserve provenance or surface a conflict rather than silently overwrite.

### AUD-F06 — No verified executable CLI entry point or concrete filesystem adapter

**Priority:** P1 — end-to-end product gap  
**Locations:** `22-governance-operations/cli/package.json`, `cli/src/index.ts`, `cli/src/filesystem.ts`, `cli/src/commands.ts`

Package scripts currently provide build/test/check commands. The CLI index exports formatting functions; commands accept an injected snapshot and governance pack. The filesystem layer defines an interface and snapshot loader but no concrete Node filesystem implementation was found in the inspected CLI source tree. No executable `bin` entry or argument parser was found.

**Impact:** The planned `governance check .` workflow is not yet demonstrated as runnable by a developer or CI.

**Required resolution:** After the contract and build foundation is stabilized, implement the concrete filesystem adapter, safe repository-root confinement, configuration path resolution, CLI argument parsing, executable entry point, help/version/check/analyze commands, deterministic output, and tested exit codes.

### AUD-F07 — Configuration loader does not validate the governance schema

**Priority:** P1 — invalid configuration may enter evaluation  
**Location:** `22-governance-operations/cli/src/config.ts`

The loader parses JSON and checks only that the top-level value is an object before casting it to `GovernancePack`. Its source comment explicitly defers full schema validation.

**Impact:** Structurally invalid packs, invalid enum values, duplicate IDs, dangling evidence references, or other semantic inconsistencies can reach the engine.

**Required resolution:** Integrate schema validation and semantic validation. Invalid configuration must produce a clear diagnostic and a non-zero CLI exit code. Do not evaluate a malformed pack.

### AUD-F08 — Architecture profile validation is weaker than its JSON Schema

**Priority:** P1 — profile correctness  
**Locations:** `22-governance-operations/analyzer/src/architecture.ts`, `model/architecture-profile.schema.json`

The runtime validator checks core fields and selected rule fields but does not enforce the full JSON Schema contract, including all optional-field types, unknown-property restrictions, patterns, uniqueness, and every boundary-rule property.

**Impact:** Profiles accepted by runtime validation may violate the documented schema. A profile may be loaded without sufficient validation.

**Required resolution:** Reuse the schema validator planned for governance packs, then add semantic checks for duplicate IDs and profile/control references. Keep schema validation separate from actual architecture conformance.

### AUD-F09 — Monorepo manifest discovery is incomplete

**Priority:** P2 — polyglot/monorepo detection gap  
**Locations:** `analyzer/src/detector.ts`, `analyzer/src/adapters/frameworks.ts`, `cli/src/filesystem.ts`

The filesystem loader can collect nested manifests, but detection and framework parsing look up root-level markers and exact keys such as `fileContents["package.json"]` and `fileContents["pyproject.toml"]`.

**Impact:** Nested applications in a monorepo may be missed or attributed incorrectly.

**Required resolution:** Discover all supported manifest paths, associate facts with their relative package/workspace roots, and retain component provenance. Avoid flattening every package into a single unscoped fact list.

### AUD-F10 — No GitHub Actions workflow was present in the audited tree

**Priority:** P2 — continuous verification gap  
**Location:** `.github/workflows/` (not present in inspected tree)

The recursive tree did not contain a GitHub Actions workflow directory.

**Impact:** There is no repository-defined automated CI gate visible in the audited tree to continuously build and test the engine/analyzer/CLI.

**Required resolution:** After the package strategy is stable, add CI for installation, build, type checks, tests, and later end-to-end CLI fixtures. CI must report the actual command outcomes.

### AUD-F11 — Architecture profiles describe patterns but no actual dependency graph is evaluated

**Priority:** P1 — architecture governance not yet enforceable  
**Locations:** `analyzer/src/architecture.ts`, `model/architecture-profile-*.json`

Profile rules contain declarative source/target patterns, but the analyzer currently validates profile shape and emits architecture signals. No verified component graph or dependency-edge evaluation was found in the inspected implementation.

**Impact:** A profile declaration cannot currently prove that a repository respects its architecture.

**Required resolution:** Implement a provenance-backed system graph and component-role mapping, then evaluate actual dependency relationships. Unsupported or ambiguous analysis must remain unverified.

### AUD-F12 — Change scope is not used to scope analysis

**Priority:** P2 — change-impact gap  
**Location:** `22-governance-operations/analyzer/src/pipeline.ts`

The snapshot includes `changedFiles`, but the current pipeline selects adapters from the full snapshot and does not use the changed-file list to produce changed-component scope or blast-radius information.

**Impact:** The current analysis cannot yet distinguish repository-wide observations from findings specifically relevant to a change.

**Required resolution:** Keep full-repository facts available while adding explicit change-scope and dependency-impact results. Do not treat an absent change analysis as a clean result.

## 4. Initial Package and CI Observations

| Area | Source-inspection status | Notes |
|---|---|---|
| Engine package | Scripts exist; execution unverified | Unit tests exist; evidence-status semantics need correction. |
| Analyzer package | Scripts exist; execution unverified | Includes engine sibling sources outside its declared root directory. |
| CLI package | Scripts exist; execution unverified | Includes engine/analyzer sibling sources; no executable command path found. |
| Root workspace | Not present in inspected tree | No root package or workspace manifest was found. |
| GitHub Actions | Not present in inspected tree | No `.github/workflows/` directory found. |
| Governance schema validation | Not integrated in loader | Schema exists, runtime loader does not invoke it. |
| Architecture conformance | Not implemented in inspected source | Profiles are validated and converted to signals; no actual dependency graph check. |

## 5. Recommended Remediation Order

1. **AUD-F01:** Close the evidence-authority/fail-open defect and add regression tests.
2. **AUD-F02:** Align the decision and reporting contracts.
3. **AUD-F03:** Establish a reproducible TypeScript package/build strategy and confirm the actual compiler errors.
4. **AUD-F04:** Align JSON Schema and runtime contracts.
5. **AUD-F05:** Define deterministic, field-specific analyzer merge semantics.
6. **AUD-F06 / AUD-F07:** Implement a runnable CLI only after the contract/build baseline is stable; validate configuration before evaluation.
7. **AUD-F08:** Use full profile schema validation.
8. **AUD-F09:** Add package-scoped monorepo detection.
9. **AUD-F11:** Build a provenance-backed dependency graph and architecture evaluator.
10. **AUD-F10:** Add CI once build/test commands are reliable; keep it in place as a regression gate.
11. **AUD-F12:** Add changed-component scope and blast-radius analysis.

The ordering prioritizes governance correctness and a reproducible build before expanding analyzer coverage.

## 6. Phase 0 Exit Gate

- [x] Repository tree and core executable source inspected.
- [x] Initial prioritized defect register created.
- [x] Governance-engine fail-open path identified.
- [x] Package, schema, CLI, architecture, and CI gaps recorded.
- [x] Engine/analyzer/CLI builds executed and results recorded in GitHub Actions.
- [x] Engine/analyzer/CLI test suites executed and results recorded in GitHub Actions.
- [x] Actual TypeScript diagnostics captured during the initial failing runs; corrected issues were rechecked.
- [ ] Reproducible dependency installation is established; package-level CI works, but lockfiles are not yet committed.

**Phase 0 is source-audit complete but not execution-verified.** Do not mark build/test tasks as passing until they have been run in a reproducible environment. AUD-F01 is the first implementation priority once the build path permits reliable verification.


## 7. Remediation and Verification Update

**Verified commit:** `4fde99c18fd0631445faddad96b67b856e2e2008`  
**Workflow run:** [Governance Operations Verification #46](https://github.com/Inflame21/engineering-governance/actions/runs/38360103606)  
**Result:** `success` — all three package jobs completed dependency audit, type-check, tests, and build successfully on Node.js 22 / npm 10.9.9.

| Finding | Current branch status | Evidence / remaining work |
|---|---|---|
| AUD-F01 — Evidence can be bypassed by declared PASS | **Fixed in branch** | Evaluator now requires VERIFIED evidence; regression tests cover missing, UNVERIFIED, PARTIALLY_VERIFIED, NOT_APPLICABLE, and no-evidence cases. |
| AUD-F02 — Decision/output contract mismatch | **Fixed in branch** | Open risks are part of the decision contract; P2/P3 open risks become conditional warnings; CLI output contract is typed. |
| AUD-F03 — TypeScript source root boundaries | **Fixed in branch** | Analyzer and CLI compile with shared source roots; CI build confirms this configuration compiles. |
| AUD-F04 — Schema/runtime type drift | **Substantially aligned; final compatibility review open** | Schema validation is integrated; runtime types now include freshness, maximum evidence age, risk-acceptance, and exception metadata. Contract tests cover valid/invalid packs; continue auditing optional fields and compatibility. |
| AUD-F05 — Analyzer facts overwrite each other | **Fixed in branch** | Repository facts now merge per known fact field; adapter outputs can be partial. Framework markers no longer classify package manifests as frameworks. |
| AUD-F06 — No runnable CLI entry point | **Implemented and smoke-tested in CI** | Executable entry point, argument parsing, help/version/analyze/check commands, Node filesystem adapter, JSON/human output, and stable exit codes are present. The workflow executes a seeded repository through analyze/check and architecture checks. |
| AUD-F07 — Governance pack schema validation absent | **Fixed in branch** | Loader validates the governance JSON Schema and semantic references before evaluation; malformed packs fail closed. |
| AUD-F08 — Runtime architecture profile validation is incomplete | **Schema validation integrated; semantic review remains** | Architecture profiles use the JSON Schema validator and reject duplicate boundary-rule IDs. Continue reviewing profile/control references and schema/type compatibility. |
| AUD-F09 — Monorepo manifest detection is partially addressed | **Package-scoped facts and graph edges implemented; richer topology remains open** | Nested manifests produce package-scoped language/framework/tool facts; graph nodes carry package IDs and cross-package import edges retain source/evidence provenance. Service/API/database/event relationships and non-manifest component attribution remain open. |
| AUD-F10 — No GitHub Actions workflow | **Fixed in branch** | Package-level workflow now runs type-check, tests, and build. |
| AUD-F11 — No graph-backed architecture conformance | **Implemented for supported source types, with explicit limits** | TypeScript/JavaScript and Python import edges carry source provenance; profile mappings evaluate forbidden dependencies and emit findings. Alias resolution, dynamic imports, and other language graph extraction remain unsupported and must stay unverified. |
| AUD-F12 — Changed-file scope is not used for impact analysis | **Implemented for mapped graph dependencies; limited** | Verified Git scope now drives reverse-dependency impact analysis and reports changed/impacted files and components. Unverified scope, unmapped files, and incomplete source ingestion remain explicit limitations. |

### Additional defects found through execution and corrected

- Adapters were typed as returning complete repository facts despite emitting partial facts.
- An obsolete duplicate analyzer registry had invalid relative imports and was removed.
- The architecture test fixture widened severity to `string`; it now uses the canonical profile type.
- The CLI output test fixture now conforms to the evaluation contract.
- Go projects are recognized from `go.mod`.
- Python dependency detection now handles quoted `pyproject.toml` declarations.
- TypeScript frontend detection recognizes conventional `App.tsx`, `main.tsx`, and `index.tsx` entry files; tests now use representative paths.
- Vitest was upgraded to a patched release after CI surfaced dependency advisories; the subsequent npm audit reports zero vulnerabilities.

### Remaining verification limits

- The passing workflow proves package type-checks, tests, and builds for the verified commit only.
- The workflow installs dependencies with `npm install`; lockfiles are not committed yet, so dependency resolution is not fully reproducible.
- The initial dependency audit reported **3 Vitest-related vulnerabilities (1 moderate, 2 critical)**. Vitest was upgraded to `^5.0.4`, the version suggested by npm audit. The verified commit now reports **0 vulnerabilities** across all three packages. No force-upgrade was used.
- The CLI is executable and smoke-tested in CI. Schema validation, graph-backed architecture checks, package-scoped monorepo facts, and cross-package import edges are implemented for supported source types. Dependency locking, service/API/database/event relationships, alias/dynamic import resolution, and runtime/production verification remain open.
- No runtime or production approval is claimed.

**Updated status (2026-10-13):** source audit is complete, the executable CLI and schema/profile validation are integrated, and the architecture graph reports provenance-backed boundary findings, change impact, package ownership, and cross-package import edges. The latest verified run [#296](https://github.com/Inflame21/engineering-governance/actions/runs/38367133120) passed type-checks, tests, builds, dependency audits, and the CLI smoke test for engine, analyzer, and CLI; all control severity × failure-policy combinations and all open-risk severities passed. Dependency locking and the remaining limitations above stay open. No runtime or production approval is claimed.
