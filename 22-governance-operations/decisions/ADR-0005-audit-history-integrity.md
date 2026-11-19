# ADR-0005 — Audit History: Retention, Access Control and Integrity (OPS-05)

**Status:** PROPOSED 2026-11-19 on the repository owner's request. Implemented in the CLI and workflows; the retention periods and the custodian list are proposals that leadership must approve (the operating blueprint is itself a draft).
**Standards applied:** GOV-022, GOV-023, EXC-021.
**Related:** DEBT-GOV-017, DEBT-GOV-018, DEBT-GOV-021, ADR-0004.

## 1. Problem

OPS-01 to OPS-03 gave the project an assessment history, exception approvals and signed approvals. Four weaknesses were recorded as debt:

1. The history is a hash chain, which shows an edit in the middle, but not deleted newest records and not a chain recomputed from scratch.
2. Recording is opt-in, so a check that is not recorded leaves no trace.
3. Approval signatures are verified only when a flag is passed.
4. A repository administrator who controls both the authority policy and the pack can still forge an approval.

Nothing yet said how long records are kept, who may write them, or who may change the rules.

## 2. Decision

### 2.1 Integrity: signed checkpoints

`governance checkpoint <repository> --sign <key>` GPG-signs the newest history record's sequence number and hash and saves it to `.governance/history/checkpoints/<n>.asc`. It never replaces an existing checkpoint. `governance history <repository> --authority <policy>` verifies every checkpoint against the keys the policy registers (`key_fingerprint` on holders of APPROVED roles) and exits 3 when:

- a checkpoint vouches for a record that is no longer there (the newest records were deleted);
- its signature does not verify over the current record (the chain was recomputed or the checkpoint was altered);
- it is signed by a key the policy does not register.

A forger now needs a registered signing key as well as write access, or must also delete the checkpoint files (see 3).

### 2.2 Recording by default in CI

The reusable `governance-check.yml` records every assessment (`record_history`, default true) and uploads the history as the artifact `<artifact_name>-history`, kept `history_retention_days` (default 400). One check appends one record. A check run through the workflow therefore leaves a trace outside the pull request. Local runs still record only with `--record`.

### 2.3 Required signatures are set by the policy, not a flag

An authority policy may set `require_signed_approvals: true`. When it does, the CLI verifies every approved exception's signature whenever that policy is applied, and an approval without a verified signature does not hold. No flag can turn it off. `--verify-signatures` remains for policies that do not set it.

### 2.4 Who controls the policy

The reusable workflow copies the authority policy and the control catalog from the **pinned governance baseline** (`governance_ref`), not from the project. A project administrator cannot change them without changing the pin, which is a reviewed pull request. The project controls its pack, its registry record and its approvals; the baseline controls who may approve and whether signatures are required.

### 2.5 Access control (what may write what)

| Path | Who may change it | Enforced by |
|---|---|---|
| `.governance/history/assessments.jsonl` | the CLI, appending only | hash chain; checkpoints |
| `.governance/history/checkpoints/` | a registered custodian, adding only | signature; CODEOWNERS |
| `.governance/approvals/`, the pack's `exceptions` | the named approver, signed | signature; CODEOWNERS |
| `.governance/governance-pack.json`, `project.json` | project engineers | pull request review |
| authority policy, control catalog | governance maintainers, via a baseline release | the pin in the workflow |
| `.github/workflows/governance*.yml`, `production-approval.yml` | governance maintainers | CODEOWNERS |

The CODEOWNERS template [templates/github/CODEOWNERS](../templates/github/CODEOWNERS) encodes this. The rules only bind when the branch ruleset has "Require review from Code Owners" turned on, and a repository administrator can bypass a ruleset unless it has no bypass actors.

### 2.6 Retention (proposal)

| Record | Keep | Why |
|---|---|---|
| Assessment history and checkpoints (in git) | for the life of the project, then at least 7 years | they are the evidence of past decisions; they are small |
| Approvals and exception records (in git) | the same | an approval is meaningless without its history |
| CI history and report artifacts | 400 days (the proposed default) | a copy outside git while the repository is active; git is the long-term store |
| Saved reports under `.governance/reports/` | at the owner's choice | they quote code; not part of the audit trail |

Records are never deleted or rewritten. A record that must be corrected is superseded by a later one. If a record has to be removed for legal reasons, the removal is itself recorded (a new checkpoint after the removal; the earlier checkpoints then correctly report the gap). The 7-year figure is a placeholder for leadership and legal to set.

## 3. What this does not stop

- Someone who can delete the checkpoint files as well as the newest records, with no other copy of the checkpoints. Mitigation: CODEOWNERS on `.governance/history/`, and the CI artifact copy. Better: publish each checkpoint outside the repository (a signed tag, a ticket, a log service).
- A repository administrator who can edit the workflow to use `use_authority: false`, change `governance_ref`, or skip the check. Mitigation: CODEOWNERS on `.github/workflows/`, and an organization ruleset that requires the governance workflow so it cannot be edited per repository.
- Someone who holds a registered signing key. Keys are as strong as their custody: hardware keys or Sigstore would be stronger (not implemented).
- A CI artifact chain that does not continue from a committed history: each run then starts a new chain of one.

## 4. Consequences

- A new `checkpoint` command, `history --authority`, a policy field and one workflow input. Existing callers see an extra artifact and a record in the runner's copy of the history; nothing fails because of either.
- `--record` now prints its status line to standard error so standard output stays the report.
- Custody of signing keys, and the choice of who the custodians are, becomes a governance decision that leadership must make; until roles are APPROVED with named holders and key fingerprints, no checkpoint can verify and the policy field changes nothing.

## 5. Alternatives considered

- **Publish the head hash as a signed git tag by default:** stronger against deletion in the repository, but tags can be force-pushed unless a tag ruleset protects them, and it depends on repository settings. Offered as the next step.
- **Sigstore keyless signing:** ties a signature to an identity without key custody, but needs network access and extra tooling. Not chosen for this step; GPG is already used for approvals.
- **An external append-only log service:** the strongest option, and out of scope without a chosen service.
- **Recording on every local check:** rejected; it would dirty working trees and surprise users. CI is where a trace matters most.

## 6. Verification

Tests: a checkpoint verifies; an empty history and a repeated checkpoint are refused; deleting the newest records, and recomputing the whole chain with one record changed, are each reported; a key the policy does not register is rejected; uncovered records are counted; a policy that requires signed approvals refuses an unsigned approval with no flag, and without the requirement the approval is trusted as before; the workflow script records exactly one entry per check and none unless asked; through the CLI with real GnuPG, a checkpoint is signed, verified and then catches a deleted record. Run on GitHub: the reusable workflow's self-test recorded a check and uploaded the history artifact (`governance-self-test-report-history`, kept 400 days). Not verified: a history that continues from a committed one in CI, and the comment and production-approval workflows (DEBT-GOV-019); no organization ruleset exists yet.
