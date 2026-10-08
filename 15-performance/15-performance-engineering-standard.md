# PERF-015 — Performance Engineering Standard

**Status:** Published  
**Standard ID:** PERF-015  
**Applies to:** All software systems, services, APIs, databases, frontend applications, background workloads, infrastructure interactions, and performance-sensitive workflows governed by this framework.

---

## 1. Purpose

PERF-015 defines the engineering requirements for designing, measuring, validating, and maintaining system performance.

Performance is a system property produced by the interaction of:

- application code
- architecture
- data access
- network behavior
- infrastructure
- concurrency
- dependencies
- workload characteristics
- user interaction

> **Performance is not the absence of slow code. Performance is predictable system behavior under defined workload and resource conditions.**

---

## 2. Scope

This standard governs:

- performance requirements
- performance budgets
- workload models
- latency
- throughput
- concurrency
- resource consumption
- frontend performance
- backend performance
- API performance
- database/query performance
- caching
- asynchronous processing
- network behavior
- external dependencies
- capacity planning
- load testing
- stress testing
- endurance testing
- scalability testing
- profiling
- performance regression detection
- production performance monitoring
- performance-related incidents
- AI-assisted performance changes

This standard is technology-neutral.

Framework-, runtime-, database-, browser-, cloud-, and platform-specific profiles MAY define implementation details.

---

## 3. Performance Principles

### 3.1 Requirements Before Optimization

Performance targets SHALL originate from:

- user expectations
- business requirements
- system requirements
- workload characteristics
- operational constraints

Do not optimize against arbitrary numbers without understanding why they matter.

### 3.2 Measure Before Optimizing

Performance changes SHOULD be supported by evidence.

A developer's assumption that a change is "faster" is not sufficient evidence for a material performance decision.

### 3.3 Optimize the Bottleneck

Optimization effort SHOULD target the dominant bottleneck.

Improving a non-critical component while the actual bottleneck remains unchanged is not meaningful performance engineering.

### 3.4 Performance Has Trade-offs

Performance improvements SHALL consider:

- correctness
- maintainability
- security
- cost
- complexity
- consistency
- reliability

A faster system that is materially less correct or reliable is not necessarily a better system.

---

## 4. Performance Requirements

Critical workflows SHOULD define measurable performance requirements.

A performance requirement SHOULD specify:

- operation
- workload
- metric
- target
- percentile or aggregation
- environment
- relevant conditions

Example:

> Under 500 concurrent users, 99% of successful requests to the order-search operation SHALL complete within 500 ms in the production-equivalent environment.

---

## 5. Performance Metrics

Relevant performance metrics include:

- latency
- throughput
- concurrency
- queueing delay
- CPU utilization
- memory utilization
- storage I/O
- network throughput
- database latency
- connection utilization
- cache hit rate
- garbage-collection behavior where applicable
- frontend rendering time
- resource transfer size
- interaction latency

Metrics SHALL be selected according to the workload.

---

## 6. Percentiles

Latency SHOULD be evaluated using percentiles where tail behavior matters.

Commonly useful values include:

- p50
- p90
- p95
- p99
- p99.9 for highly sensitive systems

Average latency SHALL NOT be the only latency metric for critical workloads.

A system with a good average but unacceptable tail latency may still provide poor user experience.

---

## 7. Performance Budgets

Critical applications SHOULD define performance budgets.

Budgets MAY cover:

- API latency
- page load
- interaction latency
- JavaScript size
- asset size
- memory
- CPU
- database query latency
- background processing delay
- queue depth

Budgets SHOULD be enforced through appropriate quality gates.

---

## 8. Workload Model

Performance testing SHALL use a realistic workload model.

Define where applicable:

- request volume
- concurrency
- request distribution
- read/write ratio
- payload sizes
- user behavior
- peak traffic
- burst traffic
- background workloads
- dependency behavior

A benchmark without a meaningful workload model provides limited evidence.

---

## 9. Baseline

Material performance work SHOULD establish a baseline before modification.

The baseline SHOULD record:

- workload
- environment
- software version
- infrastructure characteristics
- relevant configuration
- performance measurements
- test duration

Without a baseline, improvement claims are difficult to validate.

---

## 10. Reproducibility

Performance tests SHOULD be reproducible.

Document:

- test environment
- dataset
- workload
- test tooling
- configuration
- duration
- warm-up behavior
- measurement method

Environmental differences SHALL be considered when comparing results.

---

## 11. Cold and Warm Behavior

Where relevant, distinguish:

- cold start
- warm execution
- cache-warm execution
- cache-cold execution
- connection establishment
- initialization overhead

Do not report only warm performance when cold behavior materially affects users.

---

## 12. Backend Performance

Backend performance SHALL consider:

- request processing
- CPU work
- memory allocation
- serialization/deserialization
- database access
- network calls
- external dependencies
- concurrency
- connection pools
- queueing
- retries

Performance issues SHOULD be diagnosed using evidence rather than code appearance.

---

## 13. API Performance

API performance SHOULD consider:

- request latency
- response size
- serialization
- pagination
- filtering
- sorting
- database access
- downstream calls
- rate limits
- concurrency

API contracts SHALL avoid unnecessarily expensive operations.

---

## 14. Database Performance

Database performance SHALL consider:

- query execution
- indexing
- joins
- filtering
- sorting
- pagination
- connection usage
- transaction duration
- locking
- contention
- result size

Slow queries SHOULD be investigated using actual execution evidence.

Do not add indexes blindly.

---

## 15. Query Efficiency

Queries SHOULD:

- retrieve only required data
- use appropriate indexes
- avoid unnecessary repeated execution
- avoid unbounded result sets
- avoid accidental full scans where inappropriate
- use appropriate pagination

Application-level loops that produce repeated database access SHOULD be reviewed for N+1 behavior.

---

## 16. N+1 and Repeated Access

Critical paths SHALL avoid accidental N+1 patterns where they materially affect performance.

Repeated database or service calls SHOULD be consolidated, batched, cached, or redesigned when justified.

---

## 17. Transactions and Performance

Transaction boundaries SHALL consider:

- duration
- lock contention
- isolation
- throughput
- failure behavior

Long-running transactions SHOULD be avoided unless required.

Performance optimization SHALL NOT weaken required consistency guarantees without explicit architectural approval.

---

## 18. Concurrency

Concurrency behavior SHALL be understood for performance-sensitive workloads.

Consider:

- thread/task limits
- connection pools
- worker counts
- queue capacity
- synchronization
- locks
- contention
- race conditions
- downstream limits

Increasing concurrency does not necessarily increase throughput.

---

## 19. Backpressure

Systems handling variable or bursty workloads SHOULD implement appropriate backpressure.

Backpressure MAY use:

- queues
- bounded concurrency
- rate limiting
- admission control
- buffering
- load shedding

Unbounded work accumulation SHALL be avoided.

---

## 20. Async Processing

Long-running work SHOULD be moved out of synchronous request paths where appropriate.

Async processing SHALL consider:

- queue delay
- execution time
- retries
- idempotency
- failure handling
- dead-letter behavior
- user-visible status

Asynchronous processing is not automatically faster; it changes where latency is observed.

---

## 21. Caching

Caching MAY be used where it provides measurable benefit.

Caching decisions SHALL define:

- cache key
- TTL
- invalidation
- consistency expectations
- ownership
- capacity
- failure behavior

Cache correctness SHALL be preserved.

---

## 22. Cache Invalidation

Cache invalidation SHALL be deliberate.

Consider:

- stale data
- concurrent writes
- partial invalidation
- cache rebuild
- cache failure
- deployment behavior

"Just add a cache" is not a complete performance strategy.

---

## 23. Cache Failure

Systems SHALL define behavior when the cache is unavailable.

Where appropriate, the application SHOULD degrade to the source of truth without causing uncontrolled load.

Cache failure SHALL NOT automatically become a database overload incident.

---

## 24. Frontend Performance

Frontend performance SHALL consider:

- initial load
- resource transfer
- rendering
- interaction latency
- navigation
- network requests
- JavaScript execution
- memory
- images
- fonts
- third-party scripts

Performance SHALL be evaluated on representative devices and network conditions where user requirements justify it.

---

## 25. Frontend Loading Strategy

Frontend applications SHOULD minimize unnecessary work during initial rendering.

Consider:

- code splitting
- lazy loading
- route-level loading
- asset optimization
- prefetching
- caching
- server/client rendering strategy where applicable

Optimization SHALL not compromise accessibility or correctness.

---

## 26. Rendering Performance

UI components SHOULD avoid unnecessary:

- re-renders
- expensive computations
- large DOM trees
- repeated data transformations
- synchronous blocking work

Optimization SHALL be evidence-driven.

Premature memoization can increase complexity without meaningful benefit.

---

## 27. Network Performance

Network behavior SHALL consider:

- round trips
- payload size
- compression
- connection reuse
- protocol behavior
- geographic latency
- retries
- timeouts

Chatty service interactions SHOULD be reviewed.

---

## 28. Payload Size

APIs and frontend resources SHOULD avoid unnecessarily large payloads.

Consider:

- pagination
- field selection
- compression
- response shaping
- image optimization
- binary formats where justified

Large payloads SHALL be treated as a performance and reliability concern.

---

## 29. External Dependencies

External dependencies SHALL be treated as performance variables.

For important dependencies, understand:

- latency
- timeout
- rate limit
- throughput
- retry behavior
- failure behavior
- geographic considerations

Retries SHALL not create uncontrolled traffic amplification.

---

## 30. Timeout Budgets

Timeouts SHOULD reflect an intentional latency budget.

Avoid chains where:

- upstream timeout exceeds downstream timeout without reason
- retries extend beyond user/system tolerance
- multiple nested retries create excessive latency

End-to-end latency SHALL be considered.

---

## 31. Retry Amplification

Retries can multiply load.

Retry policies SHOULD define:

- maximum attempts
- backoff
- jitter where appropriate
- retryable failures
- total time budget

Retries SHALL NOT convert a dependency outage into a traffic storm.

---

## 32. Resource Efficiency

Performance engineering SHALL consider resource efficiency.

Monitor appropriate:

- CPU
- memory
- storage
- network
- database connections
- worker capacity

Optimization may reduce both latency and infrastructure cost.

---

## 33. Memory

Memory usage SHALL be bounded for long-running workloads.

Consider:

- allocation patterns
- caches
- large payloads
- streaming
- object retention
- leaks
- concurrency

Memory growth over time SHOULD be tested for long-lived services.

---

## 34. Streaming

Streaming MAY be used for large data or latency-sensitive workflows.

Streaming designs SHALL consider:

- backpressure
- connection lifetime
- cancellation
- partial failure
- memory usage
- retries
- client behavior

---

## 35. Scalability

Scalability SHALL be evaluated against expected workload growth.

Consider:

- vertical scaling
- horizontal scaling
- database scaling
- queue scaling
- dependency limits
- state management
- synchronization
- infrastructure quotas

A system is not scalable merely because additional instances can be created.

---

## 36. Capacity Planning

Critical systems SHOULD have capacity models.

Capacity planning SHOULD identify:

- expected baseline
- expected peak
- growth assumptions
- bottleneck resources
- scaling thresholds
- hard limits
- provider quotas
- cost implications

---

## 37. Load Testing

Critical systems SHOULD undergo load testing appropriate to risk.

Load testing SHOULD validate:

- target throughput
- latency objectives
- error behavior
- resource utilization
- dependency behavior
- scaling behavior

The test should represent realistic traffic patterns.

---

## 38. Stress Testing

Stress testing SHOULD determine behavior beyond expected capacity.

Identify:

- degradation point
- failure mode
- recovery behavior
- resource exhaustion
- bottleneck
- user impact

The objective is to understand the system boundary.

---

## 39. Endurance Testing

Long-running systems SHOULD use endurance/soak testing where risks include:

- memory leaks
- resource leaks
- connection exhaustion
- queue accumulation
- gradual degradation
- storage growth

Test duration SHALL reflect the failure mode being investigated.

---

## 40. Scalability Testing

Where scaling is required, validate:

- scaling trigger
- scaling speed
- scaling effectiveness
- downstream capacity
- cost behavior
- stabilization

Autoscaling that adds instances but does not improve the bottleneck is not successful scaling.

---

## 41. Performance Regression Testing

Material performance characteristics SHOULD be protected against regression.

Regression testing MAY compare:

- latency percentiles
- throughput
- memory
- CPU
- bundle size
- query duration
- startup time

Thresholds SHALL account for measurement variance.

---

## 42. Performance Variance

Performance results SHALL account for noise.

Consider:

- warm-up
- shared infrastructure
- background processes
- network variability
- cache state
- dataset changes
- workload randomness

Avoid declaring regression based on insignificant measurement differences.

---

## 43. Profiling

Profiling SHOULD be used to identify expensive operations.

Depending on the system, profile:

- CPU
- memory
- database
- network
- rendering
- allocation
- lock contention

Profiling evidence SHOULD guide optimization.

---

## 44. Benchmarking

Microbenchmarks MAY be useful for isolated operations.

They SHALL NOT be treated as proof of end-to-end system performance.

A faster function does not necessarily make the system faster.

---

## 45. Performance and Correctness

Performance changes SHALL preserve correctness.

Examples of unacceptable optimization:

- dropping required validation
- weakening authorization
- returning stale data without authorization
- removing required transactions
- hiding errors
- bypassing audit requirements

Performance SHALL NOT override higher-priority requirements.

---

## 46. Performance and Reliability

Performance optimizations SHALL consider reliability.

Examples:

- aggressive caching
- high concurrency
- connection-pool expansion
- retry increases
- queue expansion

A change that improves throughput while increasing failure probability may be a net regression.

---

## 47. Performance and Security

Security controls SHALL not be removed merely to improve benchmark results.

Performance-sensitive security controls SHOULD be optimized safely rather than bypassed.

Security-sensitive operations SHALL be benchmarked where necessary.

---

## 48. Performance and Cost

Performance targets SHALL consider infrastructure cost.

Do not automatically maximize performance if the resulting cost is disproportionate to user or business value.

Performance decisions SHOULD document major cost trade-offs.

---

## 49. Production Performance Monitoring

Production systems SHALL have sufficient telemetry to detect meaningful performance degradation.

Coordinate with OBS-014 for:

- latency metrics
- throughput
- resource utilization
- saturation
- queue delay
- performance alerts

---

## 50. Performance Incident Detection

Critical performance degradation SHOULD trigger actionable operational response.

Examples:

- latency SLO breach
- throughput collapse
- queue backlog
- resource exhaustion
- database saturation
- elevated timeout rate

Performance incidents SHALL be distinguishable from normal workload variation.

---

## 51. Performance Optimization Workflow

Recommended workflow:

1. Define the performance problem.
2. Establish measurable target.
3. Establish baseline.
4. Model workload.
5. Measure.
6. Identify bottleneck.
7. Form optimization hypothesis.
8. Implement the smallest justified change.
9. Re-measure.
10. Validate correctness and reliability.
11. Evaluate cost.
12. Document material decisions.
13. Add regression protection where appropriate.

---

## 52. Performance Documentation

Material performance decisions SHOULD document:

- problem
- baseline
- workload
- bottleneck
- change
- measurement
- result
- trade-offs
- remaining limitations

Performance claims without measurement SHOULD be treated as hypotheses.

---

## 53. Performance Testing Environments

Performance tests SHOULD use environments representative enough to support the decision being made.

When production cannot be replicated exactly, document differences in:

- infrastructure
- data
- network
- dependencies
- configuration
- traffic

Do not present non-equivalent benchmark results as production guarantees.

---

## 54. AI-Assisted Performance Engineering

AI-generated performance changes SHALL comply with AI-010.

AI MAY suggest:

- algorithmic improvements
- query changes
- caching strategies
- concurrency changes
- profiling hypotheses
- frontend optimizations

AI-generated claims such as "this is faster" SHALL be experimentally verified.

AI SHALL NOT be trusted to infer performance characteristics from source code alone when empirical measurement is practical.

---

## 55. Performance Readiness Gate

Before production approval:

### Requirements

- [ ] Critical performance requirements are defined.
- [ ] Relevant performance budgets exist.
- [ ] Workload assumptions are documented.

### Evidence

- [ ] Baseline exists where required.
- [ ] Bottlenecks were measured.
- [ ] Performance claims are evidence-based.
- [ ] Representative tests were executed.

### System

- [ ] Database access is efficient.
- [ ] Concurrency behavior is understood.
- [ ] External dependency latency is understood.
- [ ] Caching behavior is intentional.
- [ ] Resource consumption is bounded.

### Scalability

- [ ] Capacity assumptions are documented.
- [ ] Scaling behavior is understood.
- [ ] Hard limits are identified.

### Operations

- [ ] Production performance telemetry exists.
- [ ] Material regressions can be detected.
- [ ] Performance incidents have an operational response.

### Safety

- [ ] Optimization preserves correctness.
- [ ] Security controls remain intact.
- [ ] Reliability trade-offs are understood.
- [ ] Cost impact is understood.

---

## 56. Automatic Production Blockers

Production SHALL be blocked when:

- critical performance requirements are undefined
- a known critical bottleneck has no mitigation or accepted risk
- expected production workload cannot be supported
- critical resource exhaustion is unbounded
- performance testing required by risk has not been completed
- performance claims are used as production evidence without appropriate measurement
- known scalability limits are exceeded by expected workload
- critical database queries are demonstrably unsafe at expected scale
- retry/concurrency behavior can create uncontrolled load
- performance optimization compromises required correctness or security
- AI-generated performance changes have not been empirically validated where measurement is practical

---

## 57. Performance Anti-Patterns

### Optimize without measuring

Changing code because it "looks slow."

### Average-only latency

Reporting only averages while ignoring tail latency.

### Benchmark theater

Running synthetic benchmarks that do not represent production workload.

### Cache everything

Adding caching without invalidation or consistency design.

### More concurrency

Increasing workers or threads without understanding the bottleneck.

### Retry storm

Using retries that multiply traffic during dependency failure.

### Premature optimization

Adding complexity before a measurable problem exists.

### Microbenchmark fallacy

Assuming a faster isolated function makes the whole application faster.

### Infinite scaling assumption

Assuming infrastructure can scale without limits or downstream constraints.

### Performance at any cost

Improving latency by weakening correctness, security, or reliability.

---

## 58. Reviewer Checklist

A reviewer or SGE SHOULD verify:

- [ ] Performance requirements are measurable.
- [ ] Workload assumptions are explicit.
- [ ] Baselines exist where necessary.
- [ ] Relevant latency percentiles are measured.
- [ ] Throughput and concurrency are understood.
- [ ] Database access has been evaluated.
- [ ] N+1 behavior is controlled.
- [ ] Caching has explicit correctness semantics.
- [ ] Retry behavior is bounded.
- [ ] Timeouts are intentional.
- [ ] Resource consumption is bounded.
- [ ] Capacity limits are understood.
- [ ] Scaling behavior has been validated where required.
- [ ] Frontend performance is considered where applicable.
- [ ] Performance telemetry exists.
- [ ] Regression protection exists where appropriate.
- [ ] Performance changes preserve correctness and security.
- [ ] Cost trade-offs are understood.
- [ ] AI-generated performance claims were verified.

---

## 59. Relationship to Other Standards

PERF-015 complements:

- GOV-000 — Engineering Governance Constitution
- REQ-001 — Requirements Engineering Standard
- ARC-002 — Architecture & System Design Standard
- BE-003 — Backend Engineering Standard
- FE-004 — Frontend Engineering Standard
- DB-005 — Database Engineering Standard
- API-006 — API Governance Standard
- QA-008 — Testing & Quality Engineering Standard
- AI-010 — AI-Assisted Development Standard
- INFRA-013 — Infrastructure & Environment Standard
- OBS-014 — Observability Standard

PERF-015 governs **performance behavior and evidence**.

It does not replace:

- infrastructure capacity governance
- database integrity rules
- API contracts
- observability
- security
- release management

---

## 60. Exceptions

Exceptions to PERF-015 require an explicit engineering exception under EXC-021.

The exception SHALL document:

- performance limitation
- affected workload
- business/technical reason
- measured impact
- accepted risk
- compensating controls
- owner
- expiration/review date

"Users have not complained" is not sufficient evidence for ignoring a known critical performance requirement.

---

## 61. Change Control

Performance SHALL be reassessed when changes materially affect:

- architecture
- workload
- database access
- API contracts
- frontend rendering
- concurrency
- caching
- external dependencies
- infrastructure
- data volume
- traffic expectations

A change that alters performance characteristics SHALL be evaluated even when its primary purpose is functional.

---

## 62. Sign-Off

**System:** ____________________  
**Environment:** ____________________  
**Performance scope:** ____________________  
**Requirements/budget reference:** ____________________  
**Baseline reference:** ____________________  
**Performance test reference:** ____________________  
**Capacity reference:** ____________________  
**Observability reference:** ____________________  
**Known limitations:** ____________________  
**Production decision:** GO / GO WITH CONDITIONS / NO-GO  
**Reviewer:** ____________________  
**Approval date:** ____________________

---

## 63. Final Principle

> **Performance engineering is the discipline of making system behavior predictable under defined workload, resource, and failure conditions.**

The engineering chain is:

**requirement → workload → baseline → measurement → bottleneck → optimization → validation → regression protection**

**Measure first. Optimize the bottleneck. Validate the result. Preserve correctness.**
