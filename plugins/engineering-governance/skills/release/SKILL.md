---
description: Release artifacts drafted from the code and git history: a release plan, a readiness evidence matrix, or a changelog. Choose a type, or run with none to see them
argument-hint: "[plan|readiness|changelog] [repository]"
disable-model-invocation: true
allowed-tools: Bash(node *governance.mjs*), Bash(git log *), Bash(git blame *), Bash(git tag *), Bash(git describe *), Bash(git diff *)
---

# Governance release

You write release artifacts for a repository, drafted from its code and git history. Request: $ARGUMENTS (a type, then optionally a repository name; for `changelog` also a range such as `v1.2.0..HEAD`).

Facts from `governance discover` for this folder. The last line is the process exit code.

```!
node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" discover . --json; echo "[governance exit code: $?]"
```

## Choose the type

| Type | What it writes | Output folder |
|---|---|---|
| `plan` | A release checklist, migration and feature-flag notes, rollback triggers and steps | `.governance/release/` |
| `readiness` | A production-readiness evidence matrix: what evidence exists, what is missing, what is unknown | `.governance/release/` |
| `changelog` | Release notes drafted from the commits in a range | `.governance/release/` |

`readiness` is **not** a release decision. For GO, GO WITH CONDITIONS or NO-GO, use `/engineering-governance:check`.

If `$ARGUMENTS` names none of these, show this table in one line per type and stop: do not guess and do not read the repository.

## Then

1. Read `${CLAUDE_PLUGIN_ROOT}/templates/artifact-rules.md` and obey it. Do not change source, config, CI, the governance pack or git state (no tags, no commits). Never overwrite an existing file.
2. Read the file for the type and follow it, using the discovery above instead of running it again:
   - `plan`: `${CLAUDE_PLUGIN_ROOT}/skills/release/plan.md`.
   - `readiness`: `${CLAUDE_PLUGIN_ROOT}/skills/release/readiness.md`.
   - `changelog`: `${CLAUDE_PLUGIN_ROOT}/skills/release/changelog.md`.
