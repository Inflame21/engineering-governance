---
description: Security artifacts drafted from the code. Currently one type, threat-model: assets, entry points, trust boundaries and threats. Run with no type to see what is available
argument-hint: "[threat-model] [repository]"
disable-model-invocation: true
allowed-tools: Bash(node *governance.mjs*), Bash(git log *), Bash(git blame *)
---

# Governance security

You write security artifacts for a repository, drafted from its code. Request: $ARGUMENTS (a type, then optionally a repository name).

Facts from `governance discover` for this folder. The last line is the process exit code.

```!
node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" discover . --json; echo "[governance exit code: $?]"
```

## Choose the type

| Type | What it writes | Output folder |
|---|---|---|
| `threat-model` | Assets, actors, entry points, trust boundaries, data flows and the threats at each boundary | `.governance/security/` |

For a list of security findings in the code, use `/engineering-governance:review security` instead: that is a different artifact.

If `$ARGUMENTS` names none of these, show this table in one line per type and stop: do not guess and do not read the repository.

## Then

1. Read `${CLAUDE_PLUGIN_ROOT}/templates/artifact-rules.md` and obey it. Do not change source, config, CI, the governance pack or git state. Never overwrite an existing file.
2. Read the file for the type and follow it, using the discovery above instead of running it again:
   - `threat-model`: `${CLAUDE_PLUGIN_ROOT}/skills/security/threat-model.md`.
