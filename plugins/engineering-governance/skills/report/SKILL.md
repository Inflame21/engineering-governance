---
description: Produce the full governance assessment report for this repository and save it as a Markdown file
argument-hint: "[--pack path] [--profile path] [--base origin/main] [--run-tools]"
disable-model-invocation: true
allowed-tools: Bash(node *governance.mjs*)
---

# Governance report

Raw output of `governance report` for the current directory, which also saves the report to `.governance/reports/report-<date>.md` (never overwriting; a second one the same day is `-2`). It uses the same assessment and exit codes as `check`: 0 GO, 1 GO WITH CONDITIONS or incomplete analysis, 2 NO-GO, 3 invalid arguments, invalid governance pack or execution error.

```!
node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" report . --write $ARGUMENTS; echo "[governance exit code: $?]"
```

Present the report to the user as printed, followed by the exit code, and tell them the path of the saved file (the `Wrote ...` line). Do not change any other file. `--format json` cannot be combined with saving; if the user wants JSON, run it without this command.

- Do not reword the decision, soften a blocker or drop a condition. If you add a short summary, keep it above the report and consistent with it.
- The report carries an assessment ID and a snapshot fingerprint. Mention them: they identify exactly which repository state the decision refers to.
- If the exit code is 3, show the error and explain it. For a missing pack, point to `/engineering-governance:check`, which explains how to get started.
