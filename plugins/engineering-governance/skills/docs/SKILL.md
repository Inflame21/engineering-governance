---
description: Go through a whole repository, feature by feature, and write documentation for developers and for users as Markdown, in a new dated folder under .governance/docs/
argument-hint: "[repository] [--for developers|users|both]"
disable-model-invocation: true
allowed-tools: Bash(node *governance.mjs*)
---

# Governance docs

You are writing documentation for a repository: what it does and how it works, for the people who build it and for the people who use it. Request: $ARGUMENTS (a repository name, and optionally `--for developers`, `--for users` or `--for both`; nothing means every repository found and ask which audience).

Facts from `governance discover` for this folder. The last line is the process exit code.

```!
node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" discover . --json; echo "[governance exit code: $?]"
```

## Rules that cannot be bent

1. **Only write what you read.** Every statement about behavior cites the file you read (a relative path, with a line where it helps). If you could not confirm something from the code or the repository's own documents, write `Not confirmed:` and say what would confirm it. Never invent a feature, option, command, screen or default.
2. **You are a writer of new files, not an editor.** Change no source, config, CI or git state, and do not commit. Write only inside `<repository>/.governance/docs/<YYYY-MM-DD>/`. Never overwrite or edit an existing file: if that folder exists, use `<YYYY-MM-DD>-2/`, `-3`.
3. **Mark every page as a draft.** Each file starts with: `> Drafted by Claude (AI) from the code at commit <short hash>. Not reviewed by a person. Check it against the product before publishing.`
4. **No claim of completeness.** Say how much of each feature you read. Never call the repository production-ready, secure or compliant, and never present the documentation as complete.
5. **Never print a secret.** Do not read `.env` files, key files, `node_modules`, build output or lockfile bodies. If a config file shows a credential, name the setting and redact the value. No exploit code.
6. **Read-only commands only.** Searching and reading are fine. Do not run the project's scripts, installs or servers: describe how to run it from the scripts and CI files you read.
7. **Features one after another, never in parallel.** They share one index.
8. **User docs describe what a user can see and do**, in plain words, without internals, file names or jargon. Developer docs describe how it is built. Do not mix them. If the repository has no user-facing behavior (a library or an internal service), say so in `user/` and describe its callers' view instead.

## What to do

1. **Plan and ask.** From the discovery above choose the repository (the one named, or ask if several and none was named). Ask which audience if `--for` was not given: developers, users or both. Run `node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" analyze <repository> --json` and read the README, CLAUDE.md, AGENTS.md, docs, manifests and the top-level layout to list the **features**: the modules, packages, commands, endpoints or screens a reader would want explained, each with the folder it lives in. Show the user that list and the pages you will write, and tell them that **this reads a lot of code, can take a long time and uses a lot of tokens**. **Wait for a yes.** Let them remove features from the list.
2. **Write each feature, one at a time.** For each feature use the Agent tool to start one subagent at a time, so each gets a fresh context, and give it this task: *read every file in `<folder>` that defines the feature, and the tests that show its behavior; follow the rules above; then write `developer/<feature>.md` (what it is for, where the code is, how it works step by step, the main types, functions and data, how it is configured, how it is tested, how to extend or change it, and known limits) and/or `user/<feature>.md` (what it lets you do, when to use it, step-by-step instructions with an example drawn from the code or tests, what the options mean, what can go wrong and what the message means), as the audience requires; return the paths and the files read of the files in scope.* If the Agent tool is not available, do each feature yourself, one at a time. Keep going if one feature fails and record the failure.
3. **Write the shared pages.**
   - Developers: `developer/architecture.md` (modules and how they connect, from the code and as the repository's documents describe it, with any difference), `developer/getting-started.md` (set up, build, test and run, from scripts and CI files read, not run), and `developer/contributing.md` only if the repository has contribution rules to summarize.
   - Users: `user/overview.md` (what it is and who it is for, from the repository's own documents), `user/getting-started.md` (install and first use, from what you read) and `user/troubleshooting.md` (only problems and messages you found in the code or documents).
4. **Write the entry page** `index.md`. It links every file with relative links in reading order: a table of page, audience, what it covers and how much of the feature was read. Add **Coverage and limits** (features documented and skipped, files read against files in scope, every `Not confirmed:` item gathered in one list) and the line: *This is an AI draft, a sample of the code, and may be wrong or miss things.*
5. **Final message to the user.** Give the path of `index.md` first, then the list of pages by audience, the features skipped and why, and the open `Not confirmed:` items. Then say plainly: this is an AI draft that a person must check against the product before publishing, user docs most of all; the files are new and uncommitted; and these docs do not feed `check` and say nothing about whether the repository is ready to release.
