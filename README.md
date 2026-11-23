# Engineering Governance Framework

A production-grade engineering governance framework defining standards, rules, quality gates, review processes, and production-readiness requirements for building, reviewing, deploying, and maintaining reliable software systems.

## AI Agent Entry Point

`AGENTS.md` is the root AI-agent entrypoint for this framework. When this repository is provided to an AI coding agent, `AGENTS.md` tells the agent how to discover and apply the relevant governance standards without loading the entire framework into context by default.

The agent is expected to:

- identify the standards relevant to the requested task
- treat GOV-000 as the governing authority
- load detailed standards only when applicable
- preserve project requirements and approved architecture decisions
- produce engineering evidence rather than unsupported claims
- record technical debt when appropriate
- use EXC-021 for explicit governance exceptions
- use PRD-018 for production-readiness assessment
- never silently bypass mandatory governance requirements

**Important:** `AGENTS.md` provides agent guidance; it does not replace engineering enforcement. CI/CD, automated tests, security controls, code review, production gates, and human approval remain enforcement mechanisms.

## Purpose

This repository defines the engineering standards used to govern software work from project inception through production operation.

The framework is intentionally stronger than a coding-style guide. It defines how engineering decisions are made, what evidence is required, when work can progress, and when software is safe to approve for production.

## Governance Model

```
Project Start
     ↓
Requirements
     ↓
Architecture
     ↓
Technical Design
     ↓
Implementation
     ↓
Testing
     ↓
Code Review
     ↓
Security Review
     ↓
Production Readiness
     ↓
Deployment
     ↓
Observability
     ↓
Maintenance
```

## Standards

| ID | Standard | Status |
|---|---|---|
| GOV-000 | Engineering Governance Constitution | ✅ Published |
| REQ-001 | Requirements Engineering Standard | ✅ Published |
| ARC-002 | Architecture & System Design Standard | ✅ Published |
| BE-003 | Backend Engineering Standard | ✅ Published |
| FE-004 | Frontend Engineering Standard | ✅ Published |
| DB-005 | Database Engineering Standard | ✅ Published |
| API-006 | API Governance Standard | ✅ Published |
| SEC-007 | Security Engineering Standard | ✅ Published |
| QA-008 | Testing & Quality Engineering Standard | ✅ Published |
| REV-009 | Code Review Standard | ✅ Published |
| AI-010 | AI-Assisted Development Standard | ✅ Published |
| GIT-011 | Git & Version Control Standard | ✅ Published |
| CICD-012 | CI/CD Standard | ✅ Published |
| INFRA-013 | Infrastructure & Environment Standard | ✅ Published |
| OBS-014 | Observability Standard | ✅ Published |
| PERF-015 | Performance Engineering Standard | ✅ Published |
| DOC-016 | Documentation Standard | ✅ Published |
| REL-017 | Release Management Standard | ✅ Published |
| PRD-018 | Production Readiness Standard | ✅ Published |
| INC-019 | Incident Management Standard | ✅ Published |
| DEBT-020 | Technical Debt Standard | ✅ Published |
| EXC-021 | Engineering Exception Standard | ✅ Published |
| GOV-022 | Governance Lifecycle & Operating Standard | ✅ Published |
| GOV-023 | Engineering Evidence & Traceability Standard | ✅ Published |

## Severity Model

| Severity | Meaning | Default Production Decision |
|---|---|---|
| P0 | Critical | 🚫 Block |
| P1 | High | 🚫 Normally block |
| P2 | Medium | ⚠️ Conditional |
| P3 | Low | ✅ Generally permitted |

## Core Principle

> **Anyone can build. Anyone can use AI. Anyone can propose an implementation. Production approval requires engineering evidence.**

The LSGE acts as the engineering quality gate, protecting the system from unacceptable technical risk while allowing the team to move quickly within defined boundaries.

## Executable Governance Layer

The standards are now treated as **governance policy**, not as the product itself.

The executable layer converts that policy into machine-readable objects that can later be evaluated by a governance engine, CLI, CI pipeline, repository scanner, and AI context generator.

```
Standards
   ↓
Machine-readable Governance Model
   ↓
Rules / Controls
   ↓
Evidence
   ↓
Evaluation
   ↓
Decision
   ↓
Enforcement
```

### Current executable artifacts

- [Governance Model Schema](22-governance-operations/model/governance-model.schema.json)
- [Example Governance Pack](22-governance-operations/model/example-governance-pack.json)
- [Rule & Control Engine](22-governance-operations/engine/)
- [Repository Analyzer](22-governance-operations/analyzer/)
- [Governance CLI](22-governance-operations/cli/)
- [Architecture Profiles](22-governance-operations/model/)
- [Known Technical Debt](22-governance-operations/KNOWN-DEBT.md)

The schema defines the canonical model for:

- Projects
- Changes
- Standards
- Controls
- Evidence
- Risks
- Decisions
- Exceptions
- Technical debt

The example pack demonstrates a real change flowing through controls and evidence to a **NO-GO** production decision because a P1 idempotency requirement remains unverified.

### Execution layers

Status uses the vocabulary in the [master implementation plan](22-governance-operations/MASTER-IMPLEMENTATION-PLAN.md).

1. **Governance Model** — machine-readable policy objects (`TEST_VERIFIED`)
2. **Rule Engine** — determine which controls apply to a change and derive deterministic decisions (`TEST_VERIFIED`)
3. **Repository Analyzer** — detect languages/frameworks and normalize implementation evidence (`TEST_VERIFIED`)
4. **Governance CLI** — `check`, `validate`, `report`, `analyze` and the other commands in the [command reference](#command-reference), with stable exit codes (`RUNTIME_VERIFIED`)
5. **CI Enforcement** — block unsafe changes automatically (`IMPLEMENTED`: this repository's CI plus a reusable workflow other repositories can call, see [templates](22-governance-operations/templates/README.md); not yet adopted by another repository)
6. **AI Context Generator** — produce task-specific governance context (`PLANNED`)
7. **Governance UI** — visualize risk, evidence, debt, exceptions, and readiness (`PLANNED`)

The goal is to prevent the framework from becoming documentation-only governance.

## Using the Governance CLI

The CLI is a development preview. Its decision is one piece of evidence, not a production-readiness approval. Full detail is in the [CLI README](22-governance-operations/cli/README.md).

### Set up

Requires Node.js 22 or later (`gpg` only for signed approvals and checkpoints; `osv-scanner`, `gitleaks` and `semgrep` only for `--run-tools`).

```bash
cd 22-governance-operations/cli
npm ci
npm run build
```

In the examples below, `governance` stands for `node 22-governance-operations/cli/dist/cli/src/index.js`, run from the root of this repository. `<repo>` is the repository you want to assess; use `.` for the one you are standing in.

### Typical workflow

1. **Look first:** `governance analyze <repo>` shows what the framework can and cannot see. It needs no pack.
2. **Create a pack:** `governance init <repo>` writes `.governance/governance-pack.json`. The pack asserts nothing, so `check` returns NO-GO until you add real controls and evidence.
3. **Fill it in:** add the controls that apply, each tied to a standard, with evidence from real checks or reviews. Set `project.repository` (it starts as `UNSET`) and the `change` being assessed. Never copy the example pack into a real project, because its evidence is declared, not real.
4. **Validate it:** `governance validate <repo>` exits 0 if the pack is valid and 3 if not. It is quick enough for a pre-commit hook.
5. **Get a decision:** `governance check <repo> --base origin/main --run-tools`.
6. **Read the report:** `governance report <repo> --write` saves it as Markdown.
7. **Keep the record:** add `--record` to `check` or `report`, then use `history` and `diff` to see what changed between assessments.

### Command reference

| Command | What it does | Usage |
|---|---|---|
| `analyze` | Detects languages, frameworks, packages, architecture and analyzer coverage. No pack needed. | `governance analyze <repo> [--profile <file>] [--base <git-ref>] [--run-tools] [--json]` |
| `init` | Creates a pack that asserts nothing. Never overwrites an existing file. | `governance init <repo> [--id <slug>] [--name <text>] [--repo <owner/name>] [--environment <name>] [--pack <file>]` |
| `validate` | Checks the pack, profile, registry, catalog or authority policy against their schemas. No analysis. | `governance validate <repo> [--pack <file>] [--profile <file>] [--registry <file-or-dir>] [--catalog <file>] [--authority <file>]` |
| `check` | Analyzes the repository, evaluates the pack and derives **GO**, **GO WITH CONDITIONS** or **NO-GO**. | `governance check <repo> [--pack <file>] [--profile <file>] [--base <git-ref>] [--run-tools] [--record] [--json]` |
| `report` | The same assessment and exit codes as `check`, rendered as Markdown (default) or JSON. `--write` also saves it to `.governance/reports/`. | `governance report <repo> [--write] [--format markdown\|json] [same options as check]` |
| `summarize` | One status report per repository: decision, controls, open findings, and which of the eight review areas are covered. Computed from files. | `governance summarize <repo> [--json] [--write]` |
| `architecture` | Shows which architecture style the repository resembles and what it could follow instead. Advice from folder names and counts, not a verification. | `governance architecture <repo> [--json]` or `governance architecture --list` |
| `discover` | Read-only scan of a folder for git repositories, with facts about each. | `governance discover <folder> [--json]` |
| `history` | Verifies the hash-chained assessment history and lists each issue's first seen, resolved and reopened state. | `governance history <repo> [--authority <file>] [--json]` |
| `diff` | Compares two numbered recorded assessments: decision, resolved and new issues, changed evidence. | `governance diff [<repo>] <a> <b> [--json]` |
| `checkpoint` | GPG-signs the newest history record, so deleted newest records can be detected. | `governance checkpoint <repo> --sign <gpg-key>` |
| `exception` | Manages the exception lifecycle in the pack: `request`, `approve`, `renew`, `expire`, `list`. | see [Exceptions](#exceptions) |

Flags that `check` and `report` also accept:

- `--base <git-ref>`: compares the pack's declared `change.files` with the files changed since that revision. Without it the scope is "not requested" and the decision is at best conditional.
- `--run-tools`: runs the local checks (TypeScript, Python syntax, Go syntax, and the `osv-scanner`, `gitleaks` and `semgrep` scanners if installed). Opt-in. Use it only on repositories you trust. A tool that is missing is reported as `UNSUPPORTED`; it never counts as a pass. It also reads JUnit XML test reports from `.governance/evidence/tests/*.xml` if you put them there (run your tests first and write the report there); a failed test raises a P1 finding. Nothing runs your tests for you, and without reports nothing changes. LCOV coverage reports in `.governance/evidence/lcov/*.info` are read the same way and shown as a measurement only: coverage never passes or fails, because QA-008 section 24 sets no threshold and says it is not proof of quality. It likewise reads SARIF 2.1.0 lint reports from `.governance/evidence/lint/*.sarif` (an error raises a P2 finding, a warning a P3); nothing runs your linter either. And it reads GitHub Actions run data from `.governance/evidence/ci/*.json` (save it with `gh api repos/OWNER/REPO/actions/runs?head_sha=SHA`): a failed workflow raises a P1 finding, and the result can pass only when a run on the current Git HEAD is green and no tracked file is modified.
- `--record`: appends the assessment to `.governance/history/assessments.jsonl`.
- `--registry <file-or-dir> --project <id>`: lets a project record decide which pack and architecture profile apply.
- `--catalog <file>`: checks the pack against the control catalog.
- `--authority <file>` and `--verify-signatures`: applies the approver-authority policy and requires signed exception approvals to verify.

Paths given to `--pack`, `--profile` and the other file flags are relative to the repository being assessed. By default `check` reads `.governance/governance-pack.json`.

#### Exceptions

```bash
governance exception request <repo> --id EXC-001 --control SEC-AUTH-001 --reason "Bounded, tracked in TICKET-1" --by "Requester Name"
governance exception approve <repo> --id EXC-001 --by "Approver Name" --role <ROLE> --expires 2026-12-31 [--sign <gpg-key>]
governance exception renew   <repo> --id EXC-001 --by "Approver Name" --role <ROLE> --expires 2027-03-31 [--sign <gpg-key>]
governance exception expire  <repo>
governance exception list    <repo> [--authority <file>] [--json]
```

1. `request` adds a REQUESTED exception to the pack.
2. `approve` records the approver, their role and an expiry. The requester cannot approve their own request.
3. `renew` is a fresh approval with a later expiry for an approved or expired exception.
4. `expire` marks every approved exception whose time has passed as EXPIRED. An expired exception stops holding at check time either way.
5. `list` shows days left, and with `--authority` whether each signature verifies.

These commands edit the pack but never take a decision; `check` still decides. An exception can waive a P2 or P3 control. A P1 waiver holds only when the approver holds an approved role in the authority policy (none is approved yet), and a P0 waiver never holds.

### Exit codes

| Code | Meaning |
|---:|---|
| `0` | GO, complete analysis, or a pack created by `init` |
| `1` | GO WITH CONDITIONS or partial analysis |
| `2` | NO-GO |
| `3` | Invalid arguments, invalid pack, or an execution error |

Without a pack, `check` exits 3 and says so. It never reports a decision for a project it could not assess.

### Using it from Claude Code

The [plugin](plugins/engineering-governance/README.md) bundles the CLI, so nothing needs to be built.

```text
/plugin marketplace add Inflame21/engineering-governance
/plugin install engineering-governance@engineering-governance
```

New here? After installing, open Claude Code at your repository's root and run `/engineering-governance:start`. It explains the plugin and the order to run things in, and runs nothing. Then try `/engineering-governance:analyze` (changes nothing) and `/engineering-governance:audit` (a full set of reports).

Nothing runs automatically. Options are passed through, for example `/engineering-governance:check --base origin/main --run-tools`.

| Slash command | What it does |
|---|---|
| `/engineering-governance:start` | New here? Prints what the plugin does and which command to run first. Runs nothing and writes nothing. |
| `/engineering-governance:audit [repository]` | Start here for reports. Documents the repository, reviews each applicable area, and writes an ordered set of Markdown reports with a prioritized plan to `.governance/reports/`. Slow and token-heavy; it asks before starting. |
| `/engineering-governance:docs [repository]` | Writes developer and user documentation feature by feature to `.governance/docs/`. Slow and token-heavy; it asks before starting. |
| `/engineering-governance:documentation <type>` | Writes documents from the code. Types: `docs` (the same as `/docs`), `runbook` (deploy, rollback, health, failures, alerts; to `.governance/runbooks/`), `adr` (architecture decision records inferred from the code; to `.governance/adr/`), `onboarding` (a first-day guide for new contributors; to `.governance/onboarding/`) and `api` (an endpoint-by-endpoint API reference from routes, schemas and tests, calling nothing; to `.governance/api-reference/`). With no type it lists them. |
| `/engineering-governance:quality <type>` | `debt` (a technical debt register with proposed severities and blank owners, to `.governance/debt/`) or `test-plan` (what is tested, what is not and what to test first, to `.governance/test-plans/`; nothing is run). Neither changes the pack. |
| `/engineering-governance:security threat-model` | Writes a threat model (assets, actors, entry points, trust boundaries, threats and the controls found) to `.governance/security/`. Nothing is tested. |
| `/engineering-governance:release <type>` | `plan` (checklist, migrations, rollback), `readiness` (an evidence matrix, never a GO/NO-GO) or `changelog` (notes drafted from git history), written to `.governance/release/`. |
| `/engineering-governance:operations <type>` | `incident` (a blameless review built from what you tell it, to `.governance/incidents/`) or `exception` (a draft exception request to `.governance/exception-drafts/`; it records nothing in the pack). |
| `/engineering-governance:setup` | Drafts a governance pack for each repository in the folder and, with your permission, runs the project's own checks and records the real results as evidence. Also fills in the empty pack `init` wrote. AI-drafted, so review it. |
| `/engineering-governance:review <area>` | Reviews one area (security, architecture, api, data, testing, cicd, frontend, observability) against the standards, writes a report, and adds the findings to the pack. Findings are leads for a person to confirm. |
| `/engineering-governance:summary` | Writes one status report per repository, with clearly labelled AI suggestions appended. |
| `/engineering-governance:init` | Creates the empty pack. |
| `/engineering-governance:analyze` | Inspects structure and analyzer coverage. |
| `/engineering-governance:check` | Derives the decision. Needs a pack. |
| `/engineering-governance:report` | The same assessment as `check`, as a full report. |
| `/engineering-governance:validate` | Validates the pack, profile, registry, catalog or authority policy. |

Only `audit`, `docs`, `documentation`, `quality`, `security`, `release`, `operations`, `setup`, `review`, `summary`, `report` and `init` write files, and none overwrites one. Start Claude Code at the repository root. Only `validate` and `check` have been seen running in a live session so far.

## Repository Structure

```
engineering-governance/
├── AGENTS.md
├── 00-governance/
├── 01-requirements/
├── 02-architecture/
├── 03-backend/
├── 04-frontend/
├── 05-database/
├── 06-api/
├── 07-security/
├── 08-testing/
├── 09-code-review/
├── 10-ai-development/
├── 11-git/
├── 12-cicd/
├── 13-infrastructure/
├── 14-observability/
├── 15-performance/
├── 16-documentation/
├── 17-release/
├── 18-production-readiness/
├── 19-incidents/
├── 20-technical-debt/
├── 21-exceptions/
└── 22-governance-operations/
    ├── 22-governance-lifecycle-standard.md
    ├── 23-engineering-evidence-traceability-standard.md
    └── model/
        ├── governance-model.schema.json
        └── example-governance-pack.json
```

## Published Documents

### AI Agent Entry Point

- [AGENTS.md — AI Agent Governance Instructions](AGENTS.md)

### Standards

- [GOV-000 — Engineering Governance Constitution](00-governance/00-engineering-governance-constitution.md)
- [REQ-001 — Requirements Engineering Standard](01-requirements/01-requirements-engineering-standard.md)
- [ARC-002 — Architecture & System Design Standard](02-architecture/02-architecture-system-design-standard.md)
- [BE-003 — Backend Engineering Standard](03-backend/03-backend-engineering-standard.md)
- [BE-003 Profile — FastAPI](03-backend/profiles/fastapi.md)
- [FE-004 — Frontend Engineering Standard](04-frontend/04-frontend-engineering-standard.md)
- [DB-005 — Database Engineering Standard](05-database/05-database-engineering-standard.md)
- [API-006 — API Governance Standard](06-api/06-api-governance-standard.md)
- [SEC-007 — Security Engineering Standard](07-security/07-security-engineering-standard.md)
- [QA-008 — Testing & Quality Engineering Standard](08-testing/08-testing-quality-engineering-standard.md)
- [REV-009 — Code Review Standard](09-code-review/09-code-review-standard.md)
- [AI-010 — AI-Assisted Development Standard](10-ai-development/10-ai-assisted-development-standard.md)
- [GIT-011 — Git & Version Control Standard](11-git/11-git-version-control-standard.md)
- [CICD-012 — CI/CD Standard](12-cicd/12-ci-cd-standard.md)
- [INFRA-013 — Infrastructure & Environment Standard](13-infrastructure/13-infrastructure-environment-standard.md)
- [OBS-014 — Observability Standard](14-observability/14-observability-standard.md)
- [PERF-015 — Performance Engineering Standard](15-performance/15-performance-engineering-standard.md)
- [DOC-016 — Documentation Standard](16-documentation/16-documentation-standard.md)
- [REL-017 — Release Management Standard](17-release/17-release-management-standard.md)
- [PRD-018 — Production Readiness Standard](18-production-readiness/18-production-readiness-standard.md)
- [INC-019 — Incident Management Standard](19-incidents/19-incident-management-standard.md)
- [DEBT-020 — Technical Debt Standard](20-technical-debt/20-technical-debt-standard.md)
- [EXC-021 — Engineering Exception Standard](21-exceptions/21-engineering-exception-standard.md)
- [GOV-022 — Governance Lifecycle & Operating Standard](22-governance-operations/22-governance-lifecycle-standard.md)
- [GOV-023 — Engineering Evidence & Traceability Standard](22-governance-operations/23-engineering-evidence-traceability-standard.md)

### Executable Governance

- [Governance Model Schema](22-governance-operations/model/governance-model.schema.json)
- [Example Governance Pack](22-governance-operations/model/example-governance-pack.json)

## Status

The standards layer is intentionally frozen at GOV-023 while the framework moves into executable governance. Role naming uses the Lead Software Governance Engineer (LSGE).

**Current baseline:** GOV-023 standards plus the executable governance platform on `main`
**Implemented:** deterministic, fail-closed control evaluation; schema-validated governance packs; repository analysis for TypeScript/JavaScript, Python and Go (Go has no route, database or event detection yet, DEBT-GOV-025); architecture-boundary verification; a runnable CLI (see the [command reference](#command-reference)); and CI for the governance packages
**Not yet done:** registered projects (the registry schema and validation exist, but it is empty), an approved control catalog (a draft of 88 controls exists, covering the governance, security, testing, CI/CD and database blocker lists, none enforced), approved approver-authority roles with named holders (the model exists, all roles are draft), security scanners (the dependency, secret and static-analysis adapters replay output captured from the real tools, but only on tiny fixtures, and the one Semgrep rule set, 15 rules in `.governance/semgrep/`, has been checked only against its own test cases and this repository, DEBT-GOV-010 and DEBT-GOV-029), adoption of the reusable CI workflow by another repository, and a pilot on real projects
**Direction:** a draft operating blueprint in [docs/](docs/engineering-governance-operating-blueprint.md) proposes the next steps. It is pending leadership approval and is not policy.
**Detail:** see the status table in the [master implementation plan](22-governance-operations/MASTER-IMPLEMENTATION-PLAN.md) and the [debt register](22-governance-operations/KNOWN-DEBT.md).

## License

Released under the [PolyForm Shield License 1.0.0](LICENSE). In short: you may use, modify and redistribute these materials for any purpose, except to provide a product that competes with this one. It is source-available, not open source; read the full text, which controls. Files that the tools generate for your own projects (governance packs, reports, workflow and pull-request templates) are yours to keep in your own repositories. Third-party components keep their own licenses (see `plugins/engineering-governance/THIRD-PARTY-NOTICES.md`).
