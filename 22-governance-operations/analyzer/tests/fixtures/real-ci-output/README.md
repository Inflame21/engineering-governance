# Real CI run data

The response of GitHub's "list workflow runs" REST endpoint (`GET /repos/{owner}/{repo}/actions/runs`), captured on 2026-11-23 for a public repository unrelated to this one (`actions/checkout`, one run per file), replayed by `ci-status.test.ts`. A project writes the same shape with `gh api repos/OWNER/REPO/actions/runs?head_sha=SHA` or `curl`.

- `runs-success.json`: one completed run with conclusion `success`.
- `runs-failure.json`: one completed run with conclusion `failure`.

Removed from each run: `pull_requests`, `actor`, `triggering_actor`, `head_commit` (it holds a commit author's name and email), `repository`, `head_repository` and `referenced_workflows`. Nothing else was changed. Only GitHub Actions was captured; GitLab CI, CircleCI, Jenkins and others are not read at all (DEBT-GOV-031).
