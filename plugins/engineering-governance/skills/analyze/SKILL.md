---
description: Inspect this repository's structure (languages, frameworks, packages, architecture) without needing a governance pack
argument-hint: "[--profile path] [--base origin/main] [--run-tools] [--json]"
disable-model-invocation: true
allowed-tools: Bash(node *governance.mjs*)
---

# Governance analyze

Raw output of `governance analyze` for the current directory. The last line is the process exit code: 0 complete analysis, 1 incomplete (partial) analysis, 3 invalid arguments or execution error.

```!
node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" analyze . $ARGUMENTS; echo "[governance exit code: $?]"
```

Report this to the user. Do not change any files.

- Summarize what was detected: languages, frameworks, packages or workspaces, test systems, and the system graph.
- State the analysis status exactly as printed. If it is PARTIAL, say why from the output (unsupported languages, unreadable files, scan limits, tools that were unavailable). Partial analysis is a limitation, not a pass.
- Treat detection as heuristic. A directory named `domain/` or a manifest entry is a hint, not proof of architecture or of a secure configuration.
- If an architecture profile was given with `--profile`, list any boundary findings with their evidence.
- This command does not make a governance decision. Tell the user that `/engineering-governance:check` does, and that it needs a governance pack.
- If the exit code is 3, show the error message and the likely cause. Do not retry with different options unless the user asks.
