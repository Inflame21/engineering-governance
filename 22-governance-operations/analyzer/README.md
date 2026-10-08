# Repository Analyzer

The repository analyzer is the boundary between implementation-specific repositories and the language-neutral governance engine.

It discovers repository facts and delegates implementation analysis to adapters.

## Design rule

Analyzers MUST produce normalized governance signals and evidence.

They MUST NOT make production decisions.

```
Repository
   ↓
Repository Analyzer
   ↓
Language / Framework Adapters
   ↓
Normalized Signals + Evidence
   ↓
Rule & Control Engine
```

A new language or framework should normally require an adapter, not changes to the governance engine.
