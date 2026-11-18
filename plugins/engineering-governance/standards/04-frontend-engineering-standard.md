# FE-004 — Frontend Engineering Standard

**Status:** Published  
**Standard ID:** FE-004  
**Applies to:** Web applications, browser clients, frontend applications, UI systems, and client-side business workflows

## 1. Purpose

This standard defines how frontend software SHALL be designed, implemented, tested, reviewed, operated, and changed.

It establishes technology-independent rules for frontend correctness, maintainability, accessibility, security, performance, resilience, state management, and user experience.

**FE-004 defines WHAT must be true. Technology profiles define HOW those requirements are implemented in a particular frontend stack.**

Detailed visual/product design governance may be defined by project design systems. Detailed security requirements belong to SEC-007; detailed testing requirements belong to QA-008.

## 2. Core Principle

> **The UI presents state. Components express behavior. Application logic owns workflows. Domain rules remain authoritative outside the presentation layer.**

Frontend code MUST NOT become the source of truth for security, authorization, financial rules, or other server-owned business invariants.

## 3. Scope

This standard covers:

- application structure
- component boundaries
- presentation logic
- client-side business workflows
- state management
- server state and caching
- forms and validation
- routing and navigation
- authentication/session handling
- authorization-aware UI behavior
- API/client integration
- error and loading states
- accessibility
- responsive behavior
- performance
- browser storage
- security-sensitive frontend behavior
- frontend testing
- dependency management
- observability and diagnostics
- frontend review and implementation readiness

Framework-specific rules MUST live in technology profiles.

## 4. Frontend Preconditions

Frontend implementation MUST NOT begin as production work until:

- requirements have passed REQ-001
- relevant architecture decisions have passed ARC-002
- user journeys and major states are understood
- API/data contracts required by the UI are sufficiently defined
- authentication/session behavior is known
- authorization responsibilities are known
- responsive requirements are understood
- accessibility expectations are defined
- critical loading, empty, error, and failure states are identified
- required design system or visual constraints are known

Prototype work MAY proceed earlier when explicitly approved, but prototype code MUST NOT automatically be treated as production-ready code.

## 5. Application Structure

Frontend architecture SHOULD separate:

- presentation components
- application/workflow logic
- domain or business-facing logic where appropriate
- API/data-access concerns
- state management
- shared infrastructure
- configuration

Components MUST have clear responsibilities.

Do not create excessive abstractions, wrapper components, hooks, utilities, or state stores without a meaningful reason.

## 6. Component Responsibilities

Presentation components SHOULD primarily:

- render state
- handle local interaction
- compose child components
- expose intentional inputs and outputs
- manage genuinely local UI state

Components SHOULD NOT become containers for unrelated:

- API calls
- global state mutations
- business workflows
- authorization policy
- data transformation pipelines

Large components MUST be decomposed when complexity materially reduces readability, testability, or change safety.

Component decomposition MUST be based on responsibility, not arbitrary line count.

## 7. State Management

State MUST have a deliberate owner.

Classify state before introducing a state mechanism:

- **local UI state** — temporary state belonging to one component or interaction
- **shared client state** — state required across multiple frontend features
- **server state** — data whose authoritative source is a backend service
- **URL state** — filters, search, pagination, tabs, and navigation state that should be shareable/bookmarkable
- **persistent client state** — intentionally retained browser state

Do not place every state value into a global store.

Server state SHOULD NOT be copied into global client state unless there is a clear consistency strategy.

State synchronization MUST avoid competing sources of truth.

## 8. Server State and Data Fetching

Frontend applications MUST treat backend systems as the authoritative source for server-owned data.

Data fetching SHOULD define:

- loading behavior
- success behavior
- empty behavior
- error behavior
- retry behavior where appropriate
- cache/staleness behavior
- cancellation behavior where relevant

Duplicate requests SHOULD be avoided when they provide no user or system value.

Mutations MUST handle success and failure explicitly.

Optimistic updates MAY be used only when rollback/reconciliation behavior is understood.

## 9. API Integration

API access SHOULD be centralized behind a predictable client/data-access boundary.

UI components SHOULD NOT contain scattered low-level HTTP implementation details.

API clients SHOULD provide consistent handling for:

- authentication/session state
- request cancellation
- serialization
- errors
- timeouts where applicable
- retries where safe

API contracts MUST be treated as contracts rather than inferred from incidental response shapes.

Detailed API governance belongs to API-006.

## 10. Forms and Validation

Forms MUST distinguish between:

1. input/format validation
2. business validation enforced by the backend

Frontend validation SHOULD improve user feedback but MUST NOT be treated as a security boundary.

Forms SHOULD provide clear:

- field errors
- submission state
- success state
- failure state
- disabled/in-progress behavior

Double submission MUST be prevented where duplicate operations could cause incorrect business effects.

## 11. Authentication and Authorization

Authentication state MUST be represented explicitly.

Frontend applications MAY hide or disable UI actions based on permissions for usability, but this is not authorization enforcement.

Sensitive operations MUST rely on backend authorization.

The frontend MUST NOT treat tokens, roles, permissions, or route visibility as proof that a user is authorized.

Session expiration MUST have deliberate behavior.

Sensitive credentials MUST NOT be unnecessarily persisted in browser storage.

Detailed requirements belong to SEC-007.

## 12. Routing and Navigation

Routes MUST correspond to meaningful application destinations.

Navigation SHOULD:

- preserve user context where appropriate
- handle unauthorized access explicitly
- handle missing resources explicitly
- support browser back/forward semantics
- avoid unnecessary full-page reloads in applications designed for client-side navigation

Protected routes MUST NOT be the only authorization mechanism.

Navigation state MUST NOT silently discard unsaved critical user work.

## 13. Loading, Empty, Error, and Failure States

Every significant asynchronous screen or operation MUST have deliberate states for:

- initial loading
- successful content
- empty content
- recoverable error
- permission failure
- unavailable/degraded dependency where applicable

Do not leave users with indefinite spinners.

Errors SHOULD provide an actionable next step when one exists.

## 14. User Experience and Interaction

Production interfaces SHOULD provide predictable feedback for user actions.

Interactive controls MUST communicate:

- enabled state
- disabled state
- progress where appropriate
- success/failure outcome

Destructive operations SHOULD require an appropriate confirmation or undo mechanism based on risk.

Critical workflows MUST NOT depend on hidden UI behavior.

## 15. Accessibility

Accessibility MUST be treated as an engineering requirement, not an optional visual enhancement.

Frontend implementations SHOULD provide:

- semantic structure
- keyboard navigation
- visible focus behavior
- accessible names and labels
- appropriate contrast
- meaningful error messaging
- correct form semantics
- appropriate screen-reader behavior
- reduced-motion consideration where relevant

Interactive functionality MUST remain usable without relying solely on pointer interaction.

## 16. Responsive Design

Responsive behavior MUST be defined by content and interaction requirements rather than a fixed list of device widths alone.

Production interfaces SHOULD:

- avoid accidental horizontal overflow
- preserve critical functionality at supported viewport sizes
- adapt navigation appropriately
- maintain readable content density
- support touch interaction where applicable

Responsive requirements MUST be tested at representative extremes, not only the developer's primary screen.

## 17. Performance

Frontend performance MUST be considered during architecture and implementation.

Applications SHOULD avoid:

- unnecessary rerenders
- excessive JavaScript shipped to initial load
- unoptimized large assets
- blocking critical rendering
- unnecessary network requests
- uncontrolled polling
- rendering extremely large collections without an appropriate strategy

Performance optimization MUST be evidence-driven.

Use techniques such as code splitting, lazy loading, memoization, virtualization, caching, and asset optimization only where they address an identified cost.

## 18. Browser Storage

Browser storage MUST have an explicit purpose, lifecycle, and sensitivity assessment.

Do not store secrets or sensitive data in browser storage unnecessarily.

Persistent client state SHOULD define:

- expiration behavior
- migration/versioning behavior
- invalidation behavior
- storage failure behavior

## 19. Security Baseline

Frontend applications MUST:

- treat all server responses as untrusted input
- avoid unsafe HTML injection
- avoid exposing secrets in client bundles
- avoid logging sensitive values
- use secure authentication/session mechanisms defined by the backend
- avoid trusting client-side authorization
- validate data before dangerous rendering or processing

Client-side environment variables MUST be assumed public unless the build system explicitly guarantees otherwise.

Detailed security requirements belong to SEC-007.

## 20. Error Handling

Frontend errors SHOULD be categorized into:

- validation errors
- authentication/session errors
- authorization errors
- business conflicts
- network/dependency failures
- unexpected application failures

Errors MUST NOT be silently swallowed.

Unexpected failures SHOULD be captured by the application's error handling/observability mechanism.

User-facing messages SHOULD be understandable without exposing internal implementation details.

## 21. Observability and Diagnostics

Production frontend applications SHOULD provide enough diagnostics to identify:

- JavaScript/runtime failures
- failed API operations
- slow critical interactions
- navigation failures
- client-side performance degradation

Diagnostic data MUST respect privacy and security requirements.

Detailed observability requirements belong to OBS-014.

## 22. Testing Requirements

Frontend testing SHOULD exist at multiple levels:

### Unit Tests

Use for deterministic logic, utilities, state transitions, and complex component behavior.

### Component Tests

Use for important component interaction and rendering behavior.

### Integration Tests

Use for feature workflows involving multiple components, state, and API boundaries.

### End-to-End Tests

Use for critical user journeys and high-risk workflows.

Tests MUST verify meaningful user/system behavior rather than implementation details alone.

Critical workflows MUST have automated coverage appropriate to their risk.

## 23. Dependency Management

Frontend dependencies MUST be:

- explicitly declared
- version controlled
- reviewed for maintenance and security risk
- removed when unnecessary

Do not introduce a dependency solely to avoid a small amount of straightforward application code.

Client-side bundle impact SHOULD be considered when adding dependencies.

## 24. Frontend Anti-Patterns

The following are production governance violations unless explicitly justified:

- business rules duplicated across many components
- global state used for all application state
- API calls scattered throughout unrelated UI components
- client-side authorization treated as real authorization
- secrets embedded in client bundles
- arbitrary use of browser storage for sensitive data
- giant components with unrelated responsibilities
- giant global stores containing unrelated domains
- duplicated server state
- infinite or uncontrolled polling
- unbounded rendering of large collections
- swallowing API/runtime errors
- loading spinners with no failure or timeout behavior
- tests coupled tightly to implementation details
- disabling accessibility to simplify implementation
- hard-coded viewport assumptions that break supported layouts
- adding abstractions without a real maintenance benefit

## 25. Frontend Implementation Readiness Gate

Before frontend work is considered implementation-ready, the reviewer MUST verify:

- requirements are approved
- architecture is approved
- user journeys are understood
- component/feature boundaries are defined
- state ownership is defined
- server-state strategy is defined
- API contracts are sufficiently defined
- authentication/session behavior is defined
- authorization responsibilities are defined
- loading/empty/error states are defined
- responsive requirements are understood
- accessibility expectations are understood
- performance-sensitive areas are identified
- testing strategy exists
- required observability is understood

### Gate Decisions

| Decision | Meaning |
|---|---|
| READY | Frontend implementation may proceed |
| READY WITH CONDITIONS | Implementation may proceed only within documented constraints |
| NOT READY | Frontend implementation MUST NOT proceed as production work |

## 26. Frontend Review Checklist

### Architecture

- [ ] Feature/component boundaries are clear
- [ ] Responsibilities are appropriately separated
- [ ] State has deliberate ownership
- [ ] Server state is not duplicated unnecessarily
- [ ] Framework coupling is controlled

### Data and API

- [ ] API access is centralized appropriately
- [ ] Loading states exist
- [ ] Empty states exist
- [ ] Error states exist
- [ ] Mutation failures are handled
- [ ] Duplicate submission is prevented where necessary

### Security

- [ ] Client-side authorization is not treated as enforcement
- [ ] Sensitive values are not unnecessarily persisted
- [ ] Secrets are not exposed in bundles
- [ ] Unsafe rendering paths are controlled

### UX

- [ ] Critical interactions provide feedback
- [ ] Destructive actions are handled safely
- [ ] Navigation preserves necessary context
- [ ] Errors are understandable

### Accessibility

- [ ] Semantic markup is used
- [ ] Keyboard interaction works
- [ ] Focus behavior is correct
- [ ] Accessible labels/names exist
- [ ] Error states are accessible

### Responsive Design

- [ ] Supported viewport extremes were tested
- [ ] No unintended horizontal overflow exists
- [ ] Navigation adapts appropriately
- [ ] Critical functionality remains available

### Performance

- [ ] Network requests are appropriate
- [ ] Large assets are handled efficiently
- [ ] Large lists have an appropriate rendering strategy
- [ ] Critical rendering paths were reviewed

### Testing

- [ ] Critical workflows are automated
- [ ] Important component behavior is tested
- [ ] Failure paths are tested
- [ ] Authentication/authorization UI behavior is tested

## 27. Automatic Frontend Blockers

The following SHOULD result in a **NO-GO** decision until corrected:

- exposed production secrets
- client-side authorization used as the only authorization control
- critical workflow with no meaningful failure handling
- critical user operation capable of accidental duplicate submission
- severe accessibility failure in a critical workflow
- data loss caused by uncontrolled navigation/state behavior
- critical API failures silently ignored
- production-breaking responsive failures on supported viewports
- known critical runtime errors on primary user journeys
- sensitive data unnecessarily persisted in insecure client storage

## 28. AI-Assisted Frontend Development

AI-generated frontend code MUST be reviewed as untrusted implementation output.

The engineer remains responsible for:

- correctness
- accessibility
- security
- architecture
- state behavior
- API integration
- performance
- test quality
- production readiness

AI MUST NOT be treated as evidence that a UI is correct or production-ready.

AI-generated code MUST satisfy the same frontend standards and quality gates as manually written code.

## 29. Change Control

Frontend changes MUST be reviewed for impact on:

- user journeys
- navigation
- state ownership
- API contracts
- authentication/session behavior
- authorization-aware UI
- accessibility
- responsive behavior
- performance
- browser compatibility where applicable
- analytics/observability

High-risk UX or state changes SHOULD include explicit regression testing.

## 30. Frontend Sign-Off

Frontend work MAY be approved when:

- FE-004 requirements are satisfied
- applicable API, security, testing, and design requirements are satisfied
- automated verification passes
- critical user journeys work as intended
- known risks are documented
- no production-blocking findings remain

Approval means the reviewer accepts the engineering evidence, not that the reviewer guarantees the UI will never fail.

## 31. Final Principle

> **A frontend is production-ready when users can reliably understand, operate, and recover from the application while the implementation remains secure, accessible, maintainable, and consistent with the system architecture.**

A polished interface is not necessarily a production-ready interface. Production engineering requires predictable behavior under success, failure, latency, invalid input, permission changes, and constrained environments.