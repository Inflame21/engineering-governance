# Engineering Governance plugin for Claude Code

Check a repository's structure and assess it against the Engineering Governance Framework from inside Claude Code. The plugin bundles the governance CLI, so nothing else has to be built or cloned.

**Status: version 0.2.0, development.** It has not been exercised in a live Claude Code session yet (see [Limits](#limits)). Its decisions are one piece of evidence, not a production-readiness approval.

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

Nothing runs automatically. Each command runs only when you type it, against the directory Claude Code is working in. `init` is the only command that writes a file, and it never overwrites one.

| Command | What it does |
|---|---|
| `/engineering-governance:init` | Create `.governance/governance-pack.json`: a pack that **asserts nothing** (no controls, evidence, risks or decisions). Never overwrites an existing file. `check` returns NO-GO until real controls are added. |
| `/engineering-governance:analyze` | Inspect the repository's structure: languages, frameworks, packages, architecture and analyzer coverage. Needs no governance pack. |
| `/engineering-governance:check` | Assess the repository and derive **GO**, **GO WITH CONDITIONS** or **NO-GO** with the evidence behind it. Needs a governance pack. |
| `/engineering-governance:report` | The same assessment as `check`, rendered as a full Markdown (or JSON) report. |
| `/engineering-governance:validate` | Validate the governance pack, architecture profile, project registry, control catalog or authority policy against their schemas. No analysis. |

Options are passed through, for example `/engineering-governance:check --base origin/main --run-tools`. The commands accept the options listed by the CLI's `--help`.

Each command prints the CLI's raw output and its exit code (0 GO, 1 conditions or incomplete analysis, 2 NO-GO, 3 invalid input or error), and Claude then summarizes it. The instructions tell Claude not to change files, not to soften a decision and never to call software production-ready.

## First run

1. Run `/engineering-governance:analyze`. It works on any repository and shows what the framework can and cannot see.
2. To get a decision, the repository needs a governance pack. Run `/engineering-governance:init` to create `.governance/governance-pack.json`. Options: `--id`, `--name`, `--repo owner/name`, `--environment`, and `--pack` for another path.
3. The new pack asserts nothing, so `/engineering-governance:check` returns **NO-GO** ("no control applied, nothing was evaluated") until the project owner adds the controls that apply, with evidence from real checks and reviews. Fill in `project.repository` (it starts as `UNSET`) and the `change` being assessed. A pack that merely validates is not an approved one.
4. Run `/engineering-governance:validate`, then `/engineering-governance:check`.

Without a pack, `check` exits with code 3 and says so. It never reports a decision for a project it could not assess.

`templates/` holds a worked example (`governance-pack.example.json`, a fictional bulk-import change) and an example architecture profile. They show what a populated pack and profile look like. **Do not copy the example pack into a real project:** its evidence is declared, not real, and the engine takes declared evidence at face value.

## Limits

- **Not yet run in a live session.** The manifest and marketplace pass `claude plugin validate`, and the bundled CLI is tested from a clean directory. That `${CLAUDE_PLUGIN_ROOT}` and `$ARGUMENTS` are substituted into the commands as documented has not been observed. If a command reports that it cannot find `governance.mjs`, that is the cause; please report it.
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
