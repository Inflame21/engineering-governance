# Type: exception

A **draft** exception request in the framework's required record format, for a person to review and decide. It is a document. It does not record anything in the governance pack, approve anything or change any decision.

## Extra rules for this type

- You do not decide eligibility, severity or approval. Never write that an exception is justified, approved or safe.
- **Some controls should not normally be excepted:** those preventing unacceptable security compromise, authorization bypass, tenant-isolation failure, irreversible data loss, exposure of secrets, unlawful data handling, inability to recover critical systems, or falsified evidence. If the request touches one, say so at the top, advise that a person with authority decide before any work, and for a real emergency point to the incident process instead (`/engineering-governance:operations incident`). Still write the draft if the user insists.
- Reasons, owners, approvers and dates come from the user. Never invent them. A draft with many `Not confirmed:` fields is the correct result.

## Steps

1. **Ask the user** for: the repository (if several), the control or requirement to be excepted (the control ID if they know it), why, what part of the code or process is covered, how long it is needed, who owns it, what mitigates the risk meanwhile, and what would end the exception. Accept partial answers. If a governance pack exists at `.governance/governance-pack.json`, read it (do not change it) to find the control and any existing exception or debt for it, and cite them.
2. **Check against the repository (read-only):** the files the exception would cover and any evidence of the risk or the existing mitigation.
3. **Write `<EXC-id or slug>.md`** to `<repository>/.governance/exception-drafts/<YYYY-MM-DD>/` with the record's fields: Exception ID, Title, Status (`Draft, not submitted`), Requesting Team, Owner, Approver, Standard, Requirement, Reason, Scope, Risk, Severity (`Not confirmed:`), Alternatives Considered, Mitigation, Residual Risk, Start Date, Expiration / Review Date, Success / Exit Criteria, Related Debt, Related Incident, Related Release, Evidence, Decision, Approval. Anything not supplied or read is `Not confirmed:`.
4. Write `index.md` and give the final message, as the rules say. Then show the user, as text, the command that would record the request in the pack, filled in from what they gave you, and tell them to run it themselves once a person has reviewed the draft (do not run it): `node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" exception request <repository> --id <EXC-id> --control <control-id> --reason "<reason>" --by <name>`. Approval is a separate step that needs a person with the right authority.
