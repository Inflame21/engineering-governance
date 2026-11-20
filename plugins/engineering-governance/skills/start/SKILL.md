---
description: New here? Explains what this plugin does and which command to run first. Runs nothing and changes nothing
disable-model-invocation: true
---

# Engineering Governance: start here

Show the user the text below as written, without running any command, reading any file or changing anything. Then stop and let them choose.

---

**What this plugin does.** It checks a software repository against a set of engineering standards (security, architecture, API, data, testing, CI/CD, frontend, observability) and tells you what to fix. It can also give a release decision: **GO**, **GO WITH CONDITIONS** or **NO-GO**, based on evidence. Nothing runs by itself; each command runs only when you type it, in the folder Claude Code is working in.

**Run this first, from your repository's root folder:**

1. `/engineering-governance:analyze` takes a minute, needs no setup and changes nothing. It shows the languages, frameworks and structure the plugin can see.
2. `/engineering-governance:audit` is the full tour. It reads the repository and writes Markdown reports to `.governance/reports/`: what the repository is, a review of each area, and a prioritized list of fixes. Open `audit-<date>.md` first. It asks before starting because it reads a lot and can take a long time.

**If you want a GO / NO-GO decision:**

3. `/engineering-governance:setup` drafts a governance pack for you (the file that holds the controls and evidence) and, only with your yes, runs your project's own lint, tests and build to record real results.
4. `/engineering-governance:check` reads that pack and gives the decision with the evidence behind it. **NO-GO is the normal first result**: it means evidence is missing, not that your code is bad.

**Other commands:**

- `/engineering-governance:review <area>` reviews one area in depth.
- `/engineering-governance:docs` writes documentation for developers and for users, feature by feature, to `.governance/docs/`. It asks before starting.
- `/engineering-governance:summary` writes one status report.
- `/engineering-governance:report` renders the full assessment as Markdown.
- `/engineering-governance:validate` checks the pack's format.
- `/engineering-governance:init` creates an empty pack.

**Good to know.** The reports and packs Claude writes are drafts for a person to review before relying on them. A GO is one piece of evidence, never a statement that software is production-ready.
