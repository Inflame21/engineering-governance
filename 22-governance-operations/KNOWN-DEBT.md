# Known Technical Debt — Governance Operations

Recorded per DEBT-020 while hardening the engine (PR #4). Owner: engineering governance maintainers.

| ID | Debt | Impact | Planned resolution |
|---|---|---|---|
| DEBT-GOV-001 | The CLI casts the governance pack without validating it against `model/governance-model.schema.json`. The schema is only exercised in tests. Missing required fields (for example `evidence.supports_controls`, `pack.risks`) throw a TypeError instead of producing a diagnostic. Unknown severities and risk statuses now fail closed in the engine, but other malformed fields may not. | Uncontrolled crash on malformed packs. | Validate at the CLI boundary (bundle the schema, add a runtime validator), exit with a diagnostic. Master plan Phase 1. |
| DEBT-GOV-002 | `pack.exceptions` is never evaluated. An approved, unexpired exception cannot waive anything, so a legitimately approved P1 risk cannot reach GO. P0 stays unapprovable by design. | Safe but over-strict. | Master plan Phase 9: approver authority by severity (EXC-021 section 15), requester != approver, expiry. Add exception fields to the schema. |
| DEBT-GOV-003 | An empty pack, or a pack whose controls never apply (analyzer emitted no matching signals), evaluates to GO. | Vacuous GO. | Decide and record the intended semantics (likely NO-GO or an explicit "nothing evaluated" state). |
| DEBT-GOV-004 | OPEN/ACCEPTED P2/P3 risks do not appear in the decision. | Lost visibility. | Surface as conditions (GO_WITH_CONDITIONS) once condition semantics are defined. |
| DEBT-GOV-005 | `hasPythonDependency` regex-scans the whole manifest; comments, keywords and project names can yield false framework signals. | Noisy applicability signals. | Parse `pyproject.toml` / `requirements.txt` dependency tables. |
| DEBT-GOV-006 | No lockfiles; CI installs with caret ranges. | Builds can drift. | Commit lockfiles and use `npm ci`. |
| DEBT-GOV-007 | The matrix test's oracle restates the engine's policy predicates, so a policy error shared by both would pass. The hand-written case table is the independent evidence. | Reduced test independence. | Review the policy table with the governance owner; add multi-control cases. |
| DEBT-GOV-008 | Schema evidence requirements tightened without a schema version bump. | Older packs lacking `source`/`freshness`/`supports_controls` stop validating (they already evaluated as missing evidence in the engine). | Version the schema when it is next changed. |
