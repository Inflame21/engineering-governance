# Type: onboarding

A single "first day" guide for someone joining the project as a contributor: what this is, how to get it running, how the code is laid out, how changes are made and reviewed here. It is shorter and more practical than the full developer documentation (`docs`), and it points to it where it exists.

## Steps

1. **Plan and ask.** Choose the repository (the one named, or ask if several). Run `node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" analyze <repository> --json`. Read the README, CONTRIBUTING, AGENTS.md, CLAUDE.md, the pull-request and issue templates, CODEOWNERS, manifests and their scripts, CI files, linter, formatter and editor configuration, the top-level layout, and the last 30 commits (`git log --oneline -30`) for the commit and branch style. Tell the user what you will read, and **wait for a yes**.
2. **Write `onboarding.md`** to `<repository>/.governance/onboarding/<YYYY-MM-DD>/` with these sections, each statement cited:
   - **What this project is** in a few sentences, from the repository's own documents.
   - **Before you start**: tools and versions the manifests, lockfile names, CI and version files require. Never read lockfile bodies or `.env` files; name required settings only.
   - **Get it running**: install, build, test and run commands copied from scripts and CI files (not run by you), in order, with the file cited and what you would expect to see only where a document says so.
   - **How the code is laid out**: a short tree of the main folders, one line each, and the three or four files to read first.
   - **How we work here**: branch and commit style (from history and contribution rules), how changes are reviewed (code owners, required checks, templates), what CI enforces, and the linters and formatters in use.
   - **Key terms**: domain words and internal names a newcomer will meet, defined from the code or documents.
   - **Where to look when something breaks**: the test, logging and troubleshooting hints that exist.
   - **Who to ask and where**: `Not confirmed:` unless a document names a channel or owner; never invent one.
   - **Further reading**: links to the repository's own docs, and to the output of `documentation docs` if present under `.governance/docs/`.
3. Write `index.md` and give the final message, as the rules say. Tell the user that the setup steps have not been run, so a newcomer should treat the first failure as a bug in this guide and report it.
