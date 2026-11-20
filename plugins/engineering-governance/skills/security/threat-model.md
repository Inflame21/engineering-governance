# Type: threat-model

A threat model for the repository, following the security standard's threat-modeling section (assets, actors, trust boundaries, entry points, data flows, privileged operations, abuse cases, failure modes, controls, residual risk). It describes **what could go wrong and what the code does about it**. It is not a list of vulnerabilities and never says the system is secure.

## Extra rules for this type

- Describe threats at the level of category and consequence (for example "a client could send another tenant's ID and read its records if no check exists at `file:line`"). **No exploit code, payloads or step-by-step attack instructions.**
- A control exists only if you read it. A control you looked for and did not find is written as `No control found at <where you looked>`, never as a vulnerability confirmed by testing; nothing was tested.
- Do not read secrets (see the rules); name the setting and the file only.

## Steps

1. **Plan and ask.** Choose the repository (the one named, or ask if several). Run `node "${CLAUDE_PLUGIN_ROOT}/bundle/governance.mjs" analyze <repository> --json`, then read the entry points (routes, handlers, CLI commands, message consumers, scheduled jobs, webhooks), authentication and authorization code, data models and stores, configuration names, external-service clients, CI/CD and deployment files. List the **boundaries** you will model (browser to backend, public API to internal services, service to service, application to database, application to third party, user-supplied file to application, CI/CD to environment), each with the folder you will read. Show the list, say this reads a fair amount of code, and **wait for a yes**. Let them remove boundaries.
2. **Write `threat-model.md`** to `<repository>/.governance/security/<YYYY-MM-DD>/` with these sections, each statement cited:
   - **System in one paragraph** and what was read.
   - **Assets**: what is worth protecting (data kinds, credentials, privileged operations), where it lives.
   - **Actors**: who and what interacts (anonymous user, signed-in user, admin, other service, CI), from the roles the code shows.
   - **Entry points** and **trust boundaries**, each with its location.
   - **Data flows** for the sensitive data: where it enters, is stored, leaves.
   - **Threats per boundary**, as a table: boundary, category (spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege, injection, account takeover, abuse of business workflow), what could go wrong, **control found** (cited) or `No control found at ...`, and the question a person must answer.
   - **Abuse cases**: a few business-workflow misuses the code makes possible or hard.
   - **Residual risk**: `Not confirmed:`. A person decides this; do not rate the system.
3. Write `index.md` and give the final message, as the rules say. Tell the user that nothing was tested, that absence of a threat here is not proof it does not exist, and that a security reviewer must check and extend this model.
