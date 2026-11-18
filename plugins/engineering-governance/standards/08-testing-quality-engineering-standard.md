# QA-008 — Testing & Quality Engineering Standard

**Status:** Mandatory Engineering Standard  
**Applies to:** All software systems and production-bound changes  
**Technology:** Technology-neutral  

---

## 1. Purpose

QA-008 defines the requirements for testing software and producing credible engineering evidence that a system behaves correctly, fails safely, and remains maintainable under change.

> **Testing is not proof that code works. Testing is evidence about which behaviors work, which failures are controlled, and which risks remain.**

## 2. Scope

QA-008 governs:

- Test strategy
- Test planning
- Test levels
- Unit testing
- Component testing
- Integration testing
- Contract testing
- End-to-end testing
- API testing
- UI testing
- Database testing
- Security testing coordination
- Performance testing coordination
- Failure and resilience testing
- Regression testing
- Test data
- Test environments
- Flaky tests
- Test coverage
- CI quality gates
- Defect classification
- Quality evidence
- AI-assisted development testing

QA-008 does not replace SEC-007 for security requirements, PERF-015 for performance engineering, or PRD-018 for final production readiness.

## 3. Quality Principles

Testing SHALL follow these principles:

- Test behavior and risk, not implementation trivia.
- Every important requirement must have corresponding evidence.
- Critical paths require stronger evidence.
- Negative paths are first-class behavior.
- Tests must be deterministic where practical.
- Test suites must remain maintainable.
- Coverage percentage is a signal, not proof of quality.
- A passing test suite does not override known production risk.
- Tests must fail for the right reasons.
- Production-like behavior should be tested at the appropriate boundary.
- Regression protection must exist for fixed defects.
- AI-generated code requires the same or stronger verification as human-authored code.

## 4. Quality Readiness Preconditions

Testing SHALL be planned after requirements and architecture are sufficiently defined.

The test strategy SHOULD identify:

- Critical business workflows
- Domain invariants
- Acceptance criteria
- Security-sensitive operations
- Integration boundaries
- Failure modes
- Data integrity requirements
- Performance requirements
- Compatibility requirements
- Supported environments
- Production risks

Testing cannot compensate for undefined requirements.

## 5. Risk-Based Test Strategy

Test depth SHALL be proportional to risk.

Risk assessment SHOULD consider:

- Business criticality
- User impact
- Data sensitivity
- Financial impact
- Security exposure
- Complexity
- Change size
- Dependency count
- Failure cost
- Frequency of use

High-risk behavior requires stronger evidence than low-risk cosmetic behavior.

## 6. Requirement Traceability

Important requirements SHALL be traceable to verification evidence.

A practical relationship is:

```text
Requirement
    ↓
Expected behavior
    ↓
Test / verification
    ↓
Result
    ↓
Release evidence
```

Critical acceptance criteria SHALL have explicit verification.

## 7. Test Pyramid and Test Boundaries

Teams SHOULD prefer the lowest test level that can reliably verify the behavior.

Typical distribution:

```text
        E2E / UI
       Integration
     Component / Contract
          Unit
```

Not every behavior belongs in an end-to-end test.

Unit tests SHOULD verify isolated deterministic logic.

Integration tests SHOULD verify real boundaries such as databases, queues, external adapters, or framework integration.

End-to-end tests SHOULD verify critical user journeys and system-level behavior.

## 8. Unit Testing

Unit tests SHOULD focus on:

- Domain rules
- Pure transformations
- Validation rules
- State transitions
- Deterministic calculations
- Business invariants

Unit tests SHOULD avoid excessive coupling to implementation details.

Tests that merely reproduce private implementation structure without protecting behavior provide limited value.

## 9. Component Testing

Component-level tests SHOULD verify meaningful behavior at a bounded application boundary.

For frontend systems this may include:

- Component interaction
- Form behavior
- State transitions
- Accessibility behavior
- Loading/error/empty states

For backend systems it may include:

- Application services
- Handler behavior
- Adapter behavior
- Validation boundaries

## 10. Integration Testing

Integration tests SHALL be used where correctness depends on real component interaction.

Relevant boundaries include:

- Application to database
- Application to cache
- Application to queue
- Service to service
- API to persistence
- Authentication infrastructure
- External provider adapters

Mocks SHALL NOT replace every integration test.

Where a mock can hide a real compatibility or serialization failure, an integration test SHOULD exist.

## 11. Contract Testing

Contract testing SHALL be considered whenever independently deployed components communicate through a defined contract.

This includes:

- Frontend to backend APIs
- Service-to-service APIs
- Webhooks
- Event consumers
- External integrations

Contract tests SHOULD verify:

- Request shape
- Response shape
- Required fields
- Status codes
- Error behavior
- Compatibility assumptions

API-006 remains authoritative for API contract requirements.

## 12. End-to-End Testing

E2E tests SHOULD focus on critical journeys rather than attempting to reproduce every possible state through the UI.

Examples include:

- Authentication
- Core business transaction
- Critical approval workflow
- Critical CRUD lifecycle
- Payment or order completion
- Important administrative workflow

E2E suites SHALL remain deterministic enough to provide release evidence.

An application with hundreds of unreliable E2E tests does not have stronger quality evidence than one with a smaller reliable critical-path suite.

## 13. API Testing

API tests SHOULD cover:

- Successful operations
- Validation failures
- Authentication failures
- Authorization failures
- Missing resources
- Conflicts
- Duplicate requests
- Pagination
- Filtering
- Rate limiting where applicable
- Dependency failures
- Error contracts

API behavior SHALL be tested at the appropriate integration boundary.

## 14. Frontend Testing

Frontend tests SHOULD cover behavior rather than snapshots alone.

Relevant cases include:

- User interaction
- Form validation
- Navigation
- Loading states
- Empty states
- Error states
- Permission-aware UI behavior
- Accessibility
- Responsive behavior where critical
- Server/API failure handling

Snapshot tests SHALL NOT be treated as sufficient UI quality evidence.

## 15. Database and Persistence Testing

Persistence tests SHOULD verify:

- Constraints
- Relationships
- Transactions
- Migrations
- Queries
- Serialization
- Concurrency-sensitive behavior
- Data integrity

Schema changes SHALL have migration verification where applicable.

DB-005 remains authoritative for database engineering requirements.

## 16. Negative and Failure Testing

Critical workflows SHALL test failure behavior, not only successful execution.

Relevant failures include:

- Invalid input
- Missing resources
- Unauthorized access
- Forbidden access
- Duplicate requests
- Concurrent updates
- Database failures
- External service failures
- Timeouts
- Network failures
- Queue failures
- Partial completion
- Malformed external data

The expected failure behavior SHALL be explicit.

## 17. Resilience and Recovery Testing

Systems with meaningful availability or reliability requirements SHOULD test relevant failure scenarios.

Examples include:

- Dependency unavailable
- Dependency slow
- Connection interruption
- Process restart
- Queue backlog
- Duplicate delivery
- Retry exhaustion
- Partial failure
- Recovery after transient failure

Tests should verify both containment and recovery behavior.

## 18. Regression Testing

Every fixed production defect or significant defect SHOULD result in regression protection when practical.

Regression tests SHALL verify the original failure condition and prevent recurrence.

Critical defects SHALL NOT be considered permanently resolved solely because the code was changed.

## 19. Test Data

Test data SHALL be controlled and reproducible.

Teams SHALL avoid using real sensitive production data unless explicitly authorized and protected.

Test data SHOULD:

- Represent meaningful states
- Include boundary values
- Include invalid values
- Be deterministic where possible
- Be isolated between tests
- Be easy to reset

Tests must not depend on accidental data left by another test.

## 20. Test Environment

Test environments SHALL be appropriate to the behavior being verified.

Where environment differences can alter correctness, tests SHOULD approximate production behavior.

Environment-specific behavior SHALL be explicit.

Production credentials and production customer data SHALL NOT be used in ordinary automated tests.

## 21. Test Isolation

Tests SHOULD be independently executable.

Tests SHALL NOT rely on execution order unless ordering is itself the behavior under test.

Shared mutable state SHALL be minimized.

Parallel test execution must not create hidden data races or cross-test contamination.

## 22. Determinism

Tests used as release evidence SHALL be deterministic enough to trust.

Sources of nondeterminism include:

- Time
- Randomness
- Network availability
- Shared external services
- Concurrent execution
- Uncontrolled test data
- Environment-dependent behavior

These dependencies SHOULD be controlled through appropriate abstractions or deterministic fixtures.

## 23. Flaky Tests

A flaky test is a quality defect.

Teams SHALL classify and manage flaky tests rather than normalizing them.

Flaky tests SHOULD have:

- Owner
- Tracking issue
- Impact assessment
- Remediation target

Blind retries SHALL NOT be used to conceal systemic test instability.

Critical release gates SHALL NOT routinely depend on tests known to be unreliable.

## 24. Test Coverage

Coverage metrics MAY be used as diagnostic signals.

Coverage SHALL NOT be used as the sole production-quality criterion.

High coverage can coexist with:

- Incorrect assertions
- Missing edge cases
- Missing integration tests
- Missing authorization tests
- Missing failure tests
- Untested requirements

Teams SHOULD measure meaningful coverage of risk and behavior, not merely line execution.

## 25. Assertions and Test Quality

Tests SHALL contain meaningful assertions.

A test that executes code without verifying the expected behavior is not sufficient evidence.

Assertions SHOULD verify externally meaningful outcomes.

Tests SHOULD avoid excessive assertion coupling to incidental formatting or internal implementation details.

## 26. Test Doubles and Mocks

Mocks, stubs, fakes, and fixtures SHALL be used deliberately.

Mocks are appropriate when isolating a unit or controlling an expensive/unreliable dependency.

Mocks are dangerous when they reproduce assumptions rather than actual dependency behavior.

Critical integrations SHALL have tests against realistic or real interfaces.

## 27. Performance Test Coordination

Performance-critical systems SHALL include appropriate performance verification.

Relevant tests may include:

- Load tests
- Stress tests
- Soak tests
- Capacity tests
- Latency tests
- Concurrency tests

Performance testing SHALL use realistic workload assumptions.

PERF-015 remains authoritative for performance engineering.

## 28. Security Test Coordination

Security-sensitive systems SHALL include appropriate security verification.

Relevant tests may include:

- Authentication bypass attempts
- Authorization bypass attempts
- Tenant-isolation tests
- Injection tests
- Input validation tests
- Secret exposure checks
- Dependency vulnerability scanning

SEC-007 remains authoritative for security requirements.

## 29. Accessibility Testing

User-facing systems SHALL verify accessibility according to product risk and applicable requirements.

Testing SHOULD include:

- Keyboard navigation
- Focus behavior
- Semantic structure
- Accessible names
- Form error association
- Screen-reader-relevant behavior
- Contrast where applicable

Automated accessibility checks are useful but do not replace appropriate manual verification.

## 30. Defect Classification

Defects SHOULD be classified by impact and risk.

| Severity | Meaning |
|---|---|
| P0 | Critical production-impacting defect |
| P1 | High-impact defect requiring urgent action |
| P2 | Material defect with bounded impact |
| P3 | Low-impact defect or improvement |

Severity SHALL consider actual user/business impact, not developer effort.

Known P0/P1 defects SHALL normally block production approval unless formally excepted under governance.

## 31. CI Quality Gates

Automated checks SHALL be used where they provide repeatable quality evidence.

CI SHOULD enforce, as appropriate:

- Build success
- Type/static checks
- Unit tests
- Integration tests
- Contract tests
- Lint/format checks
- Security scanning
- Dependency checks
- Coverage thresholds where meaningful
- Artifact validation

Quality gates SHALL fail for material defects rather than merely reporting them.

Teams SHALL avoid making CI green by disabling failing tests without documented justification.

## 32. Test Failure Triage

When a quality gate fails, engineers SHALL determine whether the cause is:

- Product defect
- Test defect
- Environment defect
- Dependency failure
- Infrastructure failure
- Flakiness

A failed test must not be dismissed without evidence.

## 33. AI-Assisted Development Testing

AI-generated code SHALL receive normal engineering verification.

Reviewers SHOULD assume AI-generated code may contain:

- Missing edge cases
- Incorrect assumptions
- Weak assertions
- Incomplete error handling
- Security omissions
- Tests that validate implementation rather than behavior

AI-generated tests SHALL themselves be reviewed for correctness.

Generated tests do not constitute independent evidence if their assertions merely encode the generated implementation.

## 34. Quality Evidence Package

Before production approval, the responsible team SHOULD be able to provide:

- Requirement-to-test traceability for critical requirements
- Test strategy
- Test results
- Failed-test disposition
- Regression evidence
- Security evidence where required
- Performance evidence where required
- Contract evidence where required
- Known-defect list
- Residual-risk assessment

The evidence must correspond to the actual release candidate.

## 35. Testing Readiness Gate

Before production approval, verify:

- [ ] Critical requirements have verification evidence
- [ ] Critical user journeys are tested
- [ ] Important business rules are tested
- [ ] Negative paths are tested
- [ ] Integration boundaries are tested
- [ ] API contracts are tested where applicable
- [ ] Security testing is complete where required
- [ ] Performance testing is complete where required
- [ ] Regression tests cover important fixed defects
- [ ] Test data is controlled
- [ ] Test environment is appropriate
- [ ] Known flaky tests are tracked
- [ ] CI quality gates pass
- [ ] Failed tests have documented disposition
- [ ] Known defects are classified
- [ ] Residual risk is documented

| Decision | Meaning |
|---|---|
| **PASS** | Sufficient evidence exists for the intended release decision |
| **PASS WITH CONDITIONS** | Release is permitted with explicit documented risk/conditions |
| **FAIL** | Evidence or known defects prevent safe progression |

## 36. QA Review Checklist

### Strategy
- [ ] Testing is risk-based
- [ ] Critical requirements are identified
- [ ] Test levels are appropriate
- [ ] Important failure modes are included

### Test Quality
- [ ] Assertions are meaningful
- [ ] Tests verify behavior
- [ ] Tests are deterministic
- [ ] Tests are isolated
- [ ] Test data is controlled

### Coverage
- [ ] Critical paths are covered
- [ ] Negative paths are covered
- [ ] Integration boundaries are covered
- [ ] Regression cases exist
- [ ] Coverage is interpreted in context

### Reliability
- [ ] Flaky tests are identified
- [ ] Release gates do not depend on known unreliable tests
- [ ] Failures are triaged
- [ ] Recovery behavior is verified where required

### Security and Performance
- [ ] Security tests are present where required
- [ ] Authorization/tenant isolation is tested
- [ ] Performance evidence exists where required

### CI
- [ ] Build passes
- [ ] Automated tests pass
- [ ] Static/type checks pass
- [ ] Security/dependency checks pass where required
- [ ] No material quality gate is disabled without approval

## 37. Automatic Production Blockers

The following SHALL normally result in **NO-GO**:

- Critical requirement with no verification evidence
- Known P0 defect
- Known P1 defect without approved exception
- Critical authorization or tenant-isolation path untested
- Release candidate failing mandatory quality gates
- Material regression with no disposition
- Critical integration behavior known to be broken
- Release decision based on routinely flaky critical tests
- Test suite deliberately weakened to hide a known failure
- Production behavior materially different from tested behavior without assessment

## 38. Change Control

Testing impact SHALL be assessed whenever changes affect:

- Business rules
- API contracts
- Database schema
- Authentication or authorization
- Critical workflows
- External integrations
- Background jobs
- Event contracts
- Performance characteristics
- User-facing behavior

Tests SHALL evolve with the behavior they protect.

## 39. Sign-Off

The responsible engineer confirms:

> “The release has appropriate verification evidence for its requirements, critical behaviors, failure modes, integrations, regressions, and identified risks.”

The reviewer confirms:

> “I have reviewed the release against QA-008 and found no unresolved quality issue that prevents the approved production decision.”

## 40. Final Principle

> **A green test suite is a signal. Engineering confidence comes from the quality, relevance, determinism, and completeness of the evidence behind it.**