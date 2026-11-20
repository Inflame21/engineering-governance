# Type: plan

A release plan for the next release, following the release standard's pre-release checklist, migrations, flags, health criteria and rollback. It plans; it does not release, tag or deploy anything.

## Steps

1. **Plan and ask.** Choose the repository (the one named, or ask if several). Ask for the release identifier and the environment if not given (otherwise write `Not confirmed:`). Read CI/CD and deploy files, manifest version and scripts, migration folders, feature-flag usage, health endpoints, smoke or end-to-end tests, monitoring and alert definitions, and the last tag (`git describe --tags --abbrev=0` and `git log <tag>..HEAD --oneline`). Tell the user the scope and that this reads a fair amount, and **wait for a yes**.
2. **Write `release-plan.md`** to `<repository>/.governance/release/<YYYY-MM-DD>/` with these sections, every statement cited:
   - **Release**: identifier, environment, last tag, number of commits since, versioning scheme the repository uses.
   - **Scope**: what is in the range, summarized from commit subjects (see the changelog type for the full notes).
   - **Gates the repository already enforces**: tests, lint, scans, approvals found in CI, with the file.
   - **Pre-release checklist**: checkbox items, each tied to evidence (`found at <file>`) or `Not confirmed:`. Cover build and artifact integrity, tests, migrations, configuration and secrets (names only), dependency changes, documentation, approvals, release window.
   - **Migrations and compatibility**: migration files in the range, and whether they look destructive (drops, renames, type changes); a person must confirm backward compatibility.
   - **Feature flags** in use and their defaults.
   - **Deployment strategy**: as the deploy files show (rolling, blue/green, canary, plain), or `Not confirmed:`.
   - **Post-deployment verification**: smoke tests and health checks that exist, with their location.
   - **Rollback**: the trigger conditions you propose (labelled as proposals), the rollback steps copied from scripts or documents you read, and whether rollback looks safe given the migrations. If no rollback path was found, say that first.
   - **Open questions** gathered in one list.
3. Write `index.md` and give the final message, as the rules say. Say that the plan has not been run, that nothing was tagged or deployed, and that it is not an approval to release.
