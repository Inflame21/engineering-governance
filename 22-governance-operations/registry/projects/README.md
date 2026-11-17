# Project registry

One JSON file per governed project, named `<project-id>.json`, following [project-registration.schema.json](../../model/project-registration.schema.json). See [example-project-registration.json](../../model/example-project-registration.json) for a complete record.

No projects are registered yet. This registry is a proposal from the operating blueprint (GOV-F09) and is not yet approved policy.

## Rules

- `id` is unique across the registry and matches `project.id` in the project's governance pack.
- A repository belongs to at most one registered project.
- `profiles.architecture` must name an existing architecture profile.
- Owners may be the placeholder `UNASSIGNED` while a project is `ONBOARDING`. That is an explicit ownership gap, not a pass. An `ACTIVE` project must name a technical owner and a governance representative.
- Record only names and source-control handles. Do not put credentials, personal contact details or customer data in registry records.

## Validating

```bash
node 22-governance-operations/cli/dist/cli/src/index.js validate . --registry 22-governance-operations/registry/projects
```

Validation fails when the path holds no `.json` records, because validating nothing is not a pass. Until the first project is registered, the command above therefore exits 3 by design. CI validates every committed record through the CLI test suite.
