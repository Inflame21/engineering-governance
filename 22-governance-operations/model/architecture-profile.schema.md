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

## Component mappings and verification

`componentMappings` maps logical roles used by boundary rules to repository-relative glob patterns. For example:

```json
{
  "componentMappings": {
    "domain": ["src/domain/**", "domain/**"],
    "application": ["src/application/**", "application/**"],
    "infrastructure": ["src/infrastructure/**", "src/repositories/**"]
  }
}
```

Boundary rule `sourcePattern` and `targetPattern` values refer to these role names; a pipe separates alternatives (for example, `transport|ui|infrastructure`). A rule with `allowed: false` reports an edge when a source role imports a target role. Values in `requiredControls` are governance control IDs, not boundary-rule IDs; every required control must exist in the selected governance pack or the CLI returns `NO-GO`. Role mappings must match actual repository paths before a rule can be verified. A missing mapping, missing role, unresolved local import, source-content limit, or unsupported language produces a partial result rather than a clean pass.

The current dependency extractor resolves relative TypeScript/JavaScript imports and Python imports. It does not yet perform AST/type-aware analysis, resolve TypeScript path aliases, or build dependency graphs for other languages. Such cases are reported as unsupported/incomplete and must not be treated as proof of architectural conformance.
