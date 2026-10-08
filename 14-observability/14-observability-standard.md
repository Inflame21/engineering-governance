# OBS-014 — Observability Standard

**Status:** Published  
**Standard ID:** OBS-014  
**Applies to:** All production systems, services, applications, infrastructure, background workloads, integrations, and operational components governed by this framework.

---

## 1. Purpose

OBS-014 defines the requirements for making system behavior observable, diagnosable, measurable, and actionable.

Observability is the ability to understand the internal state and behavior of a system from the evidence it produces.

> **If a production failure cannot be detected, understood, correlated, and investigated from available evidence, the system is not operationally mature.**

---

## 2. Scope

This standard governs:

- logs
- metrics
- traces
- events
- health checks
- service-level indicators
- service-level objectives
- alerting
- dashboards
- correlation and request identity
- operational metadata
- audit telemetry
- error telemetry
- dependency telemetry
- background-job telemetry
- deployment telemetry
- infrastructure telemetry
- telemetry security
- telemetry retention
- telemetry cost
- observability testing
- incident diagnostics
- AI-assisted observability changes

This standard is technology-neutral.

Vendor, platform, framework, logging-library, metrics-library, and tracing-specific profiles MAY define implementation details.

---

## 3. Observability Principles

### 3.1 Observability Is an Engineering Requirement

Observability SHALL be designed alongside the system rather than added after production failures occur.

Critical requirements SHALL have corresponding operational evidence where appropriate.

### 3.2 Evidence Over Assumption

Teams SHALL be able to answer questions such as:

- Is the system healthy?
- Who is affected?
- What changed?
- Where is the failure?
- When did it begin?
- Which dependency is failing?
- Is the problem isolated or systemic?
- Is recovery occurring?
- Did a deployment cause the issue?

### 3.3 Signals Must Be Actionable

Telemetry that cannot support diagnosis, detection, or decision-making SHOULD be removed or improved.

More telemetry is not automatically better observability.

### 3.4 Observability Must Reflect Failure Modes

Critical failure modes identified in architecture and risk analysis SHOULD have corresponding signals.

---

## 4. Observability Model

A production system SHOULD use multiple complementary signal types:

- logs
- metrics
- traces
- events
- profiles where appropriate
- audit records where required

No single signal type is sufficient for every diagnostic problem.

---

## 5. Logs

Logs SHALL capture meaningful operational events.

Useful log categories include:

- application lifecycle events
- request failures
- authentication/security events
- authorization failures
- business-critical failures
- dependency failures
- background-job failures
- infrastructure failures
- configuration errors
- deployment events

Logs SHOULD provide sufficient context to reconstruct what happened.

---

## 6. Structured Logging

Production logs SHOULD use structured representations.

Structured logs SHOULD include fields such as:

- timestamp
- severity
- service
- environment
- operation
- request/correlation identifier
- deployment/version identifier
- relevant entity identifier
- error classification

Field names SHOULD remain consistent across services.

---

## 7. Log Severity

Severity levels SHALL have defined semantics.

A typical model:

| Level | Meaning |
|---|---|
| DEBUG | Diagnostic detail primarily for development/troubleshooting |
| INFO | Normal meaningful operational event |
| WARN | Unexpected condition requiring attention or investigation |
| ERROR | Failed operation or significant fault |
| FATAL/CRITICAL | System-level failure requiring immediate intervention |

Severity SHALL NOT be used as decoration.

A recoverable expected validation failure SHOULD NOT automatically become an ERROR.

---

## 8. Log Content

Logs SHALL answer useful operational questions without unnecessarily recording sensitive data.

Avoid logging:

- passwords
- access tokens
- refresh tokens
- private keys
- secrets
- unnecessary personal data
- sensitive payloads
- full authentication credentials

Sensitive logging SHALL comply with SEC-007.

---

## 9. Error Logging

Errors SHOULD contain:

- error classification
- operation
- service/component
- correlation identifier
- relevant context
- dependency information where applicable
- safe diagnostic details
- stack trace where useful

Error messages SHOULD distinguish:

- expected business failures
- validation failures
- dependency failures
- programming defects
- infrastructure failures

---

## 10. Exception Duplication

The same error SHOULD NOT be logged repeatedly at every layer.

Choose an appropriate logging boundary.

Repeated logging creates:

- noisy telemetry
- inflated costs
- duplicate alerts
- difficult incident investigation

---

## 11. Metrics

Critical services SHALL expose meaningful operational metrics.

Metrics SHOULD cover appropriate dimensions such as:

- traffic
- latency
- errors
- saturation
- availability
- resource utilization
- queue depth
- dependency health
- throughput
- job execution
- business-critical outcomes

---

## 12. RED and USE Signals

Where applicable, teams SHOULD consider:

### RED

- Rate
- Errors
- Duration

For request-driven services.

### USE

- Utilization
- Saturation
- Errors

For infrastructure and resource-oriented components.

These are diagnostic frameworks, not mandatory metric names.

---

## 13. Metric Design

Metrics SHALL have controlled cardinality.

Avoid dimensions based on unbounded values such as:

- request IDs
- arbitrary user input
- full URLs with identifiers
- raw exception messages
- unrestricted entity identifiers

High-cardinality telemetry can create severe cost and performance problems.

---

## 14. Business Metrics

Technical telemetry MAY be supplemented with business metrics where they materially improve operational understanding.

Examples:

- orders created
- payments completed
- jobs processed
- documents generated
- workflows completed

Business metrics SHALL NOT replace technical health metrics.

---

## 15. Distributed Tracing

Distributed tracing SHOULD be used where requests cross multiple services or significant asynchronous boundaries.

Tracing SHOULD identify:

- originating request
- service boundaries
- downstream dependencies
- database operations where appropriate
- external calls
- queue/message boundaries
- latency contribution
- failure location

---

## 16. Trace Context Propagation

Trace or correlation context SHOULD propagate across:

- HTTP requests
- RPC
- asynchronous jobs
- queues
- events
- scheduled workloads

Context propagation SHALL be consistent enough to reconstruct distributed operations.

---

## 17. Correlation IDs

Systems SHALL provide a reliable mechanism to correlate related operations.

Correlation identifiers SHOULD be available across relevant:

- logs
- traces
- errors
- asynchronous jobs
- support diagnostics

Correlation identifiers SHALL NOT contain secrets or sensitive payloads.

---

## 18. Request Identity

Where appropriate, telemetry SHOULD identify:

- request ID
- trace ID
- service
- environment
- deployment version

The identity model SHALL be consistent across services.

---

## 19. Health Checks

Services SHALL expose appropriate health information.

Health checks SHOULD distinguish between:

- process/liveness
- readiness
- dependency health
- startup state

A health check SHALL reflect the actual question its consumer needs answered.

---

## 20. Health Check Anti-Pattern

A service SHALL NOT report healthy merely because its process is running when critical dependencies are unavailable, if readiness depends on those dependencies.

Conversely, health checks SHOULD NOT fail because of non-critical dependencies that do not prevent useful service operation.

Health semantics SHALL be deliberate.

---

## 21. Service-Level Indicators

Critical services SHOULD define Service-Level Indicators (SLIs).

Common SLIs include:

- availability
- request success rate
- latency
- freshness
- processing completion
- queue delay
- correctness indicators

SLIs SHALL represent user or system-relevant behavior.

---

## 22. Service-Level Objectives

Where appropriate, SLIs SHALL have Service-Level Objectives (SLOs).

An SLO SHOULD define:

- indicator
- target
- measurement window
- scope
- exclusions where necessary
- owner

Example:

> 99.9% of valid API requests complete successfully within the defined latency objective over a rolling 30-day window.

Targets SHALL be based on requirements and risk rather than arbitrary numbers.

---

## 23. Error Budgets

Where SLOs are used, teams MAY use error budgets to govern operational risk.

An error budget can inform:

- release velocity
- reliability work
- incident priorities
- feature trade-offs
- infrastructure investment

Error budgets SHALL be treated as an engineering decision mechanism, not merely a dashboard number.

---

## 24. Alerting

Alerts SHALL be actionable.

An alert SHOULD answer:

- What is wrong?
- How severe is it?
- Who owns it?
- What user/system impact is likely?
- What immediate action is expected?

Alerts SHOULD NOT be generated solely because a metric crossed an arbitrary threshold without operational meaning.

---

## 25. Alert Severity

Alert severity SHOULD reflect operational impact.

Typical categories:

- informational
- warning
- high
- critical

Critical alerts SHOULD correspond to conditions requiring urgent human intervention.

---

## 26. Alert Fatigue

Teams SHALL actively manage alert noise.

Avoid:

- duplicate alerts
- non-actionable alerts
- alerts for expected transient conditions
- alerts with no owner
- alerts that fire continuously without remediation

An alert that is routinely ignored is an observability defect.

---

## 27. Alert Ownership

Every production alert SHALL have an owner or escalation path.

Ownership SHOULD identify:

- responsible team
- escalation path
- relevant runbook
- severity
- expected response

---

## 28. Alert Testing

Critical alerts SHOULD be tested.

Testing SHOULD verify:

- signal generation
- alert rule
- routing
- notification
- severity
- ownership
- runbook availability

An alert definition that has never been exercised is weak operational evidence.

---

## 29. Dashboards

Critical services SHOULD have operational dashboards.

Dashboards SHOULD answer:

- Is the service healthy?
- Is traffic normal?
- Are errors increasing?
- Is latency degrading?
- Is capacity approaching limits?
- Are dependencies failing?
- Did a recent deployment correlate with the change?

---

## 30. Dashboard Design

Dashboards SHOULD prioritize:

1. user/system health
2. service-level indicators
3. errors
4. latency
5. traffic
6. saturation
7. dependency health
8. recent changes

Avoid dashboards that contain large quantities of metrics without diagnostic purpose.

---

## 31. Dependency Observability

Important dependencies SHOULD expose observable behavior.

Track where applicable:

- latency
- failures
- timeouts
- retries
- rate limits
- availability
- saturation
- connection failures

Dependency failures SHOULD be distinguishable from local application failures.

---

## 32. External Integrations

External integrations SHOULD record safe operational information such as:

- provider/service
- operation
- latency
- success/failure
- retry behavior
- timeout
- response classification
- correlation context

Do not log external credentials or sensitive payloads.

---

## 33. Background Jobs

Background workloads SHALL be observable.

Telemetry SHOULD include:

- job execution
- success/failure
- duration
- retries
- queue delay
- dead-letter behavior where applicable
- scheduling
- throughput

A background job that fails silently is an operational defect.

---

## 34. Queues and Event Systems

Where queues/events are used, monitor:

- message rate
- queue depth
- processing latency
- consumer failures
- retries
- dead-letter volume
- message age
- processing lag

Critical queue backlogs SHALL have defined operational responses.

---

## 35. Deployment Observability

Deployments SHALL be correlated with operational telemetry where practical.

Telemetry SHOULD identify:

- release/version
- deployment time
- environment
- configuration revision
- relevant infrastructure change

This enables questions such as:

> "What changed immediately before the incident?"

---

## 36. Configuration Changes

Material configuration changes SHOULD be observable and attributable.

Where practical, record:

- what changed
- when
- environment
- change reference
- actor or automation identity

Secrets themselves SHALL never be logged.

---

## 37. Audit Telemetry

Security- and compliance-relevant actions SHALL be auditable where required by SEC-007 or system requirements.

Audit records MAY include:

- actor
- action
- target
- timestamp
- outcome
- source
- correlation context

Audit telemetry SHALL be distinguished from ordinary diagnostic logs where retention or integrity requirements differ.

---

## 38. Telemetry Integrity

Telemetry used for security, compliance, or critical operational decisions SHALL have appropriate integrity protections.

Consider:

- restricted write access
- controlled retention
- immutable storage where required
- access auditing
- tamper detection

---

## 39. Telemetry Retention

Retention SHALL reflect:

- incident investigation needs
- compliance requirements
- security requirements
- cost
- data sensitivity

Retention periods SHALL be explicit for important telemetry classes.

Do not retain sensitive telemetry indefinitely without justification.

---

## 40. Telemetry Privacy

Observability systems SHALL follow SEC-007.

Teams SHALL minimize:

- personal data
- authentication data
- secrets
- confidential business data

Telemetry SHOULD use:

- redaction
- masking
- hashing where appropriate
- tokenization where appropriate

---

## 41. Telemetry Access

Observability platforms SHALL have access controls.

Production telemetry can contain sensitive operational information and SHALL NOT be treated as public data.

Access SHOULD follow least privilege.

---

## 42. Telemetry Availability

Critical observability infrastructure SHALL itself be treated as an operational dependency.

Teams SHOULD consider:

- telemetry pipeline failures
- collector failures
- storage exhaustion
- network partition
- provider outages

Loss of telemetry SHALL be detectable where possible.

---

## 43. Telemetry Failure Behavior

The application SHOULD NOT become unavailable merely because non-critical telemetry infrastructure is temporarily unavailable.

Telemetry behavior SHALL be designed to prevent:

- blocking requests indefinitely
- uncontrolled memory growth
- disk exhaustion
- cascading failures

Critical audit requirements MAY require stronger guarantees.

---

## 44. Sampling

Tracing and high-volume telemetry MAY use sampling.

Sampling SHALL consider:

- error visibility
- critical workflows
- rare failures
- debugging requirements
- cost

Do not sample away the evidence required to investigate critical failures.

---

## 45. Observability Cost

Telemetry SHALL have cost governance.

Teams SHOULD monitor:

- log volume
- metric cardinality
- trace volume
- storage
- retention
- ingestion cost

Cost optimization SHALL NOT remove signals required for incident detection or investigation without risk review.

---

## 46. Performance Impact

Observability SHALL not materially degrade system performance without justification.

Consider:

- asynchronous telemetry
- batching
- sampling
- buffering
- payload size
- serialization overhead

Observability code SHALL itself be production engineered.

---

## 47. Observability During Degraded Operation

Systems SHOULD preserve critical telemetry during degraded conditions.

Examples:

- dependency outage
- database saturation
- queue backlog
- high traffic
- partial network failure

Telemetry must remain useful when the system is least healthy.

---

## 48. Incident Diagnostics

Critical services SHOULD provide sufficient evidence to determine:

- incident start time
- affected scope
- failure mode
- contributing dependency
- relevant deployment/configuration change
- recovery status

Incident investigation SHOULD NOT depend on reproducing production state locally.

---

## 49. Runbooks

Critical alerts and operational failure modes SHOULD have runbooks.

A runbook SHOULD contain:

- symptom
- likely causes
- diagnostic queries/steps
- immediate mitigation
- escalation path
- recovery procedure
- validation steps
- rollback/roll-forward guidance

Runbooks SHALL be maintained as operational documentation.

---

## 50. Observability Testing

Observability SHALL be tested as part of production readiness.

Testing MAY include:

- log emission tests
- metric emission tests
- trace propagation tests
- alert tests
- dashboard validation
- health-check tests
- failure-simulation tests
- telemetry redaction tests
- runbook exercises

---

## 51. Failure Injection

For critical systems, controlled failure testing SHOULD validate observability.

Examples:

- dependency timeout
- service crash
- database unavailability
- queue backlog
- resource exhaustion
- network failure

The objective is not merely to prove recovery; it is also to prove that operators can detect and understand the failure.

---

## 52. Observability Requirements Traceability

Critical requirements SHOULD map to operational signals.

Example:

| Requirement | Observable evidence |
|---|---|
| API availability | availability SLI + alert |
| Payment processing | success/failure metrics + trace |
| Background processing | job metrics + failure logs |
| Authentication security | security audit events |
| Deployment safety | deployment marker + health metrics |
| Data pipeline freshness | freshness metric + alert |

---

## 53. Observability Readiness Gate

Before production approval:

### Detection

- [ ] Critical failures can be detected.
- [ ] Important service health is measurable.
- [ ] Alerts exist for material failure modes.

### Diagnosis

- [ ] Logs contain useful context.
- [ ] Correlation/trace identifiers work.
- [ ] Dependencies can be diagnosed.
- [ ] Deployments can be correlated with failures.

### Operations

- [ ] Critical dashboards exist.
- [ ] Alerts have owners.
- [ ] Critical alerts have runbooks.
- [ ] Recovery can be validated.

### Security

- [ ] Secrets are not logged.
- [ ] Sensitive data is controlled.
- [ ] Telemetry access is restricted.
- [ ] Audit requirements are satisfied.

### Reliability

- [ ] Background workloads are observable.
- [ ] Queue behavior is observable where applicable.
- [ ] Critical telemetry failure is understood.
- [ ] Observability has been tested.

---

## 54. Automatic Production Blockers

Production SHALL be blocked when:

- critical failures cannot be detected
- critical production services have no meaningful operational telemetry
- critical alerts have no owner
- critical incidents cannot be correlated to affected operations
- secrets or credentials are exposed through telemetry
- required audit events are absent
- critical background workloads can fail silently
- health checks materially misrepresent service state
- telemetry failure can cause uncontrolled application failure
- required recovery/diagnostic evidence has not been validated
- critical alerts have no defined operational response
- AI-generated observability changes have not been human-verified

---

## 55. Observability Anti-Patterns

### Log everything

Generating large volumes of unstructured logs without diagnostic value.

### Metrics without action

Collecting thousands of metrics that nobody uses.

### Alert on everything

Turning every warning into an incident.

### Dashboard theater

Building attractive dashboards that do not support operational decisions.

### Missing correlation

Having logs and traces but no reliable way to connect related operations.

### Secret logging

Recording tokens, credentials, or sensitive payloads for debugging convenience.

### Silent background failures

Allowing asynchronous jobs to fail without visible operational evidence.

### False health

Reporting healthy merely because a process is alive.

### Cardinality explosion

Using unbounded identifiers as metric dimensions.

### Untested alerts

Assuming an alert works because its configuration exists.

---

## 56. Reviewer Checklist

A reviewer or SGE SHOULD verify:

- [ ] Critical failure modes have observable signals.
- [ ] Logs are structured and useful.
- [ ] Log severity is meaningful.
- [ ] Sensitive information is protected.
- [ ] Metrics have controlled cardinality.
- [ ] Important request paths are traceable.
- [ ] Correlation IDs propagate correctly.
- [ ] Health checks represent meaningful service state.
- [ ] SLIs/SLOs exist where appropriate.
- [ ] Alerts are actionable.
- [ ] Alerts have owners.
- [ ] Dashboards support diagnosis.
- [ ] Dependencies are observable.
- [ ] Background jobs are observable.
- [ ] Deployments can be correlated with telemetry.
- [ ] Audit events are present where required.
- [ ] Telemetry access is controlled.
- [ ] Retention is defined.
- [ ] Observability has been tested.
- [ ] Critical runbooks exist.
- [ ] AI-assisted observability changes were verified.

---

## 57. Relationship to Other Standards

OBS-014 complements:

- GOV-000 — Engineering Governance Constitution
- ARC-002 — Architecture & System Design Standard
- BE-003 — Backend Engineering Standard
- FE-004 — Frontend Engineering Standard
- API-006 — API Governance Standard
- SEC-007 — Security Engineering Standard
- QA-008 — Testing & Quality Engineering Standard
- REV-009 — Code Review Standard
- AI-010 — AI-Assisted Development Standard
- INFRA-013 — Infrastructure & Environment Standard

OBS-014 governs the **evidence produced by a running system**.

It does not replace:

- security controls
- infrastructure governance
- application architecture
- performance engineering
- incident management
- release management

---

## 58. Exceptions

Exceptions to OBS-014 require an explicit engineering exception under EXC-021.

The exception SHALL document:

- missing capability
- reason
- affected services
- operational risk
- compensating controls
- owner
- expiration/review date

"Nobody looks at the logs" is not a sufficient justification for removing required telemetry.

---

## 59. Change Control

Observability SHALL be reviewed when changes materially affect:

- critical workflows
- failure modes
- service boundaries
- dependencies
- infrastructure
- security events
- data sensitivity
- deployment architecture
- SLOs
- operational ownership

A feature that changes system behavior SHALL be evaluated for corresponding observability changes.

---

## 60. Sign-Off

**System:** ____________________  
**Environment:** ____________________  
**Observability scope:** ____________________  
**SLI/SLO reference:** ____________________  
**Dashboard reference:** ____________________  
**Alert/runbook reference:** ____________________  
**Security validation:** ____________________  
**Telemetry validation:** ____________________  
**Failure-test reference:** ____________________  
**Production decision:** GO / GO WITH CONDITIONS / NO-GO  
**Reviewer:** ____________________  
**Approval date:** ____________________

---

## 61. Final Principle

> **A system is not operationally observable because it emits telemetry. It is observable when that telemetry provides reliable evidence for detecting, understanding, and responding to real system behavior.**

The operational chain is:

**system behavior → telemetry → signal → detection → diagnosis → response → recovery → evidence**

**Measure what matters. Correlate what matters. Alert on what matters. Preserve evidence when the system fails.**
