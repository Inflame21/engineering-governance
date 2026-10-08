# INFRA-013 — Infrastructure & Environment Standard

**Status:** Published  
**Standard ID:** INFRA-013  
**Applies to:** All infrastructure, environments, runtime platforms, networks, compute resources, storage, managed services, infrastructure-as-code, cloud resources, and environment configuration governed by this framework.

---

## 1. Purpose

INFRA-013 defines the engineering requirements for designing, provisioning, securing, operating, changing, and recovering software infrastructure.

Infrastructure is part of the production system. Application code cannot be considered production-ready when the infrastructure supporting it is undocumented, uncontrolled, insecure, or unrecoverable.

> **Infrastructure is software with physical, financial, security, and operational consequences.**

---

## 2. Scope

This standard governs:

- environment topology
- compute
- containers
- orchestration
- networking
- DNS
- load balancing
- storage
- databases and managed services
- identity and access management
- secrets
- configuration
- infrastructure-as-code
- infrastructure dependencies
- environment parity
- resource sizing
- availability
- resilience
- disaster recovery
- backups
- restoration
- capacity
- scaling
- cost governance
- infrastructure security
- infrastructure observability
- infrastructure testing
- infrastructure change management
- infrastructure rollback
- AI-assisted infrastructure work

This standard is technology-neutral. Cloud-provider, operating-system, container, orchestration, and IaC-specific profiles MAY define implementation details.

---

## 3. Infrastructure Principles

### 3.1 Infrastructure Is an Engineering Boundary

Infrastructure SHALL be designed as part of the system architecture.

Infrastructure decisions SHALL consider:

- application requirements
- availability
- security
- performance
- scalability
- data requirements
- operational constraints
- cost
- recovery objectives

### 3.2 Infrastructure Must Be Reproducible

Production infrastructure SHOULD be reproducible from version-controlled definitions wherever practical.

Manual infrastructure changes SHOULD be minimized.

### 3.3 Least Privilege

Infrastructure access SHALL follow least privilege.

Users, services, agents, and automation SHALL receive only the permissions required for their responsibilities.

### 3.4 Explicit Environment Boundaries

Production SHALL be isolated from lower environments according to system risk.

Development convenience SHALL NOT justify unsafe production access.

### 3.5 Design for Failure

Infrastructure SHALL assume that:

- instances fail
- networks fail
- disks fail
- providers fail
- credentials expire
- deployments fail
- dependencies become unavailable
- capacity is exhausted

Failure behavior SHALL be intentional.

---

## 4. Environment Model

Projects SHALL define their environment model.

Typical environments include:

- local
- development
- test
- staging
- production

Additional environments MAY exist for:

- previews
- performance testing
- disaster recovery
- migration testing
- regulated workloads

Each environment SHALL have a documented purpose.

Avoid environments that exist only because they were historically created.

---

## 5. Environment Isolation

Production SHALL have appropriate isolation from non-production environments.

Isolation MAY include:

- separate accounts/projects/subscriptions
- separate networks
- separate credentials
- separate databases
- separate storage
- separate identities
- separate deployment permissions

The required isolation level SHALL reflect risk.

Production data SHALL NOT be copied into lower environments without appropriate authorization and protection.

---

## 6. Environment Parity

Environments SHOULD be sufficiently similar to expose production-relevant defects before production.

Differences SHALL be intentional and documented.

Important differences include:

- runtime versions
- operating systems
- database versions
- network topology
- authentication configuration
- feature flags
- resource limits
- dependency versions
- infrastructure services

"Works in staging" is weak evidence if staging is materially different from production.

---

## 7. Infrastructure Inventory

Material infrastructure SHALL be identifiable.

The team SHOULD maintain an inventory of:

- compute resources
- networks
- load balancers
- storage
- databases
- queues
- caches
- object stores
- DNS
- certificates
- identity resources
- external services
- monitoring systems
- deployment resources

Ownership and environment SHOULD be identifiable.

Unknown infrastructure is an operational risk.

---

## 8. Infrastructure Architecture

Infrastructure architecture SHALL document important:

- trust boundaries
- network boundaries
- data flows
- public exposure
- internal services
- ingress
- egress
- dependencies
- availability zones/regions where applicable
- failure domains

Architecture documentation SHALL identify critical infrastructure dependencies.

---

## 9. Compute

Compute resources SHALL be selected according to:

- workload characteristics
- CPU requirements
- memory requirements
- storage requirements
- network requirements
- availability
- scaling requirements
- cost
- operational complexity

Resource limits SHOULD be explicit.

Unbounded resource consumption SHALL be avoided.

---

## 10. Containers

Where containers are used:

- images SHALL be reproducible where practical
- images SHOULD use immutable identifiers
- base images SHALL be maintained
- unnecessary packages SHOULD be excluded
- containers SHOULD run with least privilege
- secrets SHALL NOT be baked into images
- runtime configuration SHALL be externalized
- image vulnerabilities SHALL be monitored
- container health behavior SHALL be defined

Container images SHALL be treated as production artifacts.

---

## 11. Orchestration

Where orchestration platforms are used, workloads SHALL define appropriate:

- resource requests
- resource limits
- health checks
- restart behavior
- rollout strategy
- identity
- network policy
- configuration
- secret references

Cluster-level administrative access SHALL be restricted.

---

## 12. Networking

Network architecture SHALL define:

- public entry points
- private networks
- ingress
- egress
- service-to-service communication
- security boundaries
- DNS
- load balancing
- firewall/security rules

Network access SHALL be deny-by-default where practical.

Avoid exposing internal services directly to the public internet unless explicitly required.

---

## 13. Ingress and Public Exposure

Every publicly exposed service SHALL have a documented reason.

Public exposure SHALL consider:

- authentication
- authorization
- TLS
- rate limiting
- input validation
- abuse protection
- logging
- monitoring
- attack surface

Unused public endpoints SHALL be removed or restricted.

---

## 14. Egress Control

Outbound connectivity SHALL be governed according to risk.

Consider:

- allowed destinations
- external APIs
- package registries
- data exfiltration paths
- DNS
- third-party services

Highly sensitive environments SHOULD restrict unnecessary outbound access.

---

## 15. DNS and Certificates

DNS configuration SHALL be controlled and documented.

Certificates SHALL have:

- ownership
- expiration monitoring
- renewal strategy
- appropriate key protection

Certificate expiration SHALL NOT be discovered by production users.

---

## 16. Storage

Storage SHALL be designed according to:

- durability
- availability
- access patterns
- capacity
- retention
- encryption
- backup
- recovery
- deletion requirements

Temporary and persistent storage SHALL be distinguished.

Storage lifecycle policies SHOULD be defined for data with finite retention.

---

## 17. Infrastructure Data Services

Managed infrastructure services such as:

- databases
- caches
- queues
- object storage
- search systems

SHALL have explicit:

- ownership
- environment
- configuration
- access controls
- backup/recovery expectations
- monitoring
- capacity expectations

Infrastructure configuration SHALL complement DB-005 rather than replace database governance.

---

## 18. Identity and Access Management

Infrastructure IAM SHALL follow least privilege.

Access SHOULD be separated by:

- human users
- services
- automation
- deployment systems
- administrators

Avoid shared administrative credentials.

Privileged access SHOULD use stronger authentication and shorter-lived credentials where practical.

Access SHALL be reviewed periodically.

---

## 19. Service Identity

Services SHOULD authenticate using workload or service identities rather than embedded credentials.

Service identities SHALL have only the permissions required for their function.

Unused service identities SHALL be disabled or removed.

---

## 20. Secrets Management

Secrets SHALL be stored in approved secret-management mechanisms.

Secrets SHALL NOT be:

- committed to repositories
- embedded in container images
- hardcoded in infrastructure definitions
- printed into logs
- copied unnecessarily between environments

Secret rotation SHALL be supported where practical.

Infrastructure access to secrets SHALL be auditable.

---

## 21. Configuration Management

Configuration SHALL distinguish between:

- application configuration
- infrastructure configuration
- environment configuration
- secrets
- generated state

Configuration SHOULD be version-controlled where it is not sensitive or environment-secret-specific.

Configuration precedence SHALL be explicit.

Avoid undocumented configuration that exists only in a production console.

---

## 22. Infrastructure as Code

Infrastructure-as-code SHOULD be the default for material infrastructure.

IaC SHALL provide:

- version control
- review
- repeatability
- change traceability
- environment consistency

IaC changes SHALL follow GIT-011, REV-009, SEC-007, and CICD-012.

Manual changes SHALL be reconciled into source-controlled definitions.

---

## 23. Infrastructure State

Where infrastructure tooling maintains state:

- state SHALL be protected
- access SHALL be restricted
- locking/concurrency SHALL be controlled
- backups SHALL exist where appropriate
- secrets SHALL be handled safely

Infrastructure state SHALL NOT be treated as disposable if it represents authoritative resource relationships.

---

## 24. Infrastructure Drift

Teams SHALL detect meaningful infrastructure drift.

Drift includes differences between:

- declared infrastructure
- deployed infrastructure
- approved configuration

Unexpected drift SHALL be investigated.

Do not permanently solve drift by changing source definitions to match an unauthorized manual change without understanding why the change occurred.

---

## 25. Infrastructure Change Management

Material infrastructure changes SHALL be reviewed before production application.

Review SHALL consider:

- affected resources
- blast radius
- security
- availability
- cost
- compatibility
- migration
- rollback
- dependency impact

Emergency changes SHALL be documented after stabilization.

---

## 26. High-Risk Infrastructure Changes

High-risk changes include:

- IAM changes
- public network exposure
- firewall changes
- production database changes
- destructive resource changes
- encryption changes
- DNS changes
- certificate changes
- cluster changes
- region changes
- backup configuration changes
- production secret changes

These changes SHALL receive explicit review and appropriate approval.

---

## 27. Availability and Redundancy

Availability architecture SHALL match business requirements.

Where required, consider:

- redundancy
- multiple instances
- multiple zones
- failover
- load balancing
- replicated storage
- dependency redundancy

Do not add redundancy without understanding the actual failure model and operational cost.

---

## 28. Single Points of Failure

Critical systems SHALL identify single points of failure.

For each accepted single point of failure, document:

- component
- failure impact
- expected recovery
- mitigation decision

A single point of failure is not automatically unacceptable, but an unknown one is.

---

## 29. Scaling

Capacity and scaling SHALL be intentional.

Scaling strategy MAY include:

- vertical scaling
- horizontal scaling
- autoscaling
- queue-based scaling
- scheduled scaling
- manual scaling

Scaling policies SHALL account for:

- workload behavior
- limits
- downstream capacity
- cost
- cold starts
- state
- data consistency

---

## 30. Capacity Planning

Critical resources SHOULD have capacity expectations.

Monitor:

- CPU
- memory
- storage
- network
- connection limits
- queue depth
- database capacity
- provider quotas

Teams SHOULD understand what happens when capacity is exhausted.

---

## 31. Resource Quotas and Limits

Resource limits SHOULD be configured to prevent uncontrolled consumption.

Quotas SHOULD be monitored.

Applications and infrastructure SHALL handle quota exhaustion as an expected failure mode where applicable.

---

## 32. Cost Governance

Infrastructure cost SHALL be treated as an engineering constraint.

Teams SHOULD understand:

- major cost drivers
- expected baseline cost
- scaling cost
- storage cost
- network/egress cost
- idle resources
- environment cost

Production infrastructure SHOULD NOT rely on unlimited or unmonitored resource growth.

---

## 33. Backup

Critical data and infrastructure state SHALL have appropriate backup strategies.

Backup requirements SHALL define:

- what is backed up
- frequency
- retention
- storage location
- access control
- encryption
- verification

A backup that has never been restored is an assumption, not evidence.

---

## 34. Restore Testing

Critical backups SHALL be restored periodically according to risk.

Restore testing SHALL verify:

- backup integrity
- restoration procedure
- required dependencies
- recovery time
- recovered data correctness

Restore procedures SHALL be documented.

---

## 35. Disaster Recovery

Critical systems SHALL define disaster-recovery expectations.

At minimum, identify where applicable:

- RPO — Recovery Point Objective
- RTO — Recovery Time Objective
- recovery dependencies
- recovery sequence
- ownership
- communication path
- validation steps

Disaster recovery SHALL be tested at a frequency appropriate to system risk.

---

## 36. Regional and Provider Failure

For systems requiring high availability, consider:

- zone failure
- region failure
- provider service failure
- DNS failure
- identity-provider failure
- external dependency failure

Multi-region architecture SHALL only be adopted when justified by requirements and operational capability.

---

## 37. Infrastructure Security

Infrastructure SHALL follow SEC-007.

Controls SHOULD include:

- least privilege
- network segmentation
- encryption
- secure defaults
- vulnerability management
- hardened images
- patch management
- restricted administration
- security logging
- access reviews

Infrastructure security SHALL not depend solely on application-layer controls.

---

## 38. Patch and Lifecycle Management

Infrastructure components SHALL have lifecycle ownership.

Track where applicable:

- operating systems
- runtimes
- container bases
- managed services
- agents
- infrastructure providers
- orchestration platforms

Unsupported components SHALL have a documented remediation or exception.

---

## 39. Infrastructure Observability

Infrastructure SHALL expose sufficient telemetry to detect:

- resource exhaustion
- failures
- degraded performance
- connectivity problems
- capacity problems
- security events
- deployment issues

Observability requirements SHALL be coordinated with OBS-014.

---

## 40. Infrastructure Testing

Infrastructure SHOULD be tested according to risk.

Testing MAY include:

- IaC validation
- configuration validation
- deployment tests
- smoke tests
- failover tests
- restore tests
- capacity tests
- security tests
- disaster-recovery exercises

Infrastructure changes SHALL NOT rely solely on successful provisioning.

---

## 41. Production Access

Direct production access SHALL be restricted.

Where practical:

- use audited access
- use short-lived credentials
- require stronger authentication
- restrict network paths
- record privileged operations

Production access SHALL be granted according to role and need.

---

## 42. Infrastructure Automation

Infrastructure automation SHALL have:

- bounded permissions
- version-controlled definitions
- observable execution
- failure handling
- ownership
- recovery procedures

Automation SHALL NOT silently ignore failed infrastructure operations.

---

## 43. AI-Assisted Infrastructure

AI-generated infrastructure SHALL comply with AI-010.

AI-generated changes to:

- IAM
- networking
- infrastructure-as-code
- CI/CD
- production configuration
- secrets
- deployment systems

SHALL be treated as high-risk.

AI SHALL NOT receive unrestricted infrastructure credentials merely to simplify development.

Generated infrastructure commands SHALL be verified before execution.

---

## 44. Infrastructure Quality Gate

Before production infrastructure is approved:

### Architecture

- [ ] Environment topology is documented.
- [ ] Trust and network boundaries are understood.
- [ ] Dependencies are identified.
- [ ] Failure domains are understood.

### Security

- [ ] Least privilege is enforced.
- [ ] Public exposure is justified.
- [ ] Secrets are managed securely.
- [ ] Administrative access is controlled.

### Reliability

- [ ] Critical failure modes are understood.
- [ ] Redundancy is appropriate.
- [ ] Backups exist where required.
- [ ] Restore procedures are tested.
- [ ] RPO/RTO are defined where required.

### Delivery

- [ ] Material infrastructure is source-controlled.
- [ ] IaC changes are reviewed.
- [ ] Infrastructure drift is controlled.
- [ ] Production changes are traceable.

### Operations

- [ ] Resource limits are defined.
- [ ] Capacity is understood.
- [ ] Cost drivers are understood.
- [ ] Infrastructure telemetry is available.
- [ ] Recovery procedures are documented.

---

## 45. Automatic Production Blockers

Production infrastructure SHALL be blocked when:

- critical infrastructure has no identified owner
- production access is uncontrolled
- secrets are exposed or embedded insecurely
- required backups do not exist
- critical backups have no restoration evidence
- required environment isolation is absent
- critical infrastructure is deployed without traceable source definitions where IaC is required
- unresolved critical public exposure exists
- required IAM controls are absent
- a material infrastructure change has no rollback or recovery strategy
- destructive infrastructure changes lack authorization
- critical single points of failure are unknown
- required disaster-recovery objectives are undefined
- infrastructure drift creates an unknown production state
- AI-generated high-risk infrastructure changes lack human verification

---

## 46. Infrastructure Anti-Patterns

### Console-only infrastructure

Maintaining critical infrastructure exclusively through undocumented manual changes.

### Production snowflakes

Making production fundamentally different from every other environment without documented reason.

### Shared credentials

Using one credential across people, services, and environments.

### Public by default

Exposing infrastructure simply because access restrictions were inconvenient.

### Secret-in-IaC

Embedding credentials directly in infrastructure definitions.

### Unbounded resources

Allowing workloads to consume resources without meaningful limits.

### Untested backups

Assuming backup success means recovery capability.

### Blind multi-region

Adding multiple regions without requirements, testing, or operational capability.

### Infrastructure drift normalization

Accepting manual changes as normal operating practice.

### AI-controlled infrastructure

Allowing an AI agent broad production infrastructure access without bounded permissions.

---

## 47. Reviewer Checklist

A reviewer or SGE SHOULD verify:

- [ ] Environment topology is clear.
- [ ] Production is appropriately isolated.
- [ ] Infrastructure ownership exists.
- [ ] Network exposure is intentional.
- [ ] IAM follows least privilege.
- [ ] Secrets are controlled.
- [ ] Material infrastructure is reproducible.
- [ ] Infrastructure drift is detectable.
- [ ] Resource limits and quotas are understood.
- [ ] Cost impact is understood.
- [ ] Backups and restore procedures are validated.
- [ ] Disaster recovery is appropriate to risk.
- [ ] Infrastructure security controls are present.
- [ ] Observability is sufficient.
- [ ] Production changes are traceable.
- [ ] AI-assisted infrastructure work complies with AI-010.

---

## 48. Relationship to Other Standards

INFRA-013 complements:

- GOV-000 — Engineering Governance Constitution
- ARC-002 — Architecture & System Design Standard
- SEC-007 — Security Engineering Standard
- DB-005 — Database Engineering Standard
- QA-008 — Testing & Quality Engineering Standard
- AI-010 — AI-Assisted Development Standard
- GIT-011 — Git & Version Control Standard
- CICD-012 — CI/CD Standard

INFRA-013 governs the **physical and runtime environment in which software operates**.

It does not replace:

- application architecture
- database governance
- security engineering
- CI/CD
- observability
- performance engineering
- release management
- production readiness

---

## 49. Exceptions

Exceptions to INFRA-013 require an explicit engineering exception under EXC-021.

The exception SHALL document:

- requested deviation
- reason
- affected infrastructure
- risk
- compensating controls
- owner
- expiration/review date

Cost, speed, or development convenience alone are not sufficient justification for bypassing infrastructure controls.

---

## 50. Change Control

Infrastructure governance SHALL be reviewed when changes materially affect:

- environment topology
- IAM
- networking
- production access
- disaster recovery
- backups
- infrastructure automation
- deployment permissions
- cost exposure
- security boundaries

Infrastructure should evolve through controlled engineering decisions rather than undocumented operational habits.

---

## 51. Sign-Off

**System:** ____________________  
**Environment:** ____________________  
**Infrastructure change:** ____________________  
**Architecture reference:** ____________________  
**IaC reference:** ____________________  
**Reviewer:** ____________________  
**Security validation:** ____________________  
**Backup/restore validation:** ____________________  
**DR validation:** ____________________  
**Rollback/recovery reference:** ____________________  
**Production decision:** GO / GO WITH CONDITIONS / NO-GO  
**Approval date:** ____________________

---

## 52. Final Principle

> **Infrastructure is part of the product. If it cannot be understood, secured, reproduced, monitored, and recovered, the system is not production-ready.**

A production-grade infrastructure layer preserves:

**requirements → architecture → environment → access → deployment → operation → recovery**

**Provision deliberately. Restrict access. Automate safely. Test recovery. Control drift.**
