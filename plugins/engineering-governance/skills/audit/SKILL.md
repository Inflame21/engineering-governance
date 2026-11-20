---
description: Go through a whole repository and write an ordered set of Markdown reports: what it is, a review of each area (security, architecture, api, data, testing, cicd, frontend, observability), and a prioritized plan of fixes and improvements
argument-hint: "[repository] [--areas security,api,...]"
disable-model-invocation: true
allowed-tools: Bash(node *governance.mjs*)
---

# Governance audit

You are producing a complete, ordered set of Markdown reports for a repository, so the user does not have to run anything step by step. Request: $ARGUMENTS (a repository name, and optionally `--areas` followed by a comma-separated list; nothing means every repository found and every applicable area).

Facts from `governance discover` for this folder. The last line is the process exit code.

```!
node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" discover . --json; echo "[governance exit code: $?]"
```

## Rules that cannot be bent

1. **Only report what you read.** Every statement about the repository cites the file you read. Every finding quotes the code with a `file:line` you read just before citing. If you cannot show it, it is a lead, not a finding. State what you did not read.
2. **No claim of compliance, completeness or readiness.** A review reads a sample of an area. Say how much you read against how much there was. Never call the repository production-ready, compliant or secure.
3. **You are a reviewer, not an editor.** Change no source, config, CI or git state, and do not commit. You write only files under `<repository>/.governance/reports/`, and you append findings and one evidence record per review to the pack, exactly as the review procedure describes. Never modify or delete an existing pack record.
4. **Never overwrite a file.** Before writing any report, check the name is free; if it exists, use `-2`, `-3`. Never print a secret; redact the value. No exploit code.
5. **Do not read** `.env` files, key files, `node_modules`, build output or lockfile bodies beyond what a finding needs.
6. **Read-only commands only.** Searching and reading are fine. Do not run the project's scripts, installs, servers or anything that changes state.
7. **Run areas one after another, never in parallel.** They all append to the same pack.

## What to do

1. **Plan and ask.** From the discovery above choose the repository (the one named, or ask if several and none was named; a repository with `existingPack: false`, or with `packIsPlaceholder: true` (the empty file `init` writes), still gets reports, but say so and suggest `/engineering-governance:setup` to fill the pack). Choose the areas: those named after `--areas`, otherwise all eight in `${CLAUDE_PLUGIN_ROOT}/templates/review-areas.json`, skipping any area with nothing in scope (for example `frontend` with no UI code, `data` with no database or migrations); you will record why. Then tell the user what you will produce and that **this reads a lot of code, can take a long time and uses a lot of tokens**, list the reports in the order below, and **wait for a yes**. Let them narrow the areas.
2. **Repository documentation.** Read the repository's README, CLAUDE.md, AGENTS.md, docs, manifests and top-level layout, and run `node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" analyze <repository> --json` for a map. Write `.governance/reports/overview-<YYYY-MM-DD>.md` with these sections, each statement citing the file it comes from:
   - **What this is**: its purpose, from its own documents.
   - **Technology**: languages, frameworks, package manager, data stores, and key dependencies.
   - **Structure**: the top-level layout and each module or directory with a one-line purpose, and the entry points.
   - **How it is built, tested and run**: from the scripts and CI files (read, not run).
   - **CI/CD**: what the workflows do and when.
   - **Architecture as documented and as found**: what its documents say, what the code shows, and any difference between them.
   - **Documentation present and missing.**
   - **Open questions**: what you could not determine.
3. **Review each area, in this order:** security, architecture, api, data, testing, cicd, frontend, observability (skipping the ones you decided to skip). For each, use the Agent tool to start one subagent at a time, so each gets a fresh context, and give it this task: *read `${CLAUDE_PLUGIN_ROOT}/skills/review/SKILL.md` and carry out its rules and steps 2 to 7 for the area `<area>` of repository `<repository>`, without asking the user questions; return the path of the report, the counts by severity, the three most important findings with `file:line`, and the coverage (files read of files in scope).* If the Agent tool is not available, do each area yourself, one at a time, following the same procedure. Keep going if one area fails, and record the failure.
4. **Build the summary.** Run `node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" summarize <repository> --write`. It never overwrites, and its tables are computed by the tool.
5. **Write the entry report** `.governance/reports/audit-<YYYY-MM-DD>.md`. It is the file the user opens first, and it links the others with relative links in reading order. Sections:
   1. **Title and metadata**: repository, commit, uncommitted changes, date, standards used, and **Reviewer: Claude (AI). Not reviewed by a person.**
   2. **Executive summary**: the decision from the summary exactly as it shows it, open findings by severity, the five most important issues in plain language, and one paragraph on the overall picture, grounded in the reports.
   3. **Reading order**: a table of every file produced (overview, each area review, summary), what each contains, and its link.
   4. **What this repository is**: a short version of the overview.
   5. **Findings by area**: a table of area, reviewed or skipped (with the reason), findings by severity, coverage, and link.
   6. **Improvement plan**, from the findings in the area reports and the summary only:
      - **Fix now (P0 and P1)**: for each, the finding id, what, where (`file:line`), why (standard and risk), how to fix it, and a link to the detail.
      - **Next (P2 and P3)**, grouped by theme.
      - **Quick wins**: only those a finding justifies, with the reason they are cheap.
      - **What else to add**: controls, tests, checks, CI gates and documentation the reports show are missing, each tied to the fact or report it comes from. Say these are suggestions.
   7. **Coverage and limits**: files read against files in scope for each area, areas skipped and why, and what an AI review cannot establish.
6. **Final message to the user.** Give the path of the audit report first, then the overview, the decision, open findings by severity, the three most important issues, and the list of files in reading order. Then say plainly: this is an AI review, a sample, and may be wrong or miss things; open P0 and P1 findings count in `check` until a person resolves them; and the reports are new, uncommitted files the user should read before committing, because they quote real code. Finally ask: "Want documentation for this repository too, for developers and for users? Run `/engineering-governance:docs`." Do not write any documentation yourself.
