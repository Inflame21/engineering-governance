---
description: Create a governance pack for this repository that asserts nothing, and never overwrites an existing one
argument-hint: "[--id slug] [--name text] [--repo owner/name] [--environment name] [--pack path]"
disable-model-invocation: true
allowed-tools: Bash(node *governance.mjs*)
---

# Governance init

Raw output of `governance init` for the current directory. It creates `.governance/governance-pack.json` (or the path given with `--pack`) and refuses to overwrite a file that already exists. The last line is the process exit code: 0 created, 3 refused or error.

```!
node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" init . $ARGUMENTS; echo "[governance exit code: $?]"
```

Report the result to the user.

- If the pack was created, say what the CLI says: the pack **asserts nothing**. It has no controls, evidence, risks or decisions, so `/engineering-governance:check` returns NO-GO until real ones are added. That is the correct, honest state for a project that has not shown anything yet.
- Tell the user how to get it filled in without writing it by hand: run **`/engineering-governance:setup`**. It explores the repository (its README, CLAUDE.md, scripts and CI), drafts the controls, asks before running the project's own checks, records only what actually ran as verified evidence, and fills this file in place. The result is marked as drafted by an AI and unreviewed, and the user must review it. `setup` can also be run without `init`, since it creates the pack itself.
- Name what the user would otherwise fill in by hand: `project.repository` (it starts as `UNSET`), `project.environment`, and the `change` being assessed.
- Do not add controls, evidence, risks, decisions or exceptions yourself in this command, and do not set any status. Declared status is not proof: evidence has to come from real checks or reviews, and the project owner decides which controls apply. That drafting is what `setup` does, under its own rules.
- Do not copy `${CLAUDE_PLUGIN_ROOT}/templates/governance-pack.example.json` into the project. It is a worked example for a fictional change, and its evidence is declared, not real.
- If the exit code is 3 because the file already exists, say that nothing was changed and suggest `/engineering-governance:validate` and `/engineering-governance:check`. Do not delete or overwrite the existing file.
- For any other error, show the message and the likely cause. Do not retry with different options unless the user asks.
