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
| ARC-002 | Architecture & System Design Standard | 🔜 Next |
| BE-003 | Backend Engineering Standard | Planned |
| FE-004 | Frontend Engineering Standard | Planned |
| DB-005 | Database Engineering Standard | Planned |
| API-006 | API Governance Standard | Planned |
| SEC-007 | Security Engineering Standard | Planned |
| QA-008 | Testing & Quality Engineering Standard | Planned |
| REV-009 | Code Review Standard | Planned |
| AI-010 | AI-Assisted Development Standard | Planned |
| GIT-011 | Git & Version Control Standard | Planned |
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

## Status

This repository is built incrementally. Each standard is reviewed and added as an independent governance artifact.

**Current baseline:** REQ-001  
**Next:** ARC-002 — Architecture & System Design Standard
