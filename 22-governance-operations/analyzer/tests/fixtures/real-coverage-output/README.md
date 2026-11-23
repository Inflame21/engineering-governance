# Real coverage output

LCOV written by `node --experimental-test-coverage --test-reporter=lcov` (Node 24.18.0, 2026-11-23), replayed by `coverage-report.test.ts`.

`node-lcov.info` covers one file with 3 functions (one never called), 4 branches (one not taken) and 7 lines (5 hit). Nothing was edited; the paths were already relative.

Only Node's reporter was captured. LCOV from c8, nyc, vitest, pytest-cov (`coverage lcov`) and Go converters is read on the strength of the shared record format alone (DEBT-GOV-028).
