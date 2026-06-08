# 2026-06-07: Shared Construction Schemas

## Summary

Moved construction Zod schemas into the geometry package so document and assessment parsing share one canonical construction grammar.

This is still a boundary-oriented parsing change, not a change to construction evaluation. Geometry now owns the syntax of construction data because construction shape is part of the construction model; document and assessment packages still own their user-facing parse diagnostics.

## What Changed

Added `packages/geometry/src/constructionSchemas.ts` with shared schemas for:

- construction kinds
- construction expressions
- full persisted constructions
- tuple dependency shapes
- intersection indexes
- plain JSON point objects

The shared module also exports `rawConstructionToConstruction`, which converts parsed raw construction JSON into the geometry domain type. Its only substantive conversion is branding a free point's plain `{ x, y }` JSON position into `WorldPoint`.

`packages/document/src/constructionDecoder.ts` now uses the shared construction schema and mapper instead of carrying a duplicate construction grammar.

`packages/assessment/src/goalCodec.ts` now uses the shared construction and construction-expression schemas for meaning goals and geometric-equivalent target constructions.

Updated the geometry README and repo map so future agents know that Zod is allowed in `constructionSchemas.ts`, but not in evaluation, realization, or edit modules.

## Why Zod Can Shape This Boundary

We are comfortable letting Zod shape this part of the design because it is an explicit parser for userland data. It turns untrusted JSON into typed domain values, and the schema it encourages is the same discriminated-union structure the geometry model already wants:

- construction data is serializable
- construction variants are explicit
- invalid external input is rejected at the boundary
- internal code receives stronger types and fewer casts

Zod is not deciding what a construction means. It is making the content grammar executable.

That makes it a good fit for "parse, don't validate": after parsing, the rest of the system can work with a `Construction` or `ConstructionExpression` instead of repeatedly checking loose object shapes.

## Why React Must Not Shape This Design

React has a different role. React is an interpreter of evaluated geometry into interface state and DOM/SVG output. If React starts shaping construction data, then UI convenience can leak into the semantic model:

- geometry may become organized around component lifecycle instead of dependency graphs
- rendering state may become the source of truth
- construction meaning may become coupled to pointer gestures, selection, or view state
- headless assessment and lesson tooling may inherit UI-only assumptions

Those are exactly the architectural failures this project is avoiding.

The rule is not "dependencies must never influence design." The rule is that a dependency may influence the design only at the layer where its concepts are legitimate.

Zod's concepts are legitimate at JSON/content boundaries. React's concepts are legitimate at UI interpretation boundaries. Neither should cross into geometry evaluation semantics.

## Verification

Ran full validation after the code change:

```bash
npm run check
```

Result: lint, format check, app/test typecheck, Vitest, and Vite production build all passed. The test suite reported 34 passing test files and 213 passing tests.
