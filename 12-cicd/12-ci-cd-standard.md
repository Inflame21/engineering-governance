# CICD-012 — CI/CD Standard

**Status:** Published  
**Standard ID:** CICD-012  
**Applies to:** All software delivery pipelines, automated validation, build systems, artifact workflows, environment promotion, deployment automation, and production delivery processes governed by this framework.

---

## 1. Purpose

CICD-012 defines the engineering requirements for Continuous Integration and Continuous Delivery/Deployment.

CI/CD is not merely automation for running tests or deploying applications. It is an **engineering enforcement mechanism** that turns governance requirements into repeatable, auditable controls.

A production-grade pipeline should make the safe path the easiest path.

> **If a quality gate matters, the delivery system should enforce it rather than relying entirely on memory or manual discipline.**

---

## 2. Scope

This standard governs:

- continuous integration
- build pipelines
- validation pipelines
- automated testing
- static analysis
- type checking
- linting
- dependency and supply-chain checks
- security scanning
- artifact creation
- artifact integrity
- artifact storage
- environment promotion
- deployment automation
- approvals
- configuration management
- secrets handling
- database migration execution
- rollback
- deployment verification
- release traceability
- pipeline permissions
- pipeline failure handling
- pipeline observability
- CI/CD recovery
- AI-generated pipeline configuration

This standard is technology-neutral. Specific implementation guidance MAY be defined by platform or infrastructure profiles.

---

## 3. CI/CD Principles

### 3.1 Automation Enforces Governance

CI/CD SHALL enforce applicable engineering gates wherever practical.

Examples:

- tests
- static analysis
- type checking
- security scanning
- dependency validation
- artifact validation
- branch protection
- deployment approvals

Manual processes MAY supplement automation but SHOULD NOT be the only control for high-risk requirements.

### 3.2 Build Once, Promote the Same Artifact

Where practical, the exact artifact validated in CI SHALL be the artifact promoted through environments.

Do not rebuild independently for:

- staging
- production
- rollback

when doing so can produce a materially different artifact.

### 3.3 Immutable Delivery

Production deployments SHOULD reference immutable:

- source commits
- artifacts
- container images
- packages
- release identifiers

Mutable references such as an unpinned latest image SHOULD NOT be used for production delivery.

### 3.4 Fail Closed

When a mandatory production gate cannot be evaluated reliably, the default behavior SHALL be to block progression rather than silently continue.

---

## 4. Pipeline Lifecycle

A typical pipeline SHOULD follow a progression similar to:

Repository Change
→ Validation
→ Build
→ Test
→ Security/Quality Gates
→ Artifact Creation
→ Artifact Verification
→ Environment Deployment
→ Deployment Verification
→ Promotion Approval
→ Production Deployment
→ Post-Deployment Verification
→ Observability

Not every project requires identical stages, but every material stage SHALL have an intentional purpose.

---

## 5. Pipeline Stages

### 5.1 Source Validation

Validate:

- repository state
- branch/commit
- configuration syntax
- required metadata
- changed files
- generated artifacts where applicable

### 5.2 Static Validation

Run applicable:

- linting
- formatting checks
- type checking
- static analysis
- schema validation
- dependency checks

### 5.3 Testing

Execute the test strategy defined by QA-008.

Depending on risk, this may include:

- unit tests
- component tests
- integration tests
- contract tests
- API tests
- database tests
- E2E tests
- security tests
- accessibility tests
- performance tests

### 5.4 Build

The build SHALL be:

- reproducible where practical
- deterministic where practical
- attributable to a source commit
- validated before promotion

### 5.5 Artifact Creation

Artifacts MAY include:

- container images
- application bundles
- packages
- binaries
- deployment manifests
- infrastructure packages

Artifacts SHALL have identifiable provenance.

### 5.6 Deployment

Deployment SHALL use controlled mechanisms appropriate to the environment.

### 5.7 Verification

After deployment, verify relevant:

- health checks
- startup behavior
- critical endpoints
- migrations
- dependencies
- smoke tests
- functional behavior
- metrics/logs
- error rates

A deployment is not successful merely because the deployment command returned success.

---

## 6. CI Quality Gates

For material application changes, CI SHALL enforce applicable gates.

Minimum expected gates include:

- successful build
- required tests
- required static checks
- dependency validation
- security checks appropriate to risk

Projects MAY add stricter gates based on:

- system criticality
- regulatory requirements
- deployment risk
- architecture
- data sensitivity

---

## 7. Required Checks

Required checks SHALL be defined explicitly.

A required check SHALL:

- have a clear purpose
- produce deterministic or understood results
- fail when its required condition is not satisfied
- be visible to reviewers
- be maintainable

Avoid creating checks that exist only to produce green status indicators.

---

## 8. Test Execution

CI SHALL run the tests required by QA-008.

Tests SHALL be categorized where practical so failures can be understood quickly.

Examples:

- unit
- integration
- contract
- E2E
- security
- performance

### Flaky Tests

Known flaky tests SHALL NOT be silently ignored.

Teams SHALL:

- identify the flaky test
- track it
- determine whether it is blocking
- fix or quarantine it intentionally
- avoid using permanent quarantine as a substitute for remediation

---

## 9. Static Analysis and Type Safety

Where applicable, CI SHOULD enforce:

- linting
- type checking
- static analysis
- formatting consistency
- schema validation

Warnings that can materially affect correctness SHOULD NOT be routinely ignored.

Projects SHALL define which warnings are acceptable and which are release-blocking.

---

## 10. Security Gates

CI/CD SHALL integrate applicable security controls from SEC-007.

Depending on risk, this MAY include:

- secret scanning
- dependency vulnerability scanning
- software composition analysis
- static application security testing
- container scanning
- infrastructure scanning
- configuration scanning
- license checks

Security gate severity SHALL be defined explicitly.

Critical unresolved security findings SHALL block production unless an authorized exception exists.

---

## 11. Dependency and Supply-Chain Controls

CI SHOULD validate:

- lockfile consistency
- dependency integrity
- unexpected dependency changes
- known vulnerabilities
- prohibited packages
- license constraints
- artifact provenance where supported

Builds SHOULD be reproducible from declared dependencies.

Dependency resolution SHALL NOT silently change production dependencies between deployments.

---

## 12. Secret Management

CI/CD systems SHALL NOT store production secrets in source control.

Secrets SHOULD be supplied through an approved secret-management mechanism.

Pipeline logs SHALL be protected against accidental secret disclosure.

Avoid commands that print:

- environment variables
- credentials
- tokens
- private keys
- connection strings containing secrets

Secret access SHALL follow least privilege.

---

## 13. Pipeline Permissions

CI/CD identities SHALL follow least privilege.

A build job that only compiles code SHOULD NOT have:

- production database access
- production deployment credentials
- broad cloud administrator privileges
- unrestricted repository administration

Separate permissions SHOULD exist for:

- build
- test
- artifact publication
- staging deployment
- production deployment

High-risk credentials SHOULD be short-lived where practical.

---

## 14. Environment Separation

Environments SHALL have intentional boundaries.

Typical environments include:

- local
- development
- test
- staging
- production

Production credentials SHALL NOT be unnecessarily available to lower environments.

Lower-environment changes SHALL NOT silently mutate production resources.

Environment configuration SHALL be explicit and auditable.

---

## 15. Environment Promotion

Promotion SHALL be controlled.

A typical flow may be:

Development
→ Test
→ Staging
→ Production

Promotion criteria SHALL be defined according to risk.

Do not promote merely because:

- the previous environment is green
- the deployment command succeeded
- the pipeline completed
- the application started

Promotion SHALL consider validation evidence.

---

## 16. Build Once, Promote Many

For applications where artifact promotion is practical:

1. build the artifact once
2. test the artifact
3. store the artifact immutably
4. deploy the same artifact to staging
5. validate
6. promote the same artifact to production

This reduces differences between tested and deployed software.

---

## 17. Artifact Integrity and Provenance

Production artifacts SHALL be traceable to:

- source commit
- build execution
- dependency state where applicable
- pipeline version
- release identifier where applicable

Artifacts SHOULD have:

- immutable identifiers
- checksums or digests
- retention policy
- access controls

Container images SHOULD be deployed by immutable digest where practical.

---

## 18. Database Migrations

Database migrations SHALL be treated as deployment changes, not ordinary application startup side effects.

Pipeline controls SHALL consider:

- migration ordering
- compatibility
- transaction behavior
- locking
- duration
- failure handling
- rollback strategy
- expand/contract requirements

Production migration execution SHALL be controlled.

A deployment SHALL NOT automatically run destructive migrations merely because application startup requires a database connection.

---

## 19. Deployment Strategies

Deployment strategy SHALL match system risk.

Possible strategies include:

- rolling deployment
- blue/green
- canary
- recreate
- feature-flagged rollout
- controlled batch deployment

Selection SHOULD consider:

- availability requirements
- rollback speed
- data compatibility
- traffic volume
- failure blast radius

---

## 20. Deployment Approvals

High-risk production deployments SHOULD require explicit approval.

Approval SHALL be based on evidence, not merely pipeline completion.

The approver SHOULD be able to identify:

- exact artifact
- source commit
- validation results
- known risks
- migration impact
- rollback method

Approval SHALL NOT be delegated to an automated system merely because the deployment is routine.

---

## 21. Production Deployment

Production deployment SHALL:

- use an identified artifact
- use controlled credentials
- preserve deployment provenance
- emit deployment evidence
- support post-deployment verification
- have a recovery path

Production deployment scripts SHALL be version-controlled.

Manual production changes SHOULD be minimized.

---

## 22. Post-Deployment Verification

A deployment SHALL be considered incomplete until relevant verification passes.

Verification MAY include:

- health checks
- smoke tests
- API checks
- UI checks
- database checks
- dependency checks
- error-rate checks
- latency checks
- application metrics
- logs
- business-critical transaction checks

The verification strategy SHALL reflect the system's failure modes.

---

## 23. Rollback

Every material production deployment SHALL have a recovery strategy.

Rollback MAY mean:

- reverting application version
- redeploying a previous artifact
- rolling forward with a corrective release
- disabling a feature
- restoring infrastructure configuration

Rollback SHALL account for non-code state.

Do not claim that a deployment is safely reversible if:

- database migrations are irreversible
- external side effects cannot be undone
- data transformations are destructive
- dependent systems cannot accept the previous version

---

## 24. Forward Fix vs Rollback

Teams SHALL distinguish between:

**Rollback**

Returning to a known-good prior state.

**Roll-forward**

Deploying a corrective version when rollback is unsafe or insufficient.

The pipeline and operational documentation SHOULD define which strategy applies to each class of failure.

---

## 25. Failure Handling

Pipeline failures SHALL be visible and actionable.

A failed mandatory gate SHALL prevent dependent production stages from proceeding.

Avoid:

- ignoring failed commands
- converting errors to warnings without policy
- swallowing test failures
- allowing deployment after failed security gates
- treating unavailable checks as success

---

## 26. Pipeline Reliability

CI/CD itself is production-critical engineering infrastructure.

Teams SHOULD monitor:

- pipeline success rate
- pipeline duration
- queue time
- flaky checks
- deployment frequency
- deployment failure rate
- rollback frequency
- infrastructure failures
- dependency/service outages

A pipeline that frequently fails for unrelated reasons becomes a governance liability because teams eventually learn to bypass it.

---

## 27. Pipeline Performance

Pipeline performance SHOULD be optimized without weakening quality gates.

Appropriate techniques include:

- caching
- parallel execution
- incremental builds
- test partitioning
- artifact reuse
- dependency caching
- selective expensive validation where risk allows

Do not optimize by removing meaningful validation.

---

## 28. CI/CD Configuration as Code

Pipeline configuration SHALL be version-controlled.

Changes to pipeline definitions SHALL receive code review appropriate to their impact.

Production-impacting pipeline changes SHALL be treated as high-risk.

Pipeline configuration SHOULD be tested or validated before use.

---

## 29. Pipeline Change Security

Changes to CI/CD configuration can modify the trust boundary of the entire repository.

Review SHALL consider:

- new permissions
- secret access
- external actions
- downloaded scripts
- shell execution
- artifact publication
- deployment credentials
- repository write access
- dependency installation
- untrusted pull-request execution

A pipeline change can be a security change even when no application source code changes.

---

## 30. Third-Party Actions and Build Tools

Third-party pipeline components SHALL be evaluated before adoption.

Evaluate:

- source
- maintenance
- version pinning
- permissions
- supply-chain risk
- credentials required
- network access
- data handling

Where practical, third-party actions SHOULD be pinned to immutable versions or commit references.

Avoid executing arbitrary remote scripts without verification.

---

## 31. Pull Request Pipelines

Pull-request workflows SHALL be designed with untrusted input in mind.

Do not expose high-privilege secrets to untrusted pull-request code unless the security model explicitly permits it.

Pipeline code SHALL assume that repository content can be modified by contributors and, where applicable, malicious actors.

This is particularly important for:

- fork-based workflows
- dependency installation
- arbitrary script execution
- code generation
- deployment previews

---

## 32. Release Traceability

A production deployment SHALL be traceable through:

Source Commit
→ CI Run
→ Artifact
→ Environment Validation
→ Approval
→ Production Deployment

The exact implementation may vary, but the chain SHALL be reconstructable.

---

## 33. AI-Generated CI/CD Configuration

AI-generated pipeline configuration SHALL follow AI-010.

AI-generated CI/CD changes SHALL receive heightened review because generated configuration can accidentally:

- expose secrets
- grant excessive permissions
- skip validation
- disable security checks
- deploy unintended branches
- execute arbitrary code
- alter production environments

AI SHALL NOT be allowed to silently weaken mandatory pipeline gates.

---

## 34. CI/CD Quality Gate

Before a production-capable pipeline is approved:

### Source

- [ ] Repository and branch triggers are correct.
- [ ] Untrusted inputs are handled safely.
- [ ] Required review controls are preserved.

### Validation

- [ ] Required tests execute.
- [ ] Static/type checks execute where applicable.
- [ ] Security checks execute where required.
- [ ] Failure states fail the pipeline correctly.

### Build

- [ ] Build is reproducible where practical.
- [ ] Artifact provenance is available.
- [ ] Dependencies are controlled.
- [ ] Artifacts are immutable or appropriately versioned.

### Deployment

- [ ] Environment boundaries are enforced.
- [ ] Credentials follow least privilege.
- [ ] Production deployment is controlled.
- [ ] Required approvals are enforced.

### Operations

- [ ] Post-deployment verification exists.
- [ ] Rollback or roll-forward strategy exists.
- [ ] Deployment evidence is retained.
- [ ] Pipeline failures are observable.

---

## 35. Automatic Production Blockers

Production delivery SHALL be blocked when:

- mandatory tests fail
- mandatory security checks fail
- required quality gates were bypassed
- the deployed artifact cannot be identified
- production artifact provenance is missing
- production credentials are improperly exposed
- pipeline permissions exceed approved scope without authorization
- production deployment occurs from an unauthorized source
- required approval is missing
- a critical migration has no validated execution strategy
- rollback/recovery requirements are absent for a material deployment
- CI/CD configuration introduces an unresolved critical security issue
- a required validation system is unavailable and policy requires fail-closed behavior
- deployment verification fails
- the pipeline cannot reliably determine what will be deployed

---

## 36. CI/CD Anti-Patterns

### Green pipeline theater

Making checks pass by weakening or bypassing the checks.

### Build twice, deploy differently

Rebuilding independently for production after validating another artifact.

### Latest-tag production

Deploying mutable artifact references that can change without a new release.

### Secret-in-pipeline

Hardcoding credentials into workflow configuration.

### Privileged build agents

Giving normal build jobs production-level permissions.

### Silent failure

Ignoring errors so the pipeline remains green.

### Manual production drift

Making production changes outside the controlled delivery path.

### Unreviewed pipeline changes

Allowing CI/CD configuration to bypass normal code review.

### AI-generated pipeline trust

Accepting generated workflows without inspecting permissions, secrets, commands, and gates.

### Permanent flaky-test quarantine

Using quarantine indefinitely instead of fixing unreliable validation.

---

## 37. Reviewer Checklist

A reviewer or SGE SHOULD verify:

- [ ] Pipeline stages have explicit purposes.
- [ ] Required quality gates are enforced.
- [ ] Failures block dependent stages appropriately.
- [ ] Secrets are not exposed.
- [ ] Pipeline identities use least privilege.
- [ ] Third-party actions are controlled.
- [ ] Artifacts are identifiable and immutable where practical.
- [ ] Source-to-artifact provenance is preserved.
- [ ] Environment separation is correct.
- [ ] Production approval controls exist where required.
- [ ] Database migrations are controlled.
- [ ] Post-deployment verification exists.
- [ ] Rollback/roll-forward strategy is documented.
- [ ] Pipeline configuration changes are reviewed.
- [ ] AI-generated pipeline changes comply with AI-010.

---

## 38. Relationship to Other Standards

CICD-012 complements:

- GOV-000 — Engineering Governance Constitution
- ARC-002 — Architecture & System Design Standard
- SEC-007 — Security Engineering Standard
- QA-008 — Testing & Quality Engineering Standard
- REV-009 — Code Review Standard
- AI-010 — AI-Assisted Development Standard
- GIT-011 — Git & Version Control Standard

CICD-012 governs the **automated enforcement and delivery path**.

It does not replace:

- requirements governance
- architecture review
- application testing
- security engineering
- release management
- production readiness
- incident management

---

## 39. Exceptions

Exceptions to CICD-012 require an explicit engineering exception under EXC-021.

The exception SHALL document:

- requested deviation
- reason
- affected pipeline/environment
- risk
- compensating controls
- owner
- expiration/review date

Deployment convenience is not sufficient justification for bypassing mandatory quality or security gates.

---

## 40. Change Control

Changes to CI/CD governance SHALL be reviewed when they materially affect:

- quality gates
- security gates
- deployment permissions
- production approvals
- artifact provenance
- environment boundaries
- rollback
- auditability
- pipeline trust boundaries

CI/CD should evolve as controlled engineering infrastructure.

---

## 41. Sign-Off

**Repository / System:** ____________________  
**Pipeline:** ____________________  
**Source reference:** ____________________  
**Artifact reference:** ____________________  
**Environment(s):** ____________________  
**Reviewer:** ____________________  
**Security validation:** ____________________  
**Testing validation:** ____________________  
**Deployment verification:** ____________________  
**Rollback reference:** ____________________  
**Production decision:** GO / GO WITH CONDITIONS / NO-GO  
**Approval date:** ____________________

---

## 42. Final Principle

> **CI/CD is an automated engineering control system, not a collection of deployment scripts.**

A trustworthy delivery pipeline preserves:

**source → validation → build → artifact → promotion → deployment → verification → recovery**

The pipeline should make unsafe delivery difficult, safe delivery repeatable, and production decisions auditable.

**Automate the gates. Build once. Promote deliberately. Fail closed. Preserve provenance.**
