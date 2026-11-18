---
description: Run the governance check on this repository and report GO, GO WITH CONDITIONS or NO-GO with the evidence behind it
argument-hint: "[--pack path] [--profile path] [--base origin/main] [--run-tools] [--json]"
disable-model-invocation: true
allowed-tools: Bash(node *governance.mjs*)
---

# Governance check

Raw output of `governance check` for the current directory. The last line is the process exit code: 0 GO, 1 GO WITH CONDITIONS or incomplete analysis, 2 NO-GO, 3 invalid arguments, invalid governance pack or execution error.

```!
node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" check . $ARGUMENTS; echo "[governance exit code: $?]"
```

Report the result to the user. Do not change any files.

- State the decision exactly as the tool printed it, with the exit code. Never upgrade it, and never describe the software as production-ready: this check is one piece of evidence, and production readiness needs the full PRD-018 assessment.
- List each blocking violation first, then each condition, with its ID, severity and reason. Keep tool failures (UNSUPPORTED, SKIPPED, UNVERIFIED, ERROR) separate from code findings: a check that could not run is a gap in evidence, not a clean result.
- If the analysis is PARTIAL, say so and why. A partial analysis can never be an unconditional GO.
- Do not edit the governance pack, its evidence, controls or exceptions to change the outcome, and do not mark anything as verified. Declared status is not proof.
- If the exit code is 3 and the message says the governance pack is missing: explain that `check` needs a pack at `.governance/governance-pack.json` (or one passed with `--pack`). `/engineering-governance:analyze` works without a pack. A starting point is `${CLAUDE_PLUGIN_ROOT}/templates/governance-pack.example.json`, but its controls and evidence are examples: the project owner must adapt and approve a real pack. Offer to help adapt it only if the user asks.
- If `--run-tools` was not used, say that no scanner or compiler was run, so security and static-analysis evidence is absent.
- Suggest the next step the output supports, for example which blocker to resolve first. Make no change unless the user asks.
