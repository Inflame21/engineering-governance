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
- Name what the user still has to fill in: `project.repository` (it starts as `UNSET`), `project.environment`, and the `change` being assessed.
- Do not add controls, evidence, risks, decisions or exceptions, and do not set any status. Declared status is not proof: evidence has to come from real checks or reviews, and the project owner decides which controls apply. If the user asks for help, work only from facts they give you and from the repository's own requirements and the framework standards, and say plainly which entries are your suggestions for them to review.
- Do not copy `${CLAUDE_PLUGIN_ROOT}/templates/governance-pack.example.json` into the project. It is a worked example for a fictional change, and its evidence is declared, not real.
- If the exit code is 3 because the file already exists, say that nothing was changed and suggest `/engineering-governance:validate` and `/engineering-governance:check`. Do not delete or overwrite the existing file.
- For any other error, show the message and the likely cause. Do not retry with different options unless the user asks.
