# Adopting the governance check in a project repository

A project does not copy this repository. It calls a reusable workflow, pinned to an exact version, and keeps a small bundle of its own files. This is the Release 4 adoption package from the operating blueprint (section 10.3); the blueprint is a draft pending leadership approval, so treat all of it as a proposal.

## The bundle

| File in your repository | Source | Purpose |
|---|---|---|
| `.github/workflows/governance.yml` | [github/governance-check.yml](github/governance-check.yml) | Calls the reusable workflow at a pinned version. |
| `.governance/governance-pack.json` | [model/example-governance-pack.json](../model/example-governance-pack.json) | The controls, evidence, risks and exceptions for your project. |
| `.governance/project.json` | [model/example-project-registration.json](../model/example-project-registration.json) | Your project registration: owners, criticality, data classification, profiles. |
| `.github/pull_request_template.md` | [github/pull_request_template.md](github/pull_request_template.md) | An evidence section for every pull request. |

Replace `<GOVERNANCE_SHA>` in the workflow with one full commit SHA (or a `vMAJOR.MINOR.PATCH` tag) of this repository, in **both** places. Branch names are refused, so the baseline you run is always exactly identifiable. To upgrade, change both values in a reviewed pull request.

## What the check does

On each pull request it checks out the pinned baseline, builds the governance CLI, and runs `governance report` against your repository. It then:

- publishes the Markdown report as the **job summary** (the decision, analysis, blocking violations and conditions);
- uploads the machine-readable `report.json` as an **artifact** (30 days by default);
- exposes `decision` and `exit_code` as workflow outputs;
- fails the job according to the policy you chose.

For pull requests, the changed files are verified against the base branch, so a pack that does not declare the files actually changed is `NO-GO`. Other events have no base unless you set `base_ref`.

## Inputs

| Input | Required | Default | Meaning |
|---|---|---|---|
| `governance_ref` | yes | | Full commit SHA or `vX.Y.Z` tag of the governance baseline. Must match the `@` in `uses:`. |
| `conditions` | yes | | `pass` or `fail`: whether GO WITH CONDITIONS passes this pipeline. There is no default, so the choice is explicit. |
| `registry_path` | no | | Your project registration file (or directory) in your repository. It supplies your pack path and architecture profile, requires the pack to belong to the project, and reports unassigned owners as conditions. |
| `project_id` | no | | Needed only if the registry holds several projects. |
| `pack_path` | no | registry, else `.governance/governance-pack.json` | Overrides the pack. |
| `profile_path` | no | registry | Overrides the architecture profile. |
| `use_catalog` | no | `true` | Check the pack against the control catalog of the pinned baseline. |
| `diff_scope` | no | `true` | Verify the changed-file scope against the base. |
| `base_ref` | no | PR base | A base revision such as a release tag, for non-PR events. |
| `run_tools` | no | `false` | Run your installed TypeScript and Python checks. This executes repository code. |
| `artifact_name`, `artifact_retention_days` | no | `governance-report`, `30` | Use a distinct `artifact_name` if you call the workflow more than once in a run. |
| `governance_repository` | no | `Inflame21/engineering-governance` | Where the baseline lives. |

## Results and exit codes

| Decision | CLI exit | Pipeline |
|---|---|---|
| `GO` | 0 | passes |
| `GO_WITH_CONDITIONS` | 1 | passes if `conditions: pass`, fails if `conditions: fail` |
| `NO-GO` | 2 | fails |
| `ERROR` (invalid pack, missing file, tool failure) | 3 | fails, and the summary shows the error |

An unsupported, skipped or failed check is never a pass: see the CLI README, "Verification result states". While the catalog is `DRAFT`, its controls add one condition and block nothing.

## Making it a required check

The check appears on the pull request as `<your job id> / Governance check` (for the template above, `governance / Governance check`). Confirm the exact name from a first run, then add it to your branch ruleset. Start with `conditions: pass`, look at the false positives, and tighten later; enforcing before a baseline exists loses the team's trust.

## Security notes

- The workflow needs only a read-only token and no secrets, and never uses `pull_request_target`.
- Inputs are validated and passed to the script through environment variables, never interpolated into shell code. Paths may not be absolute, contain `..` or start with `-`.
- Repository text (control titles, risk titles) is printed with workflow commands disabled, so a pull request cannot forge annotations or outputs through the report.
- Actions are pinned to commit SHAs.
- `run_tools: true` runs code from your repository with the job's read-only token. That is the trust you already give your own CI; it stays off by default, and you should not enable it for untrusted fork pull requests.

## Known limits

- The first real run is on GitHub. The reusable workflow's wiring (inputs, checkouts, artifact upload) has been statically checked and its script tested, but not run by Actions before your first call. If it fails, open the job log and the `governance-report` artifact.
- With `run_tools: true`, the local checks run twice (once per report format).
- The control catalog is a draft and enforces nothing yet. Owners and project registrations are placeholders until leadership assigns them.
