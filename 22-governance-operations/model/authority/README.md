# Approver authority policy

Who may approve an exception or accept a risk, by severity. It follows [authority-policy.schema.json](../authority-policy.schema.json) and is a proposal from the operating blueprint (GOV-F10), not approved policy.

[organization-authority.json](organization-authority.json) is the v0.1 policy. It has **three roles, all `DRAFT`, every holder `UNASSIGNED`**, taken from the minimum-authority table in EXC-021 section 15. Each role quotes its row verbatim, and a test re-reads EXC-021 and fails if a row changes or a role stops matching it.

| Role | Covers | EXC-021 section 15 row |
|---|---|---|
| `SENIOR_ENGINEERING_AUTHORITY` | P1, P2, P3 | `P1 \| Senior/Staff Engineering authority` |
| `ENGINEERING_REVIEWER_OWNER` | P2, P3 | `P2 \| Designated engineering reviewer/owner` |
| `TEAM_ENGINEERING_AUTHORITY` | P3 | `P3 \| Team engineering authority` |

EXC-021 states a **minimum** authority per severity, so a role covers its own severity and every lower one.

## What it changes

`check` and `report` accept `--authority <path>`. Only `APPROVED` roles with at least one named holder confer authority (`DRAFT` roles and the `UNASSIGNED` placeholder never do).

| Situation | No approved roles (today) | With approved roles |
|---|---|---|
| P0 waiver or acceptance | never | never: P0 needs the emergency process (EXC-021 section 8) |
| P1 exception waiver | refused | holds if the approver holds a role that covers P1 |
| P1 risk acceptance | blocks | holds if the accepter holds a role that covers P1; stays visible as a condition |
| P2/P3 exception waiver or risk acceptance | holds as before | needs the same role check as P1 |
| Requester approves their own exception | refused | still refused |
| Control the catalog marks `NON_EXCEPTIONABLE` | refused | still refused |

An exception names its role in `approver_role` and a risk acceptance in `acceptance_role`. The approver's `approved_by` (or `accepted_by`) must be a holder of that role, matched on name or handle, ignoring case and a leading `@`. A waiver that holds is reported as a condition naming the role, never silently.

Because every role here is `DRAFT`, passing `--authority` today changes no result: it only records `Authority: organization-authority 0.1.0 (0 of 3 roles approved; none enforced)` in the report.

## What it cannot prove

**The check verifies a claimed identity against an authorized list. It does not authenticate the person.** A governance pack is written by the change's author, so an author could write a holder's name into `approved_by`. The model stops accidental misuse and encodes who is meant to approve, but it does not stop a determined author. Real assurance needs the approval to be tied to something the author cannot forge, such as a reviewed pull request that CODEOWNERS routes to the role's holders, or a signed approval. Treat any waiver that holds here as "approved by a named holder, subject to review of the pack change", and keep review of exception records independent. The report says "identity is declared in the governance pack, not authenticated" on every waiver it honours.

## Not modelled

- **Security authority:** EXC-021 section 15 says security exceptions affecting critical controls SHOULD additionally involve the security authority. That needs a second approver on the record and is not modelled.
- **PRD-018 visibility:** production-readiness exceptions SHALL be visible to the authority responsible for PRD-018. Not modelled.
- **Emergency or organizational authority (P0):** deliberately absent. It is a separate process.
- **A conflict leadership must settle:** EXC-021 puts P1 approval with Senior/Staff Engineering authority, while the operating blueprint routes P1 and regulatory risk to the CTO or a delegated risk authority. This policy follows the approved standard. To change it, leadership edits the roles' `severities` and holders in a reviewed pull request; no code change is needed.

## Approving a role

1. Optionally set `require_signed_approvals: true` so an approval holds only with a verified signature (no flag needed, none can turn it off); it needs `key_fingerprint` on the holders. Name the holders (`name`, optionally `handle`, and `key_fingerprint`, the full GPG fingerprint they sign approvals with; `check --verify-signatures` uses it to authenticate a signed approval). `UNASSIGNED` is rejected for an `APPROVED` role.
2. Set `status` to `APPROVED` and add `effective_from`.
3. Have the change reviewed by someone with authority over EXC-021.

`governance validate <repo> --authority <path>` checks the file. The reusable workflow applies the pinned baseline's policy by default (`use_authority`).
