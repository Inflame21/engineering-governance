# BE-003 — Backend Engineering Standard

**Status:** Published  
**Standard ID:** BE-003  
**Applies to:** Backend services, APIs, workers, jobs, integrations, and server-side business logic

## 1. Purpose

This standard defines how backend software SHALL be designed, implemented, tested, reviewed, operated, and changed.

It establishes technology-independent engineering rules for correctness, maintainability, security, reliability, performance, and operational safety.

**BE-003 defines WHAT must be true. Technology profiles define HOW those requirements are implemented in a particular stack.**

Detailed API contract governance belongs to API-006; detailed security requirements belong to SEC-007; detailed testing requirements belong to QA-008.

## 2. Core Principle

> **Routes or handlers orchestrate. Application services coordinate. Domain logic decides. Infrastructure persists or integrates.**

Backend code SHALL keep business decisions independent from transport, persistence, framework, and external-system concerns wherever practical.

## 3. Scope

This standard covers:

- API/transport entry points
- request and response validation
- application services and use cases
- domain logic and invariants
- repositories and persistence
- database access
- transactions
- authentication and authorization enforcement
- external integrations
- asynchronous processing and background jobs
- queues and events
- caching
- configuration and secrets
- logging and operational diagnostics
- backend performance and reliability
- backend testing
- dependency management
- backend review and implementation readiness

Framework-specific implementation guidance MUST live in technology profiles.

## 4. Backend Preconditions

Backend implementation MUST NOT begin as production work until:

- requirements have passed the REQ-001 readiness gate
- the system boundary is understood
- backend responsibilities are defined
- relevant architecture decisions have passed ARC-002
- data ownership is known
- external dependencies are identified
- authentication and authorization responsibilities are defined
- failure and recovery expectations are known
- required API contracts are sufficiently defined
- persistence and transaction requirements are understood

An implementation MAY begin earlier for explicitly approved spikes or prototypes, but prototype code MUST NOT be treated as production-ready implementation without passing the applicable gates.

## 5. Layer Responsibilities

### 5.1 Transport / Handler Layer

The transport layer is an adapter between the protocol/framework and application use cases.

Handlers SHOULD:

- parse transport input
- invoke the appropriate application operation
- provide request-scoped dependencies
- map application outcomes to transport responses
- enforce transport-level concerns
- remain small and readable

Handlers MUST NOT:

- contain substantial business rules
- perform complex database queries directly
- duplicate application workflows
- contain authorization decisions that belong to domain/application policy
- call multiple unrelated repositories to implement one business process
- expose internal exceptions or stack traces

### 5.2 Application Layer

The application layer coordinates use cases and application workflows.

It MAY:

- load required entities
- coordinate repositories
- invoke domain operations
- manage transaction boundaries
- call authorized external services
- publish domain/application events
- return application-level results

Application services MUST express meaningful use cases rather than becoming generic utility containers.

### 5.3 Domain Layer

Domain logic represents business rules, invariants, policies, and state transitions.

Domain logic SHOULD NOT depend directly on:

- HTTP/request objects
- ORM sessions
- database-specific APIs
- infrastructure clients
- environment variables
- framework globals

Business invariants MUST be enforced server-side. Client-side validation is not a substitute for backend enforcement.

### 5.4 Infrastructure Layer

Infrastructure owns technical implementations such as:

- database adapters
- external API clients
- message brokers
- object storage
- email providers
- cache providers
- observability adapters
- framework integrations

Infrastructure details MUST NOT leak unnecessarily into domain code.

## 6. Dependency Direction

Dependencies SHOULD point toward stable business abstractions rather than inward toward volatile infrastructure details.

Preferred conceptual direction:

```text
Transport / Framework
        ↓
Application
        ↓
Domain
        ↑
Infrastructure implementations
```

Framework convenience MUST NOT become an excuse for uncontrolled coupling.

Abstractions MUST have a purpose. The project SHOULD NOT introduce interfaces, repositories, services, or factories merely to satisfy an architectural pattern.

## 7. Request and Response Models

External input MUST be validated at the application boundary.

Request schemas or equivalent boundary contracts SHOULD:

- explicitly define accepted fields
- reject malformed or unexpected input where appropriate
- enforce structural constraints
- normalize input deliberately
- avoid silently accepting ambiguous values

Response contracts SHOULD:

- expose only intended fields
- avoid leaking internal persistence structures
- remain stable when internal implementation changes
- explicitly represent nullable/optional semantics

Database entities and transport schemas MAY be related, but they SHOULD NOT be coupled by default.

## 8. Validation

Validation has two distinct responsibilities:

1. **Boundary validation** — type, shape, format, size, and syntactic constraints.
2. **Business validation** — domain rules, authorization-dependent rules, state transitions, and invariants.

Persistence or external-state-dependent validation MUST NOT be hidden inside simple schema validators.

Validation MUST fail deterministically and return an appropriate application/API error.

## 9. Business Logic

Business logic MUST have one authoritative implementation.

Do not duplicate the same rule across:

- handlers
- schemas
- frontend code
- repository methods
- background workers
- database triggers
- integration adapters

unless the duplication is deliberately required as defense-in-depth.

State transitions SHOULD be explicit. Invalid transitions MUST be rejected rather than silently normalized into a different state.

## 10. Repository and Persistence Rules

Repositories, when used, SHOULD represent meaningful persistence operations rather than exposing the entire data-access technology as a generic abstraction.

Database access MUST:

- use parameterized queries or safe data-access mechanisms
- avoid unbounded reads
- avoid accidental N+1 query patterns
- select only required data where practical
- define transaction behavior explicitly
- handle connection/session lifecycle centrally
- use migrations or an equivalent controlled schema-evolution mechanism
- avoid hidden database writes inside read-oriented methods

Repositories MUST NOT contain unrelated business workflows.

Direct database access from transport handlers is prohibited for production application code unless explicitly justified and approved.

## 11. Transaction Boundaries

Transaction boundaries MUST correspond to business operations rather than arbitrary function boundaries.

A transaction SHOULD:

- be as small as practical
- include all writes that must succeed or fail together
- avoid long-running external calls
- have explicit rollback behavior
- preserve domain invariants

Do not hold database transactions open while waiting on slow external services unless the architecture explicitly requires it.

Distributed transactions SHOULD NOT be assumed available. Cross-system consistency MUST be designed using appropriate patterns such as idempotency, outbox/event processing, reconciliation, or compensating actions.

## 12. Concurrency and Idempotency

Concurrency MUST be considered whenever multiple requests or workers can modify the same business state.

Critical operations SHOULD define:

- uniqueness constraints
- locking strategy where required
- optimistic concurrency behavior where appropriate
- retry semantics
- idempotency semantics
- duplicate-event handling

Operations triggered by retries, queues, webhooks, or scheduled jobs MUST be idempotent when duplicate execution is possible.

## 13. Authentication and Authorization

Authentication establishes identity. Authorization establishes permission.

Backend authorization MUST be enforced server-side and MUST NOT rely on the frontend hiding controls.

Authorization checks SHOULD occur at the application operation boundary where the required business context is available.

Sensitive operations MUST verify:

- authenticated identity
- required role/permission
- tenant or organization scope where applicable
- ownership/resource access
- relevant business-state constraints

Detailed security requirements are governed by SEC-007.

## 14. Error Handling

Errors MUST be deliberate and classifiable.

Backend errors SHOULD distinguish between:

- client/input errors
- authentication failures
- authorization failures
- missing resources
- business-rule conflicts
- dependency failures
- infrastructure failures
- unexpected internal failures

Internal stack traces, SQL details, credentials, tokens, and infrastructure secrets MUST NOT be returned to clients.

Exceptions SHOULD be translated at an appropriate boundary. Catching broad exceptions merely to return a generic success response is prohibited.

Error responses SHOULD be consistent and machine-readable.

## 15. External Integrations

Every external dependency MUST have defined:

- timeout behavior
- failure behavior
- retry policy
- authentication mechanism
- rate-limit behavior where applicable
- observability
- fallback or degradation behavior where required

Retries MUST NOT be added blindly. A retry is safe only when the operation is idempotent or otherwise protected against duplicate effects.

External clients SHOULD be isolated behind application-facing interfaces or adapters when this reduces coupling and improves testability.

## 16. Async Processing and Background Jobs

Background work MUST have explicit ownership and execution semantics.

Jobs SHOULD define:

- trigger
- input payload
- retry behavior
- maximum retry attempts
- idempotency strategy
- failure handling
- dead-letter/recovery strategy where applicable
- observability
- timeout or execution limits

Long-running or failure-prone work SHOULD NOT block synchronous API requests unnecessarily.

Background jobs MUST NOT silently swallow failures.

## 17. Queues and Events

Events MUST represent meaningful facts or intentionally defined integration messages.

Event consumers MUST assume that:

- messages can be duplicated
- messages can arrive late
- processing can fail
- consumers can restart
- ordering may not be guaranteed unless explicitly provided

Consumers MUST be designed accordingly.

Event payloads SHOULD be versionable and SHOULD avoid exposing unstable internal database representations.

## 18. Caching

Caching MUST have an explicit invalidation and consistency strategy.

Before introducing a cache, document:

- what is cached
- cache key
- TTL or invalidation mechanism
- source of truth
- stale-data tolerance
- failure behavior
- memory/storage limits

A cache MUST NOT become the authoritative source of business data unless explicitly designed as such.

## 19. Configuration and Secrets

Configuration MUST be externalized from application code.

Secrets MUST NOT be committed to source control, embedded in source code, or exposed through logs.

Configuration SHOULD be:

- typed
- validated at startup
- environment-aware
- centrally defined
- explicit about required versus optional values

Applications SHOULD fail fast when required configuration is invalid or missing.

## 20. Logging

Production logging MUST support diagnosis without exposing sensitive information.

Logs SHOULD be structured and include appropriate contextual identifiers such as:

- request/correlation ID
- operation or endpoint
- authenticated subject where appropriate
- tenant identifier where appropriate
- relevant resource identifier
- duration
- outcome

Do not log passwords, access tokens, refresh tokens, secrets, full payment credentials, or unnecessary personal data.

Logging MUST NOT be used as a substitute for proper error handling.

## 21. Observability

Backend services SHOULD expose sufficient operational signals to answer:

- Is the service healthy?
- Is it available?
- Are requests failing?
- Which operations are slow?
- Which dependency is failing?
- Are background jobs stuck?
- Is error volume increasing?

At minimum, production services SHOULD provide appropriate health/readiness behavior and measurable request/error/latency signals.

Detailed observability requirements are governed by OBS-014.

## 22. Performance

Performance MUST be considered during design rather than only after production incidents.

Backend implementations MUST avoid:

- unbounded database queries
- accidental full-table scans on hot paths
- N+1 query patterns
- unnecessary serialization
- repeated expensive computation
- synchronous blocking of avoidable long-running work
- uncontrolled concurrency

Performance optimization MUST be evidence-driven. Do not introduce complexity solely because an optimization is theoretically possible.

## 23. Technology Profiles

BE-003 is intentionally technology-agnostic.

Technology profiles MAY define framework-specific implementation rules for:

- project structure
- dependency injection
- request/response schemas
- ORM/session lifecycle
- async/sync execution
- framework middleware
- exception handling
- startup/shutdown
- routing conventions
- framework-specific security mechanisms
- framework-native testing
- deployment/runtime conventions

A technology profile MUST NOT weaken a BE-003 requirement unless an approved engineering exception exists under EXC-021.

Recommended profiles include:

- FastAPI
- Django
- Node.js
- NestJS
- Spring Boot
- ASP.NET Core
- Go
- Rust

## 24. Dependency Management

Backend dependencies MUST be:

- explicitly declared
- version controlled
- reviewed for security and maintenance risk
- removed when no longer required

Do not add a dependency for functionality that can be implemented safely and clearly with the existing platform unless the dependency provides meaningful value.

Critical dependencies SHOULD have a known maintenance and upgrade strategy.

## 25. Backend Security Baseline

Every backend MUST provide, as applicable:

- server-side authorization
- input validation
- secure secret handling
- safe database access
- secure authentication/session handling
- rate limiting for abuse-sensitive operations
- secure file handling
- controlled CORS configuration
- safe outbound network behavior
- protection against common injection classes

These are baseline backend responsibilities. SEC-007 defines the complete security standard.

## 26. Testing Requirements

Backend testing SHOULD exist at multiple levels:

### Unit Tests

Use for domain rules, pure logic, and deterministic application behavior.

### Integration Tests

Use for database repositories, transactions, external adapters, queues, and infrastructure interactions.

### API/Transport Tests

Use for request validation, authentication/authorization behavior, response contracts, and handler integration.

Tests MUST verify meaningful behavior. A test suite that mocks every dependency and never exercises real boundaries does not constitute adequate backend verification.

Critical business rules MUST have automated tests.

## 27. Backend Anti-Patterns

The following are production governance violations unless explicitly justified:

- business logic inside transport handlers
- direct database access from controllers/handlers
- global mutable state
- hard-coded secrets
- unbounded queries
- hidden writes inside read methods
- duplicated business rules
- catch-all exception handling that hides failures
- retrying non-idempotent operations blindly
- background jobs without failure visibility
- database transactions held across slow external calls
- returning persistence entities blindly as public API responses
- using asynchronous syntax around blocking operations
- creating abstractions solely to satisfy a pattern
- service classes containing unrelated operations
- repositories that become generic query dumps
- tests that mock the entire system and verify almost nothing
- disabling validation to make an integration pass
- bypassing authorization for internal-looking endpoints

## 28. Backend Implementation Readiness Gate

Before backend work is considered implementation-ready, the reviewer MUST verify:

- requirements are approved
- architecture is approved
- backend responsibilities are defined
- module boundaries are clear
- business rules have an authoritative location
- data ownership is defined
- persistence strategy is defined
- transaction boundaries are understood
- authentication and authorization responsibilities are defined
- external dependencies are identified
- failure behavior is defined
- async/background behavior is defined where applicable
- API contracts are sufficiently defined
- configuration and secrets strategy is defined
- observability requirements are known
- testing strategy exists
- migration strategy exists for schema changes

### Gate Decisions

| Decision | Meaning |
|---|---|
| READY | Backend implementation may proceed |
| READY WITH CONDITIONS | Implementation may proceed only within documented constraints |
| NOT READY | Backend implementation MUST NOT proceed as production work |

## 29. Backend Review Checklist

### Architecture

- [ ] Responsibilities match ARC-002
- [ ] Layers have clear boundaries
- [ ] Dependency direction is controlled
- [ ] Business logic is not framework-bound unnecessarily
- [ ] Data ownership is explicit

### API Boundary

- [ ] Inputs are validated
- [ ] Outputs are intentional
- [ ] Errors are consistent
- [ ] Sensitive fields are excluded
- [ ] Authorization is enforced

### Business Logic

- [ ] Rules have one authoritative implementation
- [ ] Invariants are enforced server-side
- [ ] State transitions are explicit
- [ ] Duplicate logic is absent

### Persistence

- [ ] Queries are bounded
- [ ] N+1 risks are reviewed
- [ ] Transactions are deliberate
- [ ] Migrations are controlled
- [ ] Session/connection lifecycle is safe

### Reliability

- [ ] Retries are safe
- [ ] Critical operations are idempotent where required
- [ ] External failures are handled
- [ ] Background jobs are observable
- [ ] Recovery behavior is defined

### Operations

- [ ] Configuration is externalized
- [ ] Secrets are protected
- [ ] Structured logs exist
- [ ] Health/readiness behavior exists where required
- [ ] Errors are observable

### Testing

- [ ] Critical business rules are tested
- [ ] Persistence boundaries are tested
- [ ] API/transport behavior is tested
- [ ] Authorization paths are tested
- [ ] Failure paths are tested

## 30. Automatic Backend Blockers

The following SHOULD result in a **NO-GO** decision until corrected:

- critical authorization bypass
- secret or credential exposure
- destructive database behavior without safeguards
- data corruption risk
- unbounded production database access
- silent failure of critical background processing
- non-idempotent retry behavior that can duplicate business effects
- critical business rules missing server-side enforcement
- production handlers containing substantial unreviewed business logic
- missing transaction boundaries for operations that require atomicity
- known critical dependency failure with no defined handling
- inability to diagnose critical production failures

## 31. AI-Assisted Backend Development

AI-generated backend code MUST be reviewed as untrusted implementation output.

The engineer remains responsible for:

- correctness
- security
- architecture
- data integrity
- dependency behavior
- test quality
- operational behavior
- production readiness

AI MUST NOT be treated as evidence that an implementation is correct.

AI-generated code MUST pass the same backend tests, review gates, security controls, and production-readiness requirements as manually written code.

## 32. Change Control

Changes to backend behavior MUST preserve relevant invariants and contracts.

Reviewers MUST assess whether a change affects:

- API compatibility
- database compatibility
- authorization
- transactions
- event/message contracts
- external integrations
- background processing
- observability
- performance
- operational procedures

Breaking or high-risk backend changes require explicit migration and rollout planning.

## 33. Backend Sign-Off

Backend work MAY be approved when:

- BE-003 requirements are satisfied
- applicable API, database, security, and testing standards are satisfied
- automated verification passes
- known risks are documented
- no production-blocking findings remain
- rollback/recovery behavior is understood where required

Approval means the reviewer accepts the engineering evidence, not that the reviewer guarantees the software will never fail.

## 34. Final Principle

> **A backend is production-ready when its business behavior, data behavior, failure behavior, security behavior, and operational behavior are all deliberate and testable.**

Fast code is useful. Correct, secure, observable, recoverable, and maintainable code is production engineering.