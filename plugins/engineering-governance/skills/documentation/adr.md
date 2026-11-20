# Type: adr

Architecture decision records for decisions the code already embodies. You can see **what** was decided; you can rarely see **why**. Never make up a reason.

## Steps

1. **Plan and ask.** Choose the repository (the one named, or ask if several). Run `node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" analyze <repository> --json`, then read manifests, the top-level layout, infrastructure and CI files, the README and docs, and any existing ADR folder (`docs/adr`, `docs/decisions`, `adr`). Do not duplicate a decision that already has an ADR: list it in `index.md` instead. Propose at most ten decisions that would be costly to reverse (language and framework, data store, API style, auth approach, module boundaries, deployment target, messaging, major libraries). Show the list with the evidence for each, and **wait for a yes**. Let them remove items.
2. **Write each ADR, one at a time,** to `<repository>/.governance/adr/<YYYY-MM-DD>/NNNN-<title>.md` using the framework's structure: *Status*, *Context*, *Decision*, *Alternatives*, *Consequences*, *Risks*, *Related requirements*.
   - **Status** is always `Inferred from code, not approved by a person`.
   - **Decision** and **Consequences** state only what files show, each cited.
   - **Context** and **Alternatives** are filled only from a document or a commit message you read (read-only `git log` or `git blame` on the relevant files may show when and in what change the decision appeared); otherwise write `Not confirmed: why this was chosen, and what else was considered`.
   - **Risks** are only those the code or documents show.
   - **Related requirements**: `Not confirmed:` unless the repository links one.
3. Write `index.md` and give the final message, as the rules say. Tell the user the ADRs need the people who made the decisions to fill in the reasons and approve them.
