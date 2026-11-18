# ADR-0001 — Dependency, Secret and Static-Analysis Scanner Selection

**Status:** APPROVED 2026-11-18 on the repository owner's instruction (tool selection and section 4 mapping). Section 5 remains open as DEBT-GOV-009: no scanner evidence may be linked to a control until it is settled. Nothing in this record is enforced yet.
**Date:** 2026-11-18
**Decision owner:** engineering governance maintainers (LSGE role is draft; see DEBT-GOV-002).
**Standards applied:** SEC-007 sections 14, 20, 24, 25; CICD-012 sections 9, 10, 11; GOV-023 (evidence, section on scanners as partial proof); AI-010 (verify, do not assume).
**Plan reference:** MASTER-IMPLEMENTATION-PLAN section 2, "Real verification adapters"; operating blueprint Release 2.

## 1. Problem

The platform runs two real checks (`tsc`, Python `ast.parse`) and CI runs `npm audit` as a report that cannot fail the build. Security, dependency and secret scanning is the largest open gap in the "Real verification adapters" row, and SEC-007 section 25 and CICD-012 section 10 both expect it. No adapter yet produces `WARN`; every current result is PASS, FAIL, SKIPPED, UNSUPPORTED, UNVERIFIED or ERROR. Scanners are the natural first producers of WARN, so the choice also fixes how WARN is used.

This record selects tools and states the result mapping. It does not add an adapter.

## 2. Selection criteria

Derived from existing constraints, not preference:

1. **Local-first CLI** with machine-readable output (JSON or SARIF) and a documented exit-code contract. The runner executes allowlisted binaries without a shell (`cli/src/verification-runner.ts`).
2. **No account, no vendor service, no telemetry** required to run. The runner passes a minimal environment, so a tool that needs a token is out.
3. **Does not send source or secrets to a third party.** A governance runner must not transmit a discovered credential anywhere.
4. **Reproducible evidence.** Tool version, rule set and advisory-data snapshot must be recordable in the evidence record (GOV-023, EVD-02).
5. **Safe delivery.** Installed from a lockfile, or as a pinned release binary with a verified checksum. Never from a mutable action or image tag. The repository already pins GitHub Actions to commit SHAs; the March 2026 compromise of `aquasecurity/trivy-action` and `setup-trivy`, where version tags were force-pushed to malicious commits, is the reason this stays a hard rule.
6. **Covers both representative stacks:** TypeScript/JavaScript and Python/FastAPI (operating blueprint Release 2).
7. **Few tools.** The plan lists "numerous shallow adapters claiming comprehensive coverage" as a non-goal. One tool per class.

## 3. Decision

| Class | Adopt | Why | Not adopted |
|---|---|---|---|
| Dependency vulnerabilities (SCA) | **OSV-Scanner** | One tool for npm and Python lockfiles, open-source (Apache-2.0), no account. Keeps `npm audit` in CI as a cross-check during the pilot, not as an adapter. | `pip-audit` (Python only, would need a second adapter). `npm audit` as the adapter (npm only). |
| Secrets | **Gitleaks** | MIT, single binary, runs offline, scans the working tree and git history, can redact matches. Never verifies credentials against live services. | **TruffleHog** as the default: its main advantage is live credential verification, which sends found secrets to external services, and its licence is reported inconsistently (AGPL-3.0 in one source, partly commercial in another). Revisit only as a manual incident-response tool. |
| Static analysis (SAST) | **Semgrep Community Edition**, with a reviewed rule set stored in this repository | LGPL-2.1 engine, runs locally, covers TS/JS and Python, `--metrics=off`. Rules are pinned in the repo, so policy is not a remote, mutable input. | **CodeQL** as the adapter: proprietary engine, GitHub-only, needs a paid licence for private repositories. It may be enabled as a platform feature on a public repository, outside the adapter model. **Bandit**: deferred, Python-only, adds a second adapter for modest gain over Semgrep. |
| Containers / IaC | **None now** | No container or IaC artifact is in scope of any registered project. | Trivy, KICS. Revisit when INFRA-013 work needs it, installed as a verified binary, not via an action tag. |

Type checking (`tsc`) and Python syntax checking stay as they are. Lint is project-owned and outside this decision.

## 4. Result mapping, including WARN

Thresholds are policy and must be approved (CICD-012 section 10: "Security gate severity SHALL be defined explicitly"). The values below are a proposal.

| Tool | PASS | WARN | FAIL | UNVERIFIED / UNSUPPORTED | ERROR |
|---|---|---|---|---|---|
| OSV-Scanner | Scan completed, no advisories | Scan completed, only P2/P3 advisories | Any P1 advisory | A manifest has no lockfile, or an ecosystem is not covered | Advisory data unreachable, non-contract exit code, unparsable output |
| Gitleaks | Scan completed, no matches | **Not produced.** | Any match (P1) | History not available (shallow clone) | Non-contract exit code, unparsable output |
| Semgrep CE | Scan completed, no matches | Scan completed, only lower-severity matches | Any ERROR-severity match (P1) | Files skipped by size or parse limits | Non-contract exit code, unparsable output |

Proposed severity: runtime-dependency Critical or High advisory is P1. Moderate, and High or Critical in a dev-only dependency, is P2. Low is P3. An advisory with no score is P2 and says so in its message. Critical is deliberately P1, not P0: SEC-007 section 24 allows a formal exception, and P0 can never be waived.

Rules that keep WARN honest:

- **Secrets never produce WARN.** SEC-007 section 14 says to assume compromise until rotated, so a secret in history is as serious as one in the tree. WARN is not manufactured to make the scanner look graduated.
- **Local ignore files are not waivers.** `.gitleaksignore`, `.semgrepignore`, `# nosemgrep` and OSV ignore entries must not turn a finding into a PASS. A suppression is accepted only as an exception record in the governance pack (EXC-021), and the adapter reports suppressed counts in the evidence.
- **Counts, not silence.** Findings below the reporting floor (for example Semgrep INFO) are counted in the evidence description. Each P3 finding becomes a GO WITH CONDITIONS condition, so emitting every INFO match would bury real conditions.
- **Evidence records** carry tool version, exact command, exit code, duration, repository fingerprint, and for OSV the advisory-data date and for Semgrep the rule-set digest. A result without these is ERROR, not PASS.
- **Redaction is mandatory for Gitleaks.** The raw secret must not appear in evidence, findings, reports or CI artifacts.
- **No network where avoidable.** Advisory lookup is the one accepted network dependency (OSV). If it fails, the result is ERROR, never PASS.

### Amendments (2026-11-18, repository owner delegated the call)

1. **An advisory whose severity cannot be established is P1, not P2.** The proposal above failed open: a real Critical advisory whose label was not read would have become a warning. The unknown case is now fail-closed (GOV-022 section 10). Severity is read from the advisory's `database_specific.severity` label (CRITICAL/HIGH to P1, MODERATE/MEDIUM to P2, LOW to P3) and the worst label across an alias group wins.
2. **Development-only dependencies are not distinguished.** The documented OSV-Scanner output does not say which dependencies are runtime, so every dependency is treated as runtime. The proposed "dev-only High is P2" rule is not implemented.
3. **Advisory-data date is not recorded.** The documented output does not expose it. The evidence records tool version, generation time, command, exit code and repository fingerprint, and a result is not forced to ERROR for lacking the date. Recorded as DEBT-GOV-010.
4. **Precedence of results:** FAIL (any P1) over UNVERIFIED (a manifest no lockfile covers) over WARN (only P2/P3) over PASS.

### Findings on the secret scanner (2026-11-18, before any adapter work)

Reading the Gitleaks README and releases page found facts the approval did not have. The Gitleaks adapter is therefore **blocked pending an owner decision**, not implemented.

1. **Gitleaks is feature-complete.** Its README says it will receive "security patches only" and that the author is moving to **Betterleaks**. Latest release v8.30.1 (March 2026); MIT licence. Stable but frozen: detection rules and formats will not improve. Selection criterion 7 (maintained, few tools) was met when this was approved on the basis of an incomplete picture.
2. **Betterleaks** is reported (secondary sources only, not checked at its repository) to be a March 2026 successor by the same author, sponsored by Aikido Security, MIT-licensed, described as a drop-in replacement, and to include "CEL-based validation". If that validation contacts external services with found credentials, it breaks criterion 3, as TruffleHog's did. Not verified.
3. **Unresolved for either tool, and each is a security question:**
   - The README does not document that `--report-path -` writes the report to stdout. If it does not, a report would be written to a file in the scanned repository.
   - The README says `--redact` applies to "logs and stdout"; whether the JSON report's `Secret` and `Match` fields are redacted is not documented. The ADR requires that a raw secret never reaches evidence, findings, reports or artifacts.
   - The shape of an empty report (`[]` or `null`) is not documented.
   - Network and telemetry behaviour is not documented either way.
4. **Usable facts:** a leak and an error both exit 1 by default, but `--exit-code 2` makes a leak exit 2, so clean (0), leak (2), error (1) and unknown flag (126) can be told apart. The documented scan commands are `gitleaks dir <path>` (working tree) and `gitleaks git <path>` (history).

**Resolution (owner delegated the call, 2026-11-18): keep Gitleaks, and read nothing but its exit code.** Gitleaks is documented, MIT-licensed and still receives security patches; Betterleaks is young, vendor-sponsored and unverified, and its validation feature may breach criterion 3. The undocumented output behaviour is avoided, not resolved: the adapter passes `--exit-code 2 --redact --no-banner --no-color --log-level error`, requests no report, and never reads stdout or stderr, so no secret can reach evidence, findings or reports and no file can be written into the scanned repository. A finding therefore carries no file or line; locating a leak means running gitleaks locally. The tool-specific parts (command line, exit-code meanings) are confined to `analyzer/src/gitleaks.ts`, so moving to Betterleaks, if it proves to be a drop-in replacement, is a small change. Re-evaluate Betterleaks when its behaviour is verified. Recorded as DEBT-GOV-011.

## 5. Open problem: WARN evidence cannot satisfy a control today

`evidenceStatusForResult` maps WARN to `PARTIALLY_VERIFIED`. The engine does not accept partial evidence as proof of a required control (`engine/src/evaluator.ts`, `evidenceIsUsable`; asserted by `engine/tests/evaluator.test.ts`), and an UNVERIFIED control is blocking at every severity unless an approved exception applies (`engine/src/decision.ts`, `blockingControlViolations`).

So the doc comment "passed with non-blocking warnings" and the engine's behaviour disagree. Consequences:

- If a scanner's WARN evidence is linked to a control through `supports_controls`, that control becomes UNVERIFIED and the decision is NO-GO, not GO WITH CONDITIONS.
- The only path to GO WITH CONDITIONS today is a P2/P3 finding (`FINDING:<id>` warning). Current adapters leave `supports_controls` empty, which hides the problem. It appears the moment the control catalog gains automated verifiers.

Options, for the governance owner:

1. **Keep the engine as is.** WARN is for visibility only; a control that depends on a scan that warned needs an exception. Safest, but makes any low-severity advisory block a linked control.
2. **Treat a completed scan with only non-blocking findings as VERIFIED for the control it supports,** carrying the non-blocking findings as P2/P3 findings. WARN and PASS then differ in `result_status` and in findings, not in evidence strength. This needs an engine policy change, new decision-matrix tests, and review under the CODEOWNERS rule for `engine/`.
3. **Split the claim:** one control for "no blocking vulnerabilities" (satisfied by a completed scan), another for "no known vulnerabilities" (partial until clean).

Recommendation: option 3 where the catalog can express it, otherwise option 2. Not implemented here; recorded as DEBT-GOV-009. Do not link scanner evidence to a control before this is settled.

## 6. Consequences

- A runner allowlist extension (`VerificationToolName`) for three binaries, plus per-tool output parsers and tests for each state in section 4.
- Provisioning of pinned binaries with checksum verification in CI and for local use. Until the adapter exists, scanners are not part of any decision.
- Scanner false positives will occur and need a recorded triage path (exception records), not local suppressions.
- OSV depends on a public advisory service. An outage produces ERROR and blocks a required gate; an offline mode is a later option.

## 7. What was and was not verified

Verified in the repository: the evidence-policy mapping, the evaluator and decision behaviour for partial and unverified evidence, the runner's no-shell allowlist and minimal environment, the existing CI audit step, the SHA-pinned actions, and the open-gap statements in the README and plan.

Taken from web sources, not confirmed against primary documentation, and to be re-checked when versions are pinned:

- Licences: Gitleaks MIT; Semgrep engine LGPL-2.1; TruffleHog's licence conflicting between sources; CodeQL's private-repository licensing. Confirm each project's LICENSE file at pin time.
- Semgrep Rules License terms for vendoring registry rules into this repository. If they do not permit it, author in-house rules or use another rule source.
- OSV-Scanner Python lockfile coverage and exit-code contract for the pinned version.
- The Trivy incident details; sources differ on exact tag counts, not on the attack method.

Not verified: whether this repository is public (the `gh` CLI is not installed here), which affects only the optional CodeQL platform feature. No scanner was installed or run.

## 8. Implementation status

**OSV-Scanner adapter: IMPLEMENTED, not RUNTIME_VERIFIED.** `analyzer/src/osv.ts`, wired into `runVerificationAdapters` and the CLI runner allowlist, with `analyzer/tests/osv.test.ts`. It was written from the OSV-Scanner output documentation (v2.7.1) without running the tool: the permission to run the downloaded binary was declined, so the tests use hand-written fixtures. Unit tests prove the adapter's logic for every state in section 4 and for malformed or contradictory output; they do not prove the parser matches real output. The two unverified assumptions are the `database_specific.severity` label and the `--version` and `--lockfile=` invocations. If either is wrong the failure is visible and fail-closed (everything P1, or the tool reported UNSUPPORTED or ERROR), never a false pass.

**Gitleaks adapter: IMPLEMENTED, not RUNTIME_VERIFIED.** `analyzer/src/gitleaks.ts`, `analyzer/tests/gitleaks.test.ts`. Runs `gitleaks dir` and `gitleaks git` on the repository. Clean in both is PASS; a leak in either is FAIL with a P1 finding per scope; history that cannot be scanned (exit 1) is UNVERIFIED; any other exit code is ERROR. A PASS means no secrets in the working tree and in the history present in the clone (a shallow clone has less), and says so. Tests assert that a secret printed to the fake tool's stdout and stderr never appears in the report. Assumed, not run: the `--version` and exit-code behaviour.

**Semgrep adapter: IMPLEMENTED, not RUNTIME_VERIFIED.** `analyzer/src/semgrep.ts`, `analyzer/tests/semgrep.test.ts`. Applies when the repository has TS/JS or Python source. Rules come only from `.governance/semgrep/*.yml` in the repository, with `--metrics=off --disable-version-check` and never `--config auto` or a registry name; source without a rule set is UNSUPPORTED. ERROR severity is P1 (FAIL), WARNING is P2 (WARN), INFO is counted in the evidence and not emitted, and an unknown severity is P1. Any reported scan error, or a rule set whose content was not ingested, caps the result at UNVERIFIED. The SHA-256 of the rule set is recorded in the evidence. No rule set is authored here: writing and reviewing security rules is a separate piece of work, and no repository currently has one.

**Effect on `--run-tools`.** The secret scan applies to every non-empty repository, and Semgrep to every repository with source code. A missing scanner or rule set is UNSUPPORTED, which makes the whole analysis PARTIAL (`normalize.ts`), which makes control applicability UNVERIFIED. Under `--run-tools`, installing gitleaks is therefore a prerequisite for a COMPLETE analysis, and so is a reviewed Semgrep rule set for repositories with source code. This is deliberate (an unsupported check never passes silently) but it widens the blast radius of a missing tool; it applies only to the opt-in flag.

## 9. Next steps

1. Run the three adapters once against real output (a scratch project with known-vulnerable pins and a planted fake secret; this repository's lockfiles) and replace the hand-written fixtures with captured output. This is what moves them to RUNTIME_VERIFIED.
2. Settle DEBT-GOV-009 before any scanner evidence is linked to a control.
3. Author and review a first Semgrep rule set under `.governance/semgrep/`, checking the Semgrep Rules License before using any registry rule.
4. Pinned-binary provisioning with checksum verification in CI, then enable `--run-tools` scanning in the reusable workflow.
5. Re-evaluate Betterleaks once its behaviour is verified.
6. Run on a real project, review false positives, then decide enforcement.
