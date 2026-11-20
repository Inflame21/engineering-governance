# Type: readiness

A production-readiness **evidence matrix**: for each readiness dimension, what evidence the repository holds, what is missing and what is unknown. It never decides.

## Extra rules for this type

- **Never write GO, NO-GO, "ready", "not ready", a score, a percentage or a traffic-light verdict.** Use only these statuses per row: `Evidence found`, `Partial`, `Not found`, `Unknown`.
- **Unknown is not a pass.** If you did not read enough to say, the status is `Unknown`, and it counts against nobody and for nobody.
- Evidence must be something in the repository you read (a test, a config, a CI step, a document). A statement that something is done, with nothing to show, is `Not found`.
- Finish by pointing the user to `/engineering-governance:check` for the decision. If a governance pack exists at `.governance/governance-pack.json`, you may read it and cite its controls, but do not change it.

## Steps

1. **Plan and ask.** Choose the repository (the one named, or ask if several). Dimensions to cover (skip any the user removes): requirements, architecture, implementation, data, API, security, testing, code review, CI/CD, infrastructure, observability, performance, documentation, release, operations and recovery, ownership, dependencies, known issues. Tell the user the scope, that this reads a lot and can take a long time, and **wait for a yes**.
2. **Write one row per check, one dimension at a time,** into `<repository>/.governance/release/<YYYY-MM-DD>/readiness.md`: dimension, what a reviewer would expect to see, status, evidence (cited), gap or question. Read tests, CI, config, docs and manifests; do not run anything.
3. After the matrix add **Known issues seen** (open TODOs for blockers, failing or skipped tests found in files, documented limitations), **Exceptions and accepted risks found** (in the pack or documents), and **What a person must decide**.
4. Write `index.md` and give the final message, as the rules say. Say plainly that this is evidence collection, not an assessment of readiness, and that `check` gives the decision.
