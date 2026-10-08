# REL-017 — Release Management Standard

**Status:** Published  
**Standard ID:** REL-017  
**Applies to:** All software releases, production changes, application deployments, infrastructure releases, database migrations, configuration changes, feature releases, emergency changes, and externally visible releases governed by this framework.

---

## 1. Purpose

REL-017 defines the engineering controls required to safely move an approved change into production.

Release management coordinates:

- what is being released
- why it is being released
- whether it is ready
- how it will be released
- how success will be verified
- what happens if it fails
- who owns the decision

> **A release is not complete when deployment succeeds. A release is complete when the intended change is verified in production and the system is known to be in an acceptable state.**

---

## 2. Scope

This standard governs:

- release planning
- release classification
- release candidates
- versioning
- release notes
- release approvals
- release readiness
- deployment coordination
- feature flags
- database migrations
- backward compatibility
- rollout strategies
- canary releases
- rolling releases
- blue/green releases
- phased releases
- rollback
- roll-forward
- post-release verification
- release evidence
- emergency releases
- hotfixes
- release ownership
- release communication
- release closure
- AI-assisted release management

This standard is technology-neutral.

---

## 3. Relationship to CI/CD

CICD-012 governs the **delivery system and automated pipeline controls**.

REL-017 governs the **release decision and production change lifecycle**.

In simplified form:

**CICD-012: Can this artifact be delivered safely?**

**REL-017: Should this change be released now, how should it be released, and how do we prove it succeeded?**

A technically successful pipeline SHALL NOT automatically imply release approval.

---

## 4. Release Principles

### 4.1 Production Is a Controlled Environment

Production changes SHALL be intentional, traceable, authorized, and verifiable.

### 4.2 Release Evidence Over Confidence

Statements such as:

- "It worked locally."
- "Tests passed."
- "The deployment was green."
- "It should be fine."

are not complete production evidence.

Release decisions SHALL use appropriate evidence.

### 4.3 Small, Reversible Changes

Where practical, releases SHOULD minimize:

- blast radius
- change size
- coupling
- irreversible operations

### 4.4 Rollback Is Not Always the Answer

Rollback SHALL be evaluated against:

- database changes
- data mutations
- external side effects
- compatibility
- irreversible operations

A roll-forward may be safer than rollback.

---

## 5. Release Types

Teams SHOULD classify releases.

Examples:

- standard release
- minor release
- major release
- hotfix
- emergency release
- infrastructure release
- database release
- configuration release
- security release
- feature-flag activation

Classification SHALL determine required review and approval.

---

## 6. Change Risk Classification

Release risk SHOULD consider:

- blast radius
- reversibility
- user impact
- data impact
- security impact
- infrastructure impact
- migration complexity
- dependency changes
- downtime requirements
- operational complexity

High-risk releases require stronger evidence and approval.

---

## 7. Release Candidate

A release candidate SHOULD represent the exact change intended for production.

The candidate SHALL be identifiable through:

- commit
- tag
- artifact
- version
- deployment reference

Avoid rebuilding different source into production after approval.

---

## 8. Artifact Integrity

Production SHALL receive the artifact that was tested and approved wherever practical.

The release process SHOULD preserve:

**source → build → artifact → deployment**

traceability.

Manual modification of approved artifacts SHALL be prohibited unless explicitly governed.

---

## 9. Versioning

Releases SHALL use a consistent identification strategy.

Version identifiers MAY include:

- semantic versions
- build numbers
- immutable commit identifiers
- release tags
- deployment identifiers

The identifier SHALL make the deployed state discoverable.

---

## 10. Release Notes

Material releases SHOULD have release notes.

Release notes MAY include:

- features
- fixes
- breaking changes
- migrations
- configuration changes
- infrastructure changes
- known limitations
- operational considerations
- rollback considerations

Release notes SHALL NOT claim behavior that was not released.

---

## 11. Release Scope

Every release SHOULD have explicit scope.

Identify:

- included changes
- excluded changes
- dependencies
- migrations
- configuration
- feature flags
- infrastructure changes

Avoid releasing unrelated work merely because it happens to be available.

---

## 12. Release Readiness

Before production release, verify applicable gates from:

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

A release SHALL NOT bypass an applicable governance gate merely because deployment is urgent.

---

## 13. Release Approval

Production release approval SHALL be performed by an authorized engineer according to project governance.

Approval SHALL consider:

- scope
- risk
- test evidence
- security
- infrastructure
- migrations
- observability
- rollback/recovery
- documentation
- release timing

Approval SHALL be attributable.

---

## 14. Release Freeze

Teams MAY define release freezes around:

- critical business periods
- holidays
- major events
- known operational constraints
- staffing limitations

Emergency changes during a freeze require appropriate escalation.

---

## 15. Release Window

High-risk changes SHOULD have an appropriate release window.

Consider:

- support availability
- traffic patterns
- dependency availability
- migration duration
- rollback time
- business impact

Do not choose a release window solely because it is convenient for the developer.

---

## 16. Pre-Release Checklist

Before release:

- [ ] Scope is confirmed.
- [ ] Candidate/artifact is identified.
- [ ] Required tests passed.
- [ ] Security requirements passed.
- [ ] Required reviews are complete.
- [ ] Database migrations are reviewed.
- [ ] Infrastructure changes are reviewed.
- [ ] Observability is available.
- [ ] Rollback/recovery is understood.
- [ ] Documentation is updated.
- [ ] Release owner is identified.
- [ ] Release communication is prepared where required.

---

## 17. Database Migrations

Database changes SHALL follow DB-005.

Release planning SHALL consider:

- compatibility
- migration duration
- locking
- data volume
- deployment order
- rollback limitations
- backfill behavior
- application compatibility

Destructive migrations SHOULD NOT be coupled to an application release unless safely controlled.

---

## 18. Expand/Contract Releases

Where schema compatibility is required, use staged changes such as:

1. expand schema
2. deploy compatible application
3. migrate/backfill
4. switch application behavior
5. contract obsolete schema

The exact strategy SHALL reflect system requirements.

---

## 19. Backward Compatibility

Release planning SHALL consider compatibility between:

- old and new application versions
- application and database
- services
- APIs
- clients
- events
- background workers
- infrastructure

Rolling deployments require compatibility across simultaneously running versions.

---

## 20. Feature Flags

Feature flags MAY separate deployment from feature activation.

Flags SHALL have:

- owner
- purpose
- default state
- rollout strategy
- removal plan
- expiry/review date where appropriate

Feature flags SHALL NOT become permanent undocumented architecture.

---

## 21. Feature Flag Security

Feature flags SHALL NOT be treated as authorization controls unless explicitly designed and secured for that purpose.

Sensitive behavior SHALL use proper authorization mechanisms.

---

## 22. Release Strategies

Release strategy SHALL match risk.

Common strategies include:

- direct/rolling release
- canary
- blue/green
- phased rollout
- regional rollout
- percentage rollout
- feature-flag activation

High-risk changes SHOULD prefer smaller blast radius where operationally feasible.

---

## 23. Rolling Releases

Rolling releases SHALL consider compatibility between versions.

Verify:

- schema compatibility
- API compatibility
- configuration compatibility
- event compatibility
- worker compatibility

Do not assume old and new versions can safely coexist.

---

## 24. Canary Releases

Canary releases SHOULD define:

- initial exposure
- success criteria
- observation period
- metrics
- failure thresholds
- promotion criteria
- rollback criteria

Canary traffic SHOULD be sufficient to expose meaningful failures without unnecessarily exposing the entire user base.

---

## 25. Blue/Green Releases

Blue/green deployments SHALL consider:

- data compatibility
- shared dependencies
- state
- background workers
- traffic switching
- session behavior
- rollback behavior

Switching traffic is not automatically a safe rollback mechanism when data has already changed.

---

## 26. Phased Rollouts

Phased rollouts MAY be based on:

- percentage
- geography
- tenant
- customer cohort
- feature flag
- internal users

Cohort selection SHALL consider risk.

---

## 27. Release Health Criteria

Every material release SHOULD define success criteria.

Criteria MAY include:

- error rate
- latency
- availability
- business success rate
- resource usage
- queue behavior
- dependency health
- support signals

Success criteria SHALL be observable.

---

## 28. Post-Deployment Verification

Production verification SHALL occur after deployment.

Verification SHOULD include:

- deployment health
- application health
- critical workflow smoke tests
- error rate
- latency
- resource utilization
- dependency health
- business-critical behavior

A successful deployment command is not production validation.

---

## 29. Smoke Tests

Critical production smoke tests SHOULD verify the smallest set of workflows necessary to establish that the release is functioning.

Smoke tests SHOULD be:

- safe
- repeatable
- representative
- observable

Avoid destructive smoke tests against production data.

---

## 30. Release Monitoring Period

Material releases SHOULD have an observation period.

Monitor:

- operational telemetry
- user-impact signals
- errors
- latency
- resource usage
- support incidents
- business metrics where relevant

Observation duration SHALL reflect release risk.

---

## 31. Release Completion

A release SHALL be considered complete only when:

- deployment succeeded
- required verification passed
- expected telemetry is healthy
- critical workflows are functioning
- no release-blocking regression is detected
- release status is recorded

---

## 32. Rollback

Rollback SHALL be planned where technically feasible.

Rollback criteria SHOULD be explicit.

Examples:

- critical error increase
- availability degradation
- severe latency regression
- data corruption risk
- security regression
- critical business workflow failure

---

## 33. Rollback Limitations

Some changes are not safely reversible.

Examples:

- destructive database migrations
- irreversible data transformations
- external financial transactions
- external messages
- irreversible infrastructure changes

Release plans SHALL identify these limitations.

---

## 34. Roll-Forward

When rollback is unsafe or impossible, a roll-forward MAY be preferred.

Roll-forward SHALL have:

- corrective change
- verification
- ownership
- controlled deployment

"Rollback unavailable" SHALL NOT mean "no recovery plan."

---

## 35. Release Failure

When a release fails:

1. stop further rollout
2. assess impact
3. determine rollback vs roll-forward
4. stabilize the system
5. verify recovery
6. record the release outcome
7. create follow-up actions

Do not continue rollout merely because the deployment pipeline can continue.

---

## 36. Release Abort

A release SHALL be aborted when defined blocking conditions occur.

Examples:

- critical health regression
- unexpected data mutation
- security control failure
- incompatible migration
- severe capacity impact
- loss of required observability
- unexplained production behavior

---

## 37. Emergency Releases

Emergency releases MAY bypass normal timing constraints when required to protect:

- availability
- security
- data integrity
- users
- business continuity

Emergency status SHALL NOT eliminate engineering accountability.

---

## 38. Emergency Release Controls

Emergency releases SHALL still have:

- identified owner
- reason
- scope
- risk assessment
- appropriate validation
- production verification
- post-release review

Deferred evidence SHALL be completed as soon as practical.

---

## 39. Hotfixes

Hotfixes SHALL remain traceable to the production issue they address.

A hotfix SHOULD:

- minimize scope
- avoid unrelated refactoring
- include regression protection
- receive focused review
- include post-release validation

---

## 40. Security Releases

Security releases SHOULD be prioritized according to SEC-007 severity.

Security urgency may change the release timeline, but SHALL NOT justify introducing avoidable unverified risk.

---

## 41. Infrastructure Releases

Infrastructure changes SHALL follow INFRA-013.

Release planning SHALL consider:

- blast radius
- access
- capacity
- networking
- dependencies
- backup/recovery
- rollback/roll-forward

---

## 42. Configuration Releases

Material configuration changes SHALL be treated as releases when they can affect production behavior.

Configuration changes SHALL be:

- traceable
- reviewed
- attributable
- observable where appropriate
- recoverable where possible

---

## 43. Release Communication

Communication SHALL reflect release risk.

Relevant stakeholders MAY include:

- engineering
- product
- operations
- support
- security
- customers
- external partners

Communication SHOULD include impact and expected behavior rather than implementation detail alone.

---

## 44. Release Ownership

Every production release SHALL have an identifiable owner.

The release owner is responsible for:

- readiness coordination
- release execution or oversight
- verification
- decision-making
- escalation
- release closure

Ownership SHALL remain clear during incidents.

---

## 45. Release Evidence

A release record SHOULD preserve:

- release identifier
- source revision
- artifact
- environment
- deployment time
- approver
- change scope
- test evidence
- migration reference
- deployment strategy
- verification results
- rollback/roll-forward outcome
- incidents or anomalies
- final release status

---

## 46. Release Auditability

A reviewer SHOULD be able to answer:

- What was released?
- Who approved it?
- Why was it released?
- When was it released?
- What artifact was deployed?
- What evidence supported approval?
- Did production behave as expected?
- What happened if it did not?

---

## 47. Release and Observability

REL-017 depends on OBS-014 for production evidence.

Release processes SHOULD expose:

- deployment markers
- release identifiers
- version information
- health signals
- release-specific dashboards/queries where useful

A release cannot be safely verified without appropriate observability.

---

## 48. Release and Performance

Material releases SHALL consider PERF-015.

Where performance risk exists:

- define performance acceptance criteria
- monitor latency
- monitor throughput
- compare against baseline
- evaluate resource impact

---

## 49. Release and Documentation

Material releases SHALL follow DOC-016.

Update where applicable:

- release notes
- API documentation
- runbooks
- migration documentation
- architecture documentation
- operational procedures

---

## 50. Release and Testing

Release evidence SHALL incorporate QA-008.

Testing SHOULD reflect release risk.

A passing unit-test suite alone does not establish production release readiness.

---

## 51. AI-Assisted Release Management

AI-assisted release activities SHALL comply with AI-010.

AI MAY assist with:

- release summaries
- checklist preparation
- change analysis
- release-note drafting
- anomaly analysis
- deployment planning

AI SHALL NOT independently approve production release unless the organization explicitly defines and authorizes such automation under governance.

High-risk production actions SHALL retain appropriate human authorization.

---

## 52. AI Release Risks

Reviewers SHOULD verify AI-generated:

- change summaries
- release notes
- migration descriptions
- risk assessments
- rollback recommendations
- production commands

against authoritative evidence.

AI SHALL NOT invent release evidence.

---

## 53. Release Readiness Gate

Before production approval:

### Scope

- [ ] Release scope is explicit.
- [ ] Release candidate/artifact is identified.
- [ ] Dependencies are understood.

### Evidence

- [ ] Required tests passed.
- [ ] Security requirements passed.
- [ ] Relevant performance evidence exists.
- [ ] Observability is available.
- [ ] Documentation is updated.

### Change Safety

- [ ] Database migrations are reviewed.
- [ ] Compatibility is understood.
- [ ] Feature flags are controlled where used.
- [ ] Deployment strategy is appropriate.
- [ ] Rollback/roll-forward is understood.

### Operations

- [ ] Release owner is identified.
- [ ] Success criteria are measurable.
- [ ] Monitoring period is defined.
- [ ] Smoke verification exists where appropriate.

---

## 54. Automatic Production Blockers

Production SHALL be blocked when:

- release artifact cannot be identified
- required approval is missing
- release scope is unknown
- critical tests have not passed
- required security gates have failed
- critical migration compatibility is unknown
- required production observability is absent
- success criteria are undefined for a high-risk release
- rollback or recovery is unknown for a reversible high-risk change
- irreversible changes have no explicit recovery strategy
- required documentation is materially incomplete
- release ownership is absent
- AI-generated release evidence has not been verified
- deployment success is being treated as proof of production health without verification

---

## 55. Release Anti-Patterns

### Deploy = release

Treating successful deployment as successful release.

### Friday blind release

Releasing high-risk changes without appropriate support or recovery capability.

### Giant release

Bundling unrelated changes into one difficult-to-diagnose production event.

### Rollback theater

Claiming rollback is available when database or data changes make it unsafe.

### Flag forever

Leaving feature flags permanently without ownership or cleanup.

### Pipeline worship

Assuming a green pipeline makes human release judgment unnecessary.

### Untracked hotfix

Making emergency production changes that cannot be traced later.

### No observation period

Declaring success immediately after deployment.

### Evidence after approval

Approving a release first and collecting evidence afterward.

### AI release authority

Allowing generated summaries or recommendations to become production approval without verification.

---

## 56. Reviewer Checklist

A reviewer or SGE SHOULD verify:

- [ ] Release scope is clear.
- [ ] Risk classification is appropriate.
- [ ] Release artifact is immutable/identifiable.
- [ ] Required governance gates are satisfied.
- [ ] Database compatibility is understood.
- [ ] Deployment strategy matches risk.
- [ ] Success criteria are measurable.
- [ ] Rollback/roll-forward is understood.
- [ ] Observability is sufficient.
- [ ] Performance impact is understood.
- [ ] Documentation is updated.
- [ ] Release owner is identified.
- [ ] Production verification is defined.
- [ ] Release evidence will be retained.
- [ ] Emergency procedures are understood where applicable.
- [ ] AI-generated release information is verified.

---

## 57. Relationship to Other Standards

REL-017 complements:

- GOV-000 — Engineering Governance Constitution
- REQ-001 — Requirements Engineering Standard
- ARC-002 — Architecture & System Design Standard
- DB-005 — Database Engineering Standard
- API-006 — API Governance Standard
- SEC-007 — Security Engineering Standard
- QA-008 — Testing & Quality Engineering Standard
- REV-009 — Code Review Standard
- AI-010 — AI-Assisted Development Standard
- GIT-011 — Git & Version Control Standard
- CICD-012 — CI/CD Standard
- INFRA-013 — Infrastructure & Environment Standard
- OBS-014 — Observability Standard
- PERF-015 — Performance Engineering Standard
- DOC-016 — Documentation Standard

REL-017 governs the **decision and lifecycle of releasing change into production**.

CICD-012 governs the machinery that delivers the change.

---

## 58. Exceptions

Exceptions to REL-017 require an explicit engineering exception under EXC-021.

The exception SHALL document:

- release deviation
- reason
- affected change
- risk
- missing control
- compensating controls
- owner
- expiration/review date

Urgency may justify a controlled exception. It does not eliminate accountability.

---

## 59. Change Control

Release governance SHALL be reassessed when changes materially affect:

- release risk
- deployment strategy
- migration behavior
- rollback capability
- production verification
- approval authority
- release ownership
- external communication

---

## 60. Sign-Off

**System:** ____________________  
**Release:** ____________________  
**Release identifier:** ____________________  
**Source revision:** ____________________  
**Artifact:** ____________________  
**Scope:** ____________________  
**Risk classification:** ____________________  
**Deployment strategy:** ____________________  
**Migration reference:** ____________________  
**Verification reference:** ____________________  
**Rollback/roll-forward reference:** ____________________  
**Release owner:** ____________________  
**Approver:** ____________________  
**Production decision:** GO / GO WITH CONDITIONS / NO-GO  
**Release result:** SUCCESS / PARTIAL / FAILED / ROLLED BACK / ROLLED FORWARD  
**Release date:** ____________________

---

## 61. Final Principle

> **A release is an engineering decision, not a deployment command.**

The controlled release chain is:

**change → review → evidence → approval → release → verification → observation → closure**

**Release deliberately. Minimize blast radius. Verify production. Preserve evidence.**
