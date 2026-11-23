# Real linter output

SARIF 2.1.0 written by `ruff check --output-format sarif` (ruff 0.17.6, 2026-11-23), replayed by `lint-report.test.ts`.

- `ruff-mixed.sarif`: three results (two unused imports, one unused variable), all level `error`.
- `ruff-clean.sarif`: a clean run with no results.

Two edits: the absolute path of the scratch directory in every artifact `uri` became `file:///repo/`, and each rule's long `fullDescription` was dropped. Nothing else was changed. ruff writes no `invocations`, so there is no end time. Only ruff was captured; ESLint, golangci-lint, CodeQL and others are read on the strength of the shared SARIF structure alone (DEBT-GOV-030).
