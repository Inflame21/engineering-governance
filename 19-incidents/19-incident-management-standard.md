# INC-019 — Incident Management Standard

**Status:** Published  
**Standard ID:** INC-019  
**Applies to:** All production systems, services, infrastructure, security events, data incidents, availability incidents, performance incidents, operational failures, and material customer-impacting events governed by this framework.

---

## 1. Purpose

INC-019 defines the engineering process for detecting, assessing, responding to, recovering from, and learning from production incidents.

An incident is an unplanned event that causes, or has credible potential to cause:

- service degradation
- outage
- security impact
- data loss
- data corruption
- incorrect business behavior
- performance degradation
- operational disruption
- customer impact
- compliance impact

> **Incident management is not merely restoring service. It is controlling impact, preserving evidence, restoring a safe state, and preventing recurrence.**

---

## 2. Scope

This standard governs:

- incident detection
- incident declaration
- severity classification
- incident ownership
- triage
- escalation
- communication
- containment
- mitigation
- recovery
- rollback
- roll-forward
- emergency changes
- evidence preservation
- incident timelines
- customer communication
- security incident coordination
- data incidents
- post-incident review
- root/contributing cause analysis
- corrective actions
- incident metrics
- incident drills
- AI-assisted incident response

This standard is technology-neutral.

---

## 3. Incident Principles

### 3.1 Protect People, Data, and Service First

During an incident, prioritize:

1. human safety where applicable
2. data integrity
3. security
4. customer/user impact
5. service availability
6. evidence preservation

### 3.2 Stabilize Before Optimizing

During active incidents:

- stop the spread
- reduce blast radius
- restore a safe state
- preserve evidence

Do not perform unnecessary refactoring during an outage.

### 3.3 Incident Response Requires Ownership

Every declared incident SHALL have an identifiable owner or incident commander.

### 3.4 Facts Over Assumptions

Incident decisions SHOULD be based on:

- telemetry
- logs
- traces
- deployment records
- configuration history
- infrastructure state
- user reports
- reproducible evidence

Hypotheses SHALL be distinguished from confirmed facts.

---

## 4. Incident Severity

Projects SHALL define incident severity.

The baseline model is:

| Severity | Meaning | Typical response |
|---|---|---|
| P0 Critical | Severe outage, security event, data loss/corruption, or widespread critical impact | Immediate response |
| P1 High | Major degradation or significant user/business impact | Urgent response |
| P2 Medium | Limited or manageable impact | Standard response |
| P3 Low | Minor operational issue or limited impact | Normal prioritization |

Severity SHALL consider:

- user impact
- duration
- scope
- data impact
- security impact
- business impact
- recoverability
- regulatory impact

---

## 5. Incident Declaration

An incident SHOULD be declared when:

- impact is confirmed
- credible risk of significant impact exists
- investigation requires coordinated response
- normal support processes are insufficient

Do not delay declaration because the root cause is unknown.

> **You declare an incident based on impact, not certainty about cause.**

---

## 6. Incident Commander

Material incidents SHALL have an incident commander.

The incident commander is responsible for:

- coordinating response
- assigning roles
- controlling scope
- making escalation decisions
- maintaining priorities
- coordinating communication
- declaring recovery

The incident commander does not necessarily perform every technical action.

---

## 7. Incident Roles

For significant incidents, roles MAY include:

- Incident Commander
- Technical Lead
- Communications Lead
- Operations Lead
- Security Lead
- Data Lead
- Customer/Support Lead
- Scribe

Small incidents MAY combine roles.

Critical incidents SHOULD separate coordination from hands-on implementation where staffing allows.

---

## 8. Incident Lifecycle

The standard incident lifecycle is:

```
Detect
  ↓
Declare
  ↓
Triage
  ↓
Contain
  ↓
Mitigate
  ↓
Recover
  ↓
Verify
  ↓
Communicate Closure
  ↓
Review
  ↓
Correct
  ↓
Learn
```

---

## 9. Detection

Incidents MAY be detected through:

- alerts
- monitoring
- logs
- traces
- customer reports
- support tickets
- security systems
- automated checks
- infrastructure systems
- engineers
- external providers

Detection quality SHALL be evaluated after significant incidents.

---

## 10. Detection Quality

Teams SHOULD track whether incidents were:

- detected automatically
- detected manually
- detected by users
- detected late
- detected after significant impact

User reports repeatedly discovering failures that should be automatically detectable indicate an observability gap.

---

## 11. Triage

Initial triage SHALL establish:

- what is failing
- who is affected
- when it started
- current severity
- whether impact is increasing
- recent changes
- likely blast radius
- immediate containment options

Root cause is not required before mitigation begins.

---

## 12. Incident Timeline

Significant incidents SHALL maintain a timeline.

The timeline SHOULD capture:

- detection
- declaration
- key observations
- major decisions
- deployments
- configuration changes
- mitigations
- communications
- recovery
- closure

Times SHOULD use a consistent timezone/reference.

---

## 13. Evidence Preservation

For significant incidents, preserve relevant evidence such as:

- logs
- traces
- metrics
- deployment records
- infrastructure state
- configuration changes
- security events
- database state where appropriate

Do not destroy evidence while attempting to clean up the incident.

---

## 14. Containment

Containment limits ongoing damage.

Examples:

- disable a feature
- stop rollout
- isolate a workload
- revoke credentials
- block traffic
- disable an integration
- rate-limit traffic
- pause background processing

Containment decisions SHALL consider secondary impact.

---

## 15. Mitigation

Mitigation reduces user/system impact without necessarily addressing root cause.

Examples:

- rollback
- failover
- scale capacity
- disable non-critical functionality
- reroute traffic
- restore service
- apply temporary configuration

Temporary mitigation SHALL be distinguished from permanent remediation.

---

## 16. Recovery

Recovery restores the system to a known acceptable state.

Recovery SHALL include validation.

Do not declare recovery merely because:

- a deployment succeeded
- a process restarted
- an alert stopped

Verify the actual affected behavior.

---

## 17. Recovery Verification

Verify where applicable:

- availability
- correctness
- data integrity
- security
- performance
- dependencies
- background processing
- customer-visible workflows

Recovery verification SHALL be proportionate to incident severity.

---

## 18. Rollback During Incidents

Rollback MAY be used when it reduces risk.

Before rollback, consider:

- database compatibility
- data mutations
- external side effects
- migrations
- schema versions
- background workers
- irreversible actions

Rollback SHALL NOT be treated as universally safe.

---

## 19. Roll-Forward During Incidents

Roll-forward MAY be preferred when:

- rollback is unsafe
- data has already changed
- the corrective change is known
- forward remediation reduces risk

Roll-forward SHALL be controlled and verified.

---

## 20. Security Incidents

Security incidents SHALL follow SEC-007.

Security response SHOULD consider:

- containment
- credential revocation
- access isolation
- evidence preservation
- legal/compliance requirements
- affected users
- threat persistence

Do not destroy forensic evidence while attempting to restore service.

---

## 21. Data Incidents

Data incidents include:

- corruption
- accidental deletion
- incorrect writes
- data leakage
- integrity violations
- inconsistent state

Data incidents SHALL prioritize preservation of evidence and prevention of further damage.

Do not overwrite potentially useful forensic state without a recovery strategy.

---

## 22. Customer Impact

Where incidents materially affect users, communication SHOULD provide:

- impact
- affected scope
- current status
- mitigation
- expected next update where appropriate

Do not speculate publicly about root cause before evidence supports the claim.

---

## 23. Internal Communication

Incident communication SHALL be:

- concise
- factual
- actionable
- timestamped where useful
- free of unnecessary speculation

Separate:

- confirmed facts
- hypotheses
- decisions
- actions

---

## 24. Escalation

Escalation SHOULD occur when:

- severity increases
- impact expands
- recovery is failing
- security risk increases
- data integrity is uncertain
- required expertise is unavailable
- incident exceeds defined response objectives

Escalation paths SHALL be documented before incidents occur.

---

## 25. Incident Response Objectives

Critical systems SHOULD define operational objectives such as:

- detection target
- acknowledgement target
- containment target
- recovery target

These may be expressed as:

- MTTD — Mean Time to Detect
- MTTA — Mean Time to Acknowledge
- MTTC — Mean Time to Contain
- MTTR — Mean Time to Recover/Resolve

Metrics SHALL be interpreted according to the actual system and incident model.

---

## 26. Incident Command Discipline

During major incidents:

- establish one incident commander
- maintain one source of truth for incident status
- assign actions explicitly
- avoid duplicated work
- record important decisions
- communicate status regularly

Parallel investigation is useful; uncoordinated investigation is not.

---

## 27. Change Control During Incidents

Emergency changes MAY bypass normal release timing when necessary.

They SHALL still be:

- attributable
- scoped
- reviewed where practical
- verified
- recorded

After stabilization, emergency changes SHALL be reconciled with normal source control and release records.

---

## 28. Incident Runbooks

Critical incident types SHOULD have runbooks.

Runbooks SHOULD include:

- symptoms
- initial checks
- likely causes
- containment
- mitigation
- recovery
- validation
- escalation
- rollback/roll-forward

Runbooks SHALL be updated when incidents reveal inaccuracies.

---

## 29. Incident Automation

Automation MAY assist with:

- detection
- enrichment
- routing
- diagnostics
- containment
- scaling
- rollback
- recovery

Automated remediation SHALL have:

- defined scope
- bounded permissions
- failure handling
- auditability
- safe stopping conditions

---

## 30. Automated Remediation

Automated remediation SHALL NOT create greater risk than the incident it addresses.

Examples of unsafe automation include:

- infinite restart loops
- uncontrolled scaling
- repeated destructive migrations
- automatic credential revocation without safeguards
- repeated retry storms

Automation SHALL be tested under failure conditions.

---

## 31. Post-Incident Review

Material incidents SHALL receive a post-incident review.

The review SHOULD include:

- summary
- impact
- timeline
- detection
- response
- mitigation
- recovery
- root/contributing causes
- what went well
- what failed
- corrective actions
- governance changes

---

## 32. Blameless Analysis

Incident reviews SHOULD focus on:

- system conditions
- decisions
- processes
- architecture
- tooling
- incentives
- missing controls

The objective is to improve the system, not assign personal blame.

Blameless does not mean accountability-free.

---

## 33. Root Cause Analysis

Root cause analysis SHOULD distinguish:

- direct cause
- contributing causes
- systemic causes
- detection gaps
- containment gaps
- recovery gaps

Avoid stopping at the first technical symptom.

Example:

> Database timeout

may be a symptom rather than the root problem.

Possible contributing causes:

- missing index
- unbounded query
- traffic spike
- missing capacity control
- insufficient alerting

---

## 34. Five Whys

Five Whys MAY be used when appropriate.

It SHALL NOT be used mechanically.

The analysis should produce actionable engineering learning rather than a simplistic narrative.

---

## 35. Corrective Actions

Corrective actions SHOULD be classified.

Examples:

- code fix
- test
- architecture change
- infrastructure change
- observability improvement
- security control
- runbook update
- process change
- documentation update

Actions SHOULD address the failure mechanism rather than merely its symptom.

---

## 36. Corrective Action Ownership

Every material corrective action SHALL have:

- owner
- priority
- target date
- description
- validation criteria

Unowned postmortem actions are unlikely to produce systemic improvement.

---

## 37. Incident Follow-Up

Corrective actions SHALL be tracked until:

- completed
- explicitly deprioritized with risk acceptance
- replaced by another mitigation
- closed with documented justification

---

## 38. Repeat Incidents

Repeated incidents SHOULD trigger deeper review.

Examples:

- same root cause
- same service
- same alert
- same deployment failure
- same operational workaround

Repeated incidents indicate that previous corrective action was insufficient.

---

## 39. Incident Metrics

Organizations SHOULD monitor:

- incident count
- severity distribution
- detection time
- acknowledgement time
- containment time
- recovery time
- recurrence
- customer impact
- false alerts
- escaped defects

Metrics SHALL be used to identify systemic problems rather than optimize teams toward superficial numbers.

---

## 40. Incident Trends

Trend analysis SHOULD identify:

- recurring components
- recurring failure modes
- common deployment issues
- common dependency failures
- observability gaps
- capacity problems
- security patterns

Incident data should influence engineering priorities.

---

## 41. Incident Drills

Critical systems SHOULD conduct incident exercises appropriate to risk.

Exercises MAY include:

- service outage
- database failure
- dependency outage
- credential compromise
- data recovery
- regional failure
- queue failure

Drills SHOULD validate both technical recovery and human coordination.

---

## 42. Disaster Recovery Exercises

Disaster recovery exercises SHALL coordinate with INFRA-013.

Validate:

- recovery procedure
- RPO/RTO
- ownership
- dependencies
- communication
- verification

---

## 43. Incident Evidence

Incident records SHOULD preserve:

- incident ID
- severity
- timeline
- affected systems
- impact
- actions
- decisions
- evidence
- recovery
- root/contributing causes
- corrective actions

Sensitive information SHALL be handled according to SEC-007.

---

## 44. Incident Documentation

Incident documentation SHALL be sufficiently detailed to support:

- future investigation
- audit where required
- corrective action
- training
- governance improvement

Avoid both extremes:

- no useful record
- enormous unstructured transcripts

---

## 45. Incident Closure

An incident MAY be closed when:

- user/system impact is resolved
- system state is verified
- required communication is complete
- immediate evidence is preserved
- follow-up actions are assigned
- ownership is clear

Closure does not mean every permanent corrective action is already complete.

---

## 46. Incident Severity Reassessment

Severity SHALL be reassessed when:

- impact increases
- scope expands
- security implications emerge
- data integrity becomes uncertain
- recovery becomes less likely
- business impact changes

Incidents can move from P2 to P1 or P0.

---

## 47. Incident and Observability

OBS-014 provides the telemetry needed for incident response.

Incidents SHOULD evaluate:

- whether detection worked
- whether alerts were actionable
- whether correlation was sufficient
- whether dashboards supported diagnosis
- whether telemetry was missing

An incident caused by missing observability is both an incident and an observability learning opportunity.

---

## 48. Incident and Performance

PERF-015 applies to performance incidents.

Investigate:

- workload
- bottleneck
- saturation
- capacity
- latency
- database behavior
- dependency behavior
- scaling behavior

Do not permanently increase resources without understanding the underlying failure.

---

## 49. Incident and Security

SEC-007 governs security incident requirements.

Incident responders SHALL understand when an availability incident also represents:

- unauthorized access
- data exposure
- credential compromise
- malicious activity

Security escalation SHALL occur when indicated.

---

## 50. Incident and Release Management

REL-017 governs release-related incident response.

After a release incident, evaluate:

- release decision
- test evidence
- deployment strategy
- rollout controls
- verification
- rollback assumptions

A failed release may indicate a release-governance defect rather than only an implementation defect.

---

## 51. Incident and Production Readiness

PRD-018 SHALL be revisited when an incident exposes a failed production-readiness assumption.

Examples:

- recovery did not work
- alert did not exist
- rollback was unsafe
- capacity was insufficient
- ownership was unclear

---

## 52. Incident and Technical Debt

Repeated incidents MAY identify technical debt requiring prioritization.

Technical debt should be treated as a risk when it materially increases:

- incident probability
- recovery time
- security exposure
- operational complexity

---

## 53. AI-Assisted Incident Response

AI MAY assist with:

- log summarization
- timeline construction
- anomaly correlation
- hypothesis generation
- runbook retrieval
- query generation
- communication drafting

AI-generated incident conclusions SHALL be treated as hypotheses until verified.

---

## 54. AI Incident Risks

AI incident tooling SHALL NOT:

- invent evidence
- fabricate root causes
- silently modify production
- expose sensitive data
- make unreviewed high-risk changes
- suppress uncertainty

Agentic remediation SHALL have bounded permissions and explicit safeguards.

---

## 55. Incident Readiness Gate

Critical systems SHOULD verify:

### Detection

- [ ] Critical failure modes are detectable.
- [ ] Alerts have owners.
- [ ] Escalation paths exist.

### Response

- [ ] Incident commander role is defined.
- [ ] Severity model exists.
- [ ] Runbooks exist for major failure modes.
- [ ] Emergency change process exists.

### Recovery

- [ ] Recovery procedures are documented.
- [ ] Rollback/roll-forward is understood.
- [ ] Backup restoration is validated where required.

### Learning

- [ ] Post-incident review process exists.
- [ ] Corrective actions have owners.
- [ ] Repeat incidents trigger deeper review.

---

## 56. Automatic Production Blockers

For critical systems, production SHALL be blocked when:

- there is no defined incident ownership
- critical alerts have no escalation path
- critical failure modes have no recovery procedure
- required incident communication paths are absent
- critical backups cannot be restored where required
- security incident escalation is undefined
- critical automated remediation can cause uncontrolled damage
- incident evidence cannot be preserved where required

---

## 57. Incident Anti-Patterns

### No incident declaration

Waiting for certainty about root cause before coordinating response.

### Hero operations

Depending on one engineer's undocumented knowledge.

### Blame-first postmortems

Focusing on who made the mistake instead of why the system allowed it.

### Root-cause theater

Stopping at the first technical symptom.

### Permanent workaround

Using an emergency mitigation indefinitely without addressing the cause.

### Silent incident

Restoring service without documenting what happened.

### No verification

Declaring recovery because an alert stopped.

### Alert blindness

Ignoring recurring alerts rather than fixing the underlying issue.

### Infinite automation

Allowing automated remediation to repeatedly amplify damage.

### AI certainty

Treating AI-generated hypotheses as confirmed incident facts.

---

## 58. Reviewer Checklist

A reviewer or SGE SHOULD verify:

- [ ] Incident severity model exists.
- [ ] Incident ownership is defined.
- [ ] Escalation paths exist.
- [ ] Critical failure modes have runbooks.
- [ ] Recovery is validated.
- [ ] Evidence can be preserved.
- [ ] Security incidents are escalated correctly.
- [ ] Customer communication is defined.
- [ ] Emergency changes remain traceable.
- [ ] Post-incident reviews occur.
- [ ] Corrective actions have owners.
- [ ] Repeat incidents receive deeper analysis.
- [ ] Incident metrics are meaningful.
- [ ] AI-assisted incident response is bounded and verified.

---

## 59. Relationship to Other Standards

INC-019 complements:

- GOV-000 — Engineering Governance Constitution
- ARC-002 — Architecture & System Design Standard
- SEC-007 — Security Engineering Standard
- QA-008 — Testing & Quality Engineering Standard
- REV-009 — Code Review Standard
- AI-010 — AI-Assisted Development Standard
- CICD-012 — CI/CD Standard
- INFRA-013 — Infrastructure & Environment Standard
- OBS-014 — Observability Standard
- PERF-015 — Performance Engineering Standard
- DOC-016 — Documentation Standard
- REL-017 — Release Management Standard
- PRD-018 — Production Readiness Standard

INC-019 governs the **response and learning loop after production behavior deviates from expectations**.

---

## 60. Exceptions

Exceptions to INC-019 require an explicit engineering exception under EXC-021.

The exception SHALL document:

- missing incident control
- reason
- operational risk
- compensating controls
- owner
- expiration/review date

Incident urgency may change response execution. It does not eliminate the requirement for accountability and learning.

---

## 61. Change Control

Incident governance SHALL be updated when incidents reveal:

- missing controls
- ineffective runbooks
- incorrect severity models
- insufficient observability
- recovery gaps
- unclear ownership
- ineffective release controls

Incident learnings SHOULD feed the appropriate engineering standards.

---

## 62. Incident Record

**Incident ID:** ____________________  
**Severity:** P0 / P1 / P2 / P3  
**System:** ____________________  
**Environment:** ____________________  
**Incident Commander:** ____________________  
**Detection time:** ____________________  
**Declaration time:** ____________________  
**Containment time:** ____________________  
**Recovery time:** ____________________  
**Closure time:** ____________________

**Impact:**  
__________________________________________________

**Timeline:**  
__________________________________________________

**Mitigation:**  
__________________________________________________

**Recovery:**  
__________________________________________________

**Root/contributing causes:**  
__________________________________________________

**Corrective actions:**  
__________________________________________________

**Owners:**  
__________________________________________________

---

## 63. Final Principle

> **A production incident is not merely a failure to survive. It is evidence about where the engineering system can improve.**

The complete incident loop is:

**detect → declare → triage → contain → mitigate → recover → verify → review → correct → learn**

**Restore safely. Preserve evidence. Learn systematically. Fix the system, not just the symptom.**
