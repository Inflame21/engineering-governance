# Security Policy

## Reporting a vulnerability

Do not report vulnerabilities in public issues, pull requests or discussions.

Use GitHub's private vulnerability reporting: open the repository's **Security** tab, choose **Report a vulnerability**, and describe the problem. Include the affected file or component, steps to reproduce, the impact you expect, and any suggested fix.

If that option is not available, contact a repository maintainer directly and ask for a private channel before sharing details.

## What is in scope

- The governance engine, analyzer and CLI under `22-governance-operations/`, in particular anything that could turn a failing, missing or unverified result into a pass.
- The CI workflow and repository configuration under `.github/`.
- Filesystem handling in the CLI (path confinement, symlinks) and the handling of untrusted repositories and governance packs.

Weaknesses in the policy text itself, such as a gap in a standard, are governance issues rather than vulnerabilities and can be raised through a normal pull request or issue.

## What to expect

Maintainers will acknowledge a report, assess severity using the P0 to P3 model in GOV-000, and agree a fix and disclosure timeline with the reporter. No fixed response times are promised until the maintainers confirm them.

## Handling

Security fixes follow the normal review and CI requirements. Evidence produced by this tooling is never treated as a secret-free artifact: do not commit credentials, tokens or customer data in governance packs, fixtures or logs.
