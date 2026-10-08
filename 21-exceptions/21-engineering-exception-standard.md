# EXC-021 — Engineering Exception Standard

**Status:** Published  
**Owner:** Senior/Staff-level Engineering Governance  
**Applies to:** All engineering standards, projects, systems, teams, and production changes governed by this repository  
**Related standards:** GOV-000 through DEBT-020, especially PRD-018, INC-019, and DEBT-020

---

## 1. Purpose

EXC-021 defines the controlled process for temporarily or permanently deviating from a mandatory engineering requirement.

Engineering governance exists to establish minimum acceptable engineering controls. Real systems occasionally encounter circumstances where strict compliance is impractical, temporarily unavailable, economically unjustified, or incompatible with a legitimate constraint.

An exception provides a formal mechanism for handling that situation.

It does **not** provide permission to ignore governance.

> **An exception is a governed engineering decision to accept a known deviation and its associated risk.**

---

## 2. Core Principle

> **Exceptions SHALL make risk explicit, bounded, owned, reviewable, and time-limited whenever practical.**

A team SHALL NOT bypass a mandatory requirement by:

- interpreting the requirement informally;
- declaring the requirement “not applicable” without justification;
- hiding the deviation inside implementation details;
- relying on verbal approval;
- creating an undocumented workaround;
- closing a finding without addressing it;
- treating schedule pressure as automatic authorization.

If a mandatory requirement cannot be satisfied, the deviation SHALL be governed through this standard when an exception is appropriate.

---

## 3. Scope

EXC-021 applies to exceptions involving:

- requirements;
- architecture;
- backend;
- frontend;
- databases;
- APIs;
- security;
- testing;
- code review;
- AI-assisted development;
- Git;
- CI/CD;
- infrastructure;
- observability;
- performance;
- documentation;
- release management;
- production readiness;
- incident response;
- technical debt.

It applies during:

- design;
- implementation;
- review;
- testing;
- release;
- production operation;
- incident response;
- modernization.

---

## 4. What Is an Exception?

An exception exists when:

1. a governance requirement applies;
2. the system or team cannot or will not satisfy it as written;
3. the deviation is known;
4. the deviation requires an explicit engineering decision.

Examples:

- a mandatory migration strategy cannot be completed before an urgent security release;
- a legacy integration cannot temporarily satisfy a new API compatibility requirement;
- a required test environment is unavailable during a controlled emergency;
- a legacy system cannot immediately meet a newly introduced observability requirement;
- a migration requires a temporary relaxation of a non-critical constraint.

An exception is **not** required when:

- the standard explicitly permits the behavior;
- the requirement does not apply;
- an approved technology profile defines a valid implementation;
- the behavior is already within the documented standard.

---

## 5. Exception vs Waiver vs Deferral

These terms SHALL be distinguished.

### 5.1 Exception

A controlled deviation from a requirement.

### 5.2 Waiver

An explicit decision that a requirement does not need to be satisfied for a defined scope.

A waiver SHALL require stronger justification than a normal temporary exception.

### 5.3 Deferral

A decision to satisfy a requirement later.

A deferral SHALL have a defined trigger, owner, and review condition.

### 5.4 Emergency Deviation

A deviation made during an active incident or urgent security response where normal approval cannot reasonably occur first.

Emergency deviations SHALL be documented retrospectively as soon as practical.

---

## 6. Exception Eligibility

An exception MAY be considered when:

- compliance is temporarily impossible;
- compliance creates disproportionate risk;
- a legacy constraint prevents immediate compliance;
- an external dependency prevents compliance;
- emergency response requires controlled deviation;
- migration sequencing requires temporary deviation;
- the requirement conflicts with a higher-priority legitimate constraint;
- the cost of immediate compliance materially exceeds the bounded risk.

An exception SHALL NOT be granted merely because:

- implementation is inconvenient;
- the team missed its deadline;
- engineers dislike the standard;
- the standard was not considered early enough;
- the implementation is already complete;
- the team does not want to refactor;
- an AI-generated implementation makes compliance difficult;
- the exception avoids necessary engineering work without documented justification.

---

## 7. Non-Exceptionable Requirements

Certain controls SHALL NOT normally be bypassed.

Examples include requirements necessary to prevent:

- unacceptable security compromise;
- uncontrolled authorization bypass;
- tenant isolation failure;
- irreversible data loss;
- known catastrophic data corruption;
- inability to recover critical production systems;
- deliberate exposure of secrets;
- unlawful or prohibited data handling;
- falsification of engineering evidence.

Where an emergency creates a genuine conflict, the incident or emergency governance process SHALL be used, with retrospective review.

---

## 8. Exception Severity

Exceptions SHALL use the governance severity model.

### P0 — Critical

Deviation creates immediate or potentially catastrophic risk.

**Default:** not approvable through normal exception flow.

Requires emergency governance or executive/organizational authority where applicable.

### P1 — High

Deviation creates substantial security, reliability, data, operational, or production risk.

Requires explicit senior engineering approval and strong mitigation.

### P2 — Medium

Deviation creates bounded engineering risk.

May be approved by the designated engineering authority when evidence and mitigation are sufficient.

### P3 — Low

Deviation has limited impact.

May be approved through the team's defined engineering governance process.

Severity SHALL describe the risk created by the deviation, not the inconvenience of compliance.

---

## 9. Required Exception Record

Every material exception SHALL contain:

```text
Exception ID:
Title:
Status:
Requesting Team:
Owner:
Approver:
Standard:
Requirement:
Reason:
Scope:
Risk:
Severity:
Alternatives Considered:
Mitigation:
Residual Risk:
Start Date:
Expiration / Review Date:
Success / Exit Criteria:
Related Debt:
Related Incident:
Related Release:
Evidence:
Decision:
Approval:
```

The record SHALL be sufficiently detailed for an engineer unfamiliar with the original decision to understand it.

---

## 10. Required Justification

An exception request SHALL explain:

### What requirement is being deviated from?

Quote or precisely identify the requirement.

### Why is compliance not currently possible or justified?

Provide concrete constraints.

### What alternatives were considered?

At least one reasonable alternative SHOULD be evaluated for material exceptions.

### What risk does the deviation introduce?

Describe actual system impact.

### What prevents that risk from becoming unacceptable?

Document mitigation and controls.

### Why is the deviation acceptable?

Explain the engineering/business trade-off.

---

## 11. Risk Assessment

Risk assessment SHALL consider:

- security;
- confidentiality;
- integrity;
- availability;
- reliability;
- recoverability;
- performance;
- scalability;
- maintainability;
- operational burden;
- financial impact;
- regulatory impact;
- customer impact;
- blast radius;
- reversibility;
- duration;
- dependency exposure.

The following model MAY be used:

```text
Risk =
Likelihood
× Impact
× Exposure
× Duration
```

This is a decision aid, not a substitute for engineering judgment.

---

## 12. Mitigation

Every material exception SHOULD define mitigation.

Examples:

- additional monitoring;
- feature flags;
- reduced blast radius;
- manual verification;
- additional testing;
- restricted access;
- temporary rate limits;
- additional backups;
- staged rollout;
- canary deployment;
- manual approval;
- rollback procedure;
- compensating security control;
- additional audit logging.

Mitigation SHALL be proportionate to the risk.

---

## 13. Residual Risk

Mitigation does not necessarily eliminate risk.

The exception record SHALL distinguish:

```text
Original Risk
     ↓
Mitigation
     ↓
Residual Risk
```

Approval means the residual risk has been explicitly accepted by the appropriate authority.

It does not mean the underlying risk does not exist.

---

## 14. Exception Ownership

Every material exception SHALL have an owner.

The owner is responsible for:

- maintaining the record;
- ensuring mitigation remains effective;
- monitoring the deviation;
- coordinating remediation;
- reviewing expiration;
- escalating increased risk;
- closing the exception when the deviation ends.

Ownership SHALL remain explicit even when remediation is delegated.

---

## 15. Approval Authority

Approval authority SHALL be proportional to risk.

Recommended model:

| Severity | Minimum Authority |
|---|---|
| P0 | Emergency / organizational authority |
| P1 | Senior/Staff Engineering authority |
| P2 | Designated engineering reviewer/owner |
| P3 | Team engineering authority |

Security exceptions affecting critical controls SHOULD additionally involve the appropriate security authority.

Production-readiness exceptions SHALL be visible to the authority responsible for PRD-018.

A requester SHALL NOT be the sole approver of their own material exception.

---

## 16. Exception Evidence

Approvers SHALL evaluate evidence, not confidence.

Evidence MAY include:

- architecture analysis;
- security assessment;
- test results;
- performance measurements;
- incident history;
- operational metrics;
- migration plans;
- dependency constraints;
- vendor limitations;
- cost analysis;
- production telemetry;
- rollback evidence.

Statements such as:

> “We should be fine.”

are not sufficient approval evidence.

---

## 17. Expiration

Exceptions SHOULD expire.

An exception SHOULD define:

- expiration date;
- review date;
- remediation trigger;
- dependency trigger;
- release trigger;
- architectural milestone;
- incident trigger.

Examples:

> Expire after 30 days.

> Review when the migration reaches Phase 2.

> Remediate before the next production release.

> Reassess when traffic exceeds 10,000 requests per minute.

An exception without an expiry or review condition SHALL require explicit justification.

---

## 18. Permanent Exceptions

Permanent exceptions MAY exist when:

- strict compliance provides no meaningful engineering benefit;
- the requirement is demonstrably inappropriate for the system;
- the architecture has a legitimate permanent constraint;
- the organization explicitly accepts the long-term trade-off.

Permanent exceptions SHOULD trigger a review of the underlying standard.

If a pattern repeatedly requires permanent exceptions, the governance standard may be incorrectly specified.

> **Repeated exceptions are evidence about the standard itself.**

---

## 19. Emergency Exceptions

During a P0/P1 incident or urgent security response, normal approval order MAY be bypassed when delay would increase harm.

Emergency action SHALL prioritize:

1. protecting people/customers/data;
2. containing impact;
3. preserving evidence;
4. restoring a safe state;
5. preventing recurrence.

The emergency deviation SHALL be documented retrospectively.

The retrospective record SHOULD include:

- what happened;
- why normal approval was impossible;
- what was changed;
- who authorized the action;
- what risk was accepted;
- what evidence was available;
- what follow-up remediation is required.

INC-019 governs the incident itself.

EXC-021 governs the resulting deviation.

---

## 20. Exception During Release

If a release requires an exception:

- the exception SHALL be linked to the release;
- the release decision SHALL account for the residual risk;
- rollback SHALL be considered;
- monitoring SHALL be sufficient;
- the release owner SHALL understand the deviation.

A release SHALL NOT automatically proceed merely because an exception was approved.

PRD-018 and REL-017 still apply.

---

## 21. Exception During Code Review

A reviewer who identifies a mandatory governance deviation SHALL:

1. identify the requirement;
2. classify the severity;
3. determine whether an existing exception covers it;
4. request an exception when appropriate;
5. block the change when required.

Code review SHALL NOT be used as a substitute for exception approval.

---

## 22. Exception During AI-Assisted Development

AI-generated output SHALL NOT receive special exception treatment.

Examples of invalid reasoning:

> “The model generated this structure, so changing it would be difficult.”

> “The AI library requires us to violate our architecture.”

> “The generated code is too large to refactor.”

These are implementation constraints, not governance authority.

If AI-generated work creates a deviation:

- identify the violated standard;
- assess the risk;
- simplify or correct the implementation where practical;
- request an exception only when a legitimate constraint remains.

AI-010 remains authoritative for AI-specific controls.

---

## 23. Relationship to Technical Debt

An exception and technical debt are related but distinct.

### Exception

Answers:

> **Are we allowed to deviate from this requirement?**

### Technical Debt

Answers:

> **What future cost or risk does this compromise create?**

A temporary exception SHOULD create a DEBT-020 record when the deviation creates future engineering obligation.

Example:

```text
Governance Requirement
        ↓
Cannot comply immediately
        ↓
EXC-021 Exception
        ↓
Controlled deviation
        ↓
DEBT-020 Technical Debt
        ↓
Remediation
        ↓
Exception retired
        ↓
Debt retired
```

---

## 24. Exception and Production Readiness

PRD-018 remains the final production readiness authority.

An approved exception:

- does not automatically make a system production-ready;
- does not override automatic production blockers unless the governing authority explicitly permits it;
- does not remove the requirement for evidence;
- does not transfer accountability away from engineering.

The production decision SHALL account for:

- exception severity;
- residual risk;
- mitigation;
- duration;
- blast radius;
- recovery capability;
- customer impact.

---

## 25. Exception and Incidents

INC-019 SHALL be consulted when an exception:

- contributes to an incident;
- is discovered during an incident;
- weakens an incident control;
- affects recovery;
- affects evidence preservation.

If an incident demonstrates that an approved exception created more risk than expected, the exception SHALL be reassessed.

Possible outcomes:

- retain;
- modify;
- reduce scope;
- increase mitigation;
- increase severity;
- terminate;
- create corrective debt;
- update the governance standard.

---

## 26. Exception Review

Material exceptions SHALL be reviewed periodically.

Review questions:

### Validity
- Does the original reason still exist?
- Does the exception still apply?

### Risk
- Has exposure increased?
- Has the blast radius changed?
- Has residual risk changed?

### Mitigation
- Are compensating controls still effective?
- Are they actually being used?

### Ownership
- Is the owner still responsible?

### Remediation
- Has the exit condition been reached?
- Has remediation stalled?

### Economics
- Is compliance now cheaper than continued deviation?

### Governance
- Are similar exceptions appearing repeatedly?

---

## 27. Exception States

Recommended lifecycle:

```text
Requested
   ↓
Under Review
   ↓
Approved ───────────────┐
   ↓                    │
Active                  │
   ↓                    │
Renewed / Modified      │
   ↓                    │
Expired                 │
   ↓                    │
Closed ←────────────────┘
```

Additional terminal state:

**Rejected**

An exception SHALL NOT silently remain active after expiration.

---

## 28. Exception Renewal

Renewal SHALL NOT be automatic for material exceptions.

A renewal SHALL reassess:

- original justification;
- current risk;
- mitigation;
- remediation progress;
- system changes;
- production incidents;
- new alternatives.

Repeated renewals SHOULD trigger escalation.

> **If an exception keeps being renewed, it is probably no longer an exception. It may be technical debt, an architectural decision, or evidence that the standard needs revision.**

---

## 29. Exception Closure

An exception SHALL be closed when:

- the underlying requirement is satisfied;
- the affected system is removed;
- the requirement is formally changed;
- the exception is superseded by a new approved decision;
- the risk is eliminated through another control.

Closure SHOULD include evidence.

Examples:

- migration completed;
- dependency removed;
- security control implemented;
- architecture redesigned;
- tests added;
- infrastructure automated.

---

## 30. Exception Rejection

An exception SHALL be rejected when:

- risk is unacceptable;
- mitigation is inadequate;
- the requirement is non-exceptionable;
- justification is insufficient;
- safer alternatives exist;
- ownership is missing;
- evidence is inadequate;
- the request attempts to bypass governance;
- the exception would create uncontrolled production risk.

Rejection SHOULD explain what must change before approval can be reconsidered.

---

## 31. Exception Anti-Patterns

### 31.1 Exception by Silence

No response does not mean approval.

### 31.2 Verbal Exception

A material deviation recorded only in chat or conversation is not sufficient governance evidence.

### 31.3 Permanent Temporary Exception

A temporary exception with indefinite renewal is governance debt.

### 31.4 Self-Approval

An engineer should not unilaterally approve their own material deviation.

### 31.5 Schedule-Based Exception

“Release is tomorrow” is not sufficient justification.

### 31.6 AI-Based Exception

AI limitations do not override engineering standards.

### 31.7 Blanket Exception

“Everything in this project is exempt” is unacceptable.

Exceptions SHALL identify concrete requirements and scope.

### 31.8 Retroactive Concealment

An exception discovered after implementation SHALL NOT be hidden to make the project appear compliant.

### 31.9 Exception as Debt Replacement

An exception does not eliminate technical debt.

### 31.10 Exception Inflation

Teams SHALL NOT request exceptions for behavior already permitted by the standard.

---

## 32. Exception Register

Organizations SHOULD maintain a central exception register.

Recommended fields:

| Field | Purpose |
|---|---|
| Exception ID | Stable identifier |
| Standard | Governing document |
| Requirement | Exact deviation |
| Severity | Risk classification |
| Owner | Accountable engineer/team |
| Approver | Decision authority |
| Scope | Systems/releases affected |
| Status | Lifecycle state |
| Start | Activation date |
| Expiration | End/review date |
| Mitigation | Compensating controls |
| Residual risk | Remaining exposure |
| Debt link | Related DEBT-020 item |
| Incident link | Related INC-019 item |
| Release link | Related REL-017 item |
| Evidence | Supporting material |
| Decision | Approval/rejection |
| Closure | Retirement evidence |

---

## 33. Exception Metrics

Useful governance metrics include:

- active exceptions;
- exceptions by severity;
- expired exceptions;
- overdue reviews;
- average exception age;
- repeated renewals;
- exceptions associated with incidents;
- exceptions associated with production blockers;
- exceptions by standard;
- exceptions by team;
- exceptions converted into technical debt;
- exceptions closed successfully;
- permanent exceptions.

Metrics SHALL be used to identify systemic governance problems.

They SHALL NOT become targets that encourage:

- avoiding exception registration;
- prematurely closing exceptions;
- manipulating severity;
- splitting exceptions;
- denying legitimate exceptions to improve metrics.

---

## 34. Governance Feedback Loop

Exceptions SHOULD feed improvements back into engineering governance.

```text
Exception
    ↓
Risk Observation
    ↓
Operational / Engineering Evidence
    ↓
Review
    ↓
One of:
    ├── Requirement clarified
    ├── Standard improved
    ├── Architecture changed
    ├── Technical debt created
    ├── Mitigation strengthened
    └── Exception retired
```

Repeated exceptions in the same category SHALL be investigated.

They may indicate:

- unrealistic requirements;
- poor architecture;
- inadequate tooling;
- missing platform capabilities;
- unclear standards;
- organizational constraints;
- underfunded engineering work.

---

## 35. Reviewer Checklist

### Requirement
- [ ] Is the requirement mandatory?
- [ ] Is the exact requirement identified?
- [ ] Does the standard already permit the requested behavior?

### Justification
- [ ] Is the reason concrete?
- [ ] Were alternatives considered?
- [ ] Is the constraint legitimate?

### Risk
- [ ] Is the risk explicitly documented?
- [ ] Is severity correct?
- [ ] Is blast radius understood?
- [ ] Is residual risk acceptable?

### Mitigation
- [ ] Are compensating controls defined?
- [ ] Are they testable?
- [ ] Are they observable?
- [ ] Is recovery possible?

### Ownership
- [ ] Is an owner assigned?
- [ ] Is an approver assigned?
- [ ] Is the requester different from the approver for material exceptions?

### Time
- [ ] Is there an expiration or review date?
- [ ] Is there an exit condition?
- [ ] Is renewal controlled?

### Production
- [ ] Does this affect PRD-018?
- [ ] Does this create a production blocker?
- [ ] Is release impact documented?

### Debt
- [ ] Does this create technical debt?
- [ ] Is DEBT-020 tracking required?

### Incidents
- [ ] Is INC-019 relevant?
- [ ] Does the exception affect incident response or recovery?

### Evidence
- [ ] Is the decision supported by evidence?
- [ ] Could another engineer reconstruct the decision later?

---

## 36. Exception Approval Checklist

Before approval, the approver SHOULD be able to answer:

1. What exact requirement is being violated?
2. Why is deviation necessary?
3. What alternatives were rejected and why?
4. What is the worst credible outcome?
5. What controls reduce that risk?
6. What residual risk remains?
7. Who owns the risk?
8. When will the exception expire or be reviewed?
9. What event forces remediation?
10. Does this create technical debt?
11. Does it affect production readiness?
12. Would I approve this if I were responsible for the production incident resulting from the deviation?

If these questions cannot be answered, the exception SHOULD NOT be approved.

---

## 37. Definition of Done for an Exception

An exception is properly governed when:

- [ ] The exact requirement is identified.
- [ ] The deviation is documented.
- [ ] The reason is documented.
- [ ] Alternatives were considered where required.
- [ ] Risk is assessed.
- [ ] Severity is assigned.
- [ ] Mitigation is documented.
- [ ] Residual risk is explicit.
- [ ] Ownership is assigned.
- [ ] Approval authority is correct.
- [ ] Expiration/review conditions are defined.
- [ ] Related debt is recorded where appropriate.
- [ ] Related incident/release records are linked where applicable.
- [ ] Evidence is retained.
- [ ] Production-readiness impact is assessed.
- [ ] Closure criteria are defined.

---

## 38. Governance Hierarchy

When standards appear to conflict, use the following order:

```text
Legal / Regulatory Obligations
          ↓
Organizational Security / Safety Requirements
          ↓
GOV-000 Governance Constitution
          ↓
Specific Engineering Standard
          ↓
Technology Profile
          ↓
Project / System Architecture
          ↓
Implementation Detail
```

An implementation detail SHALL NOT override a higher-level governance requirement.

When two requirements genuinely conflict, the conflict SHALL be documented and resolved through explicit governance rather than silently choosing one.

---

## 39. Final Principle

Engineering standards establish the default path.

Exceptions establish the controlled path when the default cannot be followed.

The objective is not to create a bureaucracy where engineers need permission for every decision.

The objective is to prevent this:

```text
"We knew it violated the standard,
but we shipped anyway."
```

from becoming an acceptable engineering practice.

Instead, governance requires:

```text
Deviation
   ↓
Explicit Risk
   ↓
Evidence
   ↓
Mitigation
   ↓
Ownership
   ↓
Approval
   ↓
Review / Expiration
   ↓
Remediation or Formal Continuation
```

> **A well-governed exception is not a failure of engineering discipline. An undocumented exception is.**

> **Governance is strongest when engineers can move quickly without hiding risk.**
