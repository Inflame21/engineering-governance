# REV-009 — Code Review Standard

**Status:** Mandatory Engineering Standard  
**Applies to:** All production-bound code changes  
**Technology:** Technology-neutral  

---

## 1. Purpose

REV-009 defines how engineers review code, how review findings are classified, what evidence is required, and how a reviewer determines whether a change is suitable for production.

Code review is an engineering control, not a formatting exercise.

> **The reviewer is accountable for evaluating the change as a system contribution, not merely deciding whether the code looks reasonable.**

## 2. Scope

REV-009 applies to:

- Application code
- Backend code
- Frontend code
- Database changes
- API changes
- Infrastructure code
- CI/CD configuration
- Security-sensitive changes
- Configuration changes
- Tests
- AI-generated or AI-assisted code
- Refactors
- Dependency changes
- Documentation that changes operational or engineering behavior

## 3. Review Principles

Reviewers SHALL:

- Review behavior and risk, not only syntax.
- Verify the change against requirements.
- Check architectural alignment.
- Evaluate failure behavior.
- Look for security and data-integrity risks.
- Verify tests provide meaningful evidence.
- Consider operational consequences.
- Challenge unnecessary complexity.
- Identify hidden coupling.
- Treat AI-generated code as untrusted implementation.
- Require evidence for production claims.

Reviewers SHOULD:

- Prefer simple designs.
- Identify defects close to their source.
- Explain why material findings matter.
- Distinguish defects from preferences.
- Avoid blocking changes solely on personal style when standards are satisfied.

## 4. Reviewer Responsibility

A reviewer is responsible for the quality of the review, not the authorship of the implementation.

Approval SHALL mean that the reviewer has sufficient evidence to accept the known risk of the change.

Reviewers SHALL NOT approve based solely on:

- Author confidence
- AI-generated explanations
- Passing compilation
- Passing lint
- High test coverage
- Successful local execution
- Visual similarity

## 5. Review Preconditions

A production review SHOULD begin only when the change has sufficient context.

The reviewer SHOULD have access to:

- Relevant requirements
- Architecture decisions
- API contracts where applicable
- Database changes where applicable
- Security requirements
- Test evidence
- Deployment impact
- Known limitations
- Related issues or acceptance criteria

Large changes lacking design context SHOULD be returned for clarification before detailed line-by-line review.

## 6. Review Scope

Reviewers SHALL determine the blast radius of the change.

Consider:

- Changed modules
- Consumers
- APIs
- Database schema
- External integrations
- Authentication/authorization
- Background jobs
- Events
- Caches
- Configuration
- Deployment behavior
- Operational dependencies

The review scope SHALL extend beyond changed lines when the change affects shared behavior.

## 7. Requirements Verification

The reviewer SHALL determine whether the implementation satisfies the intended requirements.

Verify:

- Functional behavior
- Business rules
- Acceptance criteria
- Edge cases
- Explicit constraints
- Error behavior
- Non-functional requirements

An implementation that compiles but violates the requirement is a review failure.

## 8. Architecture Review

Reviewers SHALL assess whether the implementation follows approved architecture.

Check:

- Module boundaries
- Dependency direction
- Separation of concerns
- Domain ownership
- Business logic placement
- Data ownership
- Integration boundaries
- Transaction boundaries
- Runtime behavior
- Failure architecture

Architecture shortcuts that create long-term coupling SHALL be identified.

ARC-002 remains authoritative for architecture requirements.

## 9. Code Structure and Maintainability

Reviewers SHOULD evaluate:

- Naming
- Cohesion
- Coupling
- Function/class/module size
- Duplication
- Abstraction quality
- Error handling
- Dependency management
- Readability
- Local reasoning

Code should be understandable without requiring the author to explain every decision.

Complexity requires justification.

## 10. Business Logic Review

Business rules SHALL reside in the appropriate application/domain boundary.

Reviewers SHALL look for:

- Duplicated business rules
- Inconsistent state transitions
- Missing invariants
- Invalid state combinations
- Incorrect ordering
- Race conditions
- Implicit assumptions

UI behavior SHALL NOT be treated as the authoritative enforcement point for business rules.

## 11. Data and Database Review

Database changes SHALL be reviewed for:

- Data integrity
- Constraints
- Indexes
- Query behavior
- Transactions
- Concurrency
- Migration safety
- Backward compatibility
- Rollback/recovery
- Data loss risk

Reviewers SHALL assess the production impact of schema changes, not merely whether the migration executes.

DB-005 remains authoritative for database engineering.

## 12. API Review

API changes SHALL be reviewed for:

- Contract correctness
- Status codes
- Request/response schemas
- Error behavior
- Validation
- Authorization
- Pagination
- Idempotency
- Concurrency
- Compatibility
- Documentation

Breaking changes SHALL have explicit migration evidence.

API-006 remains authoritative for API governance.

## 13. Security Review

Reviewers SHALL evaluate security impact appropriate to the change.

Check:

- Authentication
- Authorization
- Tenant isolation
- Input validation
- Injection risk
- Secret handling
- Sensitive-data exposure
- Session/token behavior
- File handling
- Dependency risk
- Security logging

Security-sensitive changes SHALL NOT be approved solely because the happy path works.

SEC-007 remains authoritative for security requirements.

## 14. Error and Failure Review

Reviewers SHALL ask:

- What happens when the dependency fails?
- What happens when the input is invalid?
- What happens when the resource does not exist?
- What happens when the operation is repeated?
- What happens during concurrent execution?
- What happens after a timeout?
- What happens after partial completion?
- What happens when downstream data is malformed?

Failure behavior must be intentional.

Silent corruption is generally more severe than visible failure.

## 15. Concurrency and Idempotency

Reviewers SHALL identify operations that can be executed concurrently or retried.

Check for:

- Duplicate side effects
- Lost updates
- Race conditions
- Double processing
- Non-atomic state transitions
- Unsafe retries
- Missing locking/version checks

Retry behavior SHALL be evaluated at both application and infrastructure boundaries where relevant.

## 16. Performance Review

Reviewers SHALL consider performance impact when changes affect:

- Large datasets
- High-traffic endpoints
- Rendering
- Serialization
- Database queries
- Network calls
- Background jobs
- Memory usage
- CPU-intensive operations

Look specifically for:

- N+1 queries
- Unbounded reads
- Unbounded response payloads
- Excessive re-rendering
- Blocking operations
- Inefficient loops
- Duplicate network calls
- Missing pagination
- Expensive operations inside hot paths

PERF-015 remains authoritative for performance engineering.

## 17. Observability Review

Material production behavior SHALL be observable enough to diagnose failures.

Reviewers SHOULD verify:

- Appropriate logs
- Metrics
- Traces where applicable
- Correlation/request identifiers
- Useful error context
- Sensitive-data filtering

Do not add logs that expose secrets or sensitive payloads merely for convenience.

## 18. Testing Review

Reviewers SHALL assess whether tests provide meaningful evidence.

Check:

- Requirement coverage
- Critical path coverage
- Negative paths
- Integration behavior
- Contract behavior
- Regression protection
- Security cases
- Failure behavior
- Test determinism

Reviewers SHALL challenge tests with weak or meaningless assertions.

QA-008 remains authoritative for testing requirements.

## 19. Dependency Review

Dependency changes SHALL be reviewed for:

- Necessity
- Maintenance status
- Security advisories
- License or organizational constraints where applicable
- Bundle/runtime impact
- Transitive dependencies
- Compatibility

Adding a dependency to avoid a small amount of maintainable code SHOULD require justification.

## 20. Configuration and Infrastructure Review

Configuration changes SHALL be reviewed for:

- Environment impact
- Secure defaults
- Secret handling
- Feature flags
- Backward compatibility
- Deployment behavior
- Rollback behavior

Infrastructure changes SHALL be reviewed for blast radius and failure behavior.

## 21. Frontend Review

Frontend changes SHALL be reviewed for:

- State ownership
- Component boundaries
- Loading/empty/error states
- Authorization-aware behavior
- Accessibility
- Responsive behavior where required
- Browser storage
- Network failure handling
- Performance
- Security

Visual correctness is not sufficient if state or failure behavior is incorrect.

## 22. Code Review for AI-Generated Code

AI-generated code SHALL receive the same review as human-written code and SHOULD receive additional scrutiny where uncertainty is high.

Reviewers SHALL specifically inspect for:

- Hallucinated APIs
- Incorrect library assumptions
- Inconsistent architecture
- Duplicated logic
- Missing edge cases
- Weak validation
- Security bypasses
- Incorrect error handling
- Race conditions
- Over-abstraction
- Dead code
- Unnecessary dependencies
- Tests that merely mirror implementation
- Comments that describe incorrect behavior

AI-generated explanations SHALL NOT be treated as evidence that the implementation is correct.

> **AI assistance changes how code is produced. It does not change the review standard.**

## 23. Diff Hygiene

Reviewers SHOULD require changes to remain reviewable.

Unrelated changes SHOULD be separated from the target change.

Examples of review-hostile changes:

- Massive formatting-only changes
- Unrelated refactors
- Generated artifacts mixed with source changes
- Unnecessary dependency churn
- Renaming unrelated modules
- Debug code

Reviewability is a quality attribute.

## 24. Review Finding Severity

Findings SHALL be classified consistently.

| Severity | Meaning | Expected action |
|---|---|---|
| **P0 Critical** | Immediate severe production/security/data risk | Block |
| **P1 High** | Material correctness, security, reliability, or data risk | Normally block |
| **P2 Medium** | Real defect or material maintainability/operational concern | Fix or explicitly accept |
| **P3 Low** | Minor issue, improvement, or non-critical concern | Optional / backlog |
| **NIT** | Non-blocking preference or readability suggestion | Optional |

Severity SHALL reflect impact and likelihood, not how strongly the reviewer feels about the issue.

## 25. Review Comment Quality

Material review comments SHOULD contain:

1. What is wrong
2. Why it matters
3. The affected scenario
4. Expected behavior
5. A suggested direction where useful

Example:

> **P1:** This update can process the same order twice when the client retries after a timeout. The operation creates a second fulfillment record because no idempotency or uniqueness constraint protects the side effect. Retries must produce the same result rather than duplicate fulfillment.

Comments should identify defects rather than merely prescribe personal implementation preferences.

## 26. Review Workflow

A production review SHOULD follow this order:

```text
Requirements
    ↓
Architecture / boundaries
    ↓
Security / data risk
    ↓
Behavior / business logic
    ↓
Failure / concurrency
    ↓
Tests / evidence
    ↓
Performance / operations
    ↓
Maintainability
    ↓
Final production decision
```

Reviewers SHOULD identify high-severity issues early rather than spending most review time on cosmetic details.

## 27. Review Outcomes

A review SHALL result in one of:

| Decision | Meaning |
|---|---|
| **APPROVE** | No unresolved issue prevents the intended progression |
| **APPROVE WITH CONDITIONS** | Explicit conditions must be satisfied or tracked before the agreed production point |
| **REQUEST CHANGES** | Material issues must be corrected before approval |
| **REJECT** | The implementation is fundamentally unsuitable and requires redesign or replacement |

Approval is an engineering decision, not a courtesy.

## 28. Production Approval

A reviewer SHALL NOT approve production readiness when:

- Requirements are materially unmet
- Critical architecture violations remain
- P0 issues exist
- Unresolved P1 security/correctness/data risks exist
- Mandatory quality gates fail
- Critical behavior lacks meaningful evidence
- Known breaking changes lack migration strategy
- Production failure behavior is unacceptable
- Security controls are bypassable

GO, GO WITH CONDITIONS, and NO-GO remain the authoritative production decisions under GOV-000.

## 29. Review Evidence

For significant changes, the review record SHOULD include:

- Requirements/issue reference
- Architecture or ADR reference where applicable
- Summary of behavior changed
- Test evidence
- Security evidence where applicable
- Migration information
- Known limitations
- Review findings
- Decision
- Conditions or accepted risks

The evidence should correspond to the actual reviewed revision.

## 30. Review Checklist

### Context
- [ ] Requirements are understood
- [ ] Acceptance criteria are identifiable
- [ ] Blast radius is understood

### Architecture
- [ ] Boundaries are respected
- [ ] Dependencies point in the correct direction
- [ ] Business logic is correctly placed
- [ ] No unjustified architectural shortcut exists

### Correctness
- [ ] Happy path works
- [ ] Edge cases are handled
- [ ] State transitions are valid
- [ ] Business invariants are preserved

### Security
- [ ] Authentication is correct
- [ ] Authorization is enforced
- [ ] Sensitive data is protected
- [ ] Input is validated
- [ ] No secret exposure exists

### Data
- [ ] Data integrity is preserved
- [ ] Transactions are appropriate
- [ ] Concurrency is considered
- [ ] Migrations are safe

### API
- [ ] Contract is correct
- [ ] Errors are consistent
- [ ] Compatibility is assessed
- [ ] Idempotency is handled where required

### Failure
- [ ] Dependency failures are handled
- [ ] Retries are safe
- [ ] Partial failure is considered
- [ ] Failure is observable

### Tests
- [ ] Tests verify behavior
- [ ] Negative paths are covered
- [ ] Regression coverage exists
- [ ] Tests are deterministic
- [ ] Mandatory CI gates pass

### Operations
- [ ] Logging is appropriate
- [ ] Metrics/telemetry are sufficient
- [ ] Configuration is safe
- [ ] Deployment/rollback impact is understood

### Maintainability
- [ ] Code is understandable
- [ ] Complexity is justified
- [ ] Duplication is controlled
- [ ] Dependencies are justified
- [ ] No debug/dead code remains

## 31. Automatic Production Blockers

The following SHALL normally result in **NO-GO** or **REQUEST CHANGES**:

- P0 finding
- Unresolved P1 security issue
- Unresolved P1 data-integrity issue
- Authentication or authorization bypass
- Cross-tenant data exposure
- Known destructive migration without safe rollout/recovery strategy
- Critical business requirement not implemented
- Mandatory tests or CI gates failing
- Critical behavior with no meaningful verification evidence
- Known breaking API change without migration strategy
- Hard-coded production secrets
- Review performed against a stale or different revision

## 32. Review Anti-Patterns

Reviewers and authors SHALL avoid:

- Rubber-stamp approvals
- Reviewing only formatting
- Approving because tests are green
- Approving because an AI tool generated the code
- Rewriting the author's implementation without explaining the defect
- Blocking on personal preference
- Ignoring changed files outside the obvious feature
- Ignoring generated/configuration/infrastructure changes
- Approving unresolved P1 findings as informal follow-up work
- Treating code review as the first time architecture is discussed

## 33. Change Control

Review standards SHALL evolve with lessons from:

- Production incidents
- Security findings
- Repeated defects
- Review failures
- Architecture changes
- New delivery practices

Material governance changes SHALL be documented and version-controlled.

## 34. Sign-Off

The reviewer confirms:

> “I have reviewed the change against REV-009 and the applicable engineering standards. I have considered requirements, architecture, correctness, security, data integrity, failure behavior, testing, performance, operations, maintainability, and production risk. My decision reflects the evidence available for the reviewed revision.”

## 35. Final Principle

> **A code review is successful when it prevents a material defect from becoming someone else's production incident.**