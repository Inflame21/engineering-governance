# PRD-018 — Production Readiness Standard

**Status:** Published  
**Standard ID:** PRD-018  
**Applies to:** All software systems, services, applications, infrastructure, releases, migrations, and material production changes governed by this framework.

---

## 1. Purpose

PRD-018 defines the final engineering gate for determining whether a system or material change is ready for production.

Production readiness is not a single test result.

It is the combined assessment of:

- requirements
- architecture
- implementation
- data
- APIs
- security
- testing
- code review
- AI-assisted development
- Git history
- CI/CD
- infrastructure
- observability
- performance
- documentation
- release readiness
- operations
- recovery
- ownership
- known risks
- exceptions

> **Production readiness is the state in which the engineering organization has sufficient evidence that the system can be safely operated, changed, observed, recovered, and supported in production.**

---

## 2. Scope

This standard governs:

- production readiness assessments
- final engineering gates
- production approval
- readiness evidence
- risk acceptance
- open issues
- operational readiness
- security readiness
- recovery readiness
- support readiness
- ownership
- production decision authority
- conditional approvals
- no-go decisions
- exceptions
- readiness reassessment
- post-approval changes
- AI-assisted production readiness

PRD-018 is technology-neutral.

---

## 3. Relationship to Other Standards

PRD-018 is an **integration and decision standard**.

It does not replace the individual engineering standards.

The readiness chain is:

```
Requirements
    ↓
Architecture
    ↓
Implementation
    ↓
Data/API/Security
    ↓
Testing/Review
    ↓
CI/CD/Infrastructure
    ↓
Observability/Performance
    ↓
Documentation
    ↓
Release Readiness
    ↓
Production Readiness
    ↓
GO / GO WITH CONDITIONS / NO-GO
```

PRD-018 consumes evidence produced by:

- GOV-000
- REQ-001
- ARC-002
- BE-003
- FE-004
- DB-005
- API-006
- SEC-007
- QA-008
- REV-009
- AI-010
- GIT-011
- CICD-012
- INFRA-013
- OBS-014
- PERF-015
- DOC-016
- REL-017

---

## 4. Production Readiness Principles

### 4.1 Production Approval Is an Engineering Decision

Production approval SHALL be based on evidence, not optimism.

### 4.2 No Single Gate Is Sufficient

A system can have:

- passing tests but broken security
- secure code but unrecoverable infrastructure
- good performance but missing operational ownership
- correct architecture but broken deployment
- successful deployment but missing production observability

Production readiness requires the complete system to be acceptable.

### 4.3 Risk Must Be Explicit

Unknown risk is more dangerous than documented risk.

Known limitations SHALL be:

- identified
- classified
- owned
- assessed
- accepted or remediated

### 4.4 Production Is a Different Risk Boundary

Production readiness SHALL consider real users, real data, real dependencies, real operational constraints, and real recovery requirements.

---

## 5. Readiness Assessment

Every material production release SHOULD have a readiness assessment.

The assessment SHALL identify:

- system/change
- environment
- release identifier
- scope
- reviewer
- evidence
- known risks
- open issues
- exceptions
- final decision

---

## 6. Readiness Evidence

Evidence MAY include:

- requirements sign-off
- architecture review
- code review
- test results
- security assessment
- dependency analysis
- migration validation
- CI results
- artifact provenance
- infrastructure validation
- observability validation
- performance results
- documentation review
- release plan
- rollback/recovery evidence

Evidence SHALL be relevant to the risk being assessed.

---

## 7. Evidence Quality

Evidence SHOULD be:

- recent
- reproducible
- attributable
- relevant
- complete enough for the decision
- traceable to the release/change

Old evidence SHALL NOT automatically be treated as current evidence when the system has materially changed.

---

## 8. Readiness Dimensions

Production readiness SHALL evaluate at least:

1. requirements
2. architecture
3. implementation
4. data
5. APIs
6. security
7. testing
8. code review
9. AI-assisted development
10. Git/change traceability
11. CI/CD
12. infrastructure
13. observability
14. performance
15. documentation
16. release management
17. operations
18. recovery
19. ownership
20. known risks and exceptions

---

## 9. Requirements Readiness

Verify:

- [ ] Business problem is defined.
- [ ] Scope is explicit.
- [ ] Functional requirements are understood.
- [ ] Important non-functional requirements are defined.
- [ ] Acceptance criteria exist.
- [ ] Important edge cases are known.
- [ ] Open requirement conflicts are resolved or accepted.

A production system SHALL NOT be approved to solve an undefined problem.

---

## 10. Architecture Readiness

Verify:

- [ ] System boundaries are clear.
- [ ] Responsibilities are defined.
- [ ] Dependency direction is appropriate.
- [ ] Data ownership is explicit.
- [ ] Integration boundaries are understood.
- [ ] Failure modes are considered.
- [ ] Security boundaries are understood.
- [ ] Scalability constraints are understood.
- [ ] Material ADRs are complete.

Architecture SHALL be acceptable for the expected production lifecycle, not merely the initial release.

---

## 11. Implementation Readiness

Verify:

- [ ] Business logic is correctly placed.
- [ ] Separation of concerns is maintained.
- [ ] Error handling is intentional.
- [ ] Transactions are appropriate.
- [ ] Concurrency behavior is understood.
- [ ] External integrations are controlled.
- [ ] Configuration is explicit.
- [ ] Dependencies are appropriate.

---

## 12. Data Readiness

Verify:

- [ ] Data ownership is defined.
- [ ] Integrity constraints exist.
- [ ] Important indexes are appropriate.
- [ ] Transactions are correct.
- [ ] Migration strategy is validated.
- [ ] Backups exist where required.
- [ ] Restore capability is validated.
- [ ] Sensitive data is protected.
- [ ] Retention/deletion requirements are addressed.

---

## 13. API Readiness

Verify:

- [ ] API contracts are defined.
- [ ] Authentication is correct.
- [ ] Authorization is correct.
- [ ] Validation is present.
- [ ] Error semantics are defined.
- [ ] Pagination/filtering behavior is safe where applicable.
- [ ] Idempotency is addressed where required.
- [ ] Compatibility is understood.
- [ ] Documentation matches implementation.

---

## 14. Security Readiness

Verify:

- [ ] Threat model is appropriate.
- [ ] Authentication is secure.
- [ ] Authorization is enforced.
- [ ] Tenant isolation is validated where applicable.
- [ ] Secrets are protected.
- [ ] Sensitive data is handled safely.
- [ ] Dependencies are reviewed.
- [ ] Security logging/auditing is adequate.
- [ ] Security testing is complete according to risk.

Security SHALL be a release-blocking concern where critical vulnerabilities remain.

---

## 15. Testing Readiness

Verify:

- [ ] Requirements have appropriate test coverage.
- [ ] Critical business logic is tested.
- [ ] Integration behavior is tested.
- [ ] Important API contracts are tested.
- [ ] Important frontend behavior is tested where applicable.
- [ ] Negative/failure paths are tested.
- [ ] Migration behavior is tested.
- [ ] Critical recovery behavior is validated.
- [ ] Required security/performance tests are complete.
- [ ] Flaky tests are understood.
- [ ] Test evidence is attributable to the release candidate.

Coverage percentage alone SHALL NOT determine readiness.

---

## 16. Code Review Readiness

Verify:

- [ ] Required reviews are complete.
- [ ] Review blockers are resolved.
- [ ] High-risk areas received appropriate scrutiny.
- [ ] Diff scope is understandable.
- [ ] Dependencies are reviewed.
- [ ] AI-generated changes were verified.
- [ ] No unresolved P0/P1 review findings remain.

---

## 17. AI-Assisted Development Readiness

Verify:

- [ ] AI-generated code was reviewed by humans.
- [ ] AI-generated tests were validated.
- [ ] AI-generated architecture claims were verified.
- [ ] AI-generated documentation was verified.
- [ ] Generated dependencies/APIs were verified.
- [ ] AI tool permissions were appropriate.
- [ ] Sensitive data was not improperly exposed.
- [ ] Agentic changes were attributable.
- [ ] AI did not become the authority for production approval.

AI assistance SHALL NOT reduce the production evidence requirement.

---

## 18. Git and Change Traceability

Verify:

- [ ] Production source revision is identifiable.
- [ ] Required branch protections were respected.
- [ ] Release commits are traceable.
- [ ] Secrets were not committed.
- [ ] Material changes have review history.
- [ ] Release artifact can be linked to source.

---

## 19. CI/CD Readiness

Verify:

- [ ] Required CI gates passed.
- [ ] Build is reproducible.
- [ ] Artifact provenance is available.
- [ ] Security/supply-chain checks passed.
- [ ] Production deployment permissions are controlled.
- [ ] Environment promotion is governed.
- [ ] Migration execution is controlled.
- [ ] Post-deployment verification exists.

A green pipeline does not automatically equal production approval.

---

## 20. Infrastructure Readiness

Verify:

- [ ] Production topology is documented.
- [ ] Production access is controlled.
- [ ] Network exposure is intentional.
- [ ] IAM is least-privilege.
- [ ] Secrets are managed securely.
- [ ] Infrastructure is reproducible where required.
- [ ] Resource limits are understood.
- [ ] Backups/recovery are validated.
- [ ] Critical failure domains are understood.
- [ ] Infrastructure drift is controlled.

---

## 21. Observability Readiness

Verify:

- [ ] Critical failures are detectable.
- [ ] Important workflows are observable.
- [ ] Logs contain useful context.
- [ ] Correlation/tracing works where required.
- [ ] Critical metrics exist.
- [ ] Alerts are actionable.
- [ ] Alerts have owners.
- [ ] Critical runbooks exist.
- [ ] Audit telemetry exists where required.
- [ ] Sensitive data is protected from telemetry leakage.

---

## 22. Performance Readiness

Verify:

- [ ] Performance requirements are defined where applicable.
- [ ] Expected workload is understood.
- [ ] Relevant baselines exist.
- [ ] Critical latency is measured.
- [ ] Resource usage is understood.
- [ ] Database performance is acceptable.
- [ ] Scaling behavior is understood.
- [ ] Performance regressions are controlled.
- [ ] Cost/performance trade-offs are understood.

---

## 23. Documentation Readiness

Verify:

- [ ] Requirements are current.
- [ ] Architecture documentation is current.
- [ ] API documentation is current.
- [ ] Operational documentation is current.
- [ ] Runbooks exist where required.
- [ ] Recovery procedures are documented.
- [ ] Release documentation is complete.
- [ ] Source of truth is unambiguous.
- [ ] No critical documentation contradictions remain.

---

## 24. Release Readiness

Verify:

- [ ] Release scope is explicit.
- [ ] Release candidate is identified.
- [ ] Risk classification is complete.
- [ ] Deployment strategy is appropriate.
- [ ] Success criteria are measurable.
- [ ] Rollback/roll-forward is understood.
- [ ] Migration compatibility is understood.
- [ ] Production verification is defined.
- [ ] Release owner is identified.

---

## 25. Operational Readiness

Verify:

- [ ] Production ownership is assigned.
- [ ] Support/escalation path exists.
- [ ] Alerts have owners.
- [ ] Runbooks exist.
- [ ] Critical dependencies are known.
- [ ] Operational access is available to authorized personnel.
- [ ] Incident procedures exist.
- [ ] Maintenance procedures are understood.

---

## 26. Recovery Readiness

Verify:

- [ ] Backup requirements are satisfied.
- [ ] Restore has been validated where required.
- [ ] RPO/RTO are defined where applicable.
- [ ] Disaster-recovery procedures exist where required.
- [ ] Recovery dependencies are known.
- [ ] Recovery ownership is clear.
- [ ] Recovery has sufficient evidence.

---

## 27. Ownership Readiness

Every production system SHALL have identifiable ownership.

Ownership SHOULD cover:

- engineering
- operations
- security where applicable
- data
- release
- incident response

Ownership SHALL NOT depend on one individual being continuously available.

---

## 28. Dependency Readiness

Material dependencies SHALL be identified.

Consider:

- external APIs
- cloud providers
- authentication providers
- payment providers
- email/SMS providers
- package registries
- databases
- queues
- caches
- infrastructure services

For critical dependencies, understand:

- failure behavior
- timeout
- rate limits
- availability
- fallback
- operational owner

---

## 29. Known Issues

Known issues SHALL be classified.

Each material issue SHOULD have:

- identifier
- description
- severity
- affected scope
- impact
- owner
- mitigation
- target resolution
- production decision

Known issues SHALL NOT be hidden merely to achieve a GO decision.

---

## 30. Risk Classification

Production risks SHOULD be classified:

| Severity | Meaning | Default production treatment |
|---|---|---|
| P0 Critical | Severe security, data, availability, or correctness risk | NO-GO |
| P1 High | Material production risk | Normally NO-GO |
| P2 Medium | Manageable risk | Conditional if controlled |
| P3 Low | Limited impact | Usually acceptable |

Risk treatment SHALL consider context and blast radius.

---

## 31. Risk Acceptance

A risk MAY be accepted only when:

- impact is understood
- likelihood is understood
- owner is identified
- mitigation is considered
- residual risk is explicitly accepted
- approval authority is appropriate

Risk acceptance SHALL NOT be implicit.

---

## 32. Production Decisions

PRD-018 defines three primary decisions.

### GO

Production release is approved.

Required controls are satisfied and residual risks are acceptable.

### GO WITH CONDITIONS

Production release is approved with explicit constraints.

Conditions SHALL specify:

- risk
- control
- owner
- deadline/review date
- monitoring
- escalation

Conditions SHALL be enforceable.

### NO-GO

Production release is not approved.

A NO-GO SHALL identify the blocking reasons and required remediation or evidence.

---

## 33. GO WITH CONDITIONS Rules

GO WITH CONDITIONS SHALL NOT be used to disguise unresolved critical risks.

Conditions SHOULD be appropriate for:

- limited known P2 risks
- temporary operational constraints
- staged rollout requirements
- additional monitoring
- scheduled follow-up work

P0 issues SHALL NOT be accepted through routine conditional approval.

P1 issues require exceptional authority and explicit justification if production approval is considered.

---

## 34. Automatic Production Blockers

Production SHALL be NO-GO when any applicable critical blocker remains unresolved.

Examples include:

- critical security vulnerability
- known critical data-integrity defect
- uncontrolled production access
- exposed secrets
- missing required tenant isolation
- critical migration incompatibility
- inability to recover critical data
- missing required backups
- no recovery path for an irreversible high-risk change
- critical failures cannot be detected
- critical operational ownership is absent
- required tests have not been completed
- artifact/source cannot be identified
- required production approvals are missing
- known P0 issue
- materially unsafe infrastructure
- unresolved release-blocking P1 issue without authorized exception
- AI-generated critical changes lack required human verification

---

## 35. Unknown-State Rule

The following SHALL be treated as a risk:

> **If a critical production property cannot be demonstrated, it SHALL NOT be assumed to be safe.**

Examples:

- unknown backup restore capability
- unknown tenant isolation
- unknown production access
- unknown migration behavior
- unknown dependency failure behavior
- unknown release artifact
- unknown security control

Unknown does not mean failed, but it does mean evidence is missing.

---

## 36. Production Readiness Score

A numerical score MAY be used as a summary.

A score SHALL NOT override a mandatory blocker.

For example:

```
Readiness score = supporting evidence summary
Production decision = governance judgment + mandatory gates
```

A system scoring 95% SHALL still receive NO-GO if it has a critical security vulnerability.

---

## 37. Readiness Evidence Matrix

Teams SHOULD maintain an evidence matrix:

| Area | Requirement | Evidence | Status | Owner |
|---|---|---|---|---|
| Security | Critical vulnerabilities resolved | Security report | PASS | Security |
| Testing | Critical workflows tested | Test report | PASS | QA |
| Infrastructure | Restore validated | Restore test | PASS | Infra |
| Observability | Critical failures alertable | Alert test | PASS | SRE |
| Performance | Latency target met | Load test | PASS | Engineering |
| Release | Rollback strategy | Release plan | PASS | Release owner |

Evidence status SHOULD be:

- PASS
- CONDITIONAL
- FAIL
- NOT APPLICABLE
- UNKNOWN

UNKNOWN SHALL trigger investigation for critical properties.

---

## 38. Readiness Review

A formal readiness review SHOULD include:

1. release scope
2. evidence review
3. blocker review
4. risk review
5. operational review
6. recovery review
7. exception review
8. final decision

The reviewer SHALL challenge unsupported assumptions.

---

## 39. Production Readiness Reviewer

The final reviewer SHALL have sufficient engineering authority to evaluate the system.

The reviewer SHALL NOT approve based solely on:

- developer confidence
- schedule pressure
- stakeholder urgency
- AI-generated summaries
- passing unit tests
- successful deployment

---

## 40. Separation of Responsibilities

Where practical, the person implementing a high-risk change SHOULD NOT be the only person deciding production readiness.

For critical systems, independent review SHOULD be required.

The exact separation SHALL reflect organizational size and risk.

---

## 41. Production Readiness Reassessment

Readiness approval SHALL become invalid when material changes occur.

Reassessment is required after changes to:

- architecture
- security
- data model
- infrastructure
- deployment strategy
- critical business logic
- production dependencies
- recovery behavior
- release artifact

Do not reuse old approval for materially different software.

---

## 42. Approval Expiration

Readiness approval MAY have an expiration or validity window.

For long-lived release candidates, reassess:

- dependency changes
- vulnerabilities
- infrastructure changes
- environment changes
- requirements changes

Approval SHALL remain tied to the approved release state.

---

## 43. Production Readiness Record

A readiness record SHOULD contain:

- system
- release
- source revision
- artifact
- environment
- reviewer
- evidence matrix
- known risks
- exceptions
- decision
- conditions
- approval date

The record SHOULD be retained according to governance and audit requirements.

---

## 44. Post-Approval Changes

Changes after readiness approval SHALL be controlled.

Do not modify an approved release candidate without:

- revalidation
- traceability
- appropriate review

A materially changed artifact is a different release candidate.

---

## 45. Production Readiness and Incidents

A production incident SHOULD trigger reassessment when it reveals a failed readiness assumption.

Examples:

- missing alert
- incorrect health check
- unrecoverable migration
- unexpected performance limit
- undocumented dependency
- security boundary failure

Incident findings SHOULD feed back into the appropriate standards.

---

## 46. Production Readiness and Technical Debt

Known technical debt MAY exist in production when:

- risk is understood
- impact is acceptable
- owner exists
- remediation is planned where necessary

Technical debt SHALL NOT be used to conceal critical defects.

---

## 47. AI-Assisted Production Readiness

AI MAY assist with:

- evidence collection
- checklist preparation
- risk summarization
- documentation cross-checking
- test-result analysis

AI SHALL NOT independently make final production approval decisions unless explicitly governed and authorized.

All critical AI-generated readiness claims SHALL be traceable to authoritative evidence.

---

## 48. AI Readiness Risks

Reviewers SHALL watch for:

- fabricated test evidence
- invented requirements
- incorrect architecture summaries
- false claims of security compliance
- missing generated code
- misunderstood dependencies
- stale context
- hallucinated rollback procedures
- incorrect interpretation of monitoring data

AI summaries are convenience artifacts, not evidence by themselves.

---

## 49. Final Production Readiness Gate

### Requirements

- [ ] Requirements are sufficiently complete.
- [ ] Scope is explicit.
- [ ] Acceptance criteria are satisfied.

### Architecture

- [ ] Architecture is approved.
- [ ] Data ownership is clear.
- [ ] Failure behavior is understood.

### Implementation

- [ ] Code review is complete.
- [ ] Critical business logic is validated.
- [ ] Dependencies are controlled.

### Security

- [ ] Security gate passed.
- [ ] No unresolved production-blocking vulnerabilities.
- [ ] Secrets/access are controlled.

### Quality

- [ ] Required testing is complete.
- [ ] Critical failure paths are tested.
- [ ] Required performance/security tests passed.

### Delivery

- [ ] Git traceability exists.
- [ ] CI/CD gates passed.
- [ ] Artifact is identifiable.

### Infrastructure

- [ ] Production infrastructure is ready.
- [ ] Access is controlled.
- [ ] Recovery is validated.

### Operations

- [ ] Observability is ready.
- [ ] Alerts are actionable.
- [ ] Runbooks exist.
- [ ] Ownership is assigned.

### Performance

- [ ] Performance requirements are met.
- [ ] Capacity is understood.
- [ ] Material regressions are controlled.

### Documentation

- [ ] Required documentation is current.
- [ ] Recovery/runbooks are available.
- [ ] Source of truth is clear.

### Release

- [ ] Release strategy is approved.
- [ ] Production verification is defined.
- [ ] Rollback/roll-forward is understood.

### Risk

- [ ] Known issues are classified.
- [ ] Exceptions are approved.
- [ ] Residual risk is explicitly accepted where applicable.

---

## 50. Final Decision Record

**System:** ____________________  
**Release:** ____________________  
**Environment:** ____________________  
**Source revision:** ____________________  
**Artifact:** ____________________  
**Readiness reviewer:** ____________________  
**Evidence record:** ____________________  
**Open P0 issues:** ____________________  
**Open P1 issues:** ____________________  
**Open P2 issues:** ____________________  
**Approved conditions:** ____________________  
**Exceptions:** ____________________  
**Residual risk:** ____________________

### Production Decision

**GO / GO WITH CONDITIONS / NO-GO**

**Decision rationale:**  
__________________________________________________  
__________________________________________________

**Conditions / required follow-up:**  
__________________________________________________  
__________________________________________________

**Owner:** ____________________  
**Approval date:** ____________________

---

## 51. Reviewer Checklist

A final reviewer SHOULD ask:

### System

- [ ] Do we understand what this system does?
- [ ] Do we understand who depends on it?
- [ ] Do we understand what can fail?

### Evidence

- [ ] Is the evidence recent?
- [ ] Is the evidence attributable?
- [ ] Is the evidence relevant to this release?

### Security

- [ ] Could this release expose users, data, or infrastructure?
- [ ] Are critical security controls verified?

### Data

- [ ] Could this release corrupt, lose, or expose data?
- [ ] Can we recover if it does?

### Operations

- [ ] Will we know when something goes wrong?
- [ ] Can an authorized engineer diagnose it?
- [ ] Can we recover it?

### Release

- [ ] Do we know exactly what artifact is going live?
- [ ] Can we stop or reverse the rollout?
- [ ] If rollback is impossible, do we have a recovery path?

### Ownership

- [ ] Is someone accountable for production?
- [ ] Is escalation clear?

### Risk

- [ ] What do we still not know?
- [ ] What risks are we explicitly accepting?
- [ ] Are any accepted risks actually blockers?

### Final Question

> **If this system fails at 2:00 AM, do we have enough evidence, ownership, and recovery capability to handle it safely?**

If the answer is no, readiness is not established.

---

## 52. Relationship to Governance

PRD-018 derives authority from GOV-000.

Where a conflict exists:

1. mandatory governance blockers take precedence
2. security and safety constraints take precedence
3. explicit approved exceptions may modify applicable requirements
4. undocumented assumptions do not override standards

Production approval SHALL remain an engineering accountability decision.

---

## 53. Exceptions

Exceptions to PRD-018 require an explicit engineering exception under EXC-021.

An exception SHALL document:

- requirement being bypassed
- reason
- risk
- affected system
- compensating controls
- approving authority
- owner
- expiration/review date

A schedule or commercial deadline alone is not sufficient justification for bypassing a critical production gate.

---

## 54. Change Control

PRD-018 SHALL be reassessed when the production-readiness model changes materially.

Updates SHOULD reflect:

- new engineering standards
- new production risks
- incident learnings
- security requirements
- infrastructure changes
- organizational ownership changes

PRD-018 should remain the final integration layer rather than duplicating every technical standard.

---

## 55. Sign-Off

**System:** ____________________  
**Release:** ____________________  
**Readiness assessment:** ____________________  
**Reviewer:** ____________________  
**Security approval:** ____________________  
**Architecture approval:** ____________________  
**Operations approval:** ____________________  
**Release approval:** ____________________  
**Production decision:** GO / GO WITH CONDITIONS / NO-GO  
**Decision date:** ____________________

---

## 56. Final Principle

> **Production readiness is not confidence. It is evidence-backed confidence within explicitly understood risk.**

The final governance chain is:

**requirements → architecture → implementation → verification → security → infrastructure → observability → performance → documentation → release → production readiness**

And the final decision is always:

**GO**

**GO WITH CONDITIONS**

**NO-GO**

> **Anyone can build. Anyone can use AI. Anyone can propose an implementation. Production approval requires engineering evidence.**
