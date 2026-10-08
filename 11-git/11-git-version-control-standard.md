# GIT-011 — Git & Version Control Standard

**Status:** Published  
**Standard ID:** GIT-011  
**Applies to:** All repositories, branches, commits, tags, merges, pull requests, and source-control workflows governed by this framework.

---

## 1. Purpose

GIT-011 defines the engineering rules for using version control as a system of record for software changes.

Version control is not merely a mechanism for storing source code. A healthy repository provides:

- change traceability
- collaboration boundaries
- review history
- rollback capability
- release provenance
- accountability
- controlled integration
- recovery from mistakes

> **The repository is part of the engineering system. Its history must remain trustworthy.**

---

## 2. Scope

This standard governs:

- repository structure
- branches
- commits
- commit messages
- pull requests
- merges
- rebases
- tags
- release references
- protected branches
- history rewriting
- merge conflicts
- repository permissions
- generated files
- binary assets
- large files
- secrets
- ignored files
- submodules or equivalent external source references
- change traceability
- rollback and recovery
- repository maintenance
- AI-assisted Git operations

This standard is technology-neutral. Specific hosting-platform controls MAY be defined by repository policy or infrastructure standards.

---

## 3. Version Control Principles

### 3.1 Every Material Change Must Be Traceable

A material production change SHALL be traceable to:

- an approved requirement, issue, task, or incident
- the implementation change
- review evidence
- validation evidence
- the resulting release where applicable

### 3.2 History Is Engineering Evidence

Git history SHALL be treated as evidence, not disposable noise.

History should make it possible to understand:

- what changed
- why it changed
- who proposed it
- who reviewed it
- when it changed
- which release contained it

### 3.3 Mainline Integrity

The primary production branch SHALL represent a controlled state of the system.

Direct uncontrolled changes to the production branch are prohibited unless explicitly authorized by repository policy or emergency procedure.

### 3.4 Reproducibility

A commit intended for deployment SHOULD identify a reproducible source state.

A production artifact SHOULD be traceable to an immutable commit or equivalent immutable source reference.

---

## 4. Repository Initialization

A repository SHALL be initialized with:

- a clear project identity
- an appropriate default branch
- repository ownership
- appropriate access controls
- a README or equivalent project entry point
- an appropriate ignore policy
- required governance or contribution rules
- appropriate CI configuration when applicable

Before implementation begins, the team SHOULD establish:

- branch strategy
- review strategy
- release strategy
- ownership
- secret handling
- required checks

Do not treat repository initialization as an administrative afterthought.

---

## 5. Repository Structure

Repository structure SHALL support discoverability and ownership.

A repository SHOULD clearly separate, where applicable:

- application source
- tests
- configuration
- infrastructure
- documentation
- scripts
- tooling
- generated artifacts

Repository structure SHALL NOT be used to hide architectural boundaries.

The source-control structure should reinforce the architecture defined by ARC-002 rather than contradict it.

---

## 6. Branch Strategy

A branch strategy SHALL be explicitly defined.

The exact model may vary:

- trunk-based development
- short-lived feature branches
- release branches
- maintenance branches
- other controlled workflows

Regardless of model:

- long-lived branches SHALL have a documented purpose
- branches SHALL have clear ownership
- unnecessary branches SHOULD be deleted
- stale branches SHOULD NOT be treated as active development state
- production branches SHALL have stronger controls than development branches

### Short-Lived Branch Preference

Branches SHOULD remain short-lived where practical.

Long-lived branches increase:

- merge conflicts
- integration drift
- duplicated work
- stale assumptions
- review difficulty
- release risk

---

## 7. Protected Branches

Production and primary integration branches SHALL be protected according to risk.

Protection SHOULD include, where supported:

- pull-request requirements
- required approvals
- required CI checks
- required status checks
- restricted direct pushes
- restricted force pushes
- restricted branch deletion
- CODEOWNERS or equivalent ownership
- signed commits where required by policy
- conversation resolution requirements
- stale approval invalidation when material changes occur

Protection settings SHALL be treated as engineering controls.

---

## 8. Commit Standards

A commit SHOULD represent a coherent logical change.

Good commits are:

- focused
- understandable
- reviewable
- attributable
- reversible where practical

Avoid commits that combine unrelated work such as:

- feature implementation
- large formatting changes
- dependency upgrades
- unrelated refactoring
- generated-file churn

Commit size is not inherently good or bad. The objective is reviewable and logically coherent change, not an arbitrary line-count limit.

---

## 9. Commit Messages

Commit messages SHALL communicate intent.

A useful commit message identifies the change rather than merely the implementation mechanism.

Prefer:

'fix: reject expired refresh tokens'

over:

'update auth code'

Projects MAY adopt Conventional Commits or another standardized format.

If a format is adopted, it SHALL be documented and consistently applied.

---

## 10. Commit Integrity

Do not create commits that intentionally obscure material changes.

The following are discouraged:

- meaningless commit messages
- repeated empty "fix" commits
- intentionally misleading history
- massive unrelated changes
- generated noise mixed with functional changes
- committing temporary debugging changes
- committing secrets and attempting to hide them later

A commit that contains a security-sensitive or production-impacting mistake SHALL be treated as a security or incident concern, not merely a Git cleanup task.

---

## 11. Pull Requests

Material changes SHOULD be integrated through a pull request or equivalent review mechanism.

A pull request SHOULD contain:

- purpose
- scope
- requirements/reference
- implementation summary
- risk
- testing evidence
- migration information where applicable
- deployment considerations where applicable
- rollback considerations where applicable

The pull request description SHALL NOT claim validation that did not occur.

AI-generated pull request descriptions SHALL be verified by the author.

---

## 12. Pull Request Scope

Pull requests SHALL remain focused enough for meaningful review.

Avoid combining unrelated features, broad formatting, dependency upgrades, architecture changes, and migrations without a clear reason.

A reviewer SHALL be able to determine:

- what changed
- why it changed
- what could break
- what was tested

without reconstructing the entire project history.

---

## 13. Merge Policy

Merges SHALL preserve the repository's required review and validation controls.

The exact merge strategy MAY be:

- merge commit
- squash merge
- rebase merge
- another approved strategy

The chosen strategy SHALL be consistent with:

- history clarity
- traceability
- release management
- rollback
- collaboration

Do not select a merge strategy solely because it produces the shortest history.

---

## 14. Rebase Policy

Rebase MAY be used to maintain a clean local or feature-branch history.

Rebase SHALL NOT be used to bypass review or erase accountability.

Do not rewrite shared history without explicit authorization.

---

## 15. Force Push Policy

Force pushes to shared branches SHALL be prohibited unless explicitly authorized.

Production branches SHOULD prohibit force pushes entirely.

If force pushing is necessary:

- verify the target branch
- verify the expected current state
- understand affected collaborators
- preserve recovery information
- communicate the operation where required

Prefer force-with-lease over unconditional force where history rewriting is legitimately required.

---

## 16. History Rewriting

History rewriting MAY be appropriate for local cleanup or unpublished work.

It SHALL NOT be used to:

- conceal defects
- remove review evidence
- hide unauthorized changes
- bypass branch protections
- alter production provenance
- erase an incident trail

If sensitive information was committed, rewriting history alone is insufficient. The secret SHALL be revoked or rotated and the incident handled according to SEC-007 and INC-019 when applicable.

---

## 17. Tags and Release References

Production releases SHALL be traceable to an immutable source reference.

Tags SHOULD be used for significant releases where appropriate.

Release references SHALL NOT be moved casually after publication.

If a release tag must be changed:

- the reason SHALL be documented
- downstream impact SHALL be understood
- release provenance SHALL remain recoverable

Prefer creating a corrected release over silently changing historical release references.

---

## 18. Versioning and Release Traceability

Where releases are versioned, the repository SHALL provide a traceable relationship between:

Requirement -> Pull Request -> Commit -> Release -> Deployment

The exact implementation may vary, but the chain SHALL remain reconstructable for material production changes.

---

## 19. Secrets and Sensitive Files

Secrets SHALL NEVER be committed to source control.

Examples include:

- passwords
- API keys
- access tokens
- private keys
- production credentials
- database credentials
- signing keys
- session secrets
- cloud credentials

This applies even when:

- the repository is private
- the commit is temporary
- the branch is short-lived
- the secret is immediately deleted

If a secret is committed:

1. assume it is compromised
2. revoke or rotate it
3. assess exposure
4. remove it from active source
5. handle historical removal appropriately
6. document the incident when required

'.gitignore' is a convenience control, not a security boundary.

---

## 20. Generated and Local Files

Generated files SHALL be classified intentionally.

For each generated artifact, decide whether it is:

- authoritative source
- reproducible build output
- required committed artifact
- environment-specific output
- temporary local output

Do not commit generated output merely because a tool created it.

Do not ignore generated artifacts that are intentionally part of the source-of-truth workflow.

---

## 21. Binary and Large Files

Large binaries SHALL be handled deliberately.

Before committing a large file, evaluate:

- repository growth
- clone cost
- storage cost
- change frequency
- distribution requirements
- whether the file is actually source
- whether artifact storage is more appropriate

Use an appropriate large-file or artifact mechanism when repository-native storage is unsuitable.

---

## 22. Dependencies and Lockfiles

Dependency changes SHALL be traceable.

Where the ecosystem supports lockfiles, production applications SHOULD commit the appropriate lockfile.

Dependency updates SHALL be reviewable for:

- direct dependency changes
- transitive changes
- security impact
- compatibility
- licensing
- runtime/build impact

AI-generated dependency changes remain subject to these requirements.

---

## 23. Configuration Files

Repository configuration SHALL distinguish between:

- source-controlled configuration
- environment-specific configuration
- secrets
- generated configuration
- local developer configuration

Environment-specific configuration SHALL NOT accidentally become the universal source of truth.

Configuration changes with production impact SHALL receive appropriate review.

---

## 24. Merge Conflict Resolution

Merge conflicts SHALL be resolved by understanding the intended behavior of both changes.

Do not resolve conflicts mechanically by choosing "ours", "theirs", or whichever version compiles without evaluating semantics.

After resolving a material conflict:

- run relevant tests
- inspect the resulting diff
- verify requirements
- verify architecture
- verify affected integration points

Conflict resolution is an implementation change and SHALL be reviewed accordingly.

---

## 25. Rollback and Recovery

The Git workflow SHALL support recovery from defective changes.

Teams SHOULD know how to:

- identify the affected commit
- identify the deployed version
- revert or roll forward safely
- restore a known-good reference
- determine whether database or external changes require separate remediation

Git rollback does not automatically roll back:

- database migrations
- external API mutations
- messages already published
- files already uploaded
- infrastructure changes
- irreversible business operations

Rollback design must account for the whole system.

---

## 26. Repository Permissions

Repository permissions SHALL follow least privilege.

Access SHOULD be separated according to responsibility:

- read
- contribute
- review
- merge
- administer

Administrative access SHALL be limited.

Production branch write access SHOULD be more restrictive than general repository write access.

Access SHALL be reviewed periodically for material projects.

---

## 27. Ownership

Repositories SHOULD define ownership for critical areas.

Ownership mechanisms MAY include:

- CODEOWNERS
- team ownership
- module ownership
- service ownership
- documented maintainers

Ownership SHALL make accountability clearer, not create unnecessary approval bureaucracy.

---

## 28. AI-Assisted Git Operations

AI agents MAY assist with:

- creating branches
- preparing commits
- writing commit messages
- preparing pull requests
- resolving routine conflicts
- inspecting history
- preparing release notes

AI SHALL NOT be trusted to infer the safety of:

- force pushes
- branch deletion
- history rewriting
- production merges
- release-tag mutation
- secret removal
- destructive repository operations

AI-assisted Git operations SHALL follow AI-010.

For destructive or irreversible operations, explicit human authorization SHOULD be required.

---

## 29. Automated Git Operations

Automation MAY create commits or pull requests when:

- the scope is bounded
- the actor is identifiable
- permissions are restricted
- changes are auditable
- validation is performed
- ownership is clear

Automated systems SHALL NOT have broader repository permissions than required.

---

## 30. Repository Hygiene

Repositories SHOULD periodically remove:

- stale branches
- obsolete generated artifacts
- abandoned temporary files
- unused repository configuration
- dead workflows
- obsolete documentation

Repository hygiene SHALL NOT destroy useful history or provenance.

---

## 31. Production Change Traceability

Every material production change SHALL be reconstructable from source control.

At minimum, the organization should be able to answer:

- Which commit introduced this behavior?
- Which change request authorized it?
- Who reviewed it?
- What validation occurred?
- Which release contained it?
- When was it deployed?
- What was the previous known-good version?

If these questions cannot be answered reliably, the repository workflow has a governance gap.

---

## 32. Git Quality Gate

Before merging material work:

### Branch

- [ ] Branch has a documented or understood purpose.
- [ ] Branch is based on an appropriate current state.
- [ ] Unrelated work is excluded.

### Commit

- [ ] Commits represent coherent changes.
- [ ] Commit messages communicate intent.
- [ ] No secrets are present.
- [ ] Temporary/debug artifacts are excluded.

### Pull Request

- [ ] Purpose and scope are clear.
- [ ] Requirement or task reference is present where required.
- [ ] Risk is understood.
- [ ] Testing evidence is accurate.
- [ ] Migration/deployment implications are documented where applicable.

### Review

- [ ] Required reviewers approved the change.
- [ ] Required CI checks passed.
- [ ] Review conversations are resolved.
- [ ] The final diff was reviewed.

### Integration

- [ ] Merge strategy follows repository policy.
- [ ] No unauthorized history rewriting occurred.
- [ ] Production branch protections were respected.

### Release

- [ ] Production changes are traceable to a commit.
- [ ] Release references are immutable or controlled.
- [ ] Rollback/recovery implications are understood.

---

## 33. Automatic Production Blockers

A production merge or release SHALL be blocked when:

- secrets are committed or exposed
- required review is missing
- required CI checks have failed or were bypassed
- production branch protection was bypassed without authorization
- the final diff differs materially from the reviewed change without re-review
- the source state cannot be reliably identified
- a production release cannot be traced to an immutable or controlled source reference
- unauthorized history rewriting has compromised provenance
- a material merge conflict was resolved without validating resulting behavior
- destructive repository operations were performed without required authorization
- required deployment or rollback information is missing
- the repository contains known critical integrity issues

---

## 34. Git Anti-Patterns

### Giant "everything" commits

Combining unrelated implementation, formatting, dependency, and configuration changes.

### Permanent feature branches

Allowing branches to become parallel versions of the product.

### Force-push culture

Treating shared history as disposable.

### Commit message theater

Using polished messages that do not describe the actual change.

### Secret deletion as remediation

Deleting a secret in a later commit while leaving the credential valid.

### Mechanical conflict resolution

Choosing a side without understanding behavior.

### Review bypass through Git

Changing history, branch state, or merge strategy to avoid required review.

### Untraceable production changes

Deploying code whose exact source commit cannot be identified.

### AI-controlled repository administration

Giving an AI agent unrestricted permissions because it is convenient.

### Generated-file pollution

Committing outputs that are reproducible, environment-specific, or temporary without justification.

---

## 35. Reviewer Checklist

A reviewer or SGE SHOULD verify:

- [ ] The change is traceable to an approved purpose.
- [ ] The branch strategy is respected.
- [ ] The diff is appropriately scoped.
- [ ] Commit history is understandable.
- [ ] Secrets and sensitive files are absent.
- [ ] Dependencies are intentional.
- [ ] Generated files are justified.
- [ ] Merge conflicts were resolved semantically.
- [ ] Required checks passed.
- [ ] Required approvals exist.
- [ ] Production provenance is preserved.
- [ ] Release/rollback implications are understood.
- [ ] AI-assisted Git operations complied with AI-010.
- [ ] No repository-control bypass occurred.

---

## 36. Relationship to Other Standards

GIT-011 complements:

- GOV-000 — Engineering Governance Constitution
- REQ-001 — Requirements Engineering Standard
- ARC-002 — Architecture & System Design Standard
- SEC-007 — Security Engineering Standard
- QA-008 — Testing & Quality Engineering Standard
- REV-009 — Code Review Standard
- AI-010 — AI-Assisted Development Standard

GIT-011 governs the **integrity and traceability of change**.

It does not replace:

- architecture review
- code review
- security review
- testing
- CI/CD controls
- release management
- production-readiness review

---

## 37. Exceptions

Exceptions to GIT-011 require an explicit engineering exception under EXC-021.

The exception SHALL document:

- requested deviation
- reason
- affected repositories
- risk
- compensating controls
- owner
- expiration/review date

Convenience, unfamiliarity with Git, or AI-tool limitations are not sufficient justification for bypassing repository controls.

---

## 38. Change Control

Changes to repository governance SHALL be reviewed when they materially affect:

- branch protection
- review requirements
- merge policy
- release provenance
- repository permissions
- secret handling
- auditability
- recovery capability

Repository policy should evolve deliberately rather than through undocumented local conventions.

---

## 39. Sign-Off

**Repository:** ____________________  
**Change / release:** ____________________  
**Requirement / issue:** ____________________  
**Pull request:** ____________________  
**Commit / release reference:** ____________________  
**Reviewer:** ____________________  
**CI validation:** ____________________  
**Security validation:** ____________________  
**Rollback reference:** ____________________  
**Production decision:** GO / GO WITH CONDITIONS / NO-GO  
**Approval date:** ____________________

---

## 40. Final Principle

> **Git is not merely where code is stored. It is the system of record for engineering change.**

A production-grade repository must preserve:

**intent -> change -> review -> validation -> release -> deployment -> recovery**

When that chain is trustworthy, version control becomes an engineering control rather than a file synchronization mechanism.

**Commit deliberately. Review traceably. Merge safely. Preserve provenance.**
