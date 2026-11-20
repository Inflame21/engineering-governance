---
description: Quality registers drafted from the code. Currently one type, debt: a technical debt register. Run with no type to see what is available
argument-hint: "[debt] [repository]"
disable-model-invocation: true
allowed-tools: Bash(node *governance.mjs*), Bash(git log *), Bash(git blame *)
---

# Governance quality

You write quality artifacts for a repository, drafted from its code. Request: $ARGUMENTS (a type, then optionally a repository name).

Facts from `governance discover` for this folder. The last line is the process exit code.

```!
node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" discover . --json; echo "[governance exit code: $?]"
```

## Choose the type

| Type | What it writes | Output folder |
|---|---|---|
| `debt` | A technical debt register: where the debt is, why it matters, how to fix it | `.governance/debt/` |

If `$ARGUMENTS` names none of these, show this table in one line per type and stop: do not guess and do not read the repository.

## Then

1. Read `${CLAUDE_PLUGIN_ROOT}/templates/artifact-rules.md` and obey it. Do not change source, config, CI, the governance pack or git state. Never overwrite an existing file.
2. Read the file for the type and follow it, using the discovery above instead of running it again:
   - `debt`: `${CLAUDE_PLUGIN_ROOT}/skills/quality/debt.md`.
