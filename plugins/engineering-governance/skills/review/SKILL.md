---
description: Review one area of a repository against the governance standards and write a report (what, where, why, how to confirm, fix), adding the findings to its pack
argument-hint: "<area> [repository]   areas: security, architecture, api, data, testing, cicd, frontend, observability"
disable-model-invocation: true
allowed-tools: Bash(node *governance.mjs*)
---

# Governance review

You are reviewing code against the framework's standards and writing a report a person can act on. Request: $ARGUMENTS (the first word is the area, an optional second word names the repository).

Facts from `governance discover` for this folder. The last line is the process exit code.

```!
node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" discover . --json; echo "[governance exit code: $?]"
```

## Rules that cannot be bent

1. **Only report what you can show.** Every finding quotes the code it points to, with a `file:line` you read just now. If you cannot point at the code, it is not a finding; put it under "Leads not confirmed" with what would confirm it.
2. **No claim of compliance.** "No findings" never means "compliant". State how much you actually read against how much there was, and what you did not look at.
3. **You are a reviewer, not an editor.** Change no source, config, CI or git state, and do not commit. Write only the report, and add to the pack as described below. Never modify or delete an existing pack record.
4. **Never print a secret.** For a credential, key or token, give the file, line and kind of value, and redact the value itself, in the report, the pack and the chat.
5. **No exploit code.** Describe how to confirm a problem, not how to attack with it.
6. **Be calibrated.** Report at most 15 findings, most serious first. No style nits, no speculation without a code path, no duplicates. Confidence 0.8 or higher only when the code directly shows the problem; 0.5 to 0.79 when it is plausible and a person must confirm; below 0.5 is a lead, not a finding.
7. **Read-only commands only.** Searching and reading are fine. Do not run the project's scripts unless the user says yes, and never run anything that changes state.
8. **Do not call the repository production-ready or compliant, and do not claim these findings are complete.**

## What to do

1. **Pick the area and repository.** Read `${CLAUDE_PLUGIN_ROOT}/templates/review-areas.json`. If no area was given, list the areas with their titles and ask which one; do not start. If the folder holds several repositories and none was named, list them and ask. Use the repository's discovery facts (commit, uncommitted changes, scripts, docs, whether a pack exists).
2. **Read the standards for the area.** Read each standard the area names, and `REV-009`, from `${CLAUDE_PLUGIN_ROOT}/standards/` (file names are in `${CLAUDE_PLUGIN_ROOT}/templates/standards-index.json`). Your findings must rest on these texts. Read the repository's own CLAUDE.md, AGENTS.md and architecture docs too: its stated rules are part of what you review against.
3. **Define the population.** Before reading code, enumerate what is in scope for the area (for example every route file, every migration, every workflow) with Glob and Grep, and count it. You may run `node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" analyze <repository> --json` for a map of packages, API endpoints and databases.
4. **Review.** Work through the area's `focus` list. Open and read the files, do not rely on searches alone. Start with the highest-risk files. Keep a running count of files read against the population.
5. **Write the report** to `<repository>/.governance/reports/review-<area>-<YYYY-MM-DD>.md`. Never overwrite: if the file exists, add `-2`, `-3`. Use this structure:
   - `# Governance review: <area title>, <repository>`, then a table: repository, commit, uncommitted changes, date, standards applied, and **Reviewer: Claude (AI). Not reviewed by a person.**
   - `## Summary`: counts by severity and a two-sentence headline.
   - `## Scope and coverage`: what was in scope, how many files you read of how many, how you chose them, and what you did not look at.
   - `## Findings`: for each one, `### <ID>: <short title>`, a line with severity, confidence and status, then **What** (the problem), **Where** (`path:line` and the quoted code, at most 8 lines, secrets redacted), **Why it matters** (the standard id and section, and the concrete risk), **How to confirm** (steps a person can follow), and **Fix** (a specific recommended change, with a small snippet where useful).
   - `## Leads not confirmed`, `## Not checked and limits`, and `## Next steps for a person`.
   Finding ids are `FND-REVIEW-<AREA>-001`, `-002`, and so on, with the area in capitals. Severity follows the standards: P0 for an authentication or tenant-isolation bypass or an exposed secret; P1 for a serious correctness, security or contract defect; P2 for a real weakness with limited impact; P3 for minor. Create the `.governance/reports/` folder if needed.
6. **Add the findings to the pack**, if `<repository>/.governance/governance-pack.json` exists. If it does not, say so, skip this step, and suggest `/engineering-governance:setup`. Append only, with the Edit tool:
   - one evidence record: `"id": "EVD-REVIEW-<AREA>-<YYYYMMDD>"`, `"type": "E2_INSPECTION"`, `"status": "UNVERIFIED"` (an AI review is not human-verified), a `description` giving the area, coverage (files read of files in scope) and the report path, `"source": "Claude review at <commit> (<n> uncommitted changes)"`, `"freshness": "current"`, `"freshness_status": "current"`, `"generated_at"` (current UTC time, ISO 8601), `"supports_controls": []`;
   - one entry in `findings` per finding: `"id"`, `"rule_id": "REVIEW-<AREA>"`, `"severity"`, `"category": "<area>"`, `"message"` (title and one sentence), `"status": "OPEN"` for a finding whose code you quoted, `"evidence_refs": ["EVD-REVIEW-<AREA>-<YYYYMMDD>"]`, `"source_location": {"file": "...", "start_line": N}`, `"confidence"`, `"remediation"` (the fix in one or two sentences, and the report path). Create the `findings` array if it is missing. Leads that are not findings do not go in the pack.
7. **Validate and check.** Run `node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" validate <repository>` then `check <repository>`. If validation fails, fix your additions. Never fix it by removing or weakening anything that was already in the pack.

## Final report to the user

Give: the path of the report, the counts by severity, the top findings (title, `file:line`, one-line fix), the coverage (files read of files in scope), and the `check` decision as printed. Then say plainly:

- This is an **AI review**. It is not exhaustive, it can be wrong, and it can miss things. A person must confirm each finding before acting on it.
- Open findings in the pack count in `check`: a P0 or P1 finding makes the decision NO-GO until it is fixed. `RESOLVED` is the only status that clears one, and a person should set it, recording the reason in the report. If a finding is a false positive, say so in the report when resolving it.
- What was not covered, and the other areas still to review.
