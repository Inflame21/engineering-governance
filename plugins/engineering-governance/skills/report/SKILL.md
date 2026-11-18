---
description: Produce the full governance assessment report for this repository (Markdown by default)
argument-hint: "[--format markdown|json] [--pack path] [--profile path] [--base origin/main] [--run-tools]"
disable-model-invocation: true
allowed-tools: Bash(node *governance.mjs*)
---

# Governance report

Raw output of `governance report` for the current directory. It uses the same assessment and exit codes as `check`: 0 GO, 1 GO WITH CONDITIONS or incomplete analysis, 2 NO-GO, 3 invalid arguments, invalid governance pack or execution error.

```!
node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" report . $ARGUMENTS; echo "[governance exit code: $?]"
```

Present the report to the user as printed, followed by the exit code. Do not change any files, and do not write the report to disk unless the user asks.

- Do not reword the decision, soften a blocker or drop a condition. If you add a short summary, keep it above the report and consistent with it.
- The report carries an assessment ID and a snapshot fingerprint. Mention them: they identify exactly which repository state the decision refers to.
- If the exit code is 3, show the error and explain it. For a missing pack, point to `/engineering-governance:check`, which explains how to get started.
