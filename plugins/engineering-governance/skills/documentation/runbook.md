# Type: runbook

Operational runbooks for the people who run this software, drafted from what the repository shows. Someone may follow these during an incident, so a wrong step is worse than a missing one: when unsure, write `Not confirmed:`.

## Steps

1. **Plan and ask.** Choose the repository (the one named, or ask if several). Read CI/CD files, Dockerfiles, deploy and infrastructure files, manifest scripts, configuration and environment-variable names (not values), health and readiness endpoints, logging, metrics and alert definitions, and the README and docs. List the runbooks the evidence supports, from: **deploy**, **rollback**, **start, stop and health check**, **configuration and secrets** (setting names only), **common failures** (from error handling and logs), **monitoring and alerts** (what each alert means), **backup and restore** (only if a data store is present). Skip a runbook with no evidence and say so. Show the list, say this reads a fair amount of code and uses tokens, and **wait for a yes**. Let them remove items.
2. **Write each runbook, one at a time,** to `<repository>/.governance/runbooks/<YYYY-MM-DD>/<topic>.md` with these sections: *When to use this*, *Before you start* (access and tools it needs), *Steps* (numbered; every command copied from a script, CI file or document you read, with the file cited; never composed by you), *How to check it worked*, *If it fails* (rollback or the next safe step), *Who to ask* (write `Not confirmed:`; never invent a name, team or contact).
3. State at the top of every runbook: **these steps have not been run or tested.** Test them in a non-production environment first.
4. Write `index.md` and give the final message, as the rules say.
