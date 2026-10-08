# DB-005 — Database Engineering Standard

**Status:** Published  
**Standard ID:** DB-005  
**Applies to:** Relational databases, document databases, key-value stores, search indexes, and other persistent data stores

## 1. Purpose

This standard defines how persistent data SHALL be modeled, stored, queried, migrated, protected, tested, and operated.

It establishes technology-independent rules for data correctness, integrity, ownership, consistency, performance, recoverability, security, and maintainability.

**DB-005 defines WHAT must be true. Database technology profiles define HOW those requirements are implemented for a particular database engine.**

Detailed application-layer persistence behavior belongs to BE-003. API-facing contract behavior belongs to API-006. Detailed security controls belong to SEC-007.

## 2. Core Principle

> **Data is a production asset. Schema, integrity, access patterns, migration behavior, and recovery must be designed—not discovered accidentally in production.**

Database correctness takes precedence over implementation convenience.

## 3. Scope

This standard covers:

- data ownership
- schema and data modeling
- primary and alternate identifiers
- relationships
- constraints and invariants
- normalization and denormalization
- indexes
- query behavior
- transactions and consistency
- concurrency
- migrations
- seed/reference data
- data lifecycle
- retention and deletion
- backups and recovery
- replication
- caching boundaries
- database security
- sensitive data
- auditing
- testing
- performance
- database observability
- operational changes
- database review and readiness

Technology-specific implementation rules MUST live in database profiles.

## 4. Database Preconditions

Database implementation MUST NOT begin as production work until:

- requirements identify the data that must exist
- data ownership is understood
- relevant architecture decisions have passed ARC-002
- authoritative sources of truth are identified
- important invariants are documented
- expected read/write patterns are understood
- transaction and consistency requirements are understood
- retention and deletion requirements are known
- migration strategy is defined
- backup/recovery requirements are known for production data

Schema exploration MAY occur earlier, but exploratory schemas MUST NOT be treated as production-approved design.

## 5. Data Ownership and Source of Truth

Every critical business datum MUST have a clearly identified authoritative owner.

The system MUST define:

- which service owns the data
- which database or storage system is authoritative
- which systems hold derived copies
- how derived data is synchronized
- how conflicts are resolved

Two systems MUST NOT independently claim authority over the same business fact without an explicit reconciliation model.

Caches, search indexes, projections, materialized views, replicas, and analytics stores MUST NOT silently become competing sources of truth.

## 6. Data Modeling

Data models MUST represent business concepts and their required relationships accurately.

Models SHOULD define:

- stable identifiers
- required versus optional attributes
- valid value domains
- relationship cardinality
- lifecycle/state
- ownership
- timestamps where operationally meaningful
- audit information where required

Names MUST be consistent and unambiguous.

Schema design SHOULD prefer explicit semantics over implicit conventions that only the original developer understands.

## 7. Identifiers

Every persisted business entity MUST have an intentional identity strategy.

Identifiers SHOULD:

- be stable
- be unique within their required scope
- avoid accidental reuse
- have predictable generation semantics
- remain independent from presentation labels where appropriate

Do not use mutable business attributes as primary identity unless explicitly justified.

Public identifiers MAY differ from internal database identifiers when security, compatibility, or domain requirements justify it.

## 8. Constraints and Integrity

Critical invariants SHOULD be enforced as close to the authoritative data boundary as practical.

Depending on the database technology, this MAY include:

- uniqueness constraints
- required/non-null constraints
- foreign keys
- check constraints
- schema validation
- optimistic concurrency markers
- application-level invariant enforcement

Application validation MUST NOT be the only protection against a critical integrity violation when the database can safely enforce the invariant.

Constraints MUST be compatible with legitimate transaction and migration behavior.

## 9. Relationships

Relationships MUST have explicit ownership and lifecycle semantics.

For every important relationship, determine:

- who owns the relationship
- whether it is mandatory
- whether it is one-to-one, one-to-many, or many-to-many
- what happens when the parent is deleted
- whether historical references must remain valid
- whether cascading behavior is safe

Destructive cascading behavior MUST be deliberate.

## 10. Normalization and Denormalization

Normalization SHOULD be the default for authoritative transactional data when it improves integrity and maintainability.

Denormalization MAY be introduced when justified by:

- measured performance requirements
- read-model requirements
- reporting/query patterns
- distributed-system constraints
- search/indexing requirements

Every deliberate denormalization SHOULD document:

- source of truth
- synchronization mechanism
- consistency expectations
- rebuild/recovery strategy
- reason the duplication exists

Do not duplicate data merely because copying it is convenient.

## 11. Indexing

Indexes MUST be driven by actual or expected access patterns.

Before adding an index, consider:

- query predicates
- sort patterns
- join/relationship access
- uniqueness requirements
- write overhead
- storage cost
- selectivity

Indexes SHOULD be reviewed when query patterns change.

Unused or redundant indexes SHOULD be removed when evidence shows they provide no value.

Indexing MUST NOT replace fixing fundamentally inefficient query design.

## 12. Query Engineering

Production queries MUST be bounded and intentional.

Queries MUST avoid:

- accidental full dataset retrieval
- unbounded pagination
- N+1 access patterns
- unnecessary columns/fields
- uncontrolled joins/lookups
- repeated identical expensive queries
- user-controlled query execution

Pagination SHOULD have explicit limits.

Sort order MUST be deterministic when pagination depends on ordering.

Query behavior SHOULD be verified using representative data volumes where performance matters.

## 13. Transactions and Consistency

Transaction boundaries MUST correspond to operations that require atomicity.

The design MUST identify which operations require:

- atomic consistency
- eventual consistency
- read-your-writes behavior
- isolation guarantees
- conflict detection

Transactions SHOULD be as short as practical.

Transactions MUST NOT remain open while waiting unnecessarily for external systems.

Distributed consistency MUST use an explicit strategy rather than assuming that multiple databases behave like one transaction.

## 14. Concurrency

Concurrent modification of important business data MUST be considered explicitly.

Where applicable, systems SHOULD use:

- unique constraints
- optimistic concurrency
- version checks
- appropriate locking
- compare-and-set semantics
- atomic operations

Lost updates MUST be prevented or deliberately accepted and documented.

Race conditions around inventory, balances, quotas, state transitions, and other scarce resources are production-critical concerns.

## 15. Migrations

Every production schema change MUST be represented by a controlled migration mechanism appropriate to the database technology.

Migrations MUST:

- be version controlled
- be reviewable
- be repeatable or safely trackable
- have a known execution order
- be tested before production
- account for existing production data

Migration design MUST consider:

- backward compatibility
- deployment ordering
- long-running operations
- locking
- table/index size
- rollback or forward-fix strategy

## 16. Expand and Contract

Changes that cannot be safely deployed atomically SHOULD use an expand-and-contract approach.

Typical sequence:

1. introduce compatible schema
2. deploy code that can operate with both representations
3. migrate/backfill data
4. switch reads/writes
5. remove obsolete representation

Do not combine destructive schema changes with application deployment when intermediate versions may still be running.

## 17. Data Backfills

Backfills MUST be treated as production operations.

A backfill SHOULD define:

- scope
- selection criteria
- batch size
- progress tracking
- retry behavior
- idempotency
- rate limiting/throttling
- failure recovery
- validation after completion

Large backfills MUST NOT be executed as one uncontrolled transaction unless explicitly justified.

## 18. Seed and Reference Data

Reference data required for correct application behavior MUST have a controlled ownership and deployment strategy.

Seed operations SHOULD be idempotent where repeated execution is possible.

Production seed processes MUST NOT overwrite business data unexpectedly.

Environment-specific test/demo data MUST be clearly separated from production reference data.

## 19. Data Lifecycle

Production data MUST have defined lifecycle expectations where applicable:

- creation
- modification
- archival
- retention
- deletion
- legal/business hold
- anonymization

Deletion behavior MUST consider dependent records, audit requirements, regulatory requirements, and recovery implications.

Soft deletion MUST NOT be used automatically for every entity. It SHOULD be introduced only when business or operational requirements justify it.

## 20. Sensitive Data

Sensitive data MUST be identified and classified.

Depending on sensitivity, controls MAY include:

- encryption at rest
- encryption in transit
- field-level protection
- tokenization
- hashing
- access restrictions
- masking
- retention limits

Secrets, authentication credentials, private keys, and similar values MUST NOT be stored as ordinary application data without an explicitly approved secure design.

Detailed security requirements belong to SEC-007.

## 21. Database Access Control

Database access MUST follow least privilege.

Applications SHOULD use dedicated database identities with only the permissions required for their workload.

Administrative credentials MUST NOT be embedded in application configuration.

Developers SHOULD NOT receive unrestricted production database access by default.

Production data access SHOULD be auditable.

## 22. Auditing

Business-critical changes SHOULD be auditable when requirements demand accountability or traceability.

Audit design MUST define:

- what changed
- when it changed
- who or what initiated the change
- relevant resource identity
- whether the record is immutable

Audit data MUST NOT be treated as an unrestricted dumping ground for request payloads or sensitive secrets.

## 23. Backups and Recovery

Production databases MUST have a documented backup and recovery strategy appropriate to their criticality.

The strategy MUST define, as applicable:

- backup frequency
- retention
- storage isolation
- encryption
- recovery procedure
- recovery point objective (RPO)
- recovery time objective (RTO)
- restoration verification

A backup that has never been restored successfully is not sufficient evidence of recoverability.

Recovery procedures SHOULD be tested periodically.

## 24. Replication and Availability

Replication MUST have a defined purpose and consistency model.

Teams MUST understand whether replicas can be:

- stale
- unavailable
- temporarily inconsistent
- promoted during failure

Applications MUST NOT assume that every replica provides identical read-after-write behavior unless guaranteed by the architecture.

Failover behavior MUST be documented for production-critical systems.

## 25. Database Performance

Database performance MUST be considered using realistic data volumes and access patterns.

Teams SHOULD monitor:

- query latency
- query frequency
- slow queries
- connection utilization
- lock contention
- storage growth
- index efficiency
- cache effectiveness where applicable

Performance fixes MUST be evidence-driven.

Do not prematurely optimize schema complexity without a measured requirement.

## 26. Database Observability

Production database operations SHOULD provide enough telemetry to determine:

- whether the database is available
- whether queries are degrading
- whether connections are exhausted
- whether storage is approaching limits
- whether locks/contention are increasing
- whether replication is healthy
- whether failures correlate with application behavior

Database logs and telemetry MUST be handled according to security and privacy requirements.

Detailed observability requirements belong to OBS-014.

## 27. Testing Requirements

Database changes SHOULD be tested at multiple levels:

### Schema Tests

Verify migrations, constraints, indexes, and structural expectations.

### Integration Tests

Verify real database behavior for repositories, transactions, concurrency, and important queries.

### Migration Tests

Verify upgrades against representative existing data.

### Performance Tests

Use representative data volumes for performance-sensitive queries and schema changes.

Critical data integrity rules MUST have automated verification.

## 28. Database Anti-Patterns

The following are production governance violations unless explicitly justified:

- no authoritative owner for critical data
- manual production schema changes without migration tracking
- destructive migrations without a recovery strategy
- unbounded production queries
- missing uniqueness/integrity enforcement for critical invariants
- storing secrets as ordinary application data
- unrestricted application database credentials
- using production data casually in development
- untested backup/recovery assumptions
- long-running transactions without justification
- destructive cascading deletes without deliberate design
- denormalization with no synchronization strategy
- indexes added without understanding their write/storage cost
- large backfills without progress/recovery controls
- silently treating replicas as strongly consistent
- direct production data edits as a normal operating procedure

## 29. Database Implementation Readiness Gate

Before database work is considered implementation-ready, the reviewer MUST verify:

- data ownership is defined
- source of truth is defined
- schema/model is documented
- identifiers are intentional
- critical constraints are identified
- relationships and deletion behavior are defined
- query patterns are understood
- indexes are justified
- transaction/consistency requirements are defined
- concurrency risks are identified
- migration strategy exists
- rollback/forward-fix strategy is understood
- data lifecycle is defined
- sensitive data classification is understood
- backup/recovery requirements are defined
- testing strategy exists

### Gate Decisions

| Decision | Meaning |
|---|---|
| READY | Database implementation may proceed |
| READY WITH CONDITIONS | Implementation may proceed within documented constraints |
| NOT READY | Database implementation MUST NOT proceed as production work |

## 30. Database Review Checklist

### Ownership

- [ ] Every critical datum has an authoritative owner
- [ ] Derived data is distinguishable from source-of-truth data
- [ ] Synchronization/reconciliation behavior is defined

### Modeling

- [ ] Entities and relationships are correct
- [ ] Identifiers are stable
- [ ] Required/optional fields are intentional
- [ ] Lifecycle semantics are understood

### Integrity

- [ ] Critical invariants are enforced
- [ ] Uniqueness is protected
- [ ] Relationship constraints are appropriate
- [ ] Cascading behavior is deliberate

### Queries and Indexes

- [ ] Queries are bounded
- [ ] Pagination is safe
- [ ] N+1 risks are reviewed
- [ ] Indexes match real access patterns
- [ ] Performance was considered at realistic scale

### Transactions and Concurrency

- [ ] Atomic operations are identified
- [ ] Transaction boundaries are deliberate
- [ ] Race conditions are considered
- [ ] Lost-update behavior is defined

### Migrations

- [ ] Changes are version controlled
- [ ] Existing production data is considered
- [ ] Deployment ordering is safe
- [ ] Destructive changes have a recovery strategy

### Security

- [ ] Sensitive data is classified
- [ ] Database access follows least privilege
- [ ] Production access is controlled
- [ ] Credentials are protected

### Recovery

- [ ] Backups exist
- [ ] RPO/RTO are understood where applicable
- [ ] Restoration has been tested
- [ ] Failover behavior is understood where applicable

## 31. Automatic Database Blockers

The following SHOULD result in a **NO-GO** decision until corrected:

- undefined source of truth for critical business data
- migration capable of destructive data loss without safeguards
- critical integrity invariant that can be violated silently
- exposed database credentials
- unrestricted application access to production data
- no viable backup/recovery strategy for critical production data
- unbounded high-volume production queries
- known severe concurrency/data-race risk
- schema change incompatible with the deployment sequence
- irreversible destructive operation without an approved recovery plan
- production data modified manually without traceability where traceability is required

## 32. AI-Assisted Database Development

AI-generated schema, queries, migrations, indexes, and data scripts MUST be treated as untrusted implementation output.

The engineer remains responsible for:

- data integrity
- migration safety
- query correctness
- performance
- security
- backup/recovery implications
- concurrency behavior
- production readiness

AI MUST NOT be treated as evidence that a migration is safe or that a query is performant.

AI-generated database changes MUST pass the same review, migration testing, security, and production-readiness requirements as manually written changes.

## 33. Change Control

Database changes MUST be reviewed for impact on:

- existing data
- application compatibility
- API behavior
- migrations
- indexes
- query performance
- concurrency
- backups
- replication
- reporting/analytics
- retention/deletion

High-risk schema changes SHOULD include a rollout and recovery plan.

## 34. Database Sign-Off

Database work MAY be approved when:

- DB-005 requirements are satisfied
- applicable backend, API, security, and testing standards are satisfied
- migrations have been verified
- critical queries and constraints have been reviewed
- known risks are documented
- recovery implications are understood
- no production-blocking findings remain

Approval means the reviewer accepts the engineering evidence, not that the database can never fail.

## 35. Final Principle

> **A production database is not merely where the application stores data. It is an operational system whose integrity, evolution, performance, and recoverability must be engineered deliberately.**

Convenient schemas are easy to create. Safe data systems require ownership, constraints, migrations, observability, and recovery.