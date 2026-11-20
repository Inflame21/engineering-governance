# Engineering Governance plugin for Claude Code

Check a repository's structure and assess it against the Engineering Governance Framework from inside Claude Code. The plugin bundles the governance CLI, so nothing else has to be built or cloned.

## Try this first

After installing, open Claude Code in your repository's root folder and run:

1. `/engineering-governance:start` for a short explanation and the order to run things in (it runs nothing).
2. `/engineering-governance:analyze` to see what the plugin can detect in your repository (changes nothing).
3. `/engineering-governance:audit` for a full set of Markdown reports on what to fix, written to `.governance/reports/`.

**Status: version 0.12.0, development.** `validate` and `check` have been seen running in a live Claude Code session on a real project (2026-11-18); the other commands, including `setup` and `review`, and passing options such as `--base` have not (see [Limits](#limits)). Its decisions are one piece of evidence, not a production-readiness approval.

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

Nothing runs automatically. Each command runs only when you type it, against the directory Claude Code is working in. `audit`, `docs`, `documentation`, `quality`, `security`, `release`, `operations`, `setup`, `review`, `summary`, `report` and `init` are the only commands that write files, and none overwrites one. `setup` runs your project's scripts only after you say yes.

| Command | What it does |
|---|---|
| `/engineering-governance:start` | New here? Prints what the plugin does and which command to run first. Runs nothing and writes nothing. |
| `/engineering-governance:audit [repository]` | **Start here for reports.** Goes through a whole repository and writes an ordered set of Markdown files to `.governance/reports/`, starting from `audit-<date>.md`: documentation of what the repository is (`overview-<date>.md`), a review of each applicable area (`review-<area>-<date>.md`), a status summary, and a prioritized plan of fixes and improvements with what, where, why and how for each. It asks before starting, because it reads a lot of code. |
| `/engineering-governance:docs [repository]` | Goes through a repository feature by feature and writes documentation for **developers** (architecture, how each feature works, setup, how to extend it) and for **users** (what each feature does, how to use it, troubleshooting) to `.governance/docs/<date>/`, starting from `index.md`. It lists the features and asks before starting, because it reads a lot of code. AI drafts: every page says so, and anything it could not confirm from the code is marked `Not confirmed:`. `audit` offers it when it finishes. |
| `/engineering-governance:documentation <type>` | Writes documents from the code. Types: `docs` (the same as `/docs`), `runbook` (deploy, rollback, health, failures, alerts; to `.governance/runbooks/`), `adr` (architecture decision records inferred from the code; to `.governance/adr/`), `onboarding` (a first-day guide for new contributors; to `.governance/onboarding/`) and `api` (an endpoint-by-endpoint API reference from routes, schemas and tests, calling nothing; to `.governance/api-reference/`). With no type it lists them. |
| `/engineering-governance:quality <type>` | `debt` (a technical debt register with proposed severities and blank owners, to `.governance/debt/`) or `test-plan` (what is tested, what is not and what to test first, to `.governance/test-plans/`; nothing is run). Neither changes the pack. |
| `/engineering-governance:security threat-model` | Writes a threat model (assets, actors, entry points, trust boundaries, threats and the controls found) to `.governance/security/`. Nothing is tested. |
| `/engineering-governance:release <type>` | `plan` (checklist, migrations, rollback), `readiness` (an evidence matrix, never a GO/NO-GO) or `changelog` (notes drafted from git history), written to `.governance/release/`. |
| `/engineering-governance:operations <type>` | `incident` (a blameless review built from what you tell it, to `.governance/incidents/`) or `exception` (a draft exception request to `.governance/exception-drafts/`; it records nothing in the pack). |
| `/engineering-governance:setup` | Finds the git repositories in the folder and drafts a governance pack for each. With your permission it runs each repository's own checks (lint, typecheck, tests, build) and records the real results as evidence. It also fills in the empty pack that `init` wrote, in place, but never touches a pack that has content. The packs are AI-drafted and need human review. |
| `/engineering-governance:review <area>` | Reviews one area of a repository (security, architecture, api, data, testing, cicd, frontend, observability) against the governance standards. Writes a report with what, where, why, how to confirm and a fix for each finding to `.governance/reports/`, and adds the findings to the pack so they count in `check`. AI-written: findings are leads for a person to confirm. |
| `/engineering-governance:summary` | Writes **one status report per repository** to `.governance/reports/summary-<date>.md`: the decision, every control and finding, and a table of which of the eight review areas have been reviewed, with possible gaps flagged. The numbers come from the CLI. Claude then appends clearly labelled AI suggestions on what to review or add next. |
| `/engineering-governance:init` | Create `.governance/governance-pack.json`: a pack that **asserts nothing** (no controls, evidence, risks or decisions). Never overwrites an existing file. `check` returns NO-GO until real controls are added. To have Claude fill it in from your files instead of by hand, run `/engineering-governance:setup` afterwards. |
| `/engineering-governance:analyze` | Inspect the repository's structure: languages, frameworks, packages, architecture and analyzer coverage. Needs no governance pack. |
| `/engineering-governance:check` | Assess the repository and derive **GO**, **GO WITH CONDITIONS** or **NO-GO** with the evidence behind it. Needs a governance pack. |
| `/engineering-governance:report` | The same assessment as `check`, rendered as a full Markdown (or JSON) report. |
| `/engineering-governance:validate` | Validate the governance pack, architecture profile, project registry, control catalog or authority policy against their schemas. No analysis. |

Options are passed through, for example `/engineering-governance:check --base origin/main --run-tools`. The commands accept the options listed by the CLI's `--help`.

Each command prints the CLI's raw output and its exit code (0 GO, 1 conditions or incomplete analysis, 2 NO-GO, 3 invalid input or error), and Claude then summarizes it. The instructions tell Claude not to change files, not to soften a decision and never to call software production-ready.

## First run

**For a full set of reports:** run `/engineering-governance:audit` in your repository. It documents what the repository is, reviews each area, and leaves you with Markdown reports in `.governance/reports/`; open `audit-<date>.md` first. It asks before starting because it reads a lot and can take a long time.

**For a governance pack with real check results:** run `/engineering-governance:setup` in your project folder (or in a folder that holds several repositories). Claude analyzes the repositories, proposes the checks it wants to run and waits for your yes, runs them, and writes `.governance/governance-pack.json` in each repository. Read its report, then review each pack before relying on it: the controls and severities are proposals, and a check that passed was verified only as of the moment it ran. Then run `/engineering-governance:review security` (or another area) for a code-level report. The manual route follows.

1. Run `/engineering-governance:analyze`. It works on any repository and shows what the framework can and cannot see.
2. To get a decision, the repository needs a governance pack. Run `/engineering-governance:init` to create `.governance/governance-pack.json`. Options: `--id`, `--name`, `--repo owner/name`, `--environment`, and `--pack` for another path.
3. The new pack asserts nothing, so `/engineering-governance:check` returns **NO-GO** ("no control applied, nothing was evaluated") until the project owner adds the controls that apply, with evidence from real checks and reviews. Fill in `project.repository` (it starts as `UNSET`) and the `change` being assessed. A pack that merely validates is not an approved one.
4. Run `/engineering-governance:validate`, then `/engineering-governance:check`.

Without a pack, `check` exits with code 3 and says so. It never reports a decision for a project it could not assess.

`templates/` holds a worked example (`governance-pack.example.json`, a fictional bulk-import change) and an example architecture profile. They show what a populated pack and profile look like. **Do not copy the example pack into a real project:** its evidence is declared, not real, and the engine takes declared evidence at face value.

## Limits

- **Only partly seen in a live session.** `validate` and `check` ran from an installed plugin in Claude Code (so `${CLAUDE_PLUGIN_ROOT}` is substituted and the CLI runs), as reported by a user. The other commands use the same mechanism but have not been seen live, and passing options through `$ARGUMENTS` (for example `--base main`) has not been observed. If a command reports that it cannot find `governance.mjs`, please report it.
- **`audit` is long and samples.** It runs a review for each area one after another, so it can take a long time and use many tokens, and each review reads a sample of its area and says how much. It has not been run in a live session. Its reports are new, uncommitted files that quote real code: read them before committing (DEBT-GOV-016, ADR-0004).
- **`summary` separates facts from suggestions.** Its tables come from the CLI and are computed from the repository, the pack and the saved review reports. The suggestions section is AI-written and nothing in it is added to the pack. "Possible gap" is a prompt to check, based on directory names such as `migrations/`, not a verdict.
- **`setup` and `review` are AI-written.** The CLI checks that a pack is consistent but cannot check that Claude really ran a command or read a file, so review each pack and report, and re-run the recorded commands (DEBT-GOV-013, DEBT-GOV-014, ADR-0002, ADR-0003). A review reads a sample of a large repository, one area at a time, and says how much it covered.
- **The commands run `node` on your machine.** Claude Code asks for permission unless you allow `Bash(node *governance.mjs*)`.
- **The analysis runs in the current directory.** Start Claude Code at the repository root.
- Scanner results do not feed any governance control yet (DEBT-GOV-009 in the debt register).
- Licensed under the [PolyForm Shield License 1.0.0](LICENSE): use, modify and redistribute for any purpose except providing a competing product. It is source-available, not open source. Third-party notices for the bundled code are in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## Maintaining the plugin

`bundle/governance.mjs` is generated from the CLI sources and committed, because a marketplace install copies only this directory. After changing the CLI, engine, analyzer or schemas:

```
cd 22-governance-operations/cli
npm ci
npm run bundle:plugin
```

The CLI test suite fails if the committed bundle is out of date, and checks that it runs standalone from an empty directory. Keep `plugin.json`, `marketplace.json` and the CLI's `VERSION` in step; a test checks that too.

**Bump the version whenever the plugin's behavior changes** (a new or changed command, skill text or CLI feature). Claude Code caches an installed plugin by its version, so a copy at the same version looks up to date and never receives the change, however many commits have landed. After a bump, users refresh the marketplace and update the plugin from `/plugin`.

## What changed in 0.12.0

A new type (not run in a live session yet): `/engineering-governance:documentation api` writes an API reference to `.governance/api-reference/`, one file per resource group plus an overview: each endpoint's inputs, responses, errors and the authentication the code requires, with a cited example only where a test or shipped spec has one. It never calls an endpoint or starts a server, treats any OpenAPI or similar file as a claim to check against the handlers, and lists the differences and other inconsistencies as leads for a person to confirm. No change to the analysis, the decision or any other command.

## What changed in 0.11.0

Two more types (not run in a live session yet): `/engineering-governance:documentation onboarding` writes a first-day guide for new contributors to `.governance/onboarding/`, and `/engineering-governance:quality test-plan` writes a test plan to `.governance/test-plans/`. `test-plan` reads the tests and the CI files and runs nothing, so it never reports coverage numbers or pass rates; it says what it did not measure and how to measure it. No change to the analysis, the decision or any other command.

## What changed in 0.10.0

Three more grouped commands (not run in a live session yet): `/engineering-governance:security threat-model` (`.governance/security/`), `/engineering-governance:release plan|readiness|changelog` (`.governance/release/`) and `/engineering-governance:operations incident|exception` (`.governance/incidents/` and `.governance/exception-drafts/`). `release readiness` is an evidence matrix only and never says GO or NO-GO; `check` still decides. `operations exception` writes a draft for a person to review and shows the `exception request` command to run afterwards; it records nothing itself. `operations incident` depends on what you tell it, and labels those facts as provided by you. The shared rules in `templates/artifact-rules.md` cover all of them. No change to the analysis, the decision or any other command.

## What changed in 0.9.0

Commands that write a kind of document are now grouped, with the type as an argument: `/engineering-governance:documentation docs|runbook|adr` and `/engineering-governance:quality debt` (not run in a live session yet). `runbook` writes operational runbooks to `.governance/runbooks/`, `adr` writes architecture decision records inferred from the code to `.governance/adr/`, and `debt` writes a technical debt register to `.governance/debt/`. All of them follow shared rules in `templates/artifact-rules.md` (cite what was read, mark as a draft, never invent, write only new files). `/docs` still works as before. No change to the analysis, the decision or any other command.

## What changed in 0.8.0

A new `/engineering-governance:docs` command that writes developer and user documentation feature by feature (not run in a live session yet), and `audit` now ends by offering it. No change to the analysis, the decision or any other command.

## What changed in 0.7.1

A new `/engineering-governance:start` command that explains the plugin and the order to run things in, plain-language plugin and marketplace descriptions, and a "Try this first" section in this README. No change to the analysis, the decision or any other command.

## What changed in 0.7.0

Since 0.6.0: `governance history`, `diff`, `checkpoint` and `check --record` (a hash-chained assessment history with signed checkpoints); `exception request|approve|renew|expire|list` with GPG-signed approvals; technical debt and incident records that feed the decision and the reports; `governance architecture` (a reference of architecture styles, which one a repository resembles and what it could follow); Go support; scanner adapters checked against real tool output; and **`setup` now fills in the empty pack that `init` writes**, instead of skipping it.
