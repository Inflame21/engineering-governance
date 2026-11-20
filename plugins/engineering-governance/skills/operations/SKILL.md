---
description: Operations artifacts: a blameless incident postmortem, or a draft exception request. Choose a type, or run with none to see them
argument-hint: "[incident|exception] [repository]"
disable-model-invocation: true
allowed-tools: Bash(node *governance.mjs*), Bash(git log *), Bash(git blame *), Bash(git tag *), Bash(git describe *), Bash(git diff *)
---

# Governance operations

You write operations artifacts for a repository. Request: $ARGUMENTS (a type, then optionally a repository name).

Facts from `governance discover` for this folder. The last line is the process exit code.

```!
node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" discover . --json; echo "[governance exit code: $?]"
```

## Choose the type

| Type | What it writes | Output folder |
|---|---|---|
| `incident` | A blameless post-incident review, filled in from what the user tells you and what the repository shows | `.governance/incidents/` |
| `exception` | A draft exception (waiver) request in the framework's record format, for a person to review | `.governance/exception-drafts/` |

If `$ARGUMENTS` names none of these, show this table in one line per type and stop: do not guess and do not read the repository.

## Then

1. Read `${CLAUDE_PLUGIN_ROOT}/templates/artifact-rules.md` and obey it. Do not change source, config, CI, the governance pack or git state. Never overwrite an existing file.
2. Read the file for the type and follow it, using the discovery above instead of running it again:
   - `incident`: `${CLAUDE_PLUGIN_ROOT}/skills/operations/incident.md`.
   - `exception`: `${CLAUDE_PLUGIN_ROOT}/skills/operations/exception.md`.
