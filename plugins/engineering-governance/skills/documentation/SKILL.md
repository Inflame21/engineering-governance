---
description: Write documentation from the code: whole-repository docs, operational runbooks, architecture decision records, or a new-contributor guide. Choose a type, or run with none to see them
argument-hint: "[docs|runbook|adr|onboarding] [repository]"
disable-model-invocation: true
allowed-tools: Bash(node *governance.mjs*), Bash(git log *), Bash(git blame *)
---

# Governance documentation

You write documentation for a repository, drafted from its code. Request: $ARGUMENTS (a type, then optionally a repository name; for `docs` also `--for developers|users|both`).

Facts from `governance discover` for this folder. The last line is the process exit code.

```!
node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" discover . --json; echo "[governance exit code: $?]"
```

## Choose the type

| Type | What it writes | Output folder |
|---|---|---|
| `docs` | Developer and user documentation, feature by feature | `.governance/docs/` |
| `runbook` | Operational runbooks: deploy, roll back, health, failures, alerts | `.governance/runbooks/` |
| `adr` | Architecture decision records inferred from the code | `.governance/adr/` |
| `onboarding` | A first-day guide for new contributors: setup, layout, how changes are made here | `.governance/onboarding/` |

If `$ARGUMENTS` names none of these, show this table, say what each does in one line, and stop: do not guess a type and do not read the repository.

## Then

1. Read `${CLAUDE_PLUGIN_ROOT}/templates/artifact-rules.md` and obey it. Do not change source, config, CI or git state. Never overwrite an existing file.
2. Read the file for the type and follow it, using the discovery above instead of running it again:
   - `docs`: `${CLAUDE_PLUGIN_ROOT}/skills/docs/SKILL.md` (its own rules and steps apply; the same as `/engineering-governance:docs`).
   - `runbook`: `${CLAUDE_PLUGIN_ROOT}/skills/documentation/runbook.md`.
   - `adr`: `${CLAUDE_PLUGIN_ROOT}/skills/documentation/adr.md`.
   - `onboarding`: `${CLAUDE_PLUGIN_ROOT}/skills/documentation/onboarding.md`.
