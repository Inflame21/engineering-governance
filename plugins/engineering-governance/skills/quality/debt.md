# Type: debt

A technical debt register for the repository, using the minimum debt record from the framework's technical debt standard (the plugin does not bundle that standard). This writes a Markdown register only. It does **not** add records to the governance pack, so it changes no decision.

## What counts as debt

Debt makes future change slower, riskier or more expensive. A defect, a vulnerability or a missing feature is not debt; if you find one, list it under **Not debt, but noticed** in `index.md` and move on. Look for evidence of: `TODO` / `FIXME` / `HACK` comments, skipped or disabled tests, lint, type or security suppressions (`ts-ignore`, `any`, `nosec`, `eslint-disable`), commented-out code, very large files or functions and duplicated blocks, modules without tests, dependencies the manifests show as deprecated or pinned to old majors (read the manifests; do not run an installer or an audit), missing documentation for important modules, and gaps between a repository's own documents and its code.

## Steps

1. **Plan and ask.** Choose the repository (the one named, or ask if several). Run `node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" analyze <repository> --json`, read the layout, and search for the signals above. Tell the user the scope (folders to be searched, folders skipped) and that this reads a fair amount of code. **Wait for a yes.**
2. **Write one entry per material item,** grouped into one file per category in `<repository>/.governance/debt/<YYYY-MM-DD>/<category>.md`. Categories: architecture, code and design, data, API, security, testing, infrastructure, observability, performance, documentation, dependencies. Merge repeated signals of one cause (twenty `TODO`s about the same missing validation are one item). Each entry has the framework's fields:
   - **Debt ID** (`DEBT-001`, numbered across files), **Title**, **Category**
   - **Origin**: intentional, accidental, inherited or obsolete; `Not confirmed:` unless a comment, document or commit message says
   - **Severity**: P0, P1, P2 or P3, as **your proposal** with one line of reasoning; a person decides
   - **Description**, **Affected system** (files, cited with lines), **Impact**, **Interest** (how it gets worse with time or change)
   - **Remediation**: the smallest fix that retires it, and a rough size (small, medium or large) labelled as a guess
   - **Evidence**: what you read
   - **Owner**, **Current mitigation**, **Trigger**, **Target**, **Decision**: write `Not confirmed:` (a person fills these in; never invent an owner)
3. Write `index.md` with a table (ID, title, category, proposed severity, where) sorted by proposed severity, and give the final message, as the rules say. Tell the user that severities are proposals, that owners and targets are blank on purpose, and that a sample of the code was read, so absence of an item is not proof of no debt.
