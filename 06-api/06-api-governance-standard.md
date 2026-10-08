# API-006 — API Governance Standard

**Status:** Mandatory Engineering Standard  
**Applies to:** All APIs and externally consumed service interfaces  
**Technology:** Technology-neutral  

---

## 1. Purpose

API-006 defines requirements for designing, implementing, reviewing, evolving, documenting, testing, and operating APIs.

An API may be consumed by web applications, mobile applications, internal services, external integrations, automation systems, webhooks, asynchronous jobs, or event consumers.

> **An API is a contract between independently changing systems. Compatibility, semantics, and failure behavior must be deliberate.**

## 2. Scope

API-006 governs API contracts, resource modeling, endpoint design, HTTP semantics, request/response schemas, errors, validation, authentication and authorization semantics, pagination, filtering, sorting, search, idempotency, concurrency, versioning, compatibility, deprecation, rate limiting, file transfer, webhooks, asynchronous operations, documentation, contract testing, observability, and performance.

It does not replace BE-003 for backend architecture, SEC-007 for security engineering, DB-005 for persistence, OBS-014 for observability, PERF-015 for performance, or PRD-018 for final production readiness.

## 3. Core Principles

All APIs SHALL follow these principles:

- The API contract is part of the product.
- Consumers must not depend on undocumented behavior.
- API semantics must be explicit.
- Breaking changes require deliberate approval and migration planning.
- Internal implementation details must not leak through the contract.
- Error behavior is part of the contract.
- Security must be enforced server-side.
- Collections must have bounded resource consumption.
- Retries must not create unintended side effects.
- APIs must be observable in production.
- Documentation must describe actual behavior.
- Generated documentation does not replace API design.
- Compatibility must be evaluated before every contract change.
- AI-generated API changes require the same engineering evidence as human-authored changes.

## 4. API Readiness Preconditions

Before implementation, the following should be known:

- Relevant requirements and acceptance criteria
- Actors and consumers
- Domain responsibilities and data ownership
- Authentication and authorization model
- Expected usage patterns
- Failure expectations
- Performance expectations
- Compatibility requirements
- Integration constraints
- Versioning strategy where applicable

An API exposing an undefined domain model is not implementation-ready.

## 5. API as a Contract

The contract SHALL define, as applicable:

- Operations and resources
- Paths and identifiers
- HTTP methods
- Request parameters and body schemas
- Response schemas
- Status codes
- Error schema
- Authentication and authorization requirements
- Pagination, filtering, and sorting
- Idempotency and concurrency behavior
- Rate limits
- Deprecation behavior

Undocumented behavior SHALL NOT be treated as a supported consumer contract.

## 6. Resource and Domain Modeling

API resources SHALL represent meaningful domain concepts rather than persistence implementation details.

Resource names SHOULD be stable, consistent, predictable, and domain-oriented. Do not expose database table names, ORM model names, internal class names, service names, or storage details merely because they exist internally.

Prefer resource-oriented operations where they accurately represent domain behavior. Action-style operations MAY be used for explicit domain operations such as approve, reject, publish, cancel, recalculate, or retry.

The API layer may translate a request into an application operation, but domain rules remain authoritative in the application/domain architecture.

## 7. Endpoint Design

Every endpoint SHALL have a clear responsibility.

Endpoints SHOULD avoid multiple unrelated responsibilities, hidden side effects, ambiguous operation names, excessive nesting, inconsistent naming, and transport-layer business logic.

The API surface SHOULD remain as small as reasonably possible. New endpoints require a clear consumer or domain requirement.

## 8. HTTP Semantics

For HTTP APIs, standard HTTP semantics SHALL be respected.

| Method | Typical intent | Default behavior |
|---|---|---|
| GET | Retrieve | Safe and idempotent |
| POST | Create or execute operation | Not inherently idempotent |
| PUT | Replace resource | Idempotent |
| PATCH | Partially modify | Depends on defined semantics |
| DELETE | Remove resource | Idempotent where resource semantics permit |

The API SHALL NOT return success merely because a request was technically processed. Status code and response must communicate the actual outcome.

## 9. Request Contracts

Request schemas SHALL be explicit. They SHOULD define required fields, optional fields, types, allowed values, formats, length limits, cross-field validation, and default behavior.

Transport validation should handle syntax, types, formats, and basic bounds. Application/domain layers SHALL enforce business rules, state transitions, authorization-sensitive invariants, and domain invariants.

Client-side validation improves UX but is never authoritative.

## 10. Response Contracts

Response schemas SHALL be explicit and stable.

Responses SHOULD contain only consumer-appropriate data, use stable field names, avoid persistence-model leakage, define nullable/optional semantics clearly, and define collection/pagination behavior.

A response contract must not change implicitly because an ORM, database, serializer, or framework changed.

## 11. Error Model

APIs SHALL provide a consistent machine-readable error model.

An error SHOULD provide, where applicable:

- Machine-readable error code
- Human-readable message
- Field-level validation details
- Request/correlation identifier
- Safe diagnostic metadata

A conceptual error shape is:

~~~json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource does not exist.",
    "details": [],
    "requestId": "..."
  }
}
~~~

Errors SHALL NOT expose stack traces, SQL statements, internal filesystem paths, secrets, tokens, or sensitive infrastructure details.

APIs SHALL use status codes consistently. The same semantic failure SHOULD map to the same class of response across the API. Do not return 200 OK for application failures merely to simplify client handling.

## 12. Authentication and Authorization Semantics

Authentication answers who the caller is. Authorization answers what the caller may do. They SHALL remain conceptually separate.

APIs SHALL define authentication requirements, authorization requirements, permissions/scopes/roles, and tenant or ownership constraints where applicable.

Authorization SHALL be enforced server-side. Hiding a UI control is not authorization.

Detailed security requirements belong to SEC-007.

## 13. Pagination

Collection endpoints SHALL be bounded. Unbounded production collection responses are prohibited unless the dataset is demonstrably bounded and small.

Pagination SHALL define the mechanism, default size, maximum size, ordering, continuation semantics, and empty-result behavior.

Pagination ordering SHALL be deterministic. Offset pagination MAY be used where appropriate. Cursor/keyset pagination SHOULD be preferred for large or frequently changing datasets where stable traversal matters.

## 14. Filtering, Sorting, and Search

Filtering and sorting SHALL be explicitly defined.

APIs SHOULD expose only supported fields, validate filter values and sort fields, define default ordering, prevent arbitrary query execution, and enforce resource limits.

Clients must not be allowed to construct arbitrary database queries through API parameters.

## 15. Idempotency

Operations with retry-sensitive side effects SHALL define idempotency behavior. This is especially important for payments, orders, financial operations, provisioning, resource creation, message submission, and other non-repeatable side effects.

Where idempotency keys are used, the contract SHALL define key format, scope, lifetime, duplicate-request behavior, and conflict behavior.

Idempotency must be enforced by the server, not merely documented for clients.

## 16. Concurrency

APIs that modify state concurrently SHALL define conflict behavior.

Where required, use version identifiers, entity versions, ETags, conditional requests, or optimistic concurrency tokens.

The API must not silently overwrite newer state when the domain requires conflict detection. Conflict responses SHALL be distinguishable from validation failures.

## 17. Versioning

Every production API SHALL have an explicit compatibility strategy.

Possible strategies include URL versioning, header/media-type versioning, contract versioning, or compatibility-first evolution without frequent major versions.

The chosen strategy SHALL be documented. Versioning SHALL NOT be introduced merely because an internal implementation detail changed. The objective is consumer compatibility, not framework compatibility.

## 18. Backward Compatibility

Every API change SHALL be classified before implementation.

Generally compatible changes may include adding optional request fields, adding response fields when clients tolerate them, or adding new endpoints.

Potentially breaking changes include removing or renaming fields, changing types, making optional fields required, changing semantics, removing endpoints, changing authorization requirements unexpectedly, or changing error meanings.

Breaking changes SHALL have a consumer impact assessment, migration strategy, communication plan, appropriate compatibility/deprecation period, and explicit approval.

## 19. Deprecation and Sunset

Deprecated APIs SHALL be managed deliberately.

A deprecation plan SHOULD define the deprecated operation, reason, replacement, consumer impact, migration instructions, deprecation date, removal target, and owner.

Deprecated functionality must not remain indefinitely without ownership.

## 20. Rate Limiting and Quotas

APIs SHALL define resource-protection requirements based on risk.

Rate limiting or quotas SHOULD be used for public APIs, authentication endpoints, expensive operations, search-heavy operations, uploads, abuse-sensitive operations, and third-party integrations.

Limits SHALL be documented where consumers need to adapt behavior. Rate-limit responses SHALL be distinguishable from application failures.

## 21. File Upload and Download

File APIs SHALL define maximum size, allowed content types, validation, storage lifecycle, authorization, download authorization, naming rules, and failure behavior.

Uploaded content SHALL NOT be trusted merely because the client declares its type.

Large transfers SHOULD avoid unnecessarily buffering entire payloads in application memory.

## 22. Webhooks

Webhook contracts SHALL define event identity, event type, payload schema, delivery semantics, retry behavior, signature/authentication mechanism, replay protection, acknowledgment behavior, duplicate-delivery behavior, and versioning.

Webhook consumers SHALL assume duplicate delivery is possible unless exactly-once delivery is explicitly guaranteed.

Webhook producers SHOULD provide stable event identifiers so consumers can implement deduplication.

## 23. Asynchronous Operations

Long-running operations SHALL NOT depend on arbitrary HTTP request timeouts.

A typical model is:

~~~text
POST /operation
  -> 202 Accepted
  -> operation identifier
  -> GET /operations/{id}
  -> pending -> running -> completed / failed
~~~

The contract SHALL define the operation identifier, lifecycle states, completion behavior, failure behavior, retry behavior, and cancellation behavior where supported.

## 24. Events and Integration APIs

Event-driven interfaces SHALL define stable contracts.

Event contracts SHOULD include event identifier, event type, schema version, occurred-at timestamp, producer identity, relevant resource identifier, and payload.

Consumers SHOULD tolerate duplicate delivery, delayed delivery, reordering where ordering is not guaranteed, and unknown future fields.

Internal implementation events SHALL NOT automatically become public integration contracts.

## 25. API Security Baseline

Every API SHALL consider authentication, authorization, input validation, output filtering, rate limiting, abuse prevention, sensitive-data exposure, request-size limits, file validation, replay protection where applicable, transport security, and secret/token handling.

Controls SHALL be proportionate to threat and data sensitivity. Detailed security requirements belong to SEC-007.

## 26. Observability

Production APIs SHALL emit enough telemetry to diagnose failures and understand usage.

Operations SHOULD make it possible to determine which operation failed, when it failed, relevant request/correlation identifier, response status, latency, failure category, and dependency failure where applicable.

Sensitive request/response payloads SHALL NOT be logged indiscriminately.

Relevant metrics SHOULD include request volume, error rate, latency, saturation, rate-limit events, and dependency failures.

## 27. Performance

API performance requirements SHALL derive from actual requirements and usage.

Review SHALL consider latency, payload size, query cost, serialization cost, external dependency latency, concurrency, rate limits, caching, pagination, N+1 behavior, and large-response generation.

Performance optimization must not weaken correctness or contract clarity.

## 28. API Testing

Production APIs SHALL have tests appropriate to their risk.

Tests SHOULD cover contract schemas, status codes, error behavior, authentication, authorization, persistence, external integrations, transactions, failure behavior, invalid input, duplicate requests, conflicts, rate limits, dependency failures, and compatibility where multiple independently deployed consumers exist.

Security testing is required according to SEC-007 risk classification.

## 29. API Documentation

Production APIs SHALL have authoritative documentation.

Documentation SHOULD define purpose, authentication, authorization, endpoints, request/response schemas, errors, examples, pagination, filtering, sorting, rate limits, idempotency, versioning, deprecation, webhooks, and asynchronous operations.

OpenAPI or an equivalent machine-readable specification SHOULD be used where applicable.

Generated documentation SHALL be validated against actual runtime behavior.

> **An API specification that differs from the deployed API is a defect.**

## 30. Anti-Patterns

The following are governance violations:

- Exposing database schemas directly
- Returning ORM entities as public contracts without deliberate review
- Business logic embedded in transport handlers
- Inconsistent error formats
- Returning 200 for failures
- Unbounded collection endpoints
- Arbitrary client-controlled database queries
- Silent breaking changes
- Undocumented behavior relied upon by consumers
- Trusting client-side authorization
- Duplicate side effects caused by normal retries
- Ignoring concurrent updates
- Logging secrets or sensitive payloads
- Documentation that does not match runtime behavior
- Endpoints without a defined consumer or domain responsibility
- Unnecessary version proliferation
- Deprecated APIs without ownership
- Treating AI-generated API code as inherently trustworthy

## 31. API Implementation Readiness Gate

Before implementation, verify:

- [ ] Consumer(s) identified
- [ ] API purpose defined
- [ ] Domain/resource model defined
- [ ] Endpoint responsibilities defined
- [ ] Request contracts defined
- [ ] Response contracts defined
- [ ] Error model defined
- [ ] Authentication requirements defined
- [ ] Authorization requirements defined
- [ ] Pagination behavior defined where applicable
- [ ] Filtering/sorting behavior defined where applicable
- [ ] Idempotency requirements assessed
- [ ] Concurrency behavior assessed
- [ ] Compatibility strategy defined
- [ ] Rate limiting/resource protection assessed
- [ ] File transfer rules defined where applicable
- [ ] Webhook contract defined where applicable
- [ ] Async operation model defined where applicable
- [ ] Observability requirements defined
- [ ] Testing strategy defined
- [ ] API documentation strategy defined

| Decision | Meaning |
|---|---|
| **READY** | Contract is sufficiently defined for implementation |
| **READY WITH CONDITIONS** | Implementation may proceed only within explicit constraints |
| **NOT READY** | Contract ambiguity or unresolved risk makes implementation unsafe |

## 32. API Review Checklist

### Contract
- [ ] Every endpoint is necessary
- [ ] Every endpoint has one clear responsibility
- [ ] Request and response contracts are explicit
- [ ] Status codes are correct
- [ ] Errors are consistent
- [ ] Undocumented behavior is avoided

### Domain
- [ ] API represents domain concepts rather than database structures
- [ ] Business rules are outside transport handlers
- [ ] Ownership boundaries are respected

### Compatibility
- [ ] Change is classified for compatibility
- [ ] Breaking changes have a migration plan
- [ ] Deprecated consumers are identified
- [ ] Versioning is appropriate

### Reliability
- [ ] Retries are safe
- [ ] Idempotency is handled where required
- [ ] Concurrency is handled where required
- [ ] Long-running work is asynchronous where appropriate

### Scale
- [ ] Collections are bounded
- [ ] Pagination is deterministic
- [ ] Filtering and sorting are constrained
- [ ] Payload sizes are reasonable
- [ ] Expensive operations are protected

### Security
- [ ] Authentication is explicit
- [ ] Authorization is server-enforced
- [ ] Sensitive data is excluded
- [ ] Abuse controls are appropriate
- [ ] Uploads are validated

### Operations
- [ ] Failures can be diagnosed
- [ ] Request/correlation IDs are available
- [ ] Latency and error metrics are available
- [ ] Sensitive payloads are excluded from logs

### Testing
- [ ] Contract tests exist
- [ ] Negative paths are tested
- [ ] Authorization paths are tested
- [ ] Integration behavior is tested
- [ ] Compatibility tests exist where required

### Documentation
- [ ] Documentation matches implementation
- [ ] Examples are valid
- [ ] Authentication requirements are documented
- [ ] Error behavior is documented
- [ ] Pagination/filtering behavior is documented
- [ ] Deprecation behavior is documented

## 33. Automatic Production Blockers

The following SHALL normally result in **NO-GO**:

- Unauthenticated access to protected data without an approved exception
- Missing server-side authorization for protected operations
- Unintentional sensitive-data exposure
- Known breaking change without a migration strategy
- Unbounded production collection endpoint
- Duplicate financial/business side effects caused by normal retries
- Inconsistent or unusable error contract
- API documentation materially contradicting production behavior
- Known severe injection or input-validation vulnerability
- Undocumented contract relied upon by a production consumer
- Critical API behavior that cannot be observed or diagnosed

## 34. AI-Assisted API Development

AI-generated API code SHALL be treated as untrusted implementation output.

Reviewers SHALL verify contract correctness, HTTP semantics, validation, authorization, error behavior, idempotency, concurrency, compatibility, security, performance, tests, and documentation.

> **The model generated the implementation. The engineer owns the contract.**

## 35. Change Control

Every API change SHALL be evaluated for consumer impact, compatibility, security impact, performance impact, operational impact, documentation impact, testing impact, and migration requirements.

Breaking changes require explicit review and approval.

API contracts SHALL be version-controlled with the implementation.

## 36. Sign-Off

The responsible engineer confirms:

> “The API contract, semantics, compatibility behavior, failure behavior, security requirements, testing evidence, documentation, and operational characteristics have been reviewed and are suitable for the intended consumers and environment.”

The reviewer confirms:

> “I have reviewed the API against API-006 and found no unresolved API governance issue that prevents the approved production decision.”

## 37. Final Principle

> **An API is not a collection of routes. It is a compatibility boundary.**

A production API must be designed around stable contracts, explicit semantics, predictable failure behavior, controlled evolution, and evidence that real consumers can safely depend on it.