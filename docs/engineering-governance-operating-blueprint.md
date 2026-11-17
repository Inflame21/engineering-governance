# Engineering Governance Operating Blueprint
## Role Charter, Repository Assessment, Target Architecture and 90-Day Execution Plan

**Prepared for:** Lead Software Governance Engineer  
**Organization scope:** Software development company; all projects and engineering teams  
**Document status:** Working draft for CTO / Head of Engineering approval  
**Version:** 1.0  
**Prepared:** 16 November 2026  
**Repository assessed:** [Inflame21/engineering-governance](https://github.com/Inflame21/engineering-governance)

---

# 1. Executive Summary

This blueprint translates the review of the `engineering-governance` repository into an organization-wide operating plan. It is intended to be the working blueprint for the Lead Software Governance Engineer (LSGE), not a replacement for the repository's existing standards.

**Executive assessment:** the repository has a broad and thoughtful policy foundation, plus an early executable implementation. It is not yet an operational, organization-wide governance platform. The next stage must connect policy to machine-readable controls, real verification, traceable evidence, enforced CI gates, project ownership, audit operations and management reporting.

The recommended strategy is to preserve GOV-000 through GOV-023, retain the separation between policy, analysis and decision-making, resolve the known engine weaknesses, and build a reliable end-to-end governance path before adding a dashboard or broad integrations.

## 1.1 Key recommendations

1. **Formalize the role before enforcing organization-wide rules.** Obtain written approval for the charter, decision rights, escalation path and risk-acceptance boundaries.
2. **Keep the existing standards architecture.** Improve and operationalize it; do not restart the document hierarchy or create a competing governance framework.
3. **Resolve the open evidence-authority pull request.** PR #4 addresses an important fail-open weakness, has successful CI checks on its head commit, but was still open and blocked by the review requirement at the time of inspection.
4. **Fix correctness before feature breadth.** Runtime schema validation, vacuous-GO prevention, explicit risk visibility, exception evaluation and deterministic decisions are prerequisites for trust.
5. **Complete a runnable CLI.** Teams need a reproducible command that analyzes a repository, validates its governance configuration, produces an actionable report and returns reliable exit codes.
6. **Verify real engineering properties.** File-name and manifest heuristics can identify candidate technologies; they cannot prove that tests pass, security controls work or architecture boundaries are respected.
7. **Pilot before rollout.** Start with two representative projects, prove the controls are useful and non-disruptive, then onboard the remaining portfolio progressively.

## 1.2 Intended end state

The repository should become the authoritative source for engineering policy and the maintained implementation of a governance capability that can:

- register projects, repositories, technical owners and approved architecture profiles;
- map mandatory standard requirements to versioned controls;
- identify which controls apply to a project or change;
- execute or consume trusted verification results;
- preserve evidence provenance, freshness and commit association;
- derive GO, GO WITH CONDITIONS or NO-GO decisions deterministically;
- manage findings, exceptions, remediation and audit history;
- enforce the appropriate controls in pull requests and release workflows; and
- report engineering risk and compliance trends to project leads and executive leadership.

---

# 2. Audit Scope, Method and Snapshot

## 2.1 Scope inspected

The review covered the public repository tree and selected source files and standards, including:

- `README.md`, `AGENTS.md` and GOV-000;
- requirements, architecture, backend, FastAPI profile, frontend, database, API, security, testing, code-review, AI-development, Git, CI/CD, infrastructure and observability standards;
- GOV-022 lifecycle and GOV-023 evidence traceability;
- EXC-021 exception handling;
- `22-governance-operations/MASTER-IMPLEMENTATION-PLAN.md`;
- the governance model JSON Schema and example governance pack;
- Engine, Analyzer and CLI source, tests and package manifests;
- GitHub Actions workflow runs, the active main-branch ruleset and PR #4 metadata.

The inspection was read-only. No repository files, settings, issues, branches or pull requests were modified.

## 2.2 Snapshot findings as of 16 November 2026

| Item | Observed state | Interpretation |
|---|---|---|
| Default branch | `main` | Main is the published policy baseline. |
| Main commit | `ca1ea5a4ef096ffefe74b2331cc8d8483d38bc9e` | Main had not advanced beyond the implementation-plan commit in the inspected repository snapshot. |
| Latest repository push reported by GitHub | 14 October 2026 | No later push was reported at audit time. |
| Standards | GOV-000 through GOV-023 | 24 standards are present in the tree. |
| Executable foundation | Engine, Analyzer, CLI, model schemas | The components exist, but key end-to-end capabilities remain incomplete. |
| PR #4 | Open, not merged; head `b770a68357629a74473f82e1e2667d1419e993d4` | Changes are not part of `main` at this snapshot. |
| PR #4 CI | Verify Engine, Analyzer and CLI passed | The reported workflow completed type-check, test and build steps successfully on that PR head. |
| PR #4 review state | No review recorded; no reviewer requested | The active ruleset requires one approving review, so the PR remained blocked. |
| Main ruleset | Active | Requires one approval, required status checks, stale-review dismissal and review-thread resolution. |

**Verification limitation:** this was a GitHub source and metadata inspection. The workspace did not perform a fresh local checkout and execute all commands independently. The successful CI result cited above is the GitHub Actions evidence for PR #4's head commit, not a claim that the current `main` branch has been re-tested during this review.

## 2.3 Source references

- Repository: https://github.com/Inflame21/engineering-governance
- Main constitution: https://github.com/Inflame21/engineering-governance/blob/main/00-governance/00-engineering-governance-constitution.md
- AI agent entry point: https://github.com/Inflame21/engineering-governance/blob/main/AGENTS.md
- Governance lifecycle: https://github.com/Inflame21/engineering-governance/blob/main/22-governance-operations/22-governance-lifecycle-standard.md
- Evidence traceability: https://github.com/Inflame21/engineering-governance/blob/main/22-governance-operations/23-engineering-evidence-traceability-standard.md
- Master implementation plan: https://github.com/Inflame21/engineering-governance/blob/main/22-governance-operations/MASTER-IMPLEMENTATION-PLAN.md
- PR #4: https://github.com/Inflame21/engineering-governance/pull/4
- Active main ruleset: https://github.com/Inflame21/engineering-governance/rules/24978229
- PR #4 successful workflow run: https://github.com/Inflame21/engineering-governance/actions/runs/38534428564

---

# 3. Repository Assessment

## 3.1 What already exists

| Area | Existing repository assets | Assessment |
|---|---|---|
| Governance constitution | GOV-000 | Strong foundation; authority and role labels need alignment with the assigned LSGE role. |
| Requirements and architecture | REQ-001, ARC-002 | Broad coverage of requirements readiness, boundaries, architecture decisions and lifecycle concerns. |
| Technology standards | BE-003, FE-004, DB-005, API-006 and FastAPI profile | Good technology/domain coverage; continue to add profiles only where the organization needs them. |
| Security and quality | SEC-007, QA-008, REV-009 | Broad policy coverage; connect requirements to executable controls and evidence. |
| AI development | AI-010 and `AGENTS.md` | Strong context-routing and human-accountability principles; preserve this design. |
| Delivery and operations | GIT-011 through INC-019 | Covers source control, CI/CD, infrastructure, observability, performance, release, readiness and incidents. |
| Debt and exceptions | DEBT-020, EXC-021 | Good governance concepts; executable lifecycle and authorization remain to be developed. |
| Governance operations | GOV-022, GOV-023 | Strong lifecycle and evidence concepts; convert them into operational records and workflows. |
| Machine-readable model | JSON Schema and example pack | Useful starting point; runtime validation and contract consistency are incomplete. |
| Rule & Control Engine | Control applicability, evidence checks and decision derivation | Early foundation; correctness edge cases and exception semantics remain. |
| Repository Analyzer | Generic, Python, TypeScript and framework adapters | Detects repository signals; not yet a proof-producing verifier. |
| CLI | command, config, filesystem and output modules | Programmatic foundation; not yet a complete installable CLI experience. |

## 3.2 What should be preserved

The following decisions are sound and should remain architectural constraints:

- **Policy is separate from implementation.** Standards describe what must be true; machine-readable controls and adapters describe how selected properties are verified.
- **The rule engine is language/framework independent.** Technology-specific adapters normalize their output into a common governance vocabulary.
- **Evidence is distinct from claims.** A developer's assertion or an AI-generated explanation must not become proof of a material production property.
- **Governance is risk-based.** Higher-risk systems and changes require stronger verification and review.
- **Exceptions are explicit and auditable.** Deviations must have an owner, justification, mitigation, approval authority and expiry/review condition.
- **AI is not an approval authority.** AI-assisted changes remain subject to the same engineering accountability and verification requirements.
- **The CLI and CI are the first execution surfaces.** A dashboard should not be used to conceal an incomplete decision engine or missing evidence model.

## 3.3 Findings and required action

| ID | Priority | Finding | Required action |
|---|---|---|---|
| GOV-F01 | P0 | The constitution's authority description and responsibility allocation do not fully match the organization-wide Lead Software Governance Engineer mandate. | Ratify a role charter, authority matrix and separation of responsibilities; update GOV-000 and GOV-022. |
| GOV-F02 | P0 | PR #4 is not merged into `main` at the audit snapshot. Main therefore retains the earlier evidence-evaluation behavior. | Obtain the required independent approval, resolve remaining review comments and merge only when repository rules are satisfied. |
| GOV-F03 | P0 | The engine can produce a GO for an empty pack or a pack where no controls apply (documented as DEBT-GOV-003 on PR #4). | Introduce an explicit `NOT_EVALUATED` / `INSUFFICIENT_SCOPE` result or fail closed; never allow a vacuous GO. |
| GOV-F04 | P1 | The CLI governance-pack loader parses JSON and casts it to `GovernancePack`; it does not perform runtime JSON Schema validation. | Validate at the CLI boundary; emit structured diagnostics and a non-zero exit code for invalid packs. |
| GOV-F05 | P1 | P2/P3 risks are not surfaced in the PR #4 decision output (documented as DEBT-GOV-004). | Show all unresolved risks; distinguish blocking findings from accepted/conditional findings. |
| GOV-F06 | P1 | The current CLI entry point only exports output functions; filesystem and command-line integration are incomplete. | Build a real executable CLI with `validate`, `analyze`, `check`, `report`, `version` and help commands. |
| GOV-F07 | P1 | Analyzer heuristics identify technologies and folder patterns, but do not prove tests, security behavior or architectural conformance. | Separate discovery signals from verification evidence; integrate trusted tools and mark unsupported checks `UNVERIFIED` or `UNSUPPORTED`. |
| GOV-F08 | P1 | Architecture profile validation and style signals exist, but actual dependency-edge and boundary verification does not. | Implement repository graph extraction and profile-driven boundary checks with fixtures and negative tests. |
| GOV-F09 | P1 | There is no organization-wide project registry or operational portfolio inventory in the repository. | Add project metadata, owners, repository mapping, criticality, data classification and profile selection. |
| GOV-F10 | P1 | Exceptions are documented but not evaluated by the executable engine. | Add approval identity, authority checks, requester/approver separation, scope, expiry and control-specific waiver semantics. |
| GOV-F11 | P1 | Evidence needs stronger source, tool, commit, run, artifact and freshness provenance. | Extend the evidence contract and retain immutable references to original verification outputs. |
| GOV-F12 | P1 | CI checks run for the governance packages, but the current implementation does not yet demonstrate end-to-end project assessment and enforcement. | First produce a reliable CLI and reusable workflow; pilot on two projects before organization-wide rollout. |
| GOV-F13 | P2 | Package lockfiles are absent from the visible package trees; PR #4 records lockfile and deterministic-install debt. | Commit lockfiles, use `npm ci` or the appropriate frozen-lockfile command, pin supported Node versions and action revisions. |
| GOV-F14 | P2 | README status and implementation plan need to be reconciled with the actual merge state and branch-specific capabilities. | Make status branch-aware and distinguish `PLANNED`, `IMPLEMENTED`, `VERIFIED`, `ACCEPTED` and `RELEASED`. |
| GOV-F15 | P2 | Repository governance metadata such as CODEOWNERS, contribution guidance and a security-reporting policy is not present in the inspected main tree. | Add these controls and route policy/engine changes to independent maintainers. |
| GOV-F16 | P2 | The active ruleset includes a repository-role bypass path, while code-owner approval is not required. | Retain a break-glass path only with restricted membership, documented conditions and audit review; consider CODEOWNERS approval for policy and engine paths. |

## 3.4 Assessment conclusion

The documentation layer is mature enough to begin operational adoption. The executable layer is a prototype/foundation, not yet a production-ready organization-wide platform. The immediate work is therefore not “write more standards”; it is to resolve decision correctness, define organizational ownership and prove an end-to-end assessment on real repositories.

---

# 4. Role Charter — Lead Software Governance Engineer

## 4.1 Role purpose

The Lead Software Governance Engineer (LSGE) is accountable for designing, maintaining, enforcing and continuously improving the organization's software engineering governance framework across all software projects and development teams.

The role ensures that engineering work is performed within approved organizational standards for architecture, security, quality, data management, delivery, production readiness and operational reliability. The LSGE establishes governance requirements and controls; project teams retain ownership of implementation and day-to-day engineering execution.

## 4.2 Mission statement

Establish a measurable, risk-based and enforceable engineering governance system that allows teams to deliver software efficiently while ensuring that material engineering decisions are deliberate, secure, testable, traceable and accountable.

## 4.3 Scope of accountability

The LSGE owns the governance framework across:

1. Engineering policy, standards and policy lifecycle.
2. Architecture principles, review process and decision traceability.
3. Development standards across frontend, backend, API and database engineering.
4. Security governance requirements and escalation coordination.
5. Quality strategy, testing expectations and release quality gates.
6. Repository, branching, pull-request and CI/CD governance.
7. Infrastructure, environment and production-readiness controls.
8. Evidence, audit, exception, risk and technical-debt governance.
9. Organization-wide engineering compliance reporting.
10. AI-assisted development policy and agent instruction standards.

## 4.4 Responsibilities

| Responsibility | Expected activity | Evidence / output |
|---|---|---|
| Policy ownership | Define, approve within delegated authority, version and review engineering standards. | Controlled standards and change history. |
| Architecture governance | Define principles, review material designs, require ADRs and monitor deviations. | Architecture review records and ADR references. |
| Control definition | Map mandatory requirements to testable controls, owners and verification methods. | Versioned control catalog. |
| Quality governance | Define minimum test, static analysis and quality gates. | CI policies and quality reports. |
| Security governance | Ensure security requirements are embedded and findings are escalated to the security owner. | Security control matrix and risk register. |
| Delivery governance | Govern branch protection, pull request, CI, release and rollback expectations. | Repository configuration baseline and release evidence. |
| Evidence governance | Define evidence quality, provenance, freshness and retention requirements. | Traceable evidence package and audit records. |
| Audit and remediation | Plan audits, classify findings, assign accountable owners and verify closure. | Audit reports and remediation register. |
| Exception governance | Review deviations within delegated limits and ensure material risk acceptance is authorized. | Approved, scoped and time-bound exception records. |
| Portfolio reporting | Report compliance, high-risk exposure, overdue remediation and systemic patterns. | Monthly governance scorecard. |
| Continuous improvement | Use incident, audit, delivery and developer feedback to improve controls. | Policy revisions and improvement backlog. |

## 4.5 Authority boundaries

The LSGE should have authority to:

- publish mandatory engineering standards within the approved governance charter;
- require applicable architecture, security, quality and production-readiness reviews;
- define mandatory CI checks and release evidence requirements within delegated authority;
- reject or block a change when a published mandatory control fails;
- require remediation and set escalation deadlines;
- audit any in-scope project or repository;
- request evidence from project owners;
- approve low/medium-risk exceptions only when explicitly delegated and when the requester is not the sole approver of their own material deviation; and
- escalate high or critical residual risk to the CTO or designated risk-acceptance authority.

The LSGE does not unilaterally:

- change business requirements or product priorities;
- own the implementation of every project's technical solution;
- replace security, QA, platform or database specialists;
- accept enterprise-level, regulatory or critical security risk without delegated authority;
- approve their own material exception;
- bypass the organization's mandatory independent review or release controls; or
- become the sole reviewer for every code change.

## 4.6 Required organizational sponsorship

The CTO / Head of Engineering should formally approve:

- the LSGE charter and reporting line;
- the authority to publish and enforce mandatory standards;
- the authority to request audits and remediation;
- the escalation path for unresolved findings;
- who can accept P0/P1 or regulatory risk;
- how exceptions are approved and expired; and
- who owns production release authorization.

**Accountability without delegated authority is not a workable governance model.** The charter must be ratified before enforcement is expanded to every project.

---

# 5. Organizational Governance Operating Model

## 5.1 Three-level operating structure

| Level | Participants | Accountability |
|---|---|---|
| Central governance | LSGE; CTO/Head of Engineering sponsor; specialist security/QA/platform representatives as needed | Own policy, control catalog, assessment process, audit, escalation and organization-wide reporting. |
| Project governance | Project Technical Lead and a nominated governance representative | Apply standards in the project, maintain evidence, coordinate audits and own remediation delivery. |
| Delivery teams | Developers, QA, DevOps/platform, security and database specialists | Implement, test, review, deploy and operate software according to approved standards. |

The project governance representative is a functional responsibility, not necessarily a new management role. One person may cover multiple small projects when capacity and independence remain adequate.

## 5.2 Governance lifecycle

The operating lifecycle should extend GOV-022 rather than replace it:

1. **Register:** identify project, repository, owner, business criticality, data classification, environments and technology profile.
2. **Classify:** determine project risk and classify each material change using the existing GOV-022 change classes.
3. **Select:** identify standards and controls applicable to the project and change.
4. **Design:** verify requirements readiness, architecture boundaries and material decisions.
5. **Implement:** teams build within the approved architecture and engineering standards.
6. **Verify:** execute appropriate tests, scans, analysis and review; collect provenance-rich evidence.
7. **Decide:** derive a governance outcome from verified evidence, unresolved findings and authorized exceptions.
8. **Release:** the authorized release owner performs deployment in accordance with release policy.
9. **Operate:** monitor service health, incidents, security signals and SLOs.
10. **Improve:** feed incidents, audit findings, debt and repeated exceptions back into controls and standards.

## 5.3 Risk-based enforcement

Use GOV-022 change classes (A: routine, B: material, C: high risk, D: emergency) as the starting point. Define objective criteria in the standard rather than inventing a second classification system.

| Change class | Typical characteristics | Governance approach |
|---|---|---|
| A — Routine | Low-impact, reversible, limited-scope change with no sensitive-data or trust-boundary impact. | Automated standard checks; normal peer review; lightweight evidence. |
| B — Material | Changes to business behavior, public APIs, data structures, dependencies or major UI workflows. | Full applicable CI checks; explicit test evidence; technical-lead review; relevant ADR or impact assessment. |
| C — High risk | Authentication/authorization, tenant isolation, sensitive data, financial workflows, destructive migrations, critical infrastructure or high availability impact. | Threat/risk assessment; stronger independent review; direct verification; rollback/recovery evidence; explicit release readiness decision. |
| D — Emergency | Incident/security response where delay itself increases harm. | Emergency change procedure; minimum safe controls; preserved evidence; retrospective review and time-bound follow-up. |

## 5.4 Governance enforcement outcomes

Keep the repository's P0–P3 severity model and GO / GO WITH CONDITIONS / NO-GO decision model, but define them precisely:

- **GO:** all applicable mandatory controls are verified; no blocking risks or invalid configuration remain.
- **GO WITH CONDITIONS:** no blocker remains, but bounded findings or approved residual risks have owners, conditions and deadlines. This status must not bypass P0/P1 blockers unless an authorized exception mechanism explicitly permits it.
- **NO-GO:** any applicable mandatory blocker fails, required evidence is missing or invalid, a critical risk remains unresolved, configuration is invalid, or the assessment is materially incomplete.
- **NOT EVALUATED / INSUFFICIENT SCOPE:** optional but recommended explicit state when no meaningful assessment occurred. It must never be represented as GO.

A tool failure, unsupported analyzer, missing evidence or invalid governance pack is not a pass. The result must be an explicit unknown/error state and must fail closed for controls marked mandatory.

## 5.5 Operating cadence

| Cadence | Activity | Required output |
|---|---|---|
| Daily / event-driven | Review P0/P1 escalations, failed mandatory gates and urgent exception requests. | Triage decision, owner and escalation record. |
| Weekly | Project governance representative sync. | Project status, blockers and remediation updates. |
| Weekly | Review material ADRs and control changes. | Decision log and updated control references. |
| Biweekly | Sample project or repository audit. | Findings and evidence references. |
| Monthly | Engineering Governance Review with project/technical leads. | Portfolio scorecard, overdue findings and policy issues. |
| Quarterly | Policy and control effectiveness review with leadership. | Policy revision proposal and maturity assessment. |
| After major incident | Review control gaps, evidence, exception and standard effectiveness. | Root-cause actions and governance improvement items. |

---

# 6. Authority Matrix and RACI

## 6.1 Decision-rights matrix

| Decision | LSGE | Project Lead | Specialist Owner | CTO / Executive |
|---|---|---|---|---|
| Publish organization engineering standards | A/R | C | C | I / sponsor approval for mandate |
| Define mandatory governance controls | A/R | C | C/R in specialist domain | I |
| Select project architecture | C / review | A/R | C | I for material escalation |
| Implement architecture | I / verify compliance | A | R | I |
| Implement a feature | I | A | C | I |
| Define test strategy | C / set minimum policy | A | R (QA where applicable) | I |
| Perform security assessment | C / govern requirement | C | A/R (Security Owner) | I / risk escalation |
| Implement infrastructure | I / govern controls | A | R (Platform/DevOps) | I |
| Conduct governance audit | A/R | C | C | I |
| Deliver remediation | A for oversight | A/R | R | I / escalation |
| Approve routine exception | A only if delegated | C | C | I |
| Accept material/high residual risk | C / recommend | C | C | A/R by delegated risk authority |
| Authorize production deployment | C / readiness control | C | R (Release Owner) | A only where organizational policy requires |
| Change governance policy | A/R | C | C | Approve material mandate changes |

**RACI:** A = accountable; R = responsible; C = consulted; I = informed. Security, privacy, compliance and regulatory obligations may require additional named authorities. The matrix must be tailored to actual company roles and approved by the CTO.

## 6.2 Separation-of-duties rules

- The implementer must not be the sole reviewer of a material change.
- The requester must not be the sole approver of their material exception.
- A critical security risk must be accepted by an authorized risk owner, not merely closed by the project team.
- A governance tool must not approve itself based only on its own assertions.
- Production deployment permission should be separated from policy authoring where practical.
- Administrative bypass must be treated as break-glass access, restricted and reviewed.

---

# 7. Repository Evolution Plan

## 7.1 Preserve the existing repository layout

Do not replace the existing GOV-000 through GOV-023 hierarchy. Add a small organizational governance layer and evolve the executable platform under `22-governance-operations/`.

### Recommended additions

| Proposed path | Purpose |
|---|---|
| `00-governance/01-lead-software-governance-engineer-charter.md` | Formal role mission, scope, responsibilities and authority. |
| `00-governance/02-governance-authority-and-raci.md` | Approved decision rights, separation of duties and escalation. |
| `00-governance/03-organizational-governance-operating-model.md` | Project onboarding, cadence, governance representatives and portfolio operating model. |
| `00-governance/04-project-governance-onboarding.md` | Required project metadata and baseline assessment procedure. |
| `22-governance-operations/registry/projects/` | Version-controlled project registry records or a validated registry manifest. |
| `22-governance-operations/model/catalog/` | Machine-readable standard/control catalog. |
| `22-governance-operations/model/schemas/` | Versioned schemas for governance pack, evidence, findings, exceptions and project profiles. |
| `22-governance-operations/KNOWN-DEBT.md` | Canonical technical-debt register, promoted from the PR branch after review. |
| `22-governance-operations/templates/` | Reusable CLI configuration, project registration, PR and CI templates. |
| `integrations/github/` or `templates/github/` | Reusable GitHub workflow and repository onboarding assets. |
| `.github/CODEOWNERS` | Independent ownership/review rules for policy and enforcement paths. |
| `CONTRIBUTING.md` | Contribution and policy-change workflow. |
| `SECURITY.md` | Vulnerability reporting and security handling guidance. |

Avoid creating a duplicate standard when an existing document already covers the subject. New documents should clarify the operating model, authority or implementation contracts that are currently missing.

## 7.2 Existing documents to update

| Existing asset | Recommended change |
|---|---|
| GOV-000 | Align authority labels and responsibility table with LSGE, project leads, specialist owners, release owners and executive risk acceptance. |
| GOV-022 | Add portfolio onboarding, representatives, governance cadence, escalation and reporting responsibilities. |
| GOV-023 | Require evidence subject/commit, tool/run provenance, freshness, verification status and immutable artifact reference where applicable. |
| EXC-021 | Clarify machine-verifiable approval records, authority by severity, expiry, renewal, requester/approver separation and prohibited waivers. |
| README.md | Show accurate branch/release status; separate policy baseline from executable release status; remove duplicated CLI roadmap numbering. |
| MASTER-IMPLEMENTATION-PLAN.md | Reconcile current PR status, completed work and known debt; preserve phase exit gates. |
| AGENTS.md | Keep as AI-agent entry point; add a short link to the approved role/authority and the exact evidence contracts. |

## 7.3 Governance policy lifecycle

Each standard and control should have:

- stable identifier;
- owner;
- version and effective date;
- status (`DRAFT`, `APPROVED`, `DEPRECATED`, `RETIRED`);
- applicability and scope;
- mandatory/recommended classification;
- verification method;
- evidence requirements;
- exception policy;
- review date and change history.

A policy change should be proposed, impact-assessed, reviewed by relevant specialists, approved by the delegated authority, versioned and communicated before enforcement changes are applied.

---

# 8. Target Governance Platform Architecture

## 8.1 Design principles

- Keep the current TypeScript implementation as a framework-independent core library.
- Keep policy and control definitions separate from runtime implementation.
- Keep repository adapters and tool adapters separate from the deterministic decision engine.
- Use a single canonical contract for controls, evidence, findings, risks, exceptions and decisions.
- Treat unsupported analysis as unknown, never as verified pass.
- Store original tool outputs or stable artifact references; do not retain only AI summaries.
- Add persistence only when historical assessment, remediation and audit workflows require it.
- Do not introduce microservices or a large dashboard before the CLI and CI path is reliable.

## 8.2 Target logical flow

```text
Standards + Versioned Control Catalog + Project Registry + Change Context
                                  |
                                  v
       Repository Analysis + Architecture Analysis + Verification Adapters
                                  |
                                  v
                         Evidence Engine
                                  |
                                  v
               Rule Engine + Risk / Exception Evaluation
                                  |
                                  v
                         Decision Engine
                                  |
                                  v
                  CLI / CI Gate + Audit / Reporting
                                  |
                                  v
                       Teams / Leadership
```

## 8.3 Recommended logical modules

| Module | Responsibility | First implementation surface |
|---|---|---|
| Policy Registry | Standard versions, control definitions, effective dates and applicability. | Versioned JSON/YAML validated by schema. |
| Project Registry | Projects, repositories, owners, criticality, data class and approved profile. | Validated registry file; later database if justified. |
| Repository Analyzer | Inventory files, manifests, languages, frameworks and candidate components. | CLI library and adapters. |
| Architecture Analyzer | Build dependency/component relationships and test profile boundaries. | Analyzer adapter with fixture repositories. |
| Verification Adapters | Execute or ingest trusted tests, type checks, SAST, dependency and secret scans. | Adapter contracts and CLI subprocess integration. |
| Evidence Engine | Validate provenance, freshness, status, source and control linkage. | Core library and evidence schema. |
| Rule & Decision Engine | Evaluate controls, findings, risks, exceptions and final outcome deterministically. | Existing Engine, hardened and expanded. |
| Exception Manager | Request, approve, expire, renew and close deviations. | Engine service + versioned records. |
| Audit Manager | Preserve assessments, decision history and remediation state. | Initially structured artifacts; persistent store later. |
| Integrations | GitHub PR checks, workflow summaries, reusable workflows and other CI providers. | GitHub Actions first. |
| Reporting | Project and portfolio compliance, trends, risks and overdue remediation. | JSON/Markdown reports first; dashboard later. |

These are logical boundaries, not an instruction to create one deployable service per module. Keep the platform as a modular codebase until scale or operational needs justify another deployment boundary.

## 8.4 Canonical domain records

The canonical governance model should explicitly represent:

- **Project:** identity, repository, owner, criticality, data classification, architecture profile, environments and status.
- **Change:** change ID, type, risk class, author, affected files/components, base/head commit and target environment.
- **Standard:** stable ID, version, status, source path and effective date.
- **Control:** standard reference, severity, applicability, verification method, required evidence, failure behavior and owner.
- **Finding:** control reference, severity, status, source location, explanation, affected component and remediation guidance.
- **Evidence:** status, type, source, tool/version, run ID, commit, timestamp, artifact reference, freshness, integrity metadata and supported controls.
- **Risk:** impact, likelihood or risk rationale, owner, status, mitigation and residual risk.
- **Exception:** requester, approver, authority, control, scope, reason, mitigation, expiry and approval evidence.
- **Decision:** assessment ID, outcome, reason, control results, unresolved risks, exceptions, assessor/version and timestamp.
- **Remediation:** finding, owner, due date, status, closure evidence and verification.

Schema and TypeScript types must be generated from or validated against one canonical contract. Avoid independent hand-maintained definitions drifting apart.

---

# 9. Technical Development Roadmap

## 9.1 Release sequence

### Release 0 — Correctness and authority baseline

- Complete PR #4 through required independent review and merge process.
- Promote and maintain `KNOWN-DEBT.md` as the canonical debt register.
- Update role charter and authority documents.
- Fix empty-pack and no-applicable-control outcomes.
- Surface P2/P3 risks and conditional findings.
- Define exact status, severity and exception semantics.

**Exit criteria:** no known vacuous GO; malformed or missing inputs fail closed; all open risks are visible; decisions have deterministic tests.

### Release 1 — Validated governance CLI

Implement:

```bash
governance version
governance validate --config governance.config.json
governance analyze .
governance check .
governance report --format markdown
```

Required capabilities:

- real filesystem adapter and safe repository root handling;
- configuration discovery and explicit config path;
- runtime JSON Schema validation;
- architecture profile validation;
- CLI argument parsing and help;
- human and JSON output;
- stable exit-code contract;
- deterministic installation/build/test process;
- actionable diagnostics for missing or invalid config.

Suggested exit codes:

| Exit code | Meaning |
|---:|---|
| 0 | GO; all applicable mandatory controls passed. |
| 1 | NO-GO; one or more mandatory blockers. |
| 2 | Invalid configuration, schema or project registration. |
| 3 | Assessment incomplete or required analyzer/verification tool failed. |
| 4 | Internal governance tool error. |
| 5 | GO WITH CONDITIONS, if the CI policy chooses to distinguish it from GO. |

The CLI must document whether conditional acceptance is allowed to pass a particular pipeline. Do not make that choice implicit.

### Release 2 — Control catalog and real verification

- Create a versioned catalog of mandatory controls from existing standards.
- Link each control to a standard section and policy version.
- Define applicability rules and verification capabilities.
- Integrate TypeScript/JavaScript and Python/FastAPI checks first if these are representative organizational stacks.
- Run actual commands or ingest signed/trusted CI outputs; do not infer test success from the existence of a test folder.
- Preserve tool name/version, command, exit status, run ID, commit SHA and artifact reference.
- Distinguish `PASS`, `FAIL`, `WARN`, `SKIPPED`, `UNSUPPORTED`, `UNVERIFIED` and `ERROR` at the evidence layer. Map these to control outcomes through explicit policy.

**Exit criteria:** a pilot project can be analyzed end-to-end; every mandatory result can be traced to a real check or qualified inspection; unsupported checks remain visible and never pass silently.

### Release 3 — Architecture and impact analysis

- Build a repository/component graph with file, package, service, API, database and event relationships where supported.
- Record provenance and confidence for graph nodes/edges.
- Implement actual dependency-boundary rules for the approved architecture profile.
- Detect changed components and affected dependents.
- Report unknown or unsupported structures rather than assuming conformance.
- Add fixture repositories representing allowed dependencies and known violations.

**Exit criteria:** profile checks produce reproducible findings for both valid and invalid boundary examples.

### Release 4 — CI/CD integration and pilot enforcement

- Publish a reusable GitHub Actions workflow or maintained composite action.
- Run relevant checks on pull requests and release candidates.
- Support base/head diff analysis.
- Publish concise human-readable PR summaries and machine-readable artifacts.
- Require check names and branch rulesets consistently across pilot repositories.
- Test pass, fail, warning, missing evidence, analyzer error and unsupported scenarios.

**Exit criteria:** known mandatory blockers prevent merge in the pilot; valid changes pass; assessment evidence is retained and linked to the commit.

### Release 5 — Operational governance

- Project registry and onboarding.
- Audit history and assessment retention.
- Finding ownership, remediation lifecycle and due dates.
- Exception approval and expiry workflow.
- Technical debt and incident feedback loop.
- Monthly project and portfolio reports.

**Exit criteria:** project leads and LSGE can review status, risks, decisions and remediation without manually reconstructing evidence from chat or CI logs.

### Release 6 — Dashboard and advanced integrations

Only after the earlier releases are stable:

- governance dashboard;
- GitHub organization/repository discovery;
- issue and project-management integrations;
- AI context generation based on project/control selection;
- additional language/framework adapters;
- trend analysis and maturity reporting.

**Exit criteria:** dashboard values are derived from canonical assessment records and can be traced to source evidence.

## 9.2 Important engine corrections

| Concern | Required behavior |
|---|---|
| Empty governance pack | Must not return GO; return explicit insufficient-scope state or NO-GO. |
| No controls applicable | Must not return GO without an explicit assessment policy. |
| Missing evidence | Must not pass a mandatory control. |
| Duplicate evidence ID | Reject as invalid or ambiguous; do not pick an arbitrary match. |
| Stale evidence | Treat as invalid for the current commit/change. |
| Unlinked evidence | Cannot support a control it does not explicitly reference. |
| Partially verified evidence | Must not be treated as fully verified. |
| Tool execution failure | Produce ERROR/UNVERIFIED; not PASS. |
| Unsupported verification | Report unsupported; apply fail-closed behavior for mandatory properties. |
| P2/P3 risks | Keep visible as conditions or warnings with owners and deadlines. |
| Accepted P1 risk | Require a valid, unexpired exception, authorized approver and sufficient evidence; status text alone is not approval. |
| Malformed severity/status | Reject schema-invalid packs; defensive engine behavior must fail closed. |
| Exception expiry | Expired exception cannot waive a control. |
| Schema drift | Version schema/model and provide migration/compatibility tests. |

## 9.3 Analyzer evidence rules

The analyzer should separate **discovery** from **verification**:

- A manifest dependency can support a framework-detected fact, not prove secure framework configuration.
- A `tests/` directory can support `tests:present`, not prove test execution or passing behavior.
- A CI YAML file can support `ci:configured`, not prove the workflow is required or reliable.
- A folder named `domain/` can support a candidate architecture hint, not prove dependency direction.
- A successful test command can prove only the scope represented by that test suite and commit.

Every evidence record must identify what claim it supports and the limits of that claim.

---

# 10. CI/CD and Repository Enforcement Model

## 10.1 Recommended pull-request workflow

```text
PR opened / updated
        -> Validate project config and schemas
        -> Analyze changed files and affected components
        -> Run applicable verification adapters
        -> Collect evidence and provenance
        -> Evaluate controls, risks and valid exceptions
        -> Publish PR report and required status check
        -> Human review
             | compliant: merge / release
             | non-compliant: remediation or approved exception, then re-assess
```

## 10.2 Enforcement guardrails

- Enforce only controls that are defined, versioned, applicable and testable.
- Do not create a required check that can report success when its analyzer did not run.
- Do not treat a skipped or unsupported check as passing.
- Separate policy failure from tool failure; both must be visible.
- Pin or verify third-party actions and use least-privilege workflow permissions.
- Avoid `pull_request_target` patterns that execute untrusted pull-request code with privileged tokens.
- Keep secrets out of pull-request jobs unless the threat model and GitHub event model explicitly justify access.
- Make branch-protection required-check names stable and documented.
- Restrict bypass actors; record and review every break-glass use.
- Use CODEOWNERS or an equivalent review policy for changes to `00-governance/`, `22-governance-operations/model/`, `engine/` and CI enforcement.

## 10.3 Reusable adoption package

Each project should receive a minimal onboarding bundle:

- project registration record;
- selected architecture and technology profile;
- governance configuration;
- reusable workflow reference;
- PR template or required evidence section;
- documented required status checks;
- exception and escalation contact;
- remediation owner.

The project team should not need to copy the entire standards repository into every application repository. Use a pinned version/tag or controlled reusable workflow reference so projects can identify exactly which governance baseline they consume.

---

# 11. Audit, Findings, Exceptions and Remediation

## 11.1 Finding lifecycle

```text
Detected
   -> Triaged
   -> Assigned
   -> In Remediation
   -> Evidence Submitted
   -> Independently Verified
   -> Closed
```

Allowed alternate outcomes include `Accepted by authorized exception`, `Not applicable with justification` and `Disputed / escalated`. A developer must not close a finding merely by changing its status; closure requires evidence or a valid governance decision.

## 11.2 Finding record requirements

Each finding should include:

- stable finding ID and control ID;
- project, repository, branch and commit;
- severity and impact rationale;
- source location or affected component;
- evidence references;
- description and reproducible context;
- accountable owner and team;
- target remediation date;
- status and history;
- exception reference, if accepted;
- closure evidence and verifier.

## 11.3 Exception lifecycle

```text
Requested -> Risk Assessed -> Authority Checked -> Approved / Rejected
       -> Active -> Reviewed -> Expired / Renewed / Closed
```

Minimum exception safeguards:

- requester and approver are separate for material exceptions;
- approval authority is checked against risk severity and organization policy;
- scope is explicit (project, control, environment, release or time window);
- mitigation and residual risk are documented;
- expiry or review date is mandatory unless a documented reason permits otherwise;
- expired exceptions stop waiving the control;
- repeated renewals trigger a policy/debt review;
- prohibited/non-exceptionable requirements remain blocked except through a distinct emergency authority process.

## 11.4 Audit approach

Use risk-based audits rather than a one-size-fits-all checklist:

- baseline every project at onboarding;
- sample low-risk projects periodically;
- review high-risk projects more frequently;
- audit after major incidents, material architecture changes or repeated exception patterns;
- prioritize high-severity and systemic control failures;
- validate both policy existence and actual enforcement evidence.

---

# 12. Governance Metrics and Reporting

## 12.1 Portfolio metrics

| Metric | Definition | Reporting expectation |
|---|---|---|
| Project coverage | In-scope projects registered / total in-scope projects. | Target 100% inventory coverage. |
| Ownership coverage | Projects with named technical owner and governance representative. | Target 100%. |
| Control mapping coverage | Mandatory requirements mapped to versioned controls. | Track by standard; aim for complete mandatory mapping before strict enforcement. |
| Required-check coverage | Applicable repositories with required governance CI checks. | Target 100% of onboarded repositories. |
| Evidence completeness | Mandatory controls with valid current evidence / mandatory applicable controls. | Report by project and change class. |
| Open P0/P1 findings | Unresolved critical/high findings. | Zero unowned; zero unapproved bypass. |
| Remediation timeliness | Findings closed by target date / findings due. | Report trend and overdue aging. |
| Exception hygiene | Active exceptions with approver, scope, mitigation and expiry. | Target 100%; report expired exceptions separately. |
| Release escape rate | Material governance defects discovered after release. | Trend, severity and root-cause analysis. |
| Governance friction | False positives, unnecessary blocks and time-to-resolution. | Use to improve controls without weakening risk protection. |

## 12.2 Reporting rules

- Establish a baseline before publishing compliance percentages.
- Do not use code coverage alone as a proxy for software quality.
- Do not average away P0/P1 risks into a portfolio score.
- Show unknown, unsupported and not-assessed states separately from pass.
- Include project owner, trend, aging and remediation date for material findings.
- Distinguish policy compliance from business risk acceptance.

## 12.3 Monthly governance report

A monthly report to the CTO/Head of Engineering should contain:

1. Project inventory and onboarding status.
2. Compliance trends by project and standard.
3. P0/P1 findings and escalation status.
4. Overdue remediation and technical debt.
5. Active, expired and renewed exceptions.
6. CI enforcement coverage and bypass events.
7. Incidents that expose governance/control gaps.
8. False positives or process bottlenecks.
9. Decisions needed from leadership.
10. Next month's control and adoption priorities.

---

# 13. Revised 90-Day Execution Plan

This plan assumes the standards layer already exists and prioritizes authority, correctness, operational tooling and pilot adoption. Dates are relative to the approved kickoff date; the plan should be re-baselined once leadership confirms resources and the project portfolio.

## Days 1–15 — Authority and baseline

**Objectives**

- Obtain CTO/Head of Engineering approval for the role charter, decision rights and escalation path.
- Update GOV-000 and GOV-022 to reflect the organizational operating model.
- Resolve PR #4 via the required independent approval process; do not bypass the active ruleset.
- Promote the known-debt register and reconcile README/master-plan status.
- Inventory all projects, repositories, stacks, owners and production environments.
- Identify two pilot projects and their technical leads.

**Deliverables**

- Approved role charter and RACI.
- Project/repository inventory baseline.
- Governance gap and risk register.
- Updated implementation status and PR disposition.

**Exit gate**

Leadership has approved the mandate; all known projects have an owner or an explicit ownership gap; the current executable baseline and debt are accurately recorded.

## Days 16–30 — Engine correctness and CLI foundation

**Objectives**

- Add runtime schema validation at the CLI boundary.
- Prevent vacuous GO for empty or unevaluated assessments.
- Surface all unresolved P0–P3 risks.
- Define clear evidence and control status semantics.
- Add complete decision-matrix tests, including malformed and unsupported inputs.
- Implement executable CLI entry point, argument parsing, filesystem adapter and stable exit codes.
- Add lockfiles and deterministic installation/build commands.

**Deliverables**

- Governance Engine v0.1 correctness baseline.
- Validated governance pack contract.
- Runnable local CLI prototype.
- Regression tests and updated known-debt register.

**Exit gate**

Malformed, empty, unsupported or insufficiently evidenced assessments cannot produce an unjustified GO; CLI commands run against a real fixture repository and return documented exit codes.

## Days 31–60 — Control catalog and two-project pilot

**Objectives**

- Create a catalog of the first mandatory controls, prioritized by security, data integrity, architecture and release risk.
- Implement project registry and approved technology/architecture profiles.
- Add real TypeScript/JavaScript and Python/FastAPI verification adapters where representative.
- Integrate type-check, lint, tests, dependency/secret scanning and selected static analysis.
- Implement evidence provenance and commit binding.
- Pilot the reusable GitHub workflow on two projects.
- Test both passing and deliberately failing changes.

**Deliverables**

- Versioned control catalog v0.1.
- Project registry v0.1.
- Verification/evidence adapters v0.1.
- Two pilot assessment reports.
- CI enforcement pilot and false-positive review.

**Exit gate**

A change in each pilot project can be assessed end-to-end; mandatory failures block the pilot check; successful results are traceable to actual executed tools and the commit being assessed.

## Days 61–90 — Portfolio adoption and governance operations

**Objectives**

- Correct pilot issues and publish onboarding guidance.
- Onboard remaining projects in risk order.
- Assign governance representatives and remediation owners.
- Establish audit and exception lifecycle records.
- Publish monthly governance dashboard/report from assessment data.
- Review CI bypass configuration and independent ownership for governance-sensitive files.
- Present first organization-wide governance report to leadership.

**Deliverables**

- Governance Operations v1.0 adoption package.
- Portfolio compliance baseline.
- Audit and remediation register.
- Exception register and review cadence.
- First monthly leadership report.
- Next-quarter improvement roadmap.

**Exit gate**

All in-scope projects are registered; each has an accountable technical owner; critical findings are visible and owned; onboarded projects use controlled CI checks; leadership has a baseline report and decisions for unresolved risks.

## 13.1 Workstream ownership

| Workstream | Accountable | Responsible contributors |
|---|---|---|
| Role charter and policy | LSGE | CTO sponsor, project leads, specialists |
| Engine and CLI | LSGE for governance outcome | Governance-tool maintainers |
| Verification adapters | Project/discipline owner | QA, security, frontend/backend, platform engineers |
| Project onboarding | LSGE for process | Project technical leads |
| CI rollout | LSGE for control policy | Platform/DevOps and repository maintainers |
| Audit/remediation | LSGE for governance | Project leads and finding owners |
| Risk acceptance | CTO/delegated risk authority | LSGE recommends; specialist owners advise |

---

# 14. First-Month Action Checklist

## Leadership and authority

- [ ] Review this charter with the CTO / Head of Engineering.
- [ ] Confirm reporting line and decision rights.
- [ ] Name risk-acceptance authority for P0/P1 and regulatory risks.
- [ ] Confirm project technical leads and governance representatives.

## Repository baseline

- [ ] Review PR #4 and complete independent approval requirements.
- [ ] Reconcile main branch, PR branch and implementation-plan status.
- [ ] Promote `KNOWN-DEBT.md` to the maintained canonical debt register.
- [ ] Add CODEOWNERS and contribution/security guidance.
- [ ] Add a controlled project registry and ownership metadata.

## Engine and CLI

- [ ] Validate governance packs against the canonical schema at runtime.
- [ ] Fix vacuous-GO and no-applicable-control semantics.
- [ ] Surface P2/P3 risks with owner and due date.
- [ ] Implement exception authorization and expiry before allowing exceptions to waive controls.
- [ ] Implement CLI commands and stable exit codes.
- [ ] Add deterministic dependency installation and build checks.

## Pilot preparation

- [ ] Select two representative projects.
- [ ] Agree the initial mandatory control set with project and specialist owners.
- [ ] Capture baseline build/test/security/architecture evidence.
- [ ] Configure pilot branch rules and required status checks.
- [ ] Define rollback/escalation path for false-positive governance blocks.

---

# 15. Risks and Guardrails

| Risk | Why it matters | Guardrail |
|---|---|---|
| Governance becomes documentation-only | Standards exist but behavior does not change. | Every mandatory policy must map to an owner, control, verification method and audit process. |
| Over-enforcement too early | Teams lose trust and delivery slows. | Baseline first, pilot, measure false positives, phase enforcement by risk. |
| False-positive analyzer results | Incorrect blocks and unsafe passes undermine confidence. | Separate discovery from verification; use confidence/unsupported states and fixture tests. |
| Vacuous or fail-open decisions | Unsafe changes may be approved. | Fail-closed semantics, schema validation and adversarial decision tests. |
| LSGE becomes a bottleneck | Central review cannot scale across teams. | Automate deterministic checks; delegate project execution; reserve central review for material risk. |
| Authority conflict | Teams may not know who owns decisions. | CTO-approved RACI and escalation path. |
| Exceptions become permanent | Risk becomes normalized and invisible. | Expiry, renewal review, approval authority and repeated-exception analysis. |
| Metrics create gaming behavior | Teams optimize the score instead of engineering outcomes. | Risk-weighted metrics; preserve raw findings; no single compliance score as release authority. |
| Governance system itself is insecure | It can influence delivery and expose repository metadata. | Least privilege, immutable audit records, secure integrations and independent review. |
| Platform scope expands too quickly | Dashboard and broad language support delay core reliability. | Complete CLI + engine + CI end-to-end path before UI and advanced integrations. |

---

# 16. Definition of Success

The governance initiative is successful when the organization can demonstrate all of the following:

1. Every in-scope production project is registered and has an accountable technical owner.
2. Every project has an explicit technology and architecture profile appropriate to its design.
3. Mandatory standards requirements are mapped to versioned controls with owners and verification methods.
4. A material change can be assessed using the same deterministic governance model across projects.
5. Every material pass/fail/unknown result is traceable to current evidence and the assessed commit.
6. Unsupported checks and tool failures are visible and cannot silently become passes.
7. Exceptions are authorized, scoped, mitigated, time-bound and auditable.
8. Critical findings are owned, escalated and tracked to verified closure.
9. Required CI gates operate consistently across onboarded repositories.
10. Engineering leadership receives reliable reporting on risk, compliance, remediation and governance effectiveness.
11. Developers can understand what is required and how to resolve a finding without needing a manual explanation for every case.
12. Governance can operate consistently when the LSGE is not personally reviewing every change.

---

# 17. Final Recommendation

Do not restart the repository, rewrite all standards or begin with a governance dashboard. The policy foundation is already broad enough to support operational adoption.

The next milestone should be **Engineering Governance Operational Foundation v0.1**, consisting of:

1. an approved LSGE charter and authority matrix;
2. a reconciled `main` branch with the evidence-authority fix reviewed and merged through the existing ruleset;
3. a fail-closed, schema-validated governance engine;
4. a real runnable CLI;
5. a versioned mandatory control catalog; and
6. a two-project GitHub CI pilot with traceable evidence.

Only after this milestone is proven should the organization invest in broad repository onboarding, persistent audit workflows and a dashboard.

**The ultimate objective is not to make every engineering decision pass through the LSGE. It is to build a system in which standards, controls, evidence, authority and accountability make good engineering the default.**

---

# Appendix A — Repository Status Vocabulary

Use the following terms consistently in README, implementation plan, issues and release notes:

| Status | Meaning |
|---|---|
| PLANNED | Approved work that has not started or has no implementation. |
| IN_PROGRESS | Implementation is actively being developed. |
| IMPLEMENTED | Source code or documentation exists; verification may be incomplete. |
| VERIFIED | Defined acceptance criteria and verification evidence passed for a specific commit/version. |
| ACCEPTED | Authorized owner accepted the result and any remaining bounded risk. |
| RELEASED | A version is published and available for intended use. |
| DEPRECATED | The capability or standard is scheduled for replacement/removal. |
| RETIRED | No longer supported or applicable. |

A successful CI run is evidence for the exact commit and workflow that ran. It does not automatically mean the entire feature, release or organization-wide adoption phase is complete.

# Appendix B — Suggested Initial Control Catalog Fields

| Field | Purpose |
|---|---|
| `id` | Stable unique control identifier. |
| `standard_id` | GOV/standard reference. |
| `standard_version` | Version against which the control is defined. |
| `title` / `description` | Human-readable requirement. |
| `mandatory` | Whether failure can block a gate. |
| `severity` | P0–P3 risk severity. |
| `applicability` | Project/change conditions under which it applies. |
| `verification_capabilities` | Required checks and supported adapters. |
| `required_evidence` | Evidence contract needed to verify the control. |
| `failure_behavior` | Block, conditional, review or informational result. |
| `exception_policy` | Whether and how a valid exception can apply. |
| `owner` | Policy/control owner. |
| `effective_from` / `retired_at` | Control lifecycle. |
| `source_section` | Link to exact standard section. |

# Appendix C — Leadership Decisions Required

Before organization-wide enforcement, leadership should explicitly decide:

1. Does the LSGE report to the CTO, Head of Engineering or another executive?
2. Which decisions can the LSGE approve independently?
3. Who accepts P0/P1, security, privacy and regulatory residual risk?
4. Who authorizes production deployment?
5. Which projects are in scope and what is the onboarding deadline?
6. Which specialists are available for security, QA, platform and data review?
7. What is the approved emergency/break-glass procedure?
8. Which GitHub organization/repository controls are mandatory?
9. What evidence retention and access rules apply?
10. What resources are allocated to maintain the governance tool itself?

---

**Document owner:** Lead Software Governance Engineer  
**Approval authority:** CTO / Head of Engineering (to be confirmed)  
**Review cadence:** Quarterly and after material organizational, policy or platform changes  
**Repository:** https://github.com/Inflame21/engineering-governance
