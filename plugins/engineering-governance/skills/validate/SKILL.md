---
description: Validate the governance pack, architecture profile, project registry, control catalog or authority policy, without analyzing the repository
argument-hint: "[--pack path] [--profile path] [--registry path] [--catalog path] [--authority path]"
disable-model-invocation: true
allowed-tools: Bash(node *governance.mjs*)
---

# Governance validate

Raw output of `governance validate` for the current directory. It checks files against their schemas and cross-reference rules only; it does not analyze the repository or make a decision. The last line is the process exit code: 0 valid, 3 invalid input or execution error.

```!
node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" validate . $ARGUMENTS; echo "[governance exit code: $?]"
```

Report the result to the user. Do not change any files.

- For each file checked, say whether it is valid. For an invalid one, quote each reported problem with its location in the file.
- Valid means well-formed, not approved: a pack can validate and still contain controls or evidence nobody has reviewed. Say so if the user seems to read it as approval.
- Do not fix the files unless the user asks. If they do, change only what the reported errors require, and never edit a control's status, evidence or severity to make validation pass.
