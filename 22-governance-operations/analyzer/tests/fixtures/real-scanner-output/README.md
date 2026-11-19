# Real scanner output

Raw standard output, standard error and exit codes from running the three scanners with the exact
commands the governance adapters use, on a GitHub Actions runner (ubuntu-24.04), run 44483594326 on
2026-11-19, and the Go cases (ADP-06) from runs 44500678465 and 44501088792 the same day. They replace hand-written fixtures (DEBT-GOV-010) and are replayed by
`../../real-scanner-output.test.ts`.

| Tool | Version |
|---|---|
| osv-scanner | 2.7.1 (osv-scalibr 0.5.3) |
| gitleaks | 8.30.1 |
| semgrep | 1.186.0 |
| Go toolchain (gofmt) | 1.24.13 |

Files are `<case>.stdout`, `<case>.stderr` and `<case>.exit`.

| Case | What it ran on |
|---|---|
| `osv-vuln` | a lockfile with `lodash@4.17.15` and `minimist@1.2.0` (7 advisories, 4 high or critical, 3 moderate) |
| `osv-clean` | a lockfile with `is-odd@3.0.1` (no known vulnerabilities) |
| `osv-empty` | a lockfile with no packages (exit 128) |
| `osv-missing` | a `--lockfile` path that does not exist (exit 127) |
| `gitleaks-{dir,git}-leak` | a git repository whose one file holds a token-shaped string generated at run time |
| `gitleaks-{dir,git}-clean` | a git repository with one harmless file |
| `gitleaks-{dir,git}-nogit` | a directory that is not a git repository (`git` exits 0 with an error on stderr) |
| `semgrep-hit` | an ERROR, a WARNING and an INFO rule, and a source file matching all three |
| `semgrep-clean` | the same rules, a source file matching none |
| `semgrep-badrule` | an invalid rule file (exit 7) |
| `probe-*` | the `--version` commands the runner uses to decide a tool is available, and the `-h` and `go version` probes for gofmt |
| `gofmt-ok`, `gofmt-unformatted` | Go files that parse (the second is only badly formatted: exit 0, listed on stdout) |
| `gofmt-syntax-one`, `gofmt-syntax-two-files` | Go files with syntax errors (exit 2, `path:line:column: message` on stderr, repeated lines) |
| `gofmt-missing-file`, `gofmt-dashfile-bare` | a file that does not exist, and a file named `-x.go` given without `--` (read as a flag) |
| `gofmt-dotslash`, `gofmt-dashdash`, `gofmt-dashfile-dotslash` | the same files given with a `./` prefix and after `--` |
| `osv-go-nested`, `osv-go-clean`, `osv-go-empty` | a `go.mod` requiring `gin v1.6.3` (3 advisories), one requiring `uuid v1.6.0`, and one with no requirements (still one package: the standard library) |
| `osv-help.stdout`, `osv-real-go-exec*.txt` | osv-scanner's option list, and a `strace` count of `go` executions with call analysis on (6) and off (0) on a real Go module |
| `semgrep-go-hit`, `semgrep-go-clean` | the same three rules in Go, a Go file matching all three and one matching none |

Limits: these are small fixtures, not a real project, so they show the output shape and exit codes,
not how the tools behave on a large repository, a monorepo or with proxy settings. The secret was
generated on the runner and is not in any file here. Do not edit these files; recapture them.
