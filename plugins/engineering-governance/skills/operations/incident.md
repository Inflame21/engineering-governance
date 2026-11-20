# Type: incident

A blameless post-incident review, following the incident standard's review structure. Most of an incident lives in people's heads and chat tools, not in the repository, so this type depends on **what the user tells you**. You cannot know what happened; you can organize it and check it against the code and history.

## Extra rules for this type

- **Blameless.** Describe systems, decisions and conditions, never fault. Refer to roles ("the on-call engineer"), not people, unless the user insists on names.
- **The timeline comes only from the user's account or from commits and files you read.** Every entry is labelled `provided by user` or cites the commit or file. Never fill a gap with a plausible event, time or duration.
- **Root cause is not yours to declare.** Separate **Causes stated by the user** from **Contributing conditions seen in the code or history** (each cited). Write `Not confirmed:` where the evidence stops.
- Corrective actions are **proposals**; owners and dates are `Not confirmed:`.

## Steps

1. **Ask the user**, in one message, for what they know and are happy to share: what happened and what users or systems felt; when it started, was detected and was resolved; how it was detected; what was done, in order; what fixed it; any commit, release or config change they suspect; what went well and what did not. Accept partial answers; do not press for what they do not know. Also ask the repository, if several.
2. **Check against the repository (read-only):** commits and releases around the stated window (`git log --since ... --until ...`), the changes that touch the affected area, existing runbooks, alerts and tests for it, and whether a test or alert covered the failure. Report what you found; do not run anything.
3. **Write `<slug>.md`** to `<repository>/.governance/incidents/<YYYY-MM-DD>/` with: **Summary**, **Impact**, **Timeline** (a table: time, event, source), **Detection**, **Response**, **Mitigation and recovery**, **Causes stated by the user**, **Contributing conditions seen in the code or history**, **What went well**, **What failed or was missing**, **Proposed corrective actions** (action, the evidence behind it, owner `Not confirmed:`), **Governance changes to consider**, **Open questions**.
4. Write `index.md` and give the final message, as the rules say. Say the review is only as accurate as what the user supplied, that the people involved must correct and approve it, and that it does not record the incident in the governance pack.
