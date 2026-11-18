# Engineering Governance plugin for Claude Code

Check a repository's structure and assess it against the Engineering Governance Framework from inside Claude Code. The plugin bundles the governance CLI, so nothing else has to be built or cloned.

**Status: version 0.5.0, development.** `validate` and `check` have been seen running in a live Claude Code session on a real project (2026-11-18); the other commands, including `setup` and `review`, and passing options such as `--base` have not (see [Limits](#limits)). Its decisions are one piece of evidence, not a production-readiness approval.

## Requirements

- Claude Code.
- Node.js 22 or later on your `PATH` (CI runs Node 22).
- Optional, for `--run-tools`: `osv-scanner`, `gitleaks` and `semgrep` on your `PATH`. See the CLI README for what each one does and what happens when one is missing.

## Install

From GitHub, once this repository is published there:

```
/plugin marketplace add Inflame21/engineering-governance
/plugin install engineering-governance@engineering-governance
```

From a local clone, to try it without installing:

```
claude --plugin-dir ./plugins/engineering-governance
```

## Commands

Nothing runs automatically. Each command runs only when you type it, against the directory Claude Code is working in. `setup`, `review`, `summary` and `init` are the only commands that write files, and none overwrites one. `setup` runs your project's scripts only after you say yes.

| Command | What it does |
|---|---|
| `/engineering-governance:setup` | **Start here.** Finds the git repositories in the folder and drafts a governance pack for each. With your permission it runs each repository's own checks (lint, typecheck, tests, build) and records the real results as evidence. Never overwrites an existing pack. The packs are AI-drafted and need human review. |
| `/engineering-governance:review <area>` | Reviews one area of a repository (security, architecture, api, data, testing, cicd, frontend, observability) against the governance standards. Writes a report with what, where, why, how to confirm and a fix for each finding to `.governance/reports/`, and adds the findings to the pack so they count in `check`. AI-written: findings are leads for a person to confirm. |
| `/engineering-governance:summary` | Writes **one status report per repository** to `.governance/reports/summary-<date>.md`: the decision, every control and finding, and a table of which of the eight review areas have been reviewed, with possible gaps flagged. The numbers come from the CLI. Claude then appends clearly labelled AI suggestions on what to review or add next. |
| `/engineering-governance:init` | Create `.governance/governance-pack.json`: a pack that **asserts nothing** (no controls, evidence, risks or decisions). Never overwrites an existing file. `check` returns NO-GO until real controls are added. |
| `/engineering-governance:analyze` | Inspect the repository's structure: languages, frameworks, packages, architecture and analyzer coverage. Needs no governance pack. |
| `/engineering-governance:check` | Assess the repository and derive **GO**, **GO WITH CONDITIONS** or **NO-GO** with the evidence behind it. Needs a governance pack. |
| `/engineering-governance:report` | The same assessment as `check`, rendered as a full Markdown (or JSON) report. |
| `/engineering-governance:validate` | Validate the governance pack, architecture profile, project registry, control catalog or authority policy against their schemas. No analysis. |

Options are passed through, for example `/engineering-governance:check --base origin/main --run-tools`. The commands accept the options listed by the CLI's `--help`.

Each command prints the CLI's raw output and its exit code (0 GO, 1 conditions or incomplete analysis, 2 NO-GO, 3 invalid input or error), and Claude then summarizes it. The instructions tell Claude not to change files, not to soften a decision and never to call software production-ready.

## First run

**Quickest:** run `/engineering-governance:setup` in your project folder (or in a folder that holds several repositories). Claude analyzes the repositories, proposes the checks it wants to run and waits for your yes, runs them, and writes `.governance/governance-pack.json` in each repository. Read its report, then review each pack before relying on it: the controls and severities are proposals, and a check that passed was verified only as of the moment it ran. Then run `/engineering-governance:review security` (or another area) for a code-level report. The manual route follows.

1. Run `/engineering-governance:analyze`. It works on any repository and shows what the framework can and cannot see.
2. To get a decision, the repository needs a governance pack. Run `/engineering-governance:init` to create `.governance/governance-pack.json`. Options: `--id`, `--name`, `--repo owner/name`, `--environment`, and `--pack` for another path.
3. The new pack asserts nothing, so `/engineering-governance:check` returns **NO-GO** ("no control applied, nothing was evaluated") until the project owner adds the controls that apply, with evidence from real checks and reviews. Fill in `project.repository` (it starts as `UNSET`) and the `change` being assessed. A pack that merely validates is not an approved one.
4. Run `/engineering-governance:validate`, then `/engineering-governance:check`.

Without a pack, `check` exits with code 3 and says so. It never reports a decision for a project it could not assess.

`templates/` holds a worked example (`governance-pack.example.json`, a fictional bulk-import change) and an example architecture profile. They show what a populated pack and profile look like. **Do not copy the example pack into a real project:** its evidence is declared, not real, and the engine takes declared evidence at face value.

## Limits

- **Only partly seen in a live session.** `validate` and `check` ran from an installed plugin in Claude Code (so `${CLAUDE_PLUGIN_ROOT}` is substituted and the CLI runs), as reported by a user. The other commands use the same mechanism but have not been seen live, and passing options through `$ARGUMENTS` (for example `--base main`) has not been observed. If a command reports that it cannot find `governance.mjs`, please report it.
- **`summary` separates facts from suggestions.** Its tables come from the CLI and are computed from the repository, the pack and the saved review reports. The suggestions section is AI-written and nothing in it is added to the pack. "Possible gap" is a prompt to check, based on directory names such as `migrations/`, not a verdict.
- **`setup` and `review` are AI-written.** The CLI checks that a pack is consistent but cannot check that Claude really ran a command or read a file, so review each pack and report, and re-run the recorded commands (DEBT-GOV-013, DEBT-GOV-014, ADR-0002, ADR-0003). A review reads a sample of a large repository, one area at a time, and says how much it covered.
- **The commands run `node` on your machine.** Claude Code asks for permission unless you allow `Bash(node *governance.mjs*)`.
- **The analysis runs in the current directory.** Start Claude Code at the repository root.
- Scanner results do not feed any governance control yet (DEBT-GOV-009 in the debt register).
- Licensed under the custom [Engineering Governance Use-and-Adapt License](LICENSE): use for any purpose and modify for your own use, no redistribution. It is not open source. Third-party notices for the bundled code are in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## Maintaining the plugin

`bundle/governance.mjs` is generated from the CLI sources and committed, because a marketplace install copies only this directory. After changing the CLI, engine, analyzer or schemas:

```
cd 22-governance-operations/cli
npm ci
npm run bundle:plugin
```

The CLI test suite fails if the committed bundle is out of date, and checks that it runs standalone from an empty directory. Keep `plugin.json`, `marketplace.json` and the CLI's `VERSION` in step; a test checks that too.
