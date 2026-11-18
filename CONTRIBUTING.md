# Contributing

This repository holds engineering governance policy (`00-governance/` to `22-governance-operations/`) and the executable platform that evaluates it (`22-governance-operations/engine`, `analyzer`, `cli`, `model`).

## Ground rules

- Work on a branch and open a pull request. Do not push to `main`.
- Every pull request needs one approving review from someone other than its author, and the required status checks must pass. Do not bypass the ruleset except as a documented break-glass action.
- Keep a pull request to one concern. Stacked changes should say what they depend on.
- AI assistance does not transfer accountability (GOV-P-010). The author is responsible for every line they submit.

## Changing policy

Standards are frozen at GOV-023 unless a genuine policy gap is identified and separately approved. New functionality belongs in the executable platform, not in a new standard.

A change to a standard is an engineering change (GOV-022 section 18). The pull request description must state:

- the reason for the change and the standards affected;
- compatibility and operational impact, and any migration needed;
- the reviewer and the effective date.

A standard must not be weakened only to make an existing implementation pass. Changes to role names, authority or approval levels (GOV-000, EXC-021) need an approver with authority over those documents, not only a code reviewer.

## Changing the platform

The engine, analyzer and CLI are TypeScript packages. In each package directory:

```bash
npm ci
npm run check   # type-check
npm test
npm run build
npm run test:e2e   # CLI package only: end-to-end contract tests against the built CLI
```

Requirements:

- Install with `npm ci` and commit lockfile changes with the dependency change.
- Decision logic fails closed. Missing, stale, unlinked, duplicate or unverified evidence, malformed input and unsupported checks must never produce a pass. Add a negative test for every new rule.
- Do not infer verification from file names or folder layout. Discovery signals are not evidence.
- Record debt you knowingly leave in `22-governance-operations/KNOWN-DEBT.md` (DEBT-020).

## Pull request description

Include what changed and why, the standards or debt items it relates to, how you verified it (commands run and results), and what remains unverified. Do not claim a check passed unless it ran.

## Commits

Use short conventional-style subjects (`fix(engine): ...`, `docs: ...`, `build: ...`) and explain the reason in the body.

## License of contributions

By submitting a contribution you agree to section 8 of the [LICENSE](LICENSE): you grant the maintainer a perpetual, irrevocable license to use, modify and distribute it as part of the project, and you confirm you have the right to do so. Do not submit code or text you cannot license this way, including AI output you have not reviewed.

## Reporting security issues

Do not open a public issue. See [SECURITY.md](SECURITY.md).
