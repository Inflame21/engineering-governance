# Control catalog

The catalog holds the mandatory controls the organization's standards already require, each traced to the exact text that requires it. It follows [control-catalog.schema.json](../control-catalog.schema.json) and is a proposal from the operating blueprint (Release 2, Appendix B), not approved policy.

[organization-controls.json](organization-controls.json) is the v0.1 catalog. It has **88 controls, all `DRAFT`**, generated from seven explicit blocker lists:

| Standard | Section | Controls |
|---|---|---:|
| GOV-000 | 10. Automatic Production Blockers (Security, Data, Reliability, Correctness, Operations) | 19 |
| GOV-022 | 22. Automatic Governance Blockers | 11 |
| GOV-023 | 28. Automatic Evidence Blockers | 9 |
| SEC-007 | 30. Automatic Production Blockers | 13 |
| QA-008 | 37. Automatic Production Blockers | 10 |
| CICD-012 | 35. Automatic Production Blockers | 15 |
| DB-005 | 31. Automatic Database Blockers | 11 |

Each control's `source_text` is one bullet of those lists, verbatim. A test re-reads the standards and fails if a quote changes, moves, or if a bullet is added to or removed from a list without the catalog following.

## What is and is not decided

The standards state that these conditions block. They do not state a severity, an owner, an evidence class or a verifier for each, so the catalog says so instead of guessing:

- **Severity:** `P1` by default (GOV-000 section 9: "normally blocked"). `P0` only where the standards name it: authentication bypass and exposed secrets (GOV-000 section 9 examples), the same authentication-bypass blocker in SEC-007, and the GOV-022 blocker about an unresolved P0.
- **Strength of the source wording:** SEC-007 and QA-008 say "SHALL normally result in NO-GO", CICD-012 says delivery "SHALL be blocked", and DB-005 says "SHOULD result in a NO-GO decision until corrected". The catalog records all of them as `NO-GO` and does not encode the difference; approving a control is where that gets decided.
- **Applicability:** `check --catalog` does not read `applies_when` (all are empty), so every mandatory control must be defined in a pack, including DB-005 controls for a repository with no database. A pack can define such a control with its own `applies_when`; whether the catalog should carry applicability itself is undecided.
- **`exception_policy`:** `NON_EXCEPTIONABLE` only for literal matches to EXC-021 section 7 (authorization bypass, tenant isolation, irreversible data loss, falsified evidence). SEC-007's "Authorization bypass" is the only new one. SEC-007's "Cross-tenant data access", DB-005's destructive-operation blockers and the credential-exposure blockers are close to EXC-021 examples but not literal, so they stay `ALLOWED` until the governance owner decides otherwise. Everything else is `ALLOWED`. `check --catalog` enforces it (see below).
- **`standard_version`:** `1.0.0` for GOV-000, which states a version, and `unversioned` for GOV-022 and GOV-023, which do not.
- **`owner`:** `UNASSIGNED` everywhere. Real owners need leadership.
- **`verification_capabilities` and `required_evidence_classes`:** empty. No control has an automated verifier yet, and the evidence classes have not been chosen.

## Lifecycle

| Status | Meaning |
|---|---|
| `DRAFT` | Proposed. Reported as a condition, never enforced. |
| `APPROVED` | Enforced. Requires an `effective_from` date and a named owner; `UNASSIGNED` is rejected. |
| `DEPRECATED` | Scheduled for removal. Ignored. |
| `RETIRED` | No longer applies. Requires `retired_at`. Ignored. |

Only leadership can move a control to `APPROVED`. Approving one means editing its `status`, `effective_from` and `owner` in a reviewed pull request.

## How `check` uses it

```bash
governance check <repo> --catalog 22-governance-operations/model/catalog/organization-controls.json
```

A governance pack must define every mandatory catalog control under the catalog's id, and may not weaken it: a lower severity, a softer `failure_decision`, or a different standard.

- `APPROVED` control missing or weakened: **NO-GO** (`CATALOG:<id>:NOT-DEFINED` or `CATALOG:<id>:WEAKENED`).
- `DRAFT` controls missing or weakened: **one condition each** (`CATALOG:<catalog>:DRAFT-CONTROLS-NOT-DEFINED`, `...-WEAKENED`), listing the ids. An otherwise passing assessment becomes `GO WITH CONDITIONS`. It never softens a `NO-GO`.
- Optional, `DEPRECATED` and `RETIRED` controls are ignored.
- **Exceptions:** a control marked `NON_EXCEPTIONABLE` can never be waived. The CLI passes those control ids to the engine, which treats every exception for them as invalid and reports `Exception <id> was not applied: Control <id> is non-exceptionable (EXC-021 section 7)`. This holds for `DRAFT` controls too, because the rule comes from EXC-021, not from the control's approval, and it does not depend on the pack's own severity. `DEPRECATED` and `RETIRED` controls no longer apply.

Because every control in v0.1 is `DRAFT`, passing `--catalog` today adds a single condition and blocks nothing.

`governance validate <repo> --catalog <path>` checks the catalog against the schema (ids must be unique). Used alone it skips the pack check.

## Adding or changing a control

1. Cite the standard text. `source_file`, `source_section` and `source_text` must name a real section and quote it verbatim.
2. Keep the id unique and in the `^[A-Z0-9-]+$` form, so a pack can define the control under the same id.
3. Start as `DRAFT`. Do not assign severity, exception policy or evidence classes the standards do not support without recording where they come from.
4. Run the CLI tests: they check the schema, id uniqueness and, for the committed catalog, that every quote matches its standard.
