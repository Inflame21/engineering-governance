---
description: Write one status report per repository, with the decision, controls, findings and which review areas are covered, plus AI suggestions on what to add next
argument-hint: "[repository names to include; default: all found]"
disable-model-invocation: true
allowed-tools: Bash(node *governance.mjs*)
---

# Governance summary

You are producing a status report for each git repository found below. The report is built by the governance CLI from the repository, its governance pack and its saved review reports, so its numbers are facts. Your part is a separate, clearly labelled section of suggestions. Repositories requested: $ARGUMENTS (nothing after the command means every repository found).

Facts from `governance discover` for this folder. The last line is the process exit code.

```!
node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" discover . --json; echo "[governance exit code: $?]"
```

## Rules that cannot be bent

1. **The factual part is not yours to change.** The CLI writes it. Never edit, reword, reorder or correct anything above your own section, and never retype it. If you think a number is wrong, say so in your report to the user and leave the file as it is.
2. **Your section is suggestions, and says so.** Append it after the CLI's text under the heading `## Suggestions (AI-written)`, starting with one line saying these are an AI's suggestions, based only on the facts above and on the repository's own documents, and that nothing in them has been added to the pack.
3. **Ground every suggestion.** Each one names the fact it comes from (an area marked "not reviewed", a "possible gap", a failing control, an open finding) or the repository document it comes from. Do not invent requirements, controls or risks. If you have nothing grounded to suggest for something, say nothing.
4. **Change nothing else.** Do not edit the pack, source, config or git state. Do not commit. The only files you touch are the summary files the CLI created, and only by appending your section.
5. **Never describe a repository as production-ready or compliant.**

## What to do

1. **Scope.** Take each repository from the discovery above (or only those named in `$ARGUMENTS`). The summary needs a repository's top level, so it works per repository, not on the parent folder. If there are none, stop and say so.
2. **Build each summary.** For each repository run `node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" summarize <repository> --write`. It prints the path of the new file, `.governance/reports/summary-<date>.md`, which it never overwrites. A repository with no pack still gets a summary, saying so. If the command fails, show the error and continue with the next repository.
3. **Read each summary file**, and also what you need to make good suggestions: the repository's CLAUDE.md, AGENTS.md and README if present, the list of standards in `${CLAUDE_PLUGIN_ROOT}/templates/standards-index.json`, and the review areas in `${CLAUDE_PLUGIN_ROOT}/templates/review-areas.json`.
4. **Append your suggestions** to each summary file with the Edit tool, after the CLI's last line. Cover only what the facts support, in this order, leaving out any group that has nothing:
   - **Do first.** Failing or unverified controls and open P0 or P1 findings, with the command or action that would address each.
   - **Reviews to run.** Areas marked "not reviewed", in order of importance for this repository, as `/engineering-governance:review <area> <repository>`. Prefer areas with a "possible gap" or open findings.
   - **Controls the pack does not have.** For each "possible gap" and each area with no controls, propose one or two controls: a title, the standard from the index, a proposed severity, and what evidence would show it. Mark them as proposals for the owner to decide.
   - **Other gaps the repository's own documents point to**, with the document and the passage.
   Keep it short: at most 10 suggestions in total, most valuable first.
5. **Do not run reviews or add controls yourself.** Suggest them.

## Final report

For each repository give the path of its summary file, the decision exactly as the summary shows it, how many areas have been reviewed of eight, the number of open findings by severity, and your top three suggestions. Then say plainly that the factual part comes from the CLI and the suggestions are an AI's, and that a person should review both before acting.
