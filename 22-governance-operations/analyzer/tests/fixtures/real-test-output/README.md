# Real test-runner output

JUnit XML written by `vitest run --reporter=junit` (vitest 5.0.4, 2026-11-23), replayed by `test-report.test.ts`.

- `vitest-pass.xml`: two passing tests.
- `vitest-mixed.xml`: one pass, one failure, one skipped test.

The machine `hostname` attribute was replaced with `redacted`. Nothing else was edited. Only vitest was captured; reports from pytest, `go-junit-report`, jest-junit and others were not, so those formats are read on the strength of the shared JUnit structure alone (DEBT-GOV-027).
