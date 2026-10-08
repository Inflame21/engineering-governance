# Engineering Governance Framework

A production-grade engineering governance framework defining standards, rules, quality gates, review processes, and production-readiness requirements for building, reviewing, deploying, and maintaining reliable software systems.

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
| GIT-011 | Git & Version Control Standard | 🔜 Next |
| CICD-012 | CI/CD Standard | Planned |
| INFRA-013 | Infrastructure & Environment Standard | Planned |
| OBS-014 | Observability Standard | Planned |
| PERF-015 | Performance Engineering Standard | Planned |
| DOC-016 | Documentation Standard | Planned |
| REL-017 | Release Management Standard | Planned |
| PRD-018 | Production Readiness Standard | Planned |
| INC-019 | Incident Management Standard | Planned |
| DEBT-020 | Technical Debt Standard | Planned |
| EXC-021 | Engineering Exception Standard | Planned |

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

## Repository Structure

```
engineering-governance/
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
└── 21-exceptions/
```

## Published Documents

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

## Status

This repository is built incrementally. Each standard is reviewed and added as an independent governance artifact.

**Current baseline:** AI-010  
**Next:** GIT-011 — Git & Version Control Standard
