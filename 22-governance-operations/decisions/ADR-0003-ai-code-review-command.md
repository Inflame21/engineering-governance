# ADR-0003 — AI Code Review Command (`/engineering-governance:review`)

**Status:** ACCEPTED 2026-11-18 on the repository owner's decisions (scope and output below). Implemented; not yet run in a live Claude Code session.
**Standards applied:** REV-009 (code review), AI-010 (AI output is verified, not trusted), SEC-007, GOV-023.
**Related:** ADR-0002 (`setup`), DEBT-GOV-014.

## 1. Problem

The plugin could structure a repository and gate on evidence, but it did not read the code and say what is wrong, where, why it matters and how to fix it. The owner expected a governance run to go through the repository and produce a report with the what, why, how, where and fixes.

## 2. Decision

Add `/engineering-governance:review <area> [repository]`. Claude reads one area of a repository against the framework's standards and writes a report; each finding is also added to the repository's pack so it counts in `check`.

Owner's choices:

- **Scope:** one area per run (security, architecture, api, data, testing, cicd, frontend, observability), in depth. (Rejected: a broad shallow pass over everything, and review limited to changed files.)
- **Output:** a Markdown report in `.governance/reports/review-<area>-<date>.md`, plus findings added to the pack.

Parts:

1. `templates/review-areas.json` defines the areas, the standards each uses, and what to look for.
2. The 12 standards the areas use ship inside the plugin under `standards/` (a marketplace install copies only the plugin directory). The bundle script copies them from the repository; a test checks they are identical.
3. The skill reads discovery facts from the CLI (`governance discover`), reads the standards and the repository's own rules, enumerates the population in scope, reviews it, writes the report, then appends one evidence record and the findings to the pack.

## 3. Integrity rules (in the instructions and tested)

- Every finding quotes the code with a `file:line` read just before citing. Without that it is a "lead not confirmed", which is not added to the pack.
- No claim of compliance: the report states files read against files in scope and what was not looked at. Findings are capped at 15, most serious first, with a confidence value.
- Read-only: no change to source, config, CI or git state; no commit; the project's scripts run only with the user's yes. Secrets are never printed; no exploit code.
- The pack is only appended to. Each review adds one `E2_INSPECTION` evidence record with status `UNVERIFIED` (an AI review is not human-verified), supporting no control, and findings that cite it. The CLI rejects a finding that cites evidence that does not exist (tested).
- The report and the final message say it is an AI review, not exhaustive, and that a person must confirm each finding.

## 4. Consequences and limits

- The engine counts every finding that is not `RESOLVED`: an open P0 or P1 finding makes `check` NO-GO, and `ACKNOWLEDGED`, `ACCEPTED` and `SUPPRESSED` do not clear it (tested). A false positive therefore blocks until a person sets it `RESOLVED`, and there is no status meaning "reviewed and rejected". Recorded as DEBT-GOV-014.
- A large repository cannot be read in one pass. Coverage is a sample, which the report must state. The model can be wrong or miss things; the CLI checks a finding's shape and that it cites existing evidence, not that its code or reasoning is correct.
- Findings cite code at a commit. If the code changes, a finding can go stale; nothing re-checks it.

## 5. Alternatives considered

- **Deterministic checks only** (linters, scanners, boundary rules): reliable but narrow. They already exist and remain the better source of evidence; the review covers what they cannot, such as missing authorization or tenant scoping.
- **Findings as report-only:** avoids false-positive blocking, but then the pack and `check` would ignore real problems. The owner chose to count them.
- **Verifying quoted code mechanically** (a check that the quote still exists at the cited line): desirable and cheap, deferred.

## 6. Verification

Tests: the area definitions against the standards index; the bundled standards against their sources; the required rules in the instructions; and the pack recipe through the CLI from the standalone bundle (a finding is accepted, a dangling evidence reference is rejected, a P1 finding blocks `check`, a P2 finding is a warning, and only `RESOLVED` clears a finding).

Not verified: the command has not been run in a live Claude Code session, so the quality and accuracy of the reviews it produces are unobserved.
