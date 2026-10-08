# Engineering Governance Framework

A production-grade engineering governance framework defining standards, rules, quality gates, review processes, and production-readiness requirements for building, reviewing, deploying, and maintaining reliable software systems.

## AI Agent Entry Point

`AGENTS.md` is the root AI-agent entrypoint for this framework. When this repository is provided to an AI coding agent, `AGENTS.md` tells the agent how to discover and apply the relevant governance standards without loading the entire framework into context by default.

The agent is expected to:

- identify the standards relevant to the requested task
- treat GOV-000 as the governing authority
- load detailed standards only when applicable
- preserve project requirements and approved architecture decisions
- produce engineering evidence rather than unsupported claims
- record technical debt when appropriate
- use EXC-021 for explicit governance exceptions
- use PRD-018 for production-readiness assessment
- never silently bypass mandatory governance requirements

**Important:** `AGENTS.md` provides agent guidance; it does not replace engineering enforcement. CI/CD, automated tests, security controls, code review, production gates, and human approval remain enforcement mechanisms.

## Purpose

This repository defines the engineering standards used to govern software work from project inception through production operation.

The framework is intentionally stronger than a coding-style guide. It defines how engineering decisions are made, what evidence is required, when work can progress, and when software is safe to approve for production.

## Governance Model

```
Project Start
     ↓
Requirements
     ↓
Architecture
     ↓
Technical Design
     ↓
Implementation
     ↓
Testing
     ↓
Code Review
     ↓
Security Review
     ↓
Production Readiness
     ↓
Deployment
     ↓
Observability
     ↓
Maintenance
```

## Standards

| ID | Standard | Status |
|---|---|---|
| GOV-000 | Engineering Governance Constitution | ✅ Published |
| REQ-001 | Requirements Engineering Standard | ✅ Published |
| ARC-002 | Architecture & System Design Standard | ✅ Published |
| BE-003 | Backend Engineering Standard | ✅ Published |
| FE-004 | Frontend Engineering Standard | ✅ Published |
| DB-005 | Database Engineering Standard | ✅ Published |
| API-006 | API Governance Standard | ✅ Published |
| SEC-007 | Security Engineering Standard | ✅ Published |
| QA-008 | Testing & Quality Engineering Standard | ✅ Published |
| REV-009 | Code Review Standard | ✅ Published |
| AI-010 | AI-Assisted Development Standard | ✅ Published |
| GIT-011 | Git & Version Control Standard | ✅ Published |
| CICD-012 | CI/CD Standard | ✅ Published |
| INFRA-013 | Infrastructure & Environment Standard | ✅ Published |
| OBS-014 | Observability Standard | ✅ Published |
| PERF-015 | Performance Engineering Standard | ✅ Published |
| DOC-016 | Documentation Standard | ✅ Published |
| REL-017 | Release Management Standard | ✅ Published |
| PRD-018 | Production Readiness Standard | ✅ Published |
| INC-019 | Incident Management Standard | ✅ Published |
| DEBT-020 | Technical Debt Standard | ✅ Published |
| EXC-021 | Engineering Exception Standard | ✅ Published |
| GOV-022 | Governance Lifecycle & Operating Standard | ✅ Published |
| GOV-023 | Engineering Evidence & Traceability Standard | ✅ Published |

## Severity Model

| Severity | Meaning | Default Production Decision |
|---|---|---|
| P0 | Critical | 🚫 Block |
| P1 | High | 🚫 Normally block |
| P2 | Medium | ⚠️ Conditional |
| P3 | Low | ✅ Generally permitted |

## Core Principle

> **Anyone can build. Anyone can use AI. Anyone can propose an implementation. Production approval requires engineering evidence.**

The SGE acts as the engineering quality gate, protecting the system from unacceptable technical risk while allowing the team to move quickly within defined boundaries.

## Executable Governance Layer

The standards are now treated as **governance policy**, not as the product itself.

The executable layer converts that policy into machine-readable objects that can later be evaluated by a governance engine, CLI, CI pipeline, repository scanner, and AI context generator.

```
Standards
   ↓
Machine-readable Governance Model
   ↓
Rules / Controls
   ↓
Evidence
   ↓
Evaluation
   ↓
Decision
   ↓
Enforcement
```

### Current executable artifacts

- [Governance Model Schema](22-governance-operations/model/governance-model.schema.json)
- [Example Governance Pack](22-governance-operations/model/example-governance-pack.json)

The schema defines the canonical model for:

- Projects
- Changes
- Standards
- Controls
- Evidence
- Risks
- Decisions
- Exceptions
- Technical debt

The example pack demonstrates a real change flowing through controls and evidence to a **NO-GO** production decision because a P1 idempotency requirement remains unverified.

### Planned execution layers

1. **Governance Model** — machine-readable policy objects
2. **Rule Engine** — determine which controls apply to a change
3. **Repository Analyzer** — collect implementation evidence
4. **Governance CLI** — expose evaluation locally
5. **CI Enforcement** — block unsafe changes automatically
6. **AI Context Generator** — produce task-specific governance context
7. **Governance UI** — visualize risk, evidence, debt, exceptions, and readiness

The goal is to prevent the framework from becoming documentation-only governance.

## Repository Structure

```
engineering-governance/
├── AGENTS.md
├── 00-governance/
├── 01-requirements/
├── 02-architecture/
├── 03-backend/
├── 04-frontend/
├── 05-database/
├── 06-api/
├── 07-security/
├── 08-testing/
├── 09-code-review/
├── 10-ai-development/
├── 11-git/
├── 12-cicd/
├── 13-infrastructure/
├── 14-observability/
├── 15-performance/
├── 16-documentation/
├── 17-release/
├── 18-production-readiness/
├── 19-incidents/
├── 20-technical-debt/
├── 21-exceptions/
└── 22-governance-operations/
    ├── 22-governance-lifecycle-standard.md
    ├── 23-engineering-evidence-traceability-standard.md
    └── model/
        ├── governance-model.schema.json
        └── example-governance-pack.json
```

## Published Documents

### AI Agent Entry Point

- [AGENTS.md — AI Agent Governance Instructions](AGENTS.md)

### Standards

- [GOV-000 — Engineering Governance Constitution](00-governance/00-engineering-governance-constitution.md)
- [REQ-001 — Requirements Engineering Standard](01-requirements/01-requirements-engineering-standard.md)
- [ARC-002 — Architecture & System Design Standard](02-architecture/02-architecture-system-design-standard.md)
- [BE-003 — Backend Engineering Standard](03-backend/03-backend-engineering-standard.md)
- [BE-003 Profile — FastAPI](03-backend/profiles/fastapi.md)
- [FE-004 — Frontend Engineering Standard](04-frontend/04-frontend-engineering-standard.md)
- [DB-005 — Database Engineering Standard](05-database/05-database-engineering-standard.md)
- [API-006 — API Governance Standard](06-api/06-api-governance-standard.md)
- [SEC-007 — Security Engineering Standard](07-security/07-security-engineering-standard.md)
- [QA-008 — Testing & Quality Engineering Standard](08-testing/08-testing-quality-engineering-standard.md)
- [REV-009 — Code Review Standard](09-code-review/09-code-review-standard.md)
- [AI-010 — AI-Assisted Development Standard](10-ai-development/10-ai-assisted-development-standard.md)
- [GIT-011 — Git & Version Control Standard](11-git/11-git-version-control-standard.md)
- [CICD-012 — CI/CD Standard](12-cicd/12-ci-cd-standard.md)
- [INFRA-013 — Infrastructure & Environment Standard](13-infrastructure/13-infrastructure-environment-standard.md)
- [OBS-014 — Observability Standard](14-observability/14-observability-standard.md)
- [PERF-015 — Performance Engineering Standard](15-performance/15-performance-engineering-standard.md)
- [DOC-016 — Documentation Standard](16-documentation/16-documentation-standard.md)
- [REL-017 — Release Management Standard](17-release/17-release-management-standard.md)
- [PRD-018 — Production Readiness Standard](18-production-readiness/18-production-readiness-standard.md)
- [INC-019 — Incident Management Standard](19-incidents/19-incident-management-standard.md)
- [DEBT-020 — Technical Debt Standard](20-technical-debt/20-technical-debt-standard.md)
- [EXC-021 — Engineering Exception Standard](21-exceptions/21-engineering-exception-standard.md)
- [GOV-022 — Governance Lifecycle & Operating Standard](22-governance-operations/22-governance-lifecycle-standard.md)
- [GOV-023 — Engineering Evidence & Traceability Standard](22-governance-operations/23-engineering-evidence-traceability-standard.md)

### Executable Governance

- [Governance Model Schema](22-governance-operations/model/governance-model.schema.json)
- [Example Governance Pack](22-governance-operations/model/example-governance-pack.json)

## Status

The standards layer is intentionally frozen at GOV-023 while the framework moves into executable governance.

**Current baseline:** GOV-023 + machine-readable governance model  
**Current phase:** Executable Governance — Model  
**Next:** Rule engine and control evaluation
