# ADR-0004 — Audit Command and Saved Reports (`/engineering-governance:audit`, `report --write`)

**Status:** ACCEPTED 2026-11-18 on the repository owner's request. Implemented; not yet run in a live Claude Code session.
**Standards applied:** REV-009, AI-010, GOV-023, DOC-016.
**Related:** ADR-0002, ADR-0003, DEBT-GOV-016.

## 1. Problem

After `setup`, `review` and `summary` existed, the owner ran `/engineering-governance:report` in another project and no Markdown file appeared: `report` only printed to the terminal. The owner's expectation was one automatic pass through the repository that leaves ordered Markdown documentation: what the repository is, a review of each area, suggestions, fixes, and the what, how, where and why of each. Running eight reviews and a summary by hand was the wrong shape.

## 2. Decision

1. **`governance report --write`** (CLI) saves the assessment Markdown to `.governance/reports/report-<date>.md`, never overwriting (`-2`, `-3`). It shares one dated-file helper with `summarize`. The plugin's `report` command now always passes `--write`. `--write` cannot be combined with `--format json`.
2. **`/engineering-governance:audit [repository] [--areas ...]`** (plugin skill) runs the whole sequence for a repository and produces, in reading order:
   - `overview-<date>.md`: documentation of what the repository is (purpose, technology, structure, how it is built and tested, CI/CD, architecture as documented and as found, documentation gaps, open questions), each statement citing the file it came from;
   - `review-<area>-<date>.md` for each applicable area, produced by the existing review procedure;
   - `summary-<date>.md` from `governance summarize --write`;
   - `audit-<date>.md`, the entry report: executive summary, reading order, findings by area, a prioritized improvement plan (fix now, next, quick wins, what else to add), and coverage and limits.
3. **One procedure, not two.** Each area runs in its own subagent (a fresh context) that follows `skills/review/SKILL.md`, so the review rules live in one place. Areas run one after another because they all append to one pack. Without the Agent tool, Claude does the areas itself.
4. **Asks first.** The command states that it reads a lot, can take long and uses many tokens, lists what it will write, and waits for a yes. Areas with nothing in scope are skipped and the reason is recorded.

## 3. Integrity rules (in the instructions and tested)

Every statement cites the file read; findings quote code; no claim of compliance, completeness or readiness; read-only on the project; nothing printed that is a secret; `.env`, key files, dependencies and build output are not read; files are never overwritten; the AI reviewer is named in every report. The improvement plan is built only from the area reports and the summary, and "what else to add" is labelled as suggestions.

## 4. Consequences and limits

- It is slow and token-heavy, and each review reads a sample of its area. The plan is the model's synthesis, not a computed result.
- Never-overwrite for the Markdown files Claude writes rests on the instructions (and the Write tool's read-before-overwrite rule); the CLI-written files (`report`, `summary`) are enforced in code. Recorded as DEBT-GOV-016.
- The reports quote real code and are untracked until committed. Users should read them first, and may add `.governance/reports/` to `.gitignore`.
- A partial run (one area failing, or the user stopping) leaves some reports and not others; the entry report records which areas ran.

## 5. Alternatives considered

- **Have the CLI assemble the index and the plan mechanically** from area reports with a fixed schema: more reliable, but it needs structured findings in the reports and a larger build. The preferred follow-up.
- **One long review of everything in a single context:** shallower and more likely to run out of context. Rejected in favour of an area per subagent.

## 6. Verification

Tests: `report --write` prints and saves the same Markdown, never overwrites, does not write without the flag, and rejects `--format json`; the audit instructions require asking first, sequential areas, the honesty rules, the full ordered output set and all eight areas, and reference the review procedure, which exists. Not verified: the command has not been run in a live session, so the quality of the documentation, the plan and the subagent hand-offs is unobserved.
