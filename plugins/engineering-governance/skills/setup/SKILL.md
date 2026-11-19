---
description: Analyze the repositories in this folder and draft a governance pack for each, running the project's own checks to record real evidence
argument-hint: "[repository names to include; default: all found]"
disable-model-invocation: true
allowed-tools: Bash(node *governance.mjs*)
---

# Governance setup

You are drafting governance packs for the git repositories found below, so the user does not have to write them by hand. Repositories requested: $ARGUMENTS (nothing after the command means every repository found).

Facts from `governance discover` for this folder. The last line is the process exit code.

```!
node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" discover . --json; echo "[governance exit code: $?]"
```

## Rules that cannot be bent

1. **Evidence is only what you observed.** Record evidence as `VERIFIED` only for a command you ran in this session and saw exit with code 0. Never mark anything verified because it looks right, because a README or CI file says it passes, or because you would expect it to. Everything else stays `UNVERIFIED`. A failed run is `UNVERIFIED` with `result_status` `FAIL`, plus a finding. The CLI rejects a pack whose evidence status is stronger than its recorded `result_status`, so never write `VERIFIED` next to `FAIL`.
2. **Never overwrite a pack that has content.** If a repository has `existingPack: true` and `packIsPlaceholder: false`, skip it and say so. A pack with `packIsPlaceholder: true` is the empty file `governance init` writes (no controls, evidence or other records, and the change still `CHG-UNSPECIFIED`): that is yours to fill in place, because the user ran `init` precisely to have it filled. Read it first and keep its `project` values (replace `repository` only if it is `"UNSET"`). Create or fill only `<repository>/.governance/governance-pack.json`. Change nothing else: no source, config, CI, lockfile, or git state. Do not commit.
3. **Ask before running anything.** After you have read the repositories, show the user the exact commands you propose to run in each repository and wait for a yes. Running a project's scripts executes that project's code, so say so. Run them one at a time, not the aggregate `ci` script (it stops at the first failure). Use the commands the project's own CI runs as the authoritative list.
4. **Only run checks.** Allowed: lint, typecheck, unit tests, architecture or boundary tests, contract or OpenAPI validation, format check, build. Not allowed: dev servers, `start`, bootstrap, migrations, deploys, publishing, Docker or database commands, installs, deletes. If a useful check needs Docker or a database (for example integration tests), do not run it: record that evidence as `UNVERIFIED` and say why.
5. **No invented requirements.** Controls come from the repository's own stated rules (CLAUDE.md, AGENTS.md, README, docs) and from what its scripts and CI can actually check, tied to a real standard. Say where each non-obvious control came from. Never invent a standard id.
6. **Severities are proposals.** Say so in your report. The owner decides.

## What to do

1. **Scope.** From the discovery above, take each repository (or only those named in `$ARGUMENTS`). Skip any whose pack has content; say which you skip and why. A repository with no pack, or with a placeholder pack from `init`, is in scope; say which of the two it is. If nothing remains, stop and report.
2. **Understand each repository.** Read its CLAUDE.md, AGENTS.md and README if present, its `package.json` scripts and CI commands from the discovery, and its top-level layout. For a deeper structural view you may run `node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" analyze <repository> --json`. A repository with no scripts or CI (documentation, infrastructure) still gets a pack: its controls rest on review evidence and stay `UNVERIFIED`.
3. **Choose standards.** Read `${CLAUDE_PLUGIN_ROOT}/templates/standards-index.json` and pick only the standards that fit what the repository is (for example SEC-007 almost always; QA-008 if it has tests; CICD-012 if it has CI; API-006 if it has contracts or OpenAPI; DB-005 if it has migrations; FE-004 for UI code; ARC-002 if it states module boundaries). Write each standard's `source` as `engineering-governance/<file>`.
4. **Draft 4 to 8 controls per repository**, each with one `standard`, a `severity` (P0 for tenant isolation, secrets or an authentication bypass; P1 for correctness and contract gates; P2 for quality hygiene such as lint), `required_evidence`, and `failure_decision` (`NO-GO` for P0 and P1, `GO_WITH_CONDITIONS` for P2). Control ids are unique, upper-case and hyphenated, like `SEC-SECRETS-001`. A control that no command can check (tenant isolation, authorization) gets review evidence: `E2_INSPECTION`, `UNVERIFIED`, with a description of what a reviewer or test must show.
5. **Ask, then run the checks** you proposed under rule 3. For each command record exactly what happened:
   - Passed (exit 0): `"type": "E3_AUTOMATED_ANALYSIS"`, `"status": "VERIFIED"`, `"result_status": "PASS"`, `"exit_code": 0`, `"command": ["pnpm","lint"]` (the argument list), `"generated_at"` (current UTC time, ISO 8601), `"freshness": "current"`, `"freshness_status": "current"`, and a `source` naming the repository, the commit from discovery, and how many uncommitted changes there were (if more than 0, say the result covers the working tree, not the commit).
   - Failed (non-zero): `"status": "UNVERIFIED"`, `"result_status": "FAIL"`, the real `exit_code`, and the same fields. Add a finding in the pack's `findings` array: `id`, `rule_id`, `severity` (P1 for typecheck, tests, build or architecture failures, P2 for lint or format), `category`, a `message` stating the count and the first few locations (file and line) but never secrets, `"status": "OPEN"`, `evidence_refs`, and a `remediation`.
   - Not run: `"status": "UNVERIFIED"` with no `result_status`, and a description of how to verify it.
   One evidence record may support several controls only if that command really covers each.
6. **Write the pack** for each repository with the Write tool (for a placeholder pack, Read the file first, then write the filled version over it): `version` `"1.0.0"`; `project` with `id` (the repository name, lower-case slug), `name`, `repository` (the `repositorySlug` from discovery, else `"UNSET"`), `environment` `"development"`; `change` with id `CHG-<REPOSITORY-NAME>-BASELINE` (upper-case, digits and hyphens only), `type` `"configuration"`, a title, `risk_class` `"C"`, `files` `[".governance/governance-pack.json"]`, and a `description` saying this pack was drafted by Claude from repository analysis on today's date at that commit and is **unreviewed**; then `standards`, `controls`, `evidence`, `findings` (only if there are any), and empty `risks`, `decisions`, `exceptions` and `debt`.
7. **Validate and check.** Run `node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" validate <repository>`, then `check <repository>`. If validation fails, fix your draft. Never fix it by weakening a status or deleting a failed record.

## Final report

For each repository give: the decision and exit code exactly as printed; how many controls, and how many evidence records are verified, failed and unverified; every finding; and which commands you ran with their exit codes, so the user can run them again. Then say plainly:

- These packs are **drafted by an AI and unreviewed**. A person must review the controls, severities and every evidence record before relying on them, ideally in a pull request.
- Verified means only "this command passed when run just now". It does not show the software is correct, secure or production-ready.
- NO-GO is the expected first result: it means required evidence is missing or a check failed, not that the code is unfit.
- Next steps: commit each pack on its own branch, then run `/engineering-governance:check --base <default-branch>` in that repository.

Do not describe any repository as production-ready.
