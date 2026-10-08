# GOV-022 — Governance Lifecycle & Operating Standard

**Status:** Published  
**Category:** Governance Operations  
**Authority:** GOV-000  
**Applies to:** All governed software projects and engineering changes

---

## 1. Purpose

GOV-022 defines how the Engineering Governance Framework is applied throughout the software lifecycle.

The framework is not a collection of independent documents. The standards form a controlled engineering system in which requirements, architecture, implementation, verification, release, production operation, incidents, technical debt, and exceptions continuously inform one another.

> **Governance is a lifecycle control system, not a documentation exercise.**

---

## 2. Scope

GOV-022 governs:

- project initiation
- requirements readiness
- architecture readiness
- implementation
- verification
- review
- release
- production operation
- incident feedback
- technical debt management
- governance exceptions
- production reassessment
- governance evidence and records

It applies to:

- new projects
- existing systems
- new features
- bug fixes
- refactors
- migrations
- infrastructure changes
- security changes
- dependency changes
- AI-assisted changes
- emergency changes

---

## 3. Governance Lifecycle

The default lifecycle is:

```
Initiate
   ↓
Requirements
   ↓
Architecture
   ↓
Implementation
   ↓
Verification
   ↓
Review
   ↓
Release Readiness
   ↓
Production Readiness
   ↓
Release
   ↓
Operate
   ↓
Observe
   ↓
Incident / Debt / Change Feedback
   ↓
Reassessment
```

A project MAY iterate backward when evidence reveals that an earlier decision is incorrect.

Examples:

- implementation reveals an architectural flaw → return to ARC-002
- testing reveals an ambiguous requirement → return to REQ-001
- production incident reveals an unsafe design → reassess architecture and requirements
- technical debt becomes a material risk → DEBT-020
- a mandatory control cannot be satisfied → EXC-021

---

## 4. Governance Is Risk-Based

Governance depth MUST be proportional to risk.

Risk is influenced by:

- blast radius
- data sensitivity
- security impact
- financial impact
- availability impact
- customer impact
- regulatory impact
- architectural impact
- reversibility
- operational complexity
- dependency count
- change frequency
- failure severity

A low-risk documentation change does not require the same process as a destructive database migration.

Risk-based governance MUST NOT be used as justification for bypassing mandatory controls.

---

## 5. Change Classification

Changes SHOULD be classified before implementation.

### Class A — Routine

Examples:

- documentation corrections
- low-risk UI changes
- isolated refactoring with no behavior change
- non-production tooling changes

Typical controls:

- applicable standard
- normal review
- automated checks

### Class B — Material

Examples:

- new API behavior
- business-rule changes
- database changes
- authentication changes
- dependency changes
- infrastructure changes

Typical controls:

- requirements analysis
- applicable architecture review
- security consideration
- tests
- code review
- CI validation

### Class C — High Risk

Examples:

- authorization model changes
- tenant-isolation changes
- destructive migrations
- major architecture changes
- financial correctness changes
- production infrastructure changes
- high-blast-radius releases

Typical controls:

- explicit requirements
- architecture assessment
- threat/risk analysis
- migration/recovery strategy
- comprehensive test evidence
- formal review
- production readiness assessment
- explicit approval

### Class D — Emergency

Examples:

- active production outage
- active security incident
- severe data-integrity incident
- urgent mitigation required to protect customers or systems

Emergency changes follow INC-019 and applicable emergency provisions in REL-017 and EXC-021.

Emergency status does not permanently exempt the change from governance.

---

## 6. Standard Selection

The engineer or agent initiating work MUST identify applicable standards.

The minimum routing model is:

| Engineering Area | Standard |
|---|---|
| Requirements | REQ-001 |
| Architecture | ARC-002 |
| Backend | BE-003 |
| Frontend | FE-004 |
| Database | DB-005 |
| API | API-006 |
| Security | SEC-007 |
| Testing | QA-008 |
| Code Review | REV-009 |
| AI-assisted development | AI-010 |
| Git | GIT-011 |
| CI/CD | CICD-012 |
| Infrastructure | INFRA-013 |
| Observability | OBS-014 |
| Performance | PERF-015 |
| Documentation | DOC-016 |
| Release | REL-017 |
| Production readiness | PRD-018 |
| Incidents | INC-019 |
| Technical debt | DEBT-020 |
| Exceptions | EXC-021 |

Cross-cutting changes MUST apply all relevant standards.

---

## 7. Stage Gates

The governance lifecycle contains explicit gates.

### Gate 1 — Requirements Readiness

Controlled by REQ-001.

Decision:

- READY
- READY WITH CONDITIONS
- NOT READY

Implementation SHOULD NOT begin for materially ambiguous requirements.

### Gate 2 — Architecture Readiness

Controlled by ARC-002.

Decision:

- READY
- READY WITH CONDITIONS
- NOT READY

Architecture blockers MUST be resolved before implementation of affected areas.

### Gate 3 — Implementation Readiness

Controlled primarily by BE-003 and FE-004.

The implementation MUST satisfy applicable structural, security, data, API, and maintainability requirements.

### Gate 4 — Verification Readiness

Controlled by QA-008, SEC-007, PERF-015, and applicable standards.

Evidence MUST demonstrate that relevant production risks have been tested or otherwise controlled.

### Gate 5 — Review Readiness

Controlled by REV-009.

Required review findings MUST be resolved, accepted through the appropriate process, or escalated.

### Gate 6 — Release Readiness

Controlled by REL-017 and CICD-012.

The release candidate MUST be identifiable, reproducible, and deployable through the approved delivery path.

### Gate 7 — Production Readiness

Controlled by PRD-018.

Decision:

- GO
- GO WITH CONDITIONS
- NO-GO

No lower-level approval overrides a mandatory PRD-018 blocker.

---

## 8. Gate Evidence

Every material gate SHOULD have evidence.

Evidence MAY include:

- requirements documents
- ADRs
- code changes
- tests
- CI results
- security findings
- threat models
- performance measurements
- migration tests
- infrastructure validation
- observability validation
- review records
- release plans
- rollback plans
- incident history
- technical-debt records
- approved exceptions

A statement such as "reviewed" is not sufficient evidence when the decision is material.

---

## 9. Governance Decisions

Governance decisions MUST be explicit.

Accepted decision states include:

```
READY
READY WITH CONDITIONS
NOT READY

APPROVE
APPROVE WITH CONDITIONS
REQUEST CHANGES
REJECT

GO
GO WITH CONDITIONS
NO-GO
```

Conditions MUST be:

- specific
- actionable
- owned
- traceable
- risk-relevant

"Fix later" is not an acceptable condition.

---

## 10. Unknown-State Rule

If a material production property is unknown, it MUST NOT automatically be treated as safe.

Examples:

- unknown tenant isolation
- unknown migration behavior
- unknown rollback behavior
- unknown dependency behavior
- unknown data loss impact
- unknown security exposure
- unknown performance under expected workload

The correct response is to:

1. obtain evidence,
2. reduce the uncertainty,
3. explicitly accept residual risk where permitted, or
4. block progression.

> **Unknown is a risk state, not a green state.**

---

## 11. Governance Records

Material governance decisions SHOULD be traceable to:

- the requirement
- the change
- the relevant standards
- the implementation
- the evidence
- the reviewer
- the decision
- accepted risks
- exceptions
- production outcome

The exact storage mechanism MAY vary by project.

Possible systems include:

- repository documents
- pull requests
- issue trackers
- ADRs
- CI artifacts
- release records
- incident records

The system of record MUST be identifiable.

---

## 12. Separation of Responsibilities

Where team size permits, responsibilities SHOULD be separated.

Possible responsibilities include:

- implementation
- code review
- security review
- architecture review
- production approval
- release ownership
- incident command

The same person MAY perform multiple responsibilities in a small team when necessary, but the reduced separation MUST NOT be mistaken for reduced accountability.

High-risk decisions SHOULD receive independent review whenever practical.

---

## 13. AI Agent Governance

AI agents operating under the framework MUST:

1. identify applicable standards;
2. read relevant standards;
3. preserve project-specific requirements;
4. avoid inventing requirements;
5. identify uncertainty;
6. produce evidence;
7. report risks;
8. record technical debt;
9. request exceptions rather than bypassing controls;
10. avoid declaring production readiness without sufficient evidence.

AI MUST NOT be treated as an approval authority.

AGENTS.md provides the agent entrypoint, while the detailed standards remain authoritative.

---

## 14. Governance During Iteration

Governance does not require every iteration to restart the entire lifecycle.

A change SHOULD trigger reassessment proportional to its impact.

Examples:

| Change | Likely Reassessment |
|---|---|
| Copy/text correction | Documentation/review |
| UI styling change | Frontend/review |
| New business rule | Requirements/backend/frontend/testing |
| New API field | API/backend/testing |
| Schema migration | Database/API/testing/release |
| Authentication change | Security/API/backend/testing |
| Architecture change | Requirements/architecture/implementation |
| Production infrastructure change | Infrastructure/security/CI-CD/release/production readiness |

When the blast radius increases, governance depth MUST increase accordingly.

---

## 15. Production Feedback Loop

Production behavior is evidence about engineering decisions.

The feedback loop is:

```
Production
    ↓
Observability
    ↓
Incident / Performance / Customer Signal
    ↓
Evidence
    ↓
Root Cause / Contributing Cause
    ↓
Corrective Action
    ↓
Requirements / Architecture / Code / Test / Standard
    ↓
Future Risk Reduction
```

Production failures SHOULD result in changes to engineering controls when the existing controls proved insufficient.

---

## 16. Technical Debt Feedback

Technical debt MUST be treated as lifecycle feedback.

When debt materially affects:

- reliability
- security
- data integrity
- delivery speed
- operational burden
- scalability
- maintainability

it SHOULD influence future planning and production risk assessment.

Use DEBT-020 for classification, ownership, prioritization, and remediation.

---

## 17. Exception Feedback

Exceptions MUST NOT become an invisible parallel architecture.

Repeated exceptions for the same requirement SHOULD trigger review of:

- the requirement
- architecture
- standard wording
- tooling
- team capability
- delivery constraints

If a temporary exception becomes permanent, the organization SHOULD either:

1. remove the underlying need for the exception, or
2. formally update the governing standard.

Use EXC-021 for the controlled exception process.

---

## 18. Governance Change Control

Changes to governance standards themselves MUST be treated as engineering changes.

A proposed standard change SHOULD include:

- reason for change
- affected standards
- compatibility impact
- operational impact
- migration requirements
- reviewer
- effective date
- version/change history

A standard MUST NOT be weakened merely to make an existing implementation pass.

---

## 19. Governance Anti-Patterns

The following are prohibited or strongly discouraged:

### Governance Theater

Completing checklists without validating the underlying evidence.

### Compliance by Documentation

Writing a statement that a control exists without proving it.

### Gate Bypass

Skipping a gate because delivery is urgent without recording the risk.

### Rubber-Stamp Review

Approving work without examining material risks.

### AI Authority

Treating an AI-generated answer as an authoritative engineering decision.

### Process Over Risk

Applying excessive ceremony to trivial changes while neglecting high-risk changes.

### Unknown-as-Safe

Treating missing evidence as evidence of safety.

### Permanent Temporary Exception

Allowing temporary exceptions to remain indefinitely without review.

### Checklist Completion Bias

Optimizing for completed boxes rather than reduced engineering risk.

---

## 20. Governance Metrics

Governance metrics SHOULD measure engineering outcomes, not paperwork volume.

Useful metrics include:

- production escape rate
- repeat incident rate
- change failure rate
- rollback rate
- mean time to detect
- mean time to recover
- security defect escape rate
- critical review findings
- unresolved high-risk debt
- exception aging
- exception recurrence
- failed production-readiness gates
- requirements rework
- architecture rework
- flaky-test rate

Avoid using:

- number of documents
- number of checklist items completed
- number of approvals

as standalone indicators of engineering quality.

---

## 21. Governance Effectiveness Review

The governance framework SHOULD be reviewed periodically.

Review questions:

- Are incidents exposing gaps in the standards?
- Are reviewers repeatedly finding the same defects?
- Are teams bypassing a control because it is impractical?
- Are standards contradictory?
- Are standards too vague to produce consistent decisions?
- Are standards creating unnecessary delivery friction?
- Are automated checks enforcing the intended controls?
- Are AI agents interpreting the standards consistently?
- Are exceptions becoming common?
- Are production outcomes improving?

The framework MUST evolve based on evidence.

---

## 22. Automatic Governance Blockers

Progress MUST be blocked when:

- a mandatory gate is failed;
- a P0 issue remains unresolved;
- a mandatory security control is absent;
- production-critical behavior is unknown and cannot be accepted;
- required evidence is missing;
- a destructive migration lacks a safe strategy;
- required approval is absent;
- a mandatory exception has not been approved;
- the proposed implementation contradicts an authoritative requirement;
- a release cannot be traced to an approved source/artifact;
- a known risk exceeds the organization's accepted threshold.

---

## 23. Definition of Governance Completion

Governance for a material change is complete when:

- applicable standards have been identified;
- required gates have been evaluated;
- required evidence exists;
- material findings are resolved or explicitly accepted;
- technical debt is recorded where appropriate;
- exceptions are documented and approved where required;
- production impact is understood;
- the final decision is explicit;
- ownership is clear.

---

## 24. Relationship to Other Standards

GOV-022 orchestrates the framework but does not replace domain standards.

```
GOV-000
   │
   ▼
GOV-022
   │
   ├── REQ-001
   ├── ARC-002
   ├── BE-003
   ├── FE-004
   ├── DB-005
   ├── API-006
   ├── SEC-007
   ├── QA-008
   ├── REV-009
   ├── AI-010
   ├── GIT-011
   ├── CICD-012
   ├── INFRA-013
   ├── OBS-014
   ├── PERF-015
   ├── DOC-016
   ├── REL-017
   ├── PRD-018
   ├── INC-019
   ├── DEBT-020
   └── EXC-021
```

GOV-022 determines **when and how** the standards participate in the lifecycle.

The individual standards determine **what must be true** within their engineering domain.

---

## 25. Reviewer Checklist

Before approving a material change, verify:

- [ ] Change risk/classification is understood.
- [ ] Applicable standards are identified.
- [ ] Requirements are sufficiently clear.
- [ ] Architecture impact is understood.
- [ ] Required stage gates have been evaluated.
- [ ] Evidence supports material claims.
- [ ] Security implications are addressed.
- [ ] Data/API implications are addressed.
- [ ] Testing evidence exists.
- [ ] Operational impact is understood.
- [ ] Technical debt is recorded where appropriate.
- [ ] Exceptions are explicit and approved.
- [ ] Production readiness is assessed where applicable.
- [ ] Ownership is clear.
- [ ] Final decision is explicit.

---

## 26. Final Principle

> **The purpose of governance is not to prevent change. It is to make change deliberate, observable, reviewable, reversible where possible, and accountable for its risk.**

A mature engineering organization does not ask only:

> "Did we follow the process?"

It asks:

> **"Did the process produce enough evidence to make this engineering decision safely?"**
