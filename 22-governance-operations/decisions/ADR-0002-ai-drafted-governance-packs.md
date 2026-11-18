# ADR-0002 — AI-Drafted Governance Packs (`/engineering-governance:setup`)

**Status:** ACCEPTED 2026-11-18 on the repository owner's decisions (evidence level and layout below). Implemented; not yet run in a live Claude Code session.
**Standards applied:** AI-010 (AI output is verified, not trusted), GOV-023 (evidence and traceability), SEC-007 (secrets, untrusted code), GIT-011.
**Related:** ADR-0001 (scanners); DEBT-GOV-009 (scanner evidence is not linked to controls).

## 1. Problem

The first plugin design made the user write the governance pack by hand: `init` creates an empty pack, and the user adds controls and evidence. The owner wants the opposite experience: install the plugin, run one command, and have Claude analyze the repositories and produce the packs.

The difficulty is integrity. The engine takes a declared `VERIFIED` evidence status at face value (observed: editing two statuses by hand moved a NO-GO to GO WITH CONDITIONS with nothing checked). A pack that an AI types in, with the AI also typing the evidence, is the AI's claim, not proof.

## 2. Decision

Add `/engineering-governance:setup`. Claude drafts a pack for each git repository found in the folder, then, with the user's permission, runs the repository's own checks and records what really happened.

Owner's choices:

- **Evidence:** draft, then run the project's own checks. (Rejected: draft only with nothing verified; and a tool-collected design, kept as a follow-up.)
- **Layout:** one pack per git repository found, inside that repository. (Rejected: a single pack at the folder root, which cannot verify changed files when the folder is not a git repository.)

Parts:

1. **`governance discover <folder>`** (CLI, deterministic, read-only). Finds git repositories (three levels deep; never follows symlinks, never enters `node_modules` or a repository it already found) and reports, for each: git branch, head commit, uncommitted changes, origin (credentials stripped), package manager, `package.json` scripts, single-line CI `run:` commands, guidance documents and whether a pack already exists. Run by `setup` so repository facts come from code, not from the model.
2. **The `setup` command** (plugin skill, explicit-only). Its instructions bind Claude to the rules in section 3 and give it the exact evidence recipe.
3. **`templates/standards-index.json`**: the framework's standard ids, titles and files, so controls cite real standards. A test checks that every entry matches its document.

## 3. Integrity rules (in the instructions and tested)

- Evidence is `VERIFIED` only for a command Claude ran in the session and saw exit 0. It records `command`, `exit_code`, `result_status`, `generated_at`, and the commit and uncommitted-change count in `source`. A failed run is `UNVERIFIED` with `result_status: FAIL` and a finding. Anything not run is `UNVERIFIED`.
- The engine already rejects a pack whose evidence status is stronger than its `result_status` (`EVIDENCE_STATUS_OVERSTATED`). A test builds a pack from the recipe and confirms a passing record is accepted, a failed run recorded as `UNVERIFIED` is accepted, and a failed run recorded as `VERIFIED` is rejected.
- Never overwrite an existing pack; write only `.governance/governance-pack.json`; change no source, config, CI or git state; do not commit.
- Ask before running anything and list the exact commands. Run checks only (lint, typecheck, tests, architecture or contract validation, format check, build). Never run dev servers, bootstrap, migrations, deploys, publishing, installs, deletes, or Docker or database commands; evidence that needs them stays `UNVERIFIED`.
- Controls come from the repository's own stated rules and from what its scripts and CI can check, tied to a real standard. Severities are proposals.
- The pack says it was drafted by Claude and is unreviewed. The final report says so, and never calls a repository production-ready.
- `discover` strips credentials from the origin URL, so a token in a remote can never be copied into a pack. A test asserts this.

## 4. What this does not guarantee

- The CLI checks that a pack is internally consistent. It cannot check that a command was really run or that the recorded exit code is real. A model can mis-record, or record a check that does not cover the control it is attached to. Recorded as DEBT-GOV-013.
- Mitigations: the user approves the commands first; each record names its command so it can be re-run; the pack is unreviewed until a person approves it in a pull request; the change declares only the pack file, so a mismatch shows up under `check --base`.
- Running a project's scripts executes that project's code. Claude Code's own permission prompts still apply, and `allowed-tools` pre-approves only the governance CLI, not the project's scripts.
- Draft controls reflect the model's reading of the repository. They are a starting point for review, not an approved control set.

## 5. Alternatives considered

- **Tool-collected evidence.** The CLI runs declared checks itself and writes the evidence, so no model ever types `VERIFIED`. Most trustworthy, but it runs commands taken from repository files, needs an opt-in flag and a safety design, and depends on settling DEBT-GOV-009. Deferred: the preferred direction if packs are to be relied on.
- **Draft only.** Safest, but leaves the user to collect all proof by hand, which is what they asked to avoid.

## 6. Verification

Unit tests: `discover` (real git repositories in temporary folders, including a token in a remote URL, symlinks, nested repositories and dependency folders), the evidence recipe through the standalone bundle, the standards index against the documents, and the command's required rules. Run against the owner's seven AppOS repositories read-only: all seven were found with correct scripts, CI commands and credential-free remotes.

Not verified: `setup` has not been run in a live Claude Code session, so how well Claude follows the instructions, and the quality of the drafted controls, are unobserved.
