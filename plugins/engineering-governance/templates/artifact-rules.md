# Rules for every document Claude drafts

These apply to the `documentation`, `quality`, `security`, `release` and `operations` commands. `<kind>` is the folder the type names (`runbooks`, `adr`, `onboarding`, `debt`, `test-plans`, `security`, `release`, `incidents`, `exception-drafts`).

1. **Only write what you read.** Every statement about behavior cites the file you read (a relative path, with a line where it helps). If you could not confirm something from the code or the repository's own documents, write `Not confirmed:` and say what would confirm it. Facts the user gives you in this session count as read; label them `provided by user`. Never invent a feature, step, command, owner, contact, date, reason or default.
2. **You are a writer of new files, not an editor.** Change no source, config, CI or git state, and do not commit. Write only inside `<repository>/.governance/<kind>/<YYYY-MM-DD>/`. Never overwrite or edit an existing file: if that folder exists, use `<YYYY-MM-DD>-2/`, `-3`.
3. **Mark every page as a draft.** Each file starts with: `> Drafted by Claude (AI) from the code at commit <short hash>. Not reviewed by a person. Check it against the product before relying on it.`
4. **No claim of completeness.** Say how much you read. Never call the repository production-ready, secure or compliant, and never present the output as complete.
5. **Never print a secret.** Do not read `.env` files, key files, `node_modules`, build output or lockfile bodies. If a config file shows a credential, name the setting and redact the value. No exploit code.
6. **Read-only commands only.** Searching, reading and read-only `git log`, `git blame`, `git tag`, `git describe` and `git diff` are fine. Do not run the project's scripts, installs or servers.
7. **One item at a time, never in parallel.** They share one index.
8. **Always write `index.md`** linking every file in reading order, with a **Coverage and limits** section (what you wrote and skipped, files read, every `Not confirmed:` item in one list).
9. **Final message:** give the path of `index.md` first, then what was written and skipped, then the open `Not confirmed:` items. Say plainly that this is an AI draft a person must check, that the files are new and uncommitted, and that it does not feed `check` and says nothing about whether the repository is ready to release.
