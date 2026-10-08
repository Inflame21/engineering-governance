# BE-003 Profile — FastAPI

**Standard:** BE-003  
**Profile:** FastAPI  
**Status:** Published  
**Applies to:** FastAPI services governed by BE-003

## 1. Purpose

This profile defines FastAPI-specific implementation guidance for satisfying the technology-independent requirements of BE-003.

This document does not replace BE-003. If a rule conflicts with BE-003, BE-003 takes precedence unless an approved exception exists.

## 2. Application Structure

A production FastAPI service SHOULD separate:

- API routers
- application/use-case logic
- domain logic
- infrastructure adapters
- persistence models/repositories
- configuration
- tests

A project MAY use a different structure when its architecture clearly preserves the same boundaries.

Do not create folders or layers merely for visual organization. Each boundary must have a defined responsibility.

## 3. Routers

FastAPI routers MUST remain thin.

Routers SHOULD:

- declare routes
- define transport schemas
- obtain request-scoped dependencies
- invoke application operations
- map results to response models

Routers MUST NOT contain substantial business workflows or direct complex database operations.

## 4. Pydantic Models

Pydantic models SHOULD be used for explicit transport contracts.

Separate request and response models SHOULD be used when their responsibilities differ.

Do not expose ORM/database models directly as API contracts merely because the framework supports it.

Validation requiring database state, authorization context, or external calls SHOULD live in the application/domain layer rather than a simple Pydantic field validator.

## 5. Dependency Injection

FastAPI dependency injection SHOULD be used for request-scoped technical dependencies such as:

- authenticated identity
- database sessions
- service construction where appropriate
- configuration access
- request context

Dependencies MUST NOT become hidden business workflows.

A dependency that performs significant business work should normally be replaced with an explicit application operation.

## 6. Database Sessions

Database sessions/connections MUST have a controlled lifecycle.

Session creation, cleanup, commit, and rollback behavior MUST be explicit.

Do not store request-specific database sessions in global state.

Transaction ownership MUST be clear. A reviewer should be able to identify where a business operation begins and where its transaction ends.

## 7. Async and Sync Execution

An async endpoint MUST NOT casually perform blocking synchronous I/O.

When using asynchronous execution:

- database clients/drivers must be compatible with the execution model
- external HTTP clients must use an appropriate async client where required
- blocking CPU-heavy work should not execute directly on the event loop
- thread/process execution should be explicit when needed

Do not use async solely because it appears more modern. Use it when the workload and dependencies benefit from asynchronous execution.

## 8. Authentication and Authorization

Authentication and authorization dependencies MAY establish request context, but the actual permission decision MUST remain explicit and auditable.

Every sensitive route MUST have a server-side authorization path.

Do not assume an internal router, admin prefix, or hidden frontend route is trusted.

## 9. Exception Handling

FastAPI exception handlers SHOULD translate known application/domain errors into consistent API responses.

Unexpected exceptions MUST be logged through the service's operational logging mechanism and MUST NOT expose internal details to clients.

Do not use broad exception handlers to turn failures into HTTP 200 responses.

## 10. Middleware

Middleware SHOULD be limited to genuinely cross-cutting concerns such as:

- request IDs/correlation
- security headers
- request logging
- metrics
- controlled CORS
- tracing

Business rules MUST NOT be hidden in middleware.

## 11. Startup and Shutdown

Application startup and shutdown behavior MUST be explicit.

Resource initialization and cleanup MAY use FastAPI lifespan mechanisms or an equivalent controlled lifecycle.

Long-running initialization SHOULD NOT block service startup indefinitely.

## 12. OpenAPI

The generated OpenAPI contract SHOULD accurately represent:

- request schemas
- response schemas
- authentication requirements
- status codes
- relevant descriptions

Do not rely on generated documentation as a substitute for API-006 contract governance.

## 13. Configuration

Use a typed configuration mechanism appropriate to the project.

Required configuration MUST be validated during startup or before the service accepts production traffic.

Secrets MUST come from approved secret/configuration mechanisms and MUST NOT be hard-coded.

## 14. Background Tasks

FastAPI background-task mechanisms MUST NOT be used as a replacement for a durable job system when the work:

- must survive process restarts
- requires retries
- has important business consequences
- may run for a significant duration
- requires reliable observability

For such workloads, use the project's approved queue/worker architecture.

## 15. Testing

FastAPI services SHOULD test at multiple boundaries:

- domain/application unit tests
- persistence integration tests
- HTTP/API tests
- authentication/authorization tests
- failure-path tests

The test suite SHOULD exercise actual FastAPI routing and dependency behavior rather than mocking the framework itself.

## 16. FastAPI Anti-Patterns

The following require correction or explicit justification:

- large router functions
- business logic inside dependencies
- direct ORM queries scattered across routers
- global mutable request state
- synchronous blocking I/O inside async execution
- using BackgroundTasks for durable critical jobs
- returning ORM entities blindly
- broad exception handlers that hide failures
- authentication without authorization
- duplicated Pydantic/domain business rules
- creating a service/repository class for every trivial operation without architectural value

## 17. Review Checklist

- [ ] Routers are thin
- [ ] Application operations are explicit
- [ ] Domain rules are framework-independent
- [ ] Pydantic models define intentional API contracts
- [ ] Dependency injection is controlled
- [ ] Database session lifecycle is safe
- [ ] Transaction boundaries are identifiable
- [ ] Async/sync usage is technically correct
- [ ] Authorization is enforced
- [ ] Exceptions are translated safely
- [ ] Middleware is genuinely cross-cutting
- [ ] Startup/shutdown lifecycle is controlled
- [ ] OpenAPI reflects the intended contract
- [ ] Configuration is validated
- [ ] Background work has appropriate durability
- [ ] Tests cover meaningful boundaries

## 18. Final Rule

> **FastAPI is the transport framework, not the architecture.**

Use FastAPI to expose the system; do not allow FastAPI to define where the business logic lives.