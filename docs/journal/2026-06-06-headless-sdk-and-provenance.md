# 2026-06-06: Headless SDK Direction and Construction Provenance

## Summary

The project direction sharpened around Euclid as headless geometry infrastructure for edTech products rather than a monolithic geometry applet.

The near-term differentiator is now explicit: make construction meaning inspectable and assessable through package APIs before growing the app surface or adding many construction tools.

## Strategic Direction

Added `docs/strategy/headless-edtech-sdk.md`.

The core positioning:

- `@euclid/geometry` should be the flagship package.
- The kernel should work without React, rendering, a DOM, or a browser.
- Rendering and React should remain optional interpreters.
- EdTech integrations should be able to inspect construction semantics, not just embed a finished app.

Deferred work remains deferred:

- no LTI work yet
- no hosted runtime yet
- no analytics storage
- no package publishing split until public API surfaces are curated

## Provenance API

Added `packages/geometry/src/explain.ts`.

The new API includes:

- `explainConstruction`
- `traceDependencies`
- `traceDependents`

`explainConstruction` returns structured provenance for a construction:

- direct parent constructions
- direct dependent constructions
- exact meaning, when graph-valid
- approximate primitive, when currently realized
- diagnostics for graph or realization failures
- a short human-readable explanation

This preserves the meaning/realization distinction. A construction can have exact meaning but no current primitive, and explanations expose that state directly.

## Validation

Focused validation passed:

```bash
npx vitest run packages/geometry/src/explain.test.ts packages/geometry/src/evaluate.test.ts packages/geometry/src/edit.test.ts
npm run typecheck
```
