# Type: changelog

Release notes drafted from the commits in a range. The standard says release notes must not claim behavior that was not released, so they come only from the history, never from guesses about what the code does now.

## Steps

1. **Plan and ask.** Choose the repository (the one named, or ask if several). The range is the one given in `$ARGUMENTS`, otherwise from the last tag (`git describe --tags --abbrev=0`) to `HEAD`; with no tag, ask. Show the range and how many commits it holds (`git log <range> --oneline`), and **wait for a yes**.
2. **Read the range:** `git log <range> --format='%h %s'` and, where a subject is unclear, the commit body or `git diff <range> --stat` for the files touched. Do not read the code to describe behavior the commits do not mention.
3. **Write `changelog.md`** to `<repository>/.governance/release/<YYYY-MM-DD>/`, grouped as: **Features**, **Fixes**, **Breaking changes**, **Migrations**, **Configuration and infrastructure changes**, **Dependency changes**, **Documentation and internal changes**, **Known limitations** (only if commits or documents state them). Each line is plain words, ends with the short commit hash, and says only what the commit says. Put merge commits and noise (typos, reverts that cancel out) in a final count rather than a line each. Anything you cannot classify goes under **Unsorted**. For **Breaking changes** and **Migrations**, include only items a commit message, a migration file in the range or a changed public interface shows; otherwise write `Not confirmed:`.
4. Write `index.md` and give the final message, as the rules say. Tell the user the notes are drafted from commit subjects, so they reflect what was written, not necessarily what shipped, and a person must edit them before publishing.
