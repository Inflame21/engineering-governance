# Architecture Profile Model

Architecture profiles express project-specific architectural constraints without embedding them in language analyzers or the core governance engine.

## Principles

- A project may select multiple compatible styles.
- Profiles describe constraints and required controls; they do not assert that the architecture has been verified.
- Boundary patterns are declarative inputs for analyzers. They are not executable source-code matchers by themselves.
- A profile may only be considered verified to the extent that the selected analyzers can inspect the relevant boundaries.
- Unsupported or ambiguous analysis must remain explicitly unverified.

## Current examples

- `architecture-profile-clean-architecture.json`
- `architecture-profile-microservices.json`

The initial patterns are illustrative logical labels. Before enforcement, map them to actual repository components using a project architecture manifest or analyzer-derived component graph.
