# DEBT-020 — Technical Debt Standard

**Status:** Published  
**Owner:** Senior/Staff-level Engineering Governance  
**Applies to:** All software systems, services, applications, infrastructure, data systems, integrations, and AI-assisted development  
**Related standards:** GOV-000, ARC-002, BE-003, FE-004, DB-005, API-006, SEC-007, QA-008, AI-010, PRD-018, INC-019, EXC-021

---

## 1. Purpose

DEBT-020 defines how technical debt is identified, classified, recorded, prioritized, accepted, monitored, remediated, and retired.

Technical debt is an unavoidable engineering reality. The purpose of governance is not to eliminate every imperfection. The purpose is to ensure that compromises are:

- visible;
- understood;
- owned;
- risk-assessed;
- intentionally accepted when appropriate;
- prevented from silently compounding;
- remediated according to business and engineering risk;
- prevented from becoming production surprises.

Technical debt SHALL be managed as an engineering risk, not as an informal backlog of cleanup work.

---

## 2. Core Principle

> **Technical debt is not simply code that is old or ugly. It is a deliberate or accidental engineering compromise that creates future cost, risk, or constraint.**

Debt incurs **interest** when it makes future changes slower, riskier, more expensive, less reliable, or more difficult to validate.

A system may contain technical debt and still be production-ready. However:

> **Unacknowledged, unowned, unbounded, or materially unsafe technical debt SHALL NOT be treated as acceptable simply because the system currently works.**

---

## 3. Scope

This standard governs debt involving:

- architecture;
- source code and design;
- databases and data;
- APIs and integrations;
- security;
- testing and quality;
- infrastructure and deployment;
- observability and operations;
- performance;
- dependencies and supply chain;
- documentation and organizational knowledge;
- AI-generated or AI-assisted implementation;
- build, delivery, and operational processes.

It applies during:

- requirements;
- architecture;
- implementation;
- code review;
- testing;
- release;
- production operation;
- incident response;
- maintenance;
- modernization.

---

## 4. What Technical Debt Is

Technical debt exists when a current engineering decision creates a future obligation, limitation, risk, or cost.

Examples include:

- knowingly choosing a simpler implementation that will require later replacement;
- bypassing a robust abstraction to meet a deadline;
- accepting a temporary compatibility layer;
- shipping with a known non-critical test gap;
- retaining a legacy dependency because migration is not yet justified;
- operating with a manual deployment process while automation is planned;
- accepting a temporary observability limitation;
- carrying forward an architecture that constrains scaling;
- allowing AI-generated code to introduce unnecessary complexity that has not yet been simplified;
- postponing a migration with an explicit owner and deadline.

Technical debt is **not automatically**:

- old code;
- code that another engineer dislikes;
- a different coding style;
- a component that could theoretically be refactored;
- lack of adoption of the newest technology;
- a missing abstraction where no abstraction is required;
- any TODO comment;
- any feature that is not implemented;
- any code that is unfamiliar to a new developer.

Debt must have a meaningful future impact.

---

## 5. Technical Debt vs Defects vs Features

These categories SHALL be distinguished.

### 5.1 Defect

A defect means the system does not satisfy an expected or required behavior.

Example:

> An API returns incorrect authorization results.

This is primarily a defect, not merely technical debt.

### 5.2 Technical Debt

A debt item means the system currently works or satisfies an accepted requirement, but an engineering compromise creates future cost or risk.

Example:

> Authorization rules are duplicated across 14 handlers and every future policy change requires synchronized edits.

### 5.3 Feature Work

A feature is a desired capability that does not currently exist.

Example:

> Add bulk employee import.

Feature work SHALL NOT be disguised as debt.

### 5.4 Security Vulnerability

A known exploitable security weakness SHALL be treated according to SEC-007 severity and production-blocking rules. It may also be recorded as technical debt for remediation tracking, but the debt label SHALL NOT downgrade its security severity.

---

## 6. Debt Taxonomy

Every material debt item SHOULD have a primary category.

### 6.1 Architecture Debt

Examples:

- incorrect service/module boundaries;
- excessive coupling;
- circular dependencies;
- inappropriate shared state;
- architecture that prevents required scaling;
- temporary architecture that became permanent;
- duplicated domain ownership;
- migration away from an obsolete architectural pattern.

### 6.2 Code and Design Debt

Examples:

- duplicated business logic;
- excessive complexity;
- poor separation of concerns;
- unclear abstractions;
- dead code;
- unsafe shortcuts;
- inconsistent domain rules;
- tightly coupled components;
- fragile implementation patterns.

### 6.3 Database and Data Debt

Examples:

- missing constraints;
- poor indexing;
- legacy schema structures;
- duplicated data ownership;
- unsafe migrations;
- missing archival strategy;
- manual data correction processes;
- inconsistent identifiers;
- unresolved data-quality problems.

### 6.4 API and Integration Debt

Examples:

- inconsistent contracts;
- undocumented behavior;
- incompatible versioning;
- legacy endpoints;
- missing idempotency;
- brittle external integrations;
- manual reconciliation;
- unbounded dependency on a third-party service.

### 6.5 Security Debt

Examples:

- temporary security controls;
- outdated cryptographic mechanisms;
- excessive privileges;
- incomplete security hardening;
- unsupported authentication mechanisms;
- security tooling gaps.

Security debt SHALL NOT be used to justify knowingly unsafe production behavior.

### 6.6 Testing and Quality Debt

Examples:

- missing tests for important business rules;
- insufficient integration coverage;
- fragile test infrastructure;
- excessive mocking;
- missing regression tests;
- known flaky tests;
- untested failure paths.

### 6.7 Infrastructure and Deployment Debt

Examples:

- manual deployments;
- infrastructure drift;
- undocumented infrastructure;
- legacy runtime versions;
- missing automated provisioning;
- weak environment parity;
- fragile deployment processes.

### 6.8 Observability and Operations Debt

Examples:

- missing business-critical metrics;
- poor error classification;
- insufficient tracing;
- noisy alerts;
- missing runbooks;
- unclear operational ownership;
- insufficient audit telemetry.

### 6.9 Performance Debt

Examples:

- known inefficient queries;
- excessive network payloads;
- avoidable N+1 access;
- unbounded memory use;
- inadequate caching strategy;
- known latency regressions;
- insufficient capacity planning.

### 6.10 Documentation and Knowledge Debt

Examples:

- architecture decisions no longer documented;
- obsolete operational instructions;
- undocumented domain behavior;
- missing onboarding information;
- knowledge concentrated in one engineer;
- contradictory documentation.

### 6.11 Dependency and Supply-Chain Debt

Examples:

- unsupported dependencies;
- major-version migration backlog;
- abandoned packages;
- pinned versions without rationale;
- vulnerable transitive dependencies;
- unmanaged third-party SDKs.

### 6.12 AI-Generated / Vibe-Coded Debt

Examples:

- unnecessary abstractions generated by an AI tool;
- duplicated implementations generated across files;
- hallucinated or obsolete API usage;
- generated code that passes superficial tests but violates architecture;
- unexplained generated dependencies;
- copied patterns whose provenance or rationale is unknown;
- large amounts of code that no owner fully understands.

AI-generated debt SHALL be governed under both AI-010 and this standard.

---

## 7. Debt Origin

Each material debt item SHOULD identify its origin.

### 7.1 Intentional Debt

Debt knowingly accepted as a trade-off.

Example:

> Use a simple synchronous implementation for the first release because current workload does not justify asynchronous infrastructure.

Intentional debt SHALL include:

- reason;
- expected benefit;
- known downside;
- owner;
- review trigger;
- target remediation condition or date where practical.

### 7.2 Accidental Debt

Debt created without deliberate acceptance.

Common causes include:

- insufficient engineering knowledge;
- changing requirements;
- rushed implementation;
- poor review;
- incorrect assumptions;
- inadequate testing;
- architectural drift;
- AI-generated implementation errors.

Accidental debt SHALL NOT be treated as an approved trade-off merely because it already exists.

### 7.3 Inherited Debt

Debt inherited from:

- legacy systems;
- acquired codebases;
- previous teams;
- third-party software;
- migrations;
- organizational changes.

The current team does not automatically become responsible for the historical cause, but SHALL establish ownership for material debt that affects its system.

### 7.4 Obsolete Debt

Debt whose underlying constraint no longer exists.

Examples:

- a temporary compatibility layer after all clients have migrated;
- a workaround for a dependency that is no longer used;
- infrastructure retained for a removed workload.

Obsolete debt SHOULD be retired rather than remaining in the register indefinitely.

---

## 8. Debt Classification

Each material debt item SHOULD include:

| Attribute | Required Meaning |
|---|---|
| ID | Stable identifier |
| Category | Primary debt type |
| Description | What compromise exists |
| Origin | Intentional, accidental, inherited, or obsolete |
| Impact | What future cost/risk it creates |
| Affected area | System/module/service/process |
| Owner | Person/team responsible |
| Severity | P0–P3 |
| Interest | How debt compounds over time |
| Trigger | Condition requiring remediation |
| Target | Planned retirement condition/date |
| Status | Open, accepted, planned, in progress, blocked, retired |
| Evidence | References proving the issue |
| Decision | Accepted, remediate, defer, or retire |

---

## 9. Debt Severity

Technical debt SHALL use the governance severity model from GOV-000.

### P0 — Critical

Debt that creates an immediate or material threat to:

- security;
- data integrity;
- data loss;
- system safety;
- production recovery;
- critical availability;
- regulatory obligations;
- ability to operate or recover the system safely.

**Default:** production blocked.

### P1 — High

Debt that materially increases:

- production incident probability;
- change failure risk;
- operational risk;
- security exposure;
- reliability risk;
- inability to scale;
- inability to recover;
- cost of critical changes.

**Default:** production normally blocked unless explicitly mitigated and approved.

### P2 — Medium

Debt with meaningful but bounded engineering impact.

Examples:

- significant maintainability problems;
- moderate performance inefficiency;
- missing non-critical automation;
- moderate testing gaps.

**Default:** may be accepted with conditions.

### P3 — Low

Debt with limited current impact.

Examples:

- minor cleanup;
- small documentation gaps;
- low-impact duplication;
- non-critical modernization.

**Default:** generally permitted.

---

## 10. Debt Impact Dimensions

Severity SHALL consider more than code quality.

Assess debt against:

1. **Reliability** — Does it increase failure probability?
2. **Security** — Does it increase attack surface or weaken controls?
3. **Data integrity** — Can it corrupt, duplicate, lose, or misrepresent data?
4. **Performance** — Does it create latency, throughput, or resource problems?
5. **Maintainability** — Does it make future changes harder?
6. **Developer productivity** — Does it slow engineering work?
7. **Operational burden** — Does it require manual intervention?
8. **Cost** — Does it increase infrastructure or engineering cost?
9. **Change risk** — Does it make otherwise safe changes dangerous?
10. **Scalability** — Does it constrain expected growth?
11. **Recoverability** — Does it make rollback, restore, or disaster recovery harder?
12. **Knowledge concentration** — Does it depend on undocumented individual knowledge?

---

## 11. Debt Interest

Debt SHALL be evaluated for its tendency to compound.

Debt has high interest when it:

- affects many future changes;
- requires repeated workarounds;
- creates duplicated logic;
- increases test burden;
- increases incident probability;
- blocks automation;
- becomes harder to migrate as data grows;
- increases the number of dependent clients;
- creates additional compatibility obligations;
- increases operational toil.

### Example

A temporary API response format may initially be cheap.

If ten external consumers adopt it, the cost of changing it increases substantially.

Therefore:

> **The cost of debt is not only the cost of fixing it today. It is the additional cost imposed on future engineering work.**

---

## 12. Debt Identification

Debt MAY be identified through:

- architecture reviews;
- code reviews;
- security reviews;
- performance analysis;
- testing analysis;
- incident reviews;
- production observations;
- dependency scanning;
- infrastructure audits;
- database analysis;
- developer feedback;
- customer-impact analysis;
- migration planning;
- AI-generated code review;
- recurring operational toil.

Debt discovery SHOULD be continuous rather than limited to periodic cleanup projects.

---

## 13. Debt Evidence

A debt item SHALL be supported by evidence when the item is material.

Evidence MAY include:

- code references;
- architecture diagrams;
- metrics;
- traces;
- logs;
- incident records;
- test results;
- dependency reports;
- performance measurements;
- migration analysis;
- production data;
- cost measurements;
- reviewer findings.

Statements such as:

> “This code is bad.”

are insufficient.

A stronger finding is:

> “This module duplicates authorization logic across six entry points, and the last policy change required synchronized updates in all six locations.”

---

## 14. Debt Register

Material debt SHOULD be maintained in a debt register.

A debt register MAY be implemented as:

- a repository document;
- an issue tracker;
- a project-management system;
- a database;
- a governance platform.

The storage mechanism is less important than the information quality.

### Minimum debt record

```text
Debt ID:
Title:
Category:
Origin:
Severity:
Description:
Affected System:
Impact:
Interest:
Owner:
Current Mitigation:
Remediation:
Trigger:
Target:
Status:
Evidence:
Created:
Last Reviewed:
Decision:
```

---

## 15. Debt Ownership

Every P0/P1 debt item SHALL have an explicit owner.

P2 debt SHOULD have an owner.

P3 debt MAY be owned by a team rather than an individual.

Ownership means responsibility for:

- understanding the debt;
- keeping its status accurate;
- evaluating changes in risk;
- coordinating remediation;
- escalating when severity increases;
- retiring the debt record when resolved.

Unowned critical debt is a governance failure.

---

## 16. Debt Prioritization

Debt SHALL be prioritized by risk and economic impact, not by how annoying it is.

Recommended prioritization factors:

```Priority =
Impact
× Likelihood
× Exposure
× Interest
× Change Frequency
```

This is a decision aid, not a mathematical substitute for engineering judgment.

Prioritize debt that:

1. threatens security or data integrity;
2. blocks safe production operation;
3. repeatedly causes incidents;
4. increases risk across many changes;
5. compounds rapidly;
6. blocks important business capabilities;
7. creates substantial operational toil;
8. materially increases cost;
9. affects high-change areas;
10. is cheap to retire relative to its impact.

---

## 17. Debt Acceptance

Intentional debt MAY be accepted when:

- the current solution is safe;
- the risk is understood;
- the debt is documented;
- ownership exists;
- appropriate mitigation exists;
- the debt does not violate mandatory governance requirements;
- the expected benefit justifies the trade-off.

Acceptance SHALL NOT be used to bypass:

- critical security controls;
- data-integrity requirements;
- required legal/regulatory controls;
- production recovery requirements;
- mandatory testing requirements;
- architecture constraints that are explicitly mandatory;
- production blockers defined by PRD-018.

---

## 18. Debt Acceptance Record

Material intentional debt SHOULD record:

```text
Why are we accepting this debt?
What benefit does acceptance provide?
What risk does it introduce?
What prevents that risk from becoming unacceptable?
Who owns it?
When will it be reviewed?
What event requires remediation?
What evidence supports the decision?
Who approved the decision?
```

A debt item without an explicit acceptance decision SHALL be treated as unreviewed debt.

---

## 19. Debt Budgeting

Teams SHOULD allocate explicit capacity for debt reduction.

A debt budget MAY be expressed as:

- engineering capacity;
- sprint allocation;
- quarterly objectives;
- dedicated modernization work;
- operational toil reduction;
- migration milestones.

Debt remediation SHOULD NOT depend exclusively on engineers working unpaid or unplanned cleanup time.

However:

> **A team SHALL NOT use a “debt budget” as permission to continuously introduce unsafe debt.**

Prevention is preferable to planned cleanup.

---

## 20. Debt Aging

Debt SHALL be reviewed over time.

Age alone does not determine severity, but aging MAY indicate increasing interest.

Review whether:

- the original assumption remains valid;
- usage has increased;
- dependency count has increased;
- operational exposure has increased;
- remediation has become more expensive;
- new incidents have occurred;
- security posture has changed;
- the debt is still relevant;
- the debt has become obsolete.

Repeatedly deferring high-impact debt without re-evaluation is a governance failure.

---

## 21. Debt Remediation

Debt remediation SHALL define the desired future state.

A remediation plan SHOULD include:

1. problem statement;
2. target state;
3. affected components;
4. migration strategy;
5. compatibility strategy;
6. data migration requirements;
7. test requirements;
8. observability requirements;
9. rollout strategy;
10. rollback/recovery strategy;
11. ownership;
12. completion criteria.

Remediation SHALL be treated as engineering work, not merely deletion of an issue.

---

## 22. Debt Retirement

Debt is retired only when the underlying compromise no longer exists.

A debt item SHALL NOT be marked complete merely because:

- a ticket was closed;
- code was refactored;
- a new dependency was added;
- an engineer believes it is fixed.

Retirement SHOULD include evidence such as:

- tests;
- architecture review;
- migration completion;
- performance measurements;
- security verification;
- production validation;
- removal of temporary infrastructure;
- removal of compatibility code.

---

## 23. Debt Prevention

Engineering teams SHOULD prevent debt by:

- clarifying requirements;
- designing boundaries before implementation;
- keeping changes small;
- reviewing architecture;
- testing critical behavior;
- automating repetitive operations;
- maintaining documentation;
- monitoring production behavior;
- controlling dependencies;
- performing migrations deliberately;
- reviewing AI-generated code critically.

The objective is not zero debt.

The objective is:

> **Known, bounded, economically justified debt with controlled interest.**

---

## 24. Debt in Code Review

Code reviewers SHALL consider whether a change:

- introduces unnecessary complexity;
- creates duplicated logic;
- creates a temporary workaround without an exit condition;
- adds dependencies without justification;
- bypasses established architecture;
- introduces testing gaps;
- creates operational burden;
- increases migration cost;
- creates undocumented behavior;
- creates security or performance debt;
- introduces AI-generated code that has not been sufficiently understood.

A reviewer MAY require debt registration when a compromise is intentionally introduced.

---

## 25. Debt in Architecture Review

Architecture review SHALL evaluate:

- temporary architectural decisions;
- compatibility layers;
- migration shortcuts;
- source-of-truth duplication;
- future scaling constraints;
- vendor lock-in;
- infrastructure shortcuts;
- integration limitations;
- data migration debt.

Architecture decisions that knowingly introduce debt SHOULD include an exit strategy or explicit statement that the debt is economically acceptable long-term.

---

## 26. Debt from AI-Assisted Development

AI-generated code SHALL be reviewed under AI-010 and DEBT-020.

AI increases specific forms of debt risk:

- unnecessary abstraction;
- duplicated implementation;
- excessive code volume;
- outdated library usage;
- hallucinated APIs;
- copied patterns without rationale;
- inconsistent architecture;
- dependency proliferation;
- superficially passing tests;
- generated documentation that contradicts implementation.

AI-generated code SHALL NOT be considered low-risk merely because:

- it compiles;
- tests pass;
- the model claims correctness;
- the implementation looks polished;
- the code was generated from a detailed prompt.

A reviewer SHALL ask:

> **What engineering obligation did this generated code create that the team now owns?**

---

## 27. Debt and Incidents

INC-019 SHALL feed debt identification.

Recurring incidents MAY indicate:

- unresolved technical debt;
- insufficient observability;
- architectural weakness;
- missing tests;
- operational debt;
- process debt.

Post-incident actions SHOULD identify whether a debt item existed before the incident and, if so:

- why it was not detected;
- why it was accepted;
- why it was not remediated;
- whether its severity was underestimated.

Incident remediation SHOULD update the debt register where appropriate.

---

## 28. Debt and Production Readiness

PRD-018 is the final production decision authority.

Technical debt SHALL be evaluated as part of production readiness.

A system MAY receive **GO WITH CONDITIONS** when:

- debt is known;
- no mandatory production blocker exists;
- risk is bounded;
- mitigation is effective;
- ownership exists;
- remediation or review conditions are explicit.

A system SHALL receive **NO-GO** when debt creates an unacceptable production risk.

---

## 29. Automatic Production Blockers

The following SHALL be treated as production blockers unless an applicable higher-level governance rule explicitly permits a controlled exception:

- known critical security debt;
- known data corruption or loss risk;
- debt that prevents safe recovery;
- debt that prevents reliable deployment or rollback;
- critical infrastructure debt with no safe recovery path;
- critical authorization or tenant-isolation debt;
- unbounded operational debt affecting critical workflows;
- critical debt with no owner;
- repeatedly deferred P0/P1 debt without documented risk reassessment;
- intentional debt introduced without required approval;
- known AI-generated defects in critical paths that have not been remediated or explicitly governed;
- debt that directly violates a mandatory requirement of another governance standard.

---

## 30. Debt Metrics

Metrics SHALL be used carefully.

Useful indicators include:

- open debt count by severity;
- P0/P1 debt count;
- debt age;
- debt introduced vs retired;
- recurring debt categories;
- debt associated with incidents;
- remediation lead time;
- percentage of debt with owners;
- percentage with review dates;
- debt affecting high-change areas;
- operational toil attributed to debt;
- engineering hours attributable to debt;
- dependency modernization backlog;
- unresolved documentation debt;
- debt-related production incidents.

Metrics SHALL NOT become a target that encourages teams to:

- close debt without fixing it;
- avoid recording debt;
- split one debt item into many trivial items;
- manipulate severity;
- prioritize low-value cleanup for dashboard improvement.

---

## 31. Debt Health Review

Teams SHOULD periodically review:

### Inventory
- What debt exists?
- Is the inventory credible?
- Is critical debt missing?

### Risk
- Has any debt increased in severity?
- Has exposure changed?
- Has interest increased?

### Ownership
- Does every material item have an owner?
- Are owners still responsible for the affected system?

### Economics
- Is remediation still worth the cost?
- Has the cost of delay increased?

### Obsolescence
- Has any debt become irrelevant?
- Can temporary components be deleted?

### Incidents
- Did debt contribute to recent incidents?

### Architecture
- Is debt preventing planned system evolution?

---

## 32. Debt Anti-Patterns

### 32.1 “All Debt Must Be Removed”

Incorrect.

Some debt is economically rational.

### 32.2 “Debt Means Bad Code”

Incorrect.

Debt is about future obligation, risk, and constraint.

### 32.3 “We Will Fix It Later”

Insufficient.

A material debt item requires ownership and an explicit decision.

### 32.4 “It Is Only Temporary”

Temporary without an exit condition is often permanent.

### 32.5 “We Have a Ticket”

A ticket is not evidence of risk control.

### 32.6 “The Tests Pass”

Passing tests do not prove the absence of architecture, security, operational, or performance debt.

### 32.7 “The Code Was AI Generated”

This is not a risk waiver.

### 32.8 “The Business Needs It Now”

Business urgency may justify a trade-off. It does not eliminate the engineering obligation created by the trade-off.

### 32.9 “We Will Rewrite Everything”

Large rewrites can create more risk than the debt they intend to remove.

Debt remediation SHALL be risk- and evidence-driven.

### 32.10 “Refactor Everything”

Refactoring without a concrete risk, constraint, or benefit is not automatically valuable.

---

## 33. Reviewer Checklist

### Debt Identification
- [ ] Does this change introduce technical debt?
- [ ] Is the debt intentional or accidental?
- [ ] Has existing debt been discovered?
- [ ] Is the debt category correct?

### Risk
- [ ] What is the production impact?
- [ ] What is the likelihood?
- [ ] How quickly does the debt compound?
- [ ] Does it affect security or data integrity?
- [ ] Does it affect recovery?
- [ ] Does it increase operational burden?

### Ownership
- [ ] Is there an owner?
- [ ] Is there a review trigger?
- [ ] Is there a remediation condition where appropriate?

### Acceptance
- [ ] Is the trade-off justified?
- [ ] Is mitigation adequate?
- [ ] Does the debt violate another mandatory standard?
- [ ] Is explicit approval required?

### Remediation
- [ ] Is the target state clear?
- [ ] Is migration safe?
- [ ] Is backward compatibility addressed?
- [ ] Are tests defined?
- [ ] Is observability sufficient?
- [ ] Is rollback/recovery understood?

### AI
- [ ] Was generated code independently verified?
- [ ] Are dependencies legitimate?
- [ ] Are APIs real and supported?
- [ ] Is the architecture consistent?
- [ ] Is generated complexity justified?

### Production
- [ ] Does the debt create a P0/P1 blocker?
- [ ] Has PRD-018 evidence been updated?
- [ ] Is the risk explicitly understood?

---

## 34. Relationship to Other Governance Standards

DEBT-020 does not replace other standards.

```text
REQ-001
   ↓
ARC-002
   ↓
Implementation Standards
   ↓
REV-009
   ↓
Debt Identification
   ↓
DEBT-020
   ↓
PRD-018
   ↓
Production
   ↓
INC-019
   ↓
New Debt / Corrective Action
   ↺
```

Specific relationships:

- **GOV-000** — establishes authority and severity.
- **ARC-002** — governs architecture decisions that may create debt.
- **BE-003 / FE-004 / DB-005 / API-006** — define implementation-level engineering constraints.
- **SEC-007** — governs security risk; debt SHALL NOT downgrade security severity.
- **QA-008** — governs testing debt and quality evidence.
- **REV-009** — provides the primary review mechanism for identifying newly introduced debt.
- **AI-010** — governs AI-generated implementation and context risk.
- **CICD-012** — governs delivery debt and pipeline controls.
- **INFRA-013** — governs infrastructure debt.
- **OBS-014** — governs observability debt.
- **PERF-015** — governs performance debt.
- **DOC-016** — governs documentation debt.
- **REL-017** — governs release implications of unresolved debt.
- **PRD-018** — makes the final production readiness decision.
- **INC-019** — feeds production failures and corrective actions back into debt governance.
- **EXC-021** — governs formal exceptions when mandatory requirements cannot be met.

---

## 35. Governance Gate

Before accepting material technical debt, the reviewer SHALL be able to answer:

1. What exactly is the debt?
2. Why does it exist?
3. Is it intentional?
4. What future cost or risk does it create?
5. How quickly does it compound?
6. Who owns it?
7. What prevents it from becoming unsafe?
8. When will it be reviewed?
9. What event requires remediation?
10. Does it block production?
11. What evidence supports the decision?

If these questions cannot be answered, the debt SHALL be considered insufficiently governed.

---

## 36. Exception Handling

When a team cannot meet a mandatory requirement because of technical debt, the team SHALL NOT silently bypass the requirement.

The team SHALL:

1. document the debt;
2. identify the violated requirement;
3. assess the risk;
4. document mitigation;
5. identify ownership;
6. request an exception under EXC-021 when applicable;
7. obtain required approval;
8. record expiry or review conditions.

An exception does not erase the underlying debt.

---

## 37. Definition of Done for Debt Remediation

Debt remediation is complete when:

- [ ] The original compromise has been removed or materially reduced.
- [ ] The target state is implemented.
- [ ] Required migrations are complete.
- [ ] Required tests exist and pass.
- [ ] Security implications are addressed.
- [ ] Performance implications are validated where relevant.
- [ ] Observability is sufficient.
- [ ] Documentation is updated.
- [ ] Temporary compatibility mechanisms are removed where no longer required.
- [ ] Production behavior is verified.
- [ ] The debt record is updated or retired.
- [ ] Relevant reviewers approve the change.

---

## 38. Final Principle

Technical debt is a form of deferred engineering work.

Deferred work is not free.

It accumulates interest through:

- slower delivery;
- increased defect probability;
- increased operational effort;
- reduced system flexibility;
- higher migration cost;
- increased incident risk;
- reduced engineering confidence.

The goal of engineering governance is therefore not:

> “Have zero technical debt.”

The goal is:

> **Know what debt exists, understand why it exists, control its risk, manage its interest, and retire it when the economics or risk justify doing so.**

> **Unmanaged debt becomes systemic risk. Managed debt becomes an engineering trade-off.**
