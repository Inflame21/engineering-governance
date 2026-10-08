# GOV-023 — Engineering Evidence & Traceability Standard

**Status:** Published  
**Category:** Governance Operations  
**Authority:** GOV-000  
**Lifecycle:** GOV-022  
**Applies to:** All governed software projects and material engineering changes

---

## 1. Purpose

GOV-023 defines how engineering decisions are supported, recorded, traced, reviewed, and retained through objective evidence.

The governance framework requires evidence rather than unsupported assertions. This standard defines what that means operationally.

> **An engineering claim is not established by confidence. It is established by evidence appropriate to the risk of the claim.**

## 2. Scope

GOV-023 applies to evidence supporting:

- requirements
- architecture
- implementation
- security
- database changes
- API changes
- testing
- performance
- infrastructure
- observability
- releases
- incidents
- technical debt
- exceptions
- production readiness
- AI-assisted development
- governance decisions

It applies to evidence produced manually, automatically, or with AI assistance.

## 3. Evidence Principles

Evidence MUST be:

### Relevant
It directly supports the claim or decision being evaluated.

### Sufficient
It provides enough information to reasonably establish the claim.

### Reliable
Its source and generation method are trustworthy for the risk involved.

### Current
It reflects the version, environment, configuration, and behavior being evaluated.

### Traceable
A reviewer can identify what produced the evidence and what it applies to.

### Reproducible Where Practical
Another qualified engineer can repeat the relevant verification when practical.

### Proportionate
Evidence depth is proportional to engineering risk.

## 4. Claim → Evidence Model

Material engineering claims SHOULD follow:

~~~
Claim
  ↓
Risk
  ↓
Required Evidence
  ↓
Verification
  ↓
Decision
~~~

Example:

~~~
Claim:
"Only authorized managers can approve leave."

Evidence:
- authorization implementation
- authorization policy
- positive authorization test
- unauthorized-role test
- tenant-isolation test
- code review
~~~

The claim should not be accepted merely because the implementation appears correct.

## 5. Evidence Classes

Evidence SHOULD be classified by source.

### E1 — Direct Verification
Strongest general evidence.

Examples:
- successful automated test
- reproducible benchmark
- migration test
- security test
- verified restore
- deployment verification

### E2 — Inspection
Evidence obtained through qualified review.

Examples:
- code review
- architecture review
- configuration inspection
- schema inspection
- dependency review

### E3 — Automated Analysis
Evidence produced by trusted tooling.

Examples:
- static analysis
- type checking
- dependency scanning
- secret scanning
- linting
- infrastructure validation

Automated results MUST be interpreted in context.

A passing scanner does not prove that a broader security property is satisfied.

### E4 — Operational Evidence
Evidence from actual system behavior.

Examples:
- production metrics
- logs
- traces
- deployment verification
- incident records
- recovery exercises

### E5 — Documentary Evidence
Evidence contained in controlled engineering records.

Examples:
- requirements
- ADRs
- threat models
- migration plans
- release plans
- runbooks

Documentation alone is generally insufficient to prove runtime behavior.

### E6 — Assertion
An engineer's statement without independent supporting evidence.

Assertions MAY provide context but SHOULD NOT be treated as sufficient evidence for material production-critical claims.

## 6. Evidence Strength

Evidence strength SHOULD reflect risk.

| Risk | Expected Evidence |
|---|---|
| Low | Inspection or appropriate automated check |
| Medium | Automated verification + review |
| High | Direct verification + review + supporting evidence |
| Critical | Multiple independent evidence sources + explicit approval |

The absence of a specific test does not automatically invalidate a claim if another stronger verification method is appropriate.

## 7. Evidence Freshness

Evidence has a validity context.

Evidence SHOULD identify, where relevant:

- commit SHA
- branch/tag
- artifact version
- environment
- configuration version
- database/schema version
- test suite/version
- execution timestamp
- relevant dependency versions

Evidence MAY become invalid when:

- implementation changes materially
- configuration changes
- dependencies change
- infrastructure changes
- schema changes
- requirements change
- threat assumptions change
- the environment materially differs

Do not reuse stale evidence merely because the underlying feature name is unchanged.

## 8. Evidence Traceability

Material decisions SHOULD be traceable across the lifecycle.

Recommended relationship:

~~~
Requirement
    ↓
Design / ADR
    ↓
Implementation
    ↓
Test / Verification
    ↓
Review
    ↓
Release
    ↓
Production Evidence
~~~

A reviewer SHOULD be able to answer:

- Which requirement does this change satisfy?
- Which implementation satisfies it?
- Which tests verify it?
- Which review evaluated it?
- Which release contains it?
- What happened after deployment?

## 9. Evidence Identifiers

Projects SHOULD assign stable identifiers to material evidence where practical.

Examples:

~~~
REQ-EMP-014
ADR-EMP-007
TEST-EMP-042
SEC-EMP-009
PERF-EMP-003
REL-2026-041
INC-2026-017
EXC-2026-006
~~~

Identifiers SHOULD remain stable even when supporting files move.

## 10. Evidence Packages

Material governance gates SHOULD produce an evidence package.

A package MAY contain:

~~~
evidence/
├── requirements.md
├── architecture.md
├── implementation.md
├── security.md
├── testing.md
├── performance.md
├── infrastructure.md
├── observability.md
├── release.md
├── risks.md
├── exceptions.md
└── decision.md
~~~

The exact structure MAY vary by project.

The evidence package MUST identify:

- scope
- version/change
- evidence
- findings
- unresolved risks
- decision
- reviewer
- date

## 11. Evidence and Pull Requests

For material changes, the pull request SHOULD provide enough information for a reviewer to understand:

- what changed
- why it changed
- affected requirements
- affected architecture
- relevant risks
- tests performed
- security impact
- data/API impact
- operational impact
- deployment/migration considerations
- known debt
- exceptions

The PR SHOULD link to supporting evidence rather than duplicating large documents.

## 12. Test Evidence

Test evidence MUST identify what was actually verified.

A useful test record includes:

- test scope
- test type
- environment
- relevant version
- execution result
- failures
- exclusions
- known limitations

A green test suite does not prove:

- untested requirements
- absence of security vulnerabilities
- production-scale performance
- disaster recovery
- operational readiness

Testing evidence MUST be interpreted according to QA-008.

## 13. Security Evidence

Security-sensitive claims SHOULD use direct evidence where practical.

Examples:

~~~
Claim:
"Tenant data is isolated."

Evidence:
- authorization policy
- query/data-access implementation
- cross-tenant negative tests
- database constraints where applicable
- security review
~~~

~~~
Claim:
"No secrets are committed."

Evidence:
- secret scanning
- repository inspection
- configuration review
~~~

Security evidence MUST follow SEC-007.

## 14. Performance Evidence

Performance claims SHOULD include:

- workload
- environment
- baseline
- measurement method
- relevant percentile
- bottleneck
- optimization
- post-change measurement
- regression protection

Avoid claims such as:

- "fast"
- "optimized"
- "scales well"
- "low latency"

without defining the property being claimed.

Performance evidence MUST follow PERF-015.

## 15. Database and Migration Evidence

Database changes SHOULD include evidence appropriate to their risk.

Examples:

- schema validation
- migration execution
- migration rollback/recovery testing
- compatibility verification
- query plans
- index validation
- data-integrity tests
- backfill validation
- production-scale considerations

A migration that succeeds on an empty development database is not sufficient evidence for a high-risk production migration.

## 16. Infrastructure Evidence

Infrastructure changes SHOULD include, where applicable:

- configuration validation
- infrastructure-plan output
- security validation
- dependency validation
- deployment verification
- capacity assessment
- failure testing
- backup verification
- restore testing
- rollback/recovery evidence

A declared backup configuration is not equivalent to a successful restore test.

## 17. Release Evidence

A release SHOULD retain evidence of:

- source revision
- artifact identity
- CI result
- approval
- deployment target
- migration status
- smoke tests
- health verification
- monitoring
- rollback/roll-forward decision
- post-deployment verification

Release evidence MUST be traceable to REL-017 and CICD-012.

## 18. Production Readiness Evidence

PRD-018 MUST consume evidence from applicable standards.

A production readiness decision SHOULD identify:

~~~
Claim
Evidence
Finding
Residual Risk
Decision
Approver
~~~

A production-readiness score MUST NOT replace evidence.

A high score cannot override:

- unresolved P0 blockers
- mandatory security failures
- missing required approvals
- unknown critical behavior
- unsafe migrations
- unacceptable residual risk

## 19. Evidence Quality Failures

The following are evidence defects:

### Unsupported Claim
A material assertion has no supporting evidence.

### Stale Evidence
Evidence describes an earlier implementation or environment.

### Non-Representative Evidence
Testing does not represent the risk or workload being evaluated.

### Incomplete Evidence
Only the happy path is demonstrated for a failure-sensitive behavior.

### Circular Evidence
The implementation is considered correct because its own generated documentation says it is correct.

### Tool-Only Evidence
A scanner or automated check is treated as proof of a broader property it cannot establish.

### Screenshot-Only Evidence
A screenshot is treated as proof of underlying system correctness when it only demonstrates presentation.

### AI Assertion
AI-generated reasoning is treated as evidence without independent verification.

## 20. Unknown Evidence State

When evidence cannot be obtained, the state MUST be explicit:

~~~
VERIFIED
PARTIALLY VERIFIED
UNVERIFIED
NOT APPLICABLE
~~~

Do not convert UNVERIFIED into VERIFIED through assumption.

For material production properties, UNVERIFIED SHOULD normally block approval unless an explicit risk acceptance or exception is permitted.

## 21. Evidence Ownership

Every material evidence package SHOULD have an owner.

The owner is responsible for:

- completeness
- freshness
- traceability
- responding to reviewer questions
- updating evidence when implementation changes

Ownership does not transfer accountability away from the reviewer or approver.

## 22. Evidence Retention

Evidence retention SHOULD match the lifecycle and risk of the change.

Retain evidence long enough to support:

- production investigation
- rollback/recovery
- incident analysis
- compliance obligations where applicable
- architectural decisions
- future maintenance
- auditability
- technical-debt analysis

Sensitive evidence MUST follow SEC-007 data-handling requirements.

## 23. AI-Generated Evidence

AI MAY assist in:

- organizing evidence
- summarizing test results
- generating checklists
- identifying missing evidence
- correlating records
- drafting reports

AI MUST NOT fabricate evidence.

The following are prohibited:

- claiming tests ran when they did not
- claiming a scan passed without execution
- inventing benchmark results
- inventing approvals
- inventing security findings
- inventing production validation
- presenting generated reasoning as observed system behavior

AI-generated evidence summaries MUST remain traceable to their source evidence.

## 24. Evidence and Governance Gates

Each gate SHOULD answer:

### Requirements
> Is the problem and expected behavior sufficiently established?

### Architecture
> Is the proposed system design sufficiently justified?

### Implementation
> Does the implementation satisfy the approved design and requirements?

### Verification
> Is there sufficient evidence that material behavior works and failures are controlled?

### Review
> Has an appropriately qualified reviewer evaluated the material risks?

### Release
> Is the release artifact controlled and safely deployable?

### Production
> Is there sufficient evidence and ownership to accept production risk?

## 25. Evidence Conflict Resolution

If evidence conflicts:

1. Identify the conflict.
2. Determine which source is authoritative.
3. Verify timestamps/versions.
4. Prefer direct, current evidence over indirect or stale evidence.
5. Do not silently select the evidence that supports the desired outcome.
6. Escalate unresolved conflicts.

Example: if documentation says a migration is backward compatible but an integration test demonstrates an incompatible schema change, the conflict MUST be investigated before approval.

## 26. Evidence Review

Reviewers SHOULD challenge:

- whether evidence actually supports the claim
- whether the evidence is current
- whether the test represents the production risk
- whether important negative cases are missing
- whether the evidence covers the affected blast radius
- whether the environment is representative
- whether assumptions remain valid
- whether AI-generated summaries accurately reflect source evidence

A reviewer should ask:

> **What would falsify this claim?**

This is often more useful than asking only whether the evidence supports it.

## 27. Evidence Anti-Patterns

Avoid:

- evidence dumping
- massive logs without interpretation
- screenshots without context
- coverage percentages without risk analysis
- green CI treated as universal proof
- documentation treated as runtime verification
- manually edited test results
- unverifiable external claims
- stale benchmark results
- copied evidence from another release
- AI-generated evidence without source references
- evidence created solely to satisfy a checklist

## 28. Automatic Evidence Blockers

Material approval MUST be blocked when:

- required evidence is absent;
- evidence cannot be linked to the evaluated change;
- evidence is demonstrably stale;
- evidence contradicts the implementation;
- evidence was fabricated;
- critical test results are unavailable;
- production-critical behavior remains unverified without an approved risk decision;
- an approval is claimed but cannot be verified;
- evidence integrity is compromised.

## 29. Reviewer Checklist

- [ ] Claim is explicitly defined.
- [ ] Risk associated with the claim is understood.
- [ ] Evidence directly supports the claim.
- [ ] Evidence is current.
- [ ] Evidence is traceable to the evaluated change.
- [ ] Environment/version is known where relevant.
- [ ] Negative/failure behavior is considered.
- [ ] Evidence is representative of the production risk.
- [ ] Automated checks are not over-interpreted.
- [ ] AI-generated summaries are verified.
- [ ] Conflicting evidence is resolved.
- [ ] Unknown states are explicitly recorded.
- [ ] Required approvals are traceable.
- [ ] Evidence retention is appropriate.

## 30. Definition of Done

Evidence governance is complete when:

- material claims are identified;
- appropriate evidence exists;
- evidence is current and traceable;
- important limitations are documented;
- unresolved uncertainty is explicit;
- required reviewers can inspect the evidence;
- governance decisions are linked to their evidence;
- evidence cannot be mistaken for unsupported assertion.

## 31. Relationship to Other Standards

GOV-023 complements GOV-022.

~~~
GOV-022
Governance Lifecycle
      ↓
What gate are we at?
      ↓
GOV-023
Evidence & Traceability
      ↓
What evidence supports the gate?
      ↓
Domain Standards
      ↓
What must be true?
      ↓
Decision
~~~

GOV-023 does not replace:

- QA-008 for testing
- SEC-007 for security
- PERF-015 for performance
- REV-009 for code review
- PRD-018 for production readiness

It defines how evidence from those standards becomes trustworthy governance evidence.

## 32. Final Principle

> **Evidence is the bridge between engineering activity and engineering confidence.**

A system should not be approved because the team believes it is correct.

It should be approved because the relevant risks have been examined and the available evidence is strong enough to justify the decision.