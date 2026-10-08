# DOC-016 — Documentation Standard

**Status:** Published  
**Standard ID:** DOC-016  
**Applies to:** All software projects, engineering teams, systems, services, APIs, infrastructure, operational processes, and production artifacts governed by this framework.

---

## 1. Purpose

DOC-016 defines the requirements for creating, maintaining, reviewing, and governing engineering documentation.

Documentation exists to preserve engineering knowledge that would otherwise be lost across:

- people
- code changes
- architectural changes
- operational incidents
- technology changes
- organizational changes
- AI-assisted development

> **Documentation is part of the system's knowledge base. If critical knowledge exists only in someone's memory, the system has an operational dependency on that person.**

---

## 2. Scope

This standard governs:

- requirements documentation
- architecture documentation
- ADRs
- API documentation
- database documentation
- infrastructure documentation
- security documentation
- testing documentation
- operational runbooks
- incident documentation
- deployment documentation
- onboarding documentation
- developer documentation
- user-facing technical documentation
- code documentation
- generated documentation
- AI-generated documentation
- documentation ownership
- documentation lifecycle
- documentation review
- documentation drift
- documentation versioning
- documentation source-of-truth rules

This standard is technology-neutral.

---

## 3. Documentation Principles

### 3.1 Documentation Is an Engineering Artifact

Important documentation SHALL be treated as a maintained engineering artifact.

It SHALL NOT be treated as optional administrative work when it contains information required to:

- build
- review
- operate
- secure
- recover
- understand
- change
- support

the system.

### 3.2 Documentation Must Have Purpose

Every material document SHOULD have a defined purpose.

Avoid documentation that exists only because:

- a template required it
- a tool generated it
- nobody knows whether it is still needed
- it duplicates another source without adding value

### 3.3 Documentation Must Reflect Reality

Documentation SHALL describe the system as it actually exists.

Known discrepancies SHALL be corrected or explicitly marked.

> **Documentation that contradicts production behavior is a defect, not merely an outdated note.**

### 3.4 Source of Truth Must Be Explicit

When multiple sources contain the same information, one authoritative source SHALL be identified.

Other representations SHOULD be generated, referenced, or synchronized from that source.

---

## 4. Documentation Classification

Documentation SHOULD be classified according to purpose.

Common classes:

- governance
- requirements
- architecture
- implementation
- API
- data
- infrastructure
- security
- testing
- operations
- incidents
- release
- onboarding
- user documentation

Classification helps determine:

- owner
- review frequency
- audience
- lifecycle
- sensitivity
- authority

---

## 5. Documentation Audience

Documents SHOULD identify their primary audience.

Possible audiences include:

- engineers
- reviewers
- architects
- security engineers
- operations
- support
- product
- users
- auditors
- external integrators

Documentation SHALL provide enough context for its intended audience to act correctly.

---

## 6. Documentation Ownership

Material documentation SHALL have an owner.

The owner is responsible for:

- accuracy
- maintenance
- review
- change coordination
- archival when obsolete

Ownership MAY belong to a team rather than an individual.

A document without an identifiable owner is a governance risk.

---

## 7. Documentation Metadata

Material engineering documents SHOULD identify:

- title
- purpose
- owner
- status
- scope
- applicable system/environment
- source of truth where relevant
- last meaningful review
- related standards or references

Not every document requires every field, but important operational or governance documents SHALL have sufficient metadata to establish authority and lifecycle.

---

## 8. Requirements Documentation

Requirements documentation SHALL follow REQ-001.

Requirements SHOULD remain traceable to:

- business objectives
- user needs
- acceptance criteria
- architecture
- implementation
- tests

When requirements change, affected downstream documentation SHOULD be reviewed.

---

## 9. Architecture Documentation

Architecture documentation SHALL follow ARC-002.

Material architecture documentation SHOULD communicate:

- system boundaries
- responsibilities
- dependencies
- data flows
- trust boundaries
- runtime behavior
- deployment architecture
- important constraints

Architecture documentation SHOULD prioritize decisions and relationships over implementation trivia.

---

## 10. Architecture Decision Records

Material architectural decisions SHOULD have ADRs.

An ADR SHOULD document:

1. decision
2. context
3. alternatives considered
4. decision rationale
5. consequences
6. constraints
7. status

ADR statuses MAY include:

- proposed
- accepted
- superseded
- deprecated
- rejected

An ADR SHALL NOT silently remain authoritative after being superseded.

---

## 11. Documentation of Rejected Alternatives

Important rejected alternatives SHOULD be documented when future engineers could otherwise repeat the same investigation.

This is particularly useful for:

- technology selection
- architecture
- infrastructure
- data models
- major performance decisions
- security controls

The objective is to preserve decision reasoning, not every rejected idea.

---

## 12. API Documentation

APIs SHALL be documented according to API-006.

Documentation SHOULD include:

- endpoint/resource behavior
- request contract
- response contract
- authentication
- authorization expectations
- validation
- errors
- pagination
- rate limits
- idempotency
- versioning
- compatibility
- examples where useful

Generated API specifications SHOULD be treated according to the project's source-of-truth model.

---

## 13. Database Documentation

Important data structures SHOULD be documented.

Documentation MAY include:

- ownership
- entity relationships
- important invariants
- lifecycle
- sensitive fields
- retention
- migration constraints
- source-of-truth relationships

Database documentation SHALL remain consistent with DB-005.

Do not manually maintain diagrams that materially contradict the actual schema.

---

## 14. Infrastructure Documentation

Infrastructure documentation SHALL align with INFRA-013.

Material infrastructure documentation SHOULD identify:

- environment topology
- network boundaries
- major resources
- ownership
- dependencies
- access model
- backup/recovery
- disaster recovery
- important operational constraints

Infrastructure-as-code remains the authoritative source for declarative infrastructure where applicable.

---

## 15. Security Documentation

Security-sensitive systems SHOULD document:

- trust boundaries
- authentication model
- authorization model
- threat-model decisions
- sensitive data
- security controls
- secrets handling
- audit requirements
- important security assumptions

Security documentation SHALL follow SEC-007.

Sensitive credentials SHALL never be stored in documentation.

---

## 16. Testing Documentation

Testing documentation SHOULD explain:

- test strategy
- important risk areas
- test environments
- test data
- required quality gates
- known limitations
- performance/security testing expectations

Testing documentation SHALL complement QA-008 rather than duplicate the standard.

---

## 17. Operational Documentation

Production systems SHALL have sufficient operational documentation.

Critical systems SHOULD document:

- startup/deployment expectations
- health checks
- dependencies
- common failures
- diagnostics
- recovery
- rollback/roll-forward
- escalation
- ownership

---

## 18. Runbooks

Critical operational failure modes SHOULD have runbooks.

A runbook SHOULD include:

- symptom
- impact
- prerequisites
- diagnostic steps
- likely causes
- mitigation
- recovery
- validation
- escalation
- post-recovery checks

Runbooks SHALL be tested where the associated failure mode is critical.

A runbook that cannot be followed by an appropriately skilled engineer is incomplete.

---

## 19. Onboarding Documentation

Projects SHOULD provide enough onboarding information for a new engineer to:

- understand the system purpose
- configure the development environment
- run the application
- run tests
- understand major architecture
- identify important repositories/services
- understand deployment workflow
- locate authoritative documentation

Onboarding documentation SHALL avoid becoming a substitute for architecture or operational documentation.

---

## 20. Local Development Documentation

Developer setup documentation SHOULD cover:

- prerequisites
- runtime versions
- dependency installation
- environment configuration
- local services
- database setup
- test execution
- common development commands
- troubleshooting

Environment-specific secrets SHALL NOT be committed.

---

## 21. Code Documentation

Code SHOULD be self-explanatory through:

- clear naming
- appropriate structure
- explicit types/contracts
- small focused units

Comments SHOULD explain:

- why
- constraints
- non-obvious behavior
- invariants
- compatibility workarounds
- unusual decisions

Comments SHOULD NOT merely restate obvious code.

---

## 22. Documentation of Invariants

Important business and technical invariants SHOULD be documented close to the relevant engineering boundary.

Examples:

- state transition rules
- data integrity constraints
- authorization assumptions
- concurrency requirements
- ordering guarantees
- idempotency guarantees

The invariant SHOULD be represented in executable code or tests where practical.

---

## 23. Documentation and Tests

When behavior is important enough to document, teams SHOULD consider whether it is also important enough to test.

Documentation explains expected behavior.

Tests provide executable evidence of behavior.

Neither automatically replaces the other.

---

## 24. Documentation and Code

Code is authoritative for implemented behavior unless another explicit source is defined by governance.

Documentation SHALL NOT be used to claim behavior that the implementation does not provide.

If intended behavior differs from implemented behavior:

1. determine whether the code or requirement is wrong
2. correct the appropriate source
3. update dependent documentation
4. add or update tests

---

## 25. Documentation Drift

Documentation drift occurs when documentation no longer matches the governed system.

Examples:

- outdated API examples
- obsolete architecture diagrams
- incorrect environment instructions
- stale deployment steps
- deleted configuration references
- outdated screenshots
- obsolete dependencies
- superseded ADRs

Drift SHALL be treated according to impact.

Critical operational drift is a production risk.

---

## 26. Drift Detection

Teams SHOULD use automation where practical to detect documentation drift.

Examples:

- generated API specifications
- schema documentation
- infrastructure diagrams
- dependency documentation
- command validation
- link validation
- documentation tests

Automation SHALL NOT create false confidence if generated output itself is incorrect.

---

## 27. Generated Documentation

Generated documentation MAY be used for:

- API specifications
- schema references
- dependency references
- code documentation
- configuration references

Generated documentation SHALL have an identified source of truth.

Generated artifacts SHALL NOT be manually edited if regeneration will overwrite the changes, unless the process explicitly supports such edits.

---

## 28. Documentation Generation

Documentation generation SHALL be deterministic where practical.

Generation SHOULD:

- use version-controlled inputs
- be reproducible
- identify its source
- fail clearly when generation fails

Generated documentation SHALL NOT silently publish incomplete output.

---

## 29. Documentation Versioning

Documents that describe versioned behavior SHALL identify applicable versions where necessary.

This includes:

- APIs
- release behavior
- migration procedures
- configuration
- compatibility
- user-facing workflows

Historical documentation SHOULD be retained when it provides important operational or audit context.

---

## 30. Documentation Lifecycle

Documents SHOULD have lifecycle states such as:

- draft
- active
- deprecated
- superseded
- archived

Obsolete documentation SHOULD be archived or removed rather than left ambiguous.

---

## 31. Superseding Documentation

When a document is superseded:

- the old document SHOULD identify its replacement
- the new document SHOULD identify what it replaces where useful
- references SHOULD be updated
- authority SHALL be unambiguous

Multiple conflicting "current" documents are a governance defect.

---

## 32. Documentation Review

Material documentation SHALL be reviewed when relevant system changes occur.

Review triggers MAY include:

- architecture changes
- API changes
- schema changes
- infrastructure changes
- security changes
- deployment changes
- operational changes
- major feature changes

Documentation SHALL NOT depend exclusively on calendar-based review.

---

## 33. Scheduled Documentation Review

Critical operational documentation SHOULD also receive periodic review.

Review frequency SHALL reflect:

- system risk
- change frequency
- operational importance
- compliance requirements

A yearly review is insufficient for a rapidly changing critical system if changes occur weekly.

---

## 34. Documentation During Development

Documentation changes SHOULD occur in the same engineering change as the behavior they describe when practical.

Examples:

- API change → API documentation update
- architecture change → ADR/architecture update
- operational change → runbook update
- deployment change → deployment documentation update

Do not defer documentation indefinitely.

---

## 35. Definition of Done

A change is not fully complete when required documentation remains knowingly inaccurate.

The relevant definition of done SHOULD include:

- implementation
- tests
- documentation
- operational updates
- migration guidance
- release notes where required

The required documentation scope SHALL be proportional to change impact.

---

## 36. Documentation in Code Review

REV-009 review SHALL consider documentation impact.

Reviewers SHOULD ask:

- Did behavior change?
- Did an API contract change?
- Did architecture change?
- Did operational behavior change?
- Did deployment behavior change?
- Did user/developer instructions change?
- Does an ADR need updating?
- Does a runbook need updating?

---

## 37. Documentation and Release Management

Material releases SHOULD include documentation changes where necessary.

Release documentation MAY include:

- user-visible changes
- migration requirements
- configuration changes
- operational changes
- known limitations
- rollback considerations

Release documentation SHALL not claim functionality that is not actually released.

---

## 38. Documentation and Incidents

Incidents SHOULD produce documentation updates when they reveal:

- missing runbooks
- incorrect procedures
- undocumented architecture
- unclear ownership
- missing operational signals
- misunderstood failure behavior

An incident is evidence about documentation quality as well as system behavior.

---

## 39. Post-Incident Documentation

Post-incident records SHOULD preserve:

- impact
- timeline
- detection
- diagnosis
- mitigation
- recovery
- root/contributing causes
- corrective actions
- documentation gaps

Sensitive information SHALL be handled according to SEC-007.

---

## 40. Documentation Accessibility

Important engineering documentation SHOULD be easy for authorized engineers to locate.

Avoid critical knowledge spread across:

- private chat messages
- individual notes
- undocumented tickets
- inaccessible personal storage
- ephemeral AI conversations

The system of record SHOULD be obvious.

---

## 41. Documentation Searchability

Documentation SHOULD use:

- descriptive titles
- consistent terminology
- predictable structure
- stable references
- meaningful headings

Important documents SHOULD be discoverable without knowing the original author's wording.

---

## 42. Documentation Links and References

References SHALL be maintained where practical.

Broken links to critical documentation SHALL be corrected.

References SHOULD prefer stable identifiers over fragile locations where appropriate.

---

## 43. Documentation Security

Documentation SHALL follow SEC-007.

Do not include:

- passwords
- private keys
- access tokens
- secrets
- unnecessary personal information
- sensitive production data

Documentation containing sensitive architectural or operational information SHALL have appropriate access controls.

---

## 44. External Documentation

External documentation MAY be referenced when:

- the external source is authoritative
- the reference is stable
- the dependency is intentional

Critical internal procedures SHALL NOT depend entirely on external documentation that may change or disappear.

Record enough internal context to operate the system safely.

---

## 45. Documentation Dependencies

If documentation depends on:

- generated schemas
- diagrams
- external specifications
- vendor documentation
- repositories
- configuration

the dependency SHOULD be identifiable.

Critical dependencies SHOULD have a fallback or locally preserved operational explanation.

---

## 46. Documentation Quality

Good documentation should be:

- correct
- relevant
- concise enough to use
- sufficiently detailed
- discoverable
- maintained
- authoritative
- actionable

Documentation does not need to be long to be useful.

---

## 47. Documentation Anti-Patterns

### Documentation theater

Creating documents solely to satisfy a checklist without preserving useful knowledge.

### Stale source of truth

Maintaining a document that everyone knows is incorrect.

### Duplicate authority

Keeping multiple documents that claim to define the same behavior.

### Commenting obvious code

Using comments to repeat what clear code already expresses.

### Giant README

Putting architecture, operations, API contracts, onboarding, and troubleshooting into one unmaintainable document.

### Tribal knowledge

Relying on one engineer's memory for critical procedures.

### AI-generated fiction

Accepting generated documentation without verifying it against the implementation.

### Screenshot dependence

Using screenshots as the only explanation of a dynamic system.

### Undocumented exceptions

Allowing operational workarounds to become permanent without documenting the reason and risk.

### Documentation afterthought

Treating documentation as a separate project rather than part of the change lifecycle.

---

## 48. AI-Assisted Documentation

AI-generated documentation SHALL comply with AI-010.

AI MAY assist with:

- summarization
- restructuring
- first drafts
- examples
- cross-references
- documentation extraction

AI-generated documentation SHALL be verified against authoritative sources.

AI SHALL NOT be treated as an authoritative source for:

- architecture
- requirements
- security controls
- API behavior
- infrastructure
- operational procedures

unless those claims are independently verified.

---

## 49. AI Documentation Risks

Reviewers SHOULD specifically check for:

- invented APIs
- invented configuration
- nonexistent files
- incorrect commands
- outdated dependencies
- false architecture descriptions
- fabricated behavior
- missing edge cases
- incorrect security claims
- copied obsolete context

Generated prose can be grammatically correct while technically false.

---

## 50. Documentation Readiness Gate

Before production approval:

### Authority

- [ ] Important documents have identified owners.
- [ ] Sources of truth are explicit.
- [ ] Conflicting documentation has been resolved.

### Accuracy

- [ ] Documentation matches current behavior.
- [ ] API documentation matches contracts.
- [ ] Architecture documentation reflects current boundaries.
- [ ] Operational procedures are current.

### Operations

- [ ] Critical runbooks exist.
- [ ] Recovery procedures are documented.
- [ ] Ownership/escalation paths are documented.

### Lifecycle

- [ ] Obsolete documents are marked or archived.
- [ ] Material changes update affected documentation.
- [ ] Version-sensitive documentation is identified.

### Security

- [ ] Secrets are absent.
- [ ] Sensitive documentation has appropriate access control.
- [ ] Security-sensitive claims are verified.

### AI

- [ ] AI-generated documentation has been verified.
- [ ] Generated claims have authoritative sources.

---

## 51. Automatic Production Blockers

Production SHALL be blocked when:

- critical operational procedures exist only as undocumented tribal knowledge
- required runbooks are absent
- documentation materially contradicts production behavior for a critical workflow
- source-of-truth conflicts can cause incorrect engineering decisions
- required migration/recovery procedures are undocumented
- critical API behavior is undocumented when consumers depend on it
- required security documentation is absent
- AI-generated documentation contains unverified critical claims
- production-critical ownership or escalation information is unavailable

---

## 52. Reviewer Checklist

A reviewer or SGE SHOULD verify:

- [ ] Documentation impact was assessed.
- [ ] Relevant requirements were updated.
- [ ] Architecture/ADR documentation was updated where necessary.
- [ ] API documentation matches implementation.
- [ ] Database/infrastructure documentation is consistent.
- [ ] Runbooks are updated for operational changes.
- [ ] Documentation has clear ownership.
- [ ] Source of truth is explicit.
- [ ] Obsolete documentation is handled.
- [ ] Links/references are valid.
- [ ] No secrets or sensitive data are exposed.
- [ ] AI-generated documentation was verified.
- [ ] Production procedures are actionable.

---

## 53. Relationship to Other Standards

DOC-016 complements:

- GOV-000 — Engineering Governance Constitution
- REQ-001 — Requirements Engineering Standard
- ARC-002 — Architecture & System Design Standard
- BE-003 — Backend Engineering Standard
- FE-004 — Frontend Engineering Standard
- DB-005 — Database Engineering Standard
- API-006 — API Governance Standard
- SEC-007 — Security Engineering Standard
- QA-008 — Testing & Quality Engineering Standard
- REV-009 — Code Review Standard
- AI-010 — AI-Assisted Development Standard
- GIT-011 — Git & Version Control Standard
- CICD-012 — CI/CD Standard
- INFRA-013 — Infrastructure & Environment Standard
- OBS-014 — Observability Standard
- PERF-015 — Performance Engineering Standard

DOC-016 governs **the preservation and maintenance of engineering knowledge**.

It does not replace the technical standards that define the content being documented.

---

## 54. Exceptions

Exceptions to DOC-016 require an explicit engineering exception under EXC-021.

The exception SHALL document:

- missing documentation
- reason
- affected knowledge
- operational risk
- compensating controls
- owner
- expiration/review date

"Everyone already knows this" is not sufficient justification for leaving critical knowledge undocumented.

---

## 55. Change Control

Documentation SHALL be reassessed when changes materially affect:

- requirements
- architecture
- APIs
- data
- infrastructure
- security
- testing
- deployment
- operations
- user workflows

Documentation changes SHOULD be included in the same change lifecycle as the behavior they describe.

---

## 56. Sign-Off

**System:** ____________________  
**Documentation scope:** ____________________  
**Owner:** ____________________  
**Source-of-truth references:** ____________________  
**Architecture documentation:** ____________________  
**Operational/runbook documentation:** ____________________  
**Security review:** ____________________  
**AI-generated content verification:** ____________________  
**Known documentation gaps:** ____________________  
**Production decision:** GO / GO WITH CONDITIONS / NO-GO  
**Reviewer:** ____________________  
**Approval date:** ____________________

---

## 57. Final Principle

> **Documentation is successful when another authorized engineer can understand, change, operate, or recover the system without depending on undocumented tribal knowledge.**

The knowledge chain is:

**decision → implementation → evidence → documentation → maintenance → institutional knowledge**

**Document what matters. Make authority explicit. Keep it truthful. Update it with the system.**
