# Engineering Governance — AI Agent Instructions

## 1. Purpose

This repository contains the **Engineering Governance Framework** for building, reviewing, approving, deploying, and maintaining production software.

When operating on a project governed by this repository, you MUST treat these standards as engineering constraints, not optional documentation.

> **AI may accelerate implementation. AI does not have authority to redefine requirements, bypass architecture, weaken security, ignore testing, or declare production readiness.**

---

## 2. Authority

The governance hierarchy is:

```
GOV-000 — Engineering Governance Constitution
        ↓
Domain-specific Governance Standards
        ↓
Project Requirements / ADRs / Approved Decisions
        ↓
Implementation
        ↓
Evidence
        ↓
Production Readiness
```

The highest-level governing document is:

`00-governance/00-engineering-governance-constitution.md`

If a project-specific instruction conflicts with a mandatory governance requirement, do not silently choose one. Identify the conflict and request an explicit engineering decision or exception.

---

## 3. Core Operating Rules

You MUST:

1. Understand the requested outcome before implementing.
2. Identify applicable governance standards before making significant engineering decisions.
3. Read the relevant standards rather than guessing their requirements.
4. Respect existing project architecture, requirements, ADRs, and constraints.
5. Prefer existing project patterns over introducing unnecessary new patterns.
6. Keep business logic separate from transport, presentation, persistence, and infrastructure concerns.
7. Preserve security, data integrity, reliability, observability, and maintainability.
8. Add or update tests for behavior that changes.
9. Consider failure paths, not only the happy path.
10. Produce evidence for significant engineering claims.
11. Record known technical debt instead of silently accepting it.
12. Request an exception when a mandatory requirement cannot be satisfied.
13. Never silently bypass governance.
14. Never claim that software is production-ready without sufficient evidence.

---

## 4. Do Not Load Everything by Default

Do NOT blindly load every governance document into context for every task.

Instead:

1. Understand the task.
2. Determine the affected engineering areas.
3. Load only the relevant standards.
4. Apply their mandatory requirements.
5. Cross-check related standards when the change crosses boundaries.

This prevents irrelevant context from influencing implementation and reduces context contamination.

---

## 5. Governance Standard Routing

| Task / Change | Required Standard(s) |
|---|---|
| Requirements / feature definition | REQ-001 |
| System architecture | ARC-002 |
| Backend implementation | BE-003 |
| FastAPI implementation | BE-003 + `03-backend/profiles/fastapi.md` |
| Frontend implementation | FE-004 |
| Database/schema/migration | DB-005 |
| API design/change | API-006 |
| Authentication/authorization/security | SEC-007 |
| Testing strategy/implementation | QA-008 |
| Code review | REV-009 |
| AI/vibe-coded implementation | AI-010 |
| Git/branch/PR/commit changes | GIT-011 |
| CI/CD pipelines | CICD-012 |
| Infrastructure/environment changes | INFRA-013 |
| Logging/metrics/tracing/alerts | OBS-014 |
| Performance optimization | PERF-015 |
| Documentation | DOC-016 |
| Release planning | REL-017 |
| Production readiness | PRD-018 |
| Incident response | INC-019 |
| Technical debt | DEBT-020 |
| Governance deviation | EXC-021 |

When a change crosses multiple domains, apply all relevant standards.

Example:

```
Adding a new authenticated API endpoint that writes database records:

BE-003
API-006
DB-005
SEC-007
QA-008
REV-009
AI-010
```

---

## 6. Requirements Before Implementation

For non-trivial work, do not immediately start coding.

First determine:

- What problem is being solved?
- What behavior is required?
- Who is affected?
- What is explicitly in scope?
- What is out of scope?
- What business rules exist?
- What constraints exist?
- What failure cases matter?
- What security implications exist?
- What data changes are required?
- What external systems are involved?
- What acceptance criteria define success?

If the requirement is materially ambiguous:

> **Do not solve an ambiguous problem with precise code.**

Ask for clarification or document the assumption explicitly.

---

## 7. Architecture Before Implementation

For changes with architectural impact, determine:

```
Requirements
    ↓
System responsibilities
    ↓
Boundaries
    ↓
Domain/module boundaries
    ↓
Data ownership
    ↓
Integration boundaries
    ↓
Runtime behavior
    ↓
Technology decisions
    ↓
Implementation
```

Do not introduce:

- unnecessary abstractions
- unnecessary services
- unnecessary frameworks
- unnecessary dependencies
- duplicated sources of truth
- cross-layer business logic
- hidden coupling

If an architectural decision materially affects future evolution, document it as an ADR or equivalent engineering decision record.

---

## 8. Implementation Rules

Implementation MUST preserve clear responsibility boundaries.

General backend direction:

```
Transport / Handler
        ↓
Application
        ↓
Domain
        ↓
Infrastructure
```

General frontend direction:

```
UI / Components
        ↓
Application Workflows
        ↓
Domain / Business Behavior
        ↓
Infrastructure / API / Persistence
```

The exact architecture may vary by project, but responsibility boundaries MUST remain explicit.

Avoid:

- business logic inside controllers/routes
- business rules inside UI components
- direct database access scattered across application code
- duplicated validation rules with conflicting behavior
- hidden global mutable state
- swallowed exceptions
- generic catch-all error handling
- unexplained magic values
- dead code
- speculative abstractions
- copy-pasted implementations when a clear reusable boundary exists

---

## 9. Security Is Mandatory

Security MUST be considered for every relevant change.

Check:

- authentication
- authorization
- tenant isolation
- input validation
- output handling
- injection risks
- secrets
- sensitive data
- session/token handling
- file uploads
- external integrations
- dependency vulnerabilities
- logging of sensitive information
- least privilege

Never:

- hardcode secrets
- expose credentials
- disable security controls merely to make development easier
- trust client-side authorization
- assume tenant isolation without verification
- log sensitive data unnecessarily

---

## 10. Database and Data Integrity

Database changes require deliberate consideration of:

- ownership
- schema
- constraints
- relationships
- indexes
- transactions
- concurrency
- migration safety
- rollback/recovery
- data lifecycle
- sensitive data
- query performance

Never treat the database as an implementation detail when the change affects business correctness.

A migration must be evaluated for:

```
Existing data
    ↓
Existing application versions
    ↓
Migration
    ↓
New application version
    ↓
Rollback / recovery
```

---

## 11. API Changes

For API changes, verify:

- contract
- HTTP semantics
- request/response schemas
- validation
- authentication
- authorization
- error behavior
- idempotency
- pagination/filtering where applicable
- compatibility
- versioning
- rate limits
- observability
- documentation
- contract/integration tests

Do not break existing consumers silently.

---

## 12. Testing Requirements

Tests must provide evidence of behavior.

For meaningful changes, consider:

- unit tests
- component tests
- integration tests
- contract tests
- API tests
- database tests
- E2E tests
- negative-path tests
- authorization tests
- failure/recovery tests
- regression tests

Do not optimize for coverage percentage alone.

Ask:

> **Which production risk does this test reduce?**

AI-generated tests MUST be reviewed for correctness. Do not assume generated tests are valid simply because they pass.

---

## 13. Failure and Edge Cases

Every non-trivial implementation must consider:

- invalid input
- missing data
- duplicate requests
- concurrent requests
- timeouts
- retries
- partial failures
- external dependency failures
- database failures
- authorization failures
- stale state
- unexpected state transitions
- resource exhaustion

Happy-path-only implementation is insufficient for production approval.

---

## 14. Observability

Production-relevant behavior should be diagnosable.

Where applicable, provide:

- structured logs
- meaningful error information
- metrics
- tracing
- correlation/request IDs
- health/readiness signals
- audit events
- useful dashboards
- actionable alerts

Do not add telemetry merely to increase telemetry volume.

The objective is:

> **Detect → Understand → Respond**

---

## 15. Performance

Do not optimize blindly.

For meaningful performance work:

```
Requirement
    ↓
Workload
    ↓
Baseline
    ↓
Measurement
    ↓
Bottleneck
    ↓
Optimization
    ↓
Validation
    ↓
Regression Protection
```

Never claim that an implementation is "optimized" without evidence.

Consider:

- latency
- throughput
- database queries
- N+1 behavior
- memory
- CPU
- network payloads
- caching
- concurrency
- external dependencies
- scalability

Correctness and security take precedence over premature optimization.

---

## 16. AI-Assisted Development

AI-generated or AI-modified code is subject to the same engineering standards as human-written code.

The agent MUST:

- verify generated code
- verify APIs and library usage
- verify dependencies
- verify security assumptions
- verify architecture
- verify generated tests
- verify migrations
- verify infrastructure changes
- avoid hallucinated APIs
- avoid invented requirements
- avoid fabricated documentation
- avoid silently changing unrelated code

Never use:

> "The AI generated it."

as evidence of correctness.

Never use:

> "The tests pass."

as the only evidence of production readiness.

---

## 17. Context Governance

Project context is an engineering input.

Treat the following as potentially authoritative:

- approved requirements
- ADRs
- governance standards
- architecture documentation
- API contracts
- schema definitions
- source code
- deployment configuration
- approved operational documentation

Treat the following as potentially unreliable until verified:

- stale documentation
- generated summaries
- AI-generated plans
- copied prompts
- outdated TODOs
- comments contradicting implementation
- assumptions from previous conversations
- unverified external examples

If sources conflict:

1. Identify the conflict.
2. Determine the authoritative source.
3. Do not silently choose a convenient interpretation.
4. Escalate if authority cannot be established.

---

## 18. Technical Debt

If a change introduces or exposes technical debt:

- identify it
- classify it
- assess impact
- assign ownership when appropriate
- record it in the project's debt mechanism

Do not hide debt merely to make the implementation appear complete.

Use:

`20-technical-debt/20-technical-debt-standard.md`

for governance requirements.

---

## 19. Exceptions

If a mandatory governance requirement cannot be satisfied:

**DO NOT silently bypass it.**

Use:

`21-exceptions/21-engineering-exception-standard.md`

An exception requires explicit:

- justification
- risk assessment
- mitigation
- residual-risk assessment
- owner
- approval
- evidence
- expiration/review date where applicable

> **No undocumented bypasses.**

---

## 20. Code Review

Before requesting approval, review the change as if you will be responsible for the production incident caused by it.

Use:

`09-code-review/09-code-review-standard.md`

Review:

- requirements
- architecture
- correctness
- security
- data integrity
- API contracts
- failure behavior
- concurrency
- performance
- observability
- tests
- dependencies
- configuration
- maintainability
- blast radius

Do not approve code merely because:

- it compiles
- tests pass
- the UI looks correct
- the diff is small
- an AI generated it
- another engineer wrote it

---

## 21. Production Readiness

Production readiness is an evidence-based decision.

Use:

`18-production-readiness/18-production-readiness-standard.md`

The possible decisions are:

```
GO
GO WITH CONDITIONS
NO-GO
```

A production decision MUST consider evidence from:

```
Requirements
Architecture
Implementation
Database
API
Security
Testing
Code Review
AI Governance
Git
CI/CD
Infrastructure
Observability
Performance
Documentation
Release
Operations
Recovery
Ownership
Known Risks
Technical Debt
Exceptions
```

Never declare:

> "Production ready"

based solely on confidence, code completion, or successful local execution.

---

## 22. Automatic Stop Conditions

Stop implementation and surface the issue when you discover:

- unclear critical requirements
- conflicting authoritative instructions
- missing security controls
- unauthorized access paths
- tenant-isolation risks
- destructive database changes without a safe migration strategy
- secrets in source control
- broken backward compatibility
- unhandled critical failure paths
- missing mandatory tests
- unsafe infrastructure changes
- missing rollback/recovery strategy for high-risk changes
- undocumented governance bypass
- unknown production-critical behavior

Do not work around these silently.

---

## 23. Evidence

When making an engineering claim, prefer evidence.

Example:

```
Claim:
"The endpoint is idempotent."

Evidence:
- idempotency-key handling
- persistence strategy
- duplicate-request test
- concurrency test
```

```
Claim:
"The migration is backward compatible."

Evidence:
- expand/contract strategy
- migration test
- compatibility analysis
- rollback/recovery plan
```

```
Claim:
"The service is production-ready."

Evidence:
- completed readiness checklist
- passing CI
- security validation
- operational validation
- release plan
- known-risk assessment
- required approvals
```

Evidence beats assertion.

---

## 24. Change Scope

Keep changes focused.

Do not modify unrelated code merely because you noticed it while implementing another task.

If unrelated problems are discovered:

1. Determine whether they block the requested change.
2. Fix them if they are necessary for correctness/security.
3. Otherwise record them as technical debt or a separate task.

Avoid opportunistic refactoring unless explicitly justified.

---

## 25. Completion Protocol

Before declaring a task complete, verify:

```
[ ] Requirements understood
[ ] Applicable governance identified
[ ] Architecture respected
[ ] Implementation complete
[ ] Security reviewed
[ ] Data integrity reviewed
[ ] API contracts reviewed
[ ] Failure paths considered
[ ] Tests added/updated
[ ] Observability considered
[ ] Performance impact considered
[ ] Documentation updated
[ ] Technical debt recorded
[ ] Exceptions documented if required
[ ] Git diff reviewed
[ ] CI checks considered
[ ] Production impact assessed
```

For production-bound changes, also verify:

```
[ ] Release strategy exists
[ ] Rollback/recovery strategy exists
[ ] Operational ownership exists
[ ] Monitoring exists
[ ] Alerts are actionable
[ ] Known risks are documented
[ ] Production readiness has been assessed
[ ] Required approval exists
```

---

## 26. Required Final Response From the Agent

For significant engineering tasks, conclude with a concise engineering summary containing:

### Changed

What was implemented or modified.

### Standards Applied

Which governance documents were used.

### Evidence

Tests, checks, measurements, reviews, or other evidence produced.

### Risks

Known risks or unresolved concerns.

### Technical Debt

New or discovered debt.

### Exceptions

Any governance exceptions requested or required.

### Production Impact

Whether the change is:

- development-only
- safe for integration
- ready for review
- ready for release assessment
- production-ready
- blocked

Do not claim a stronger state than the available evidence supports.

---

## 27. Final Rule

The agent's objective is not:

> **Write code as quickly as possible.**

The objective is:

> **Produce correct, secure, maintainable, observable, testable, reviewable, and operationally safe software with evidence supporting the engineering decisions.**

**AI is an implementation tool. Engineering governance remains authoritative.**
