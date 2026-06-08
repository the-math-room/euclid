# 2026-06-07: Zod Content Boundaries

## Summary

Added Zod at userland JSON/content boundaries.

The document, assessment-goal, and lesson parsers still return their existing result shapes and preserve the diagnostic strings covered by tests. Internally, persisted content parsing now uses Zod schemas rather than handwritten structural decoder helpers.

## What Changed

Added `zod` as a runtime dependency.

`packages/document/src/documentDecoder.ts` now uses a Zod schema for:

- `schemaVersion`
- `title`
- `program.constructions`

`packages/document/src/constructionDecoder.ts` now uses Zod schemas for all supported construction variants, including fixed tuple dependencies and `0 | 1` intersection indexes.

The decoded free-point path still brands plain JSON point objects into `WorldPoint` before returning a typed `Construction`.

Removed the old `jsonDecoder.ts` primitive helper module. Zod now owns the primitive JSON shape checks for this boundary.

`packages/assessment/src/goalCodec.ts` now uses Zod schemas for:

- recursive `all` / `any` goals
- construction-kind, dependency, meaning, incidence, and geometric-equivalent goals
- construction expressions
- target constructions
- tolerance objects

`packages/lesson/src/codec.ts` now uses Zod for the lesson envelope and activity policy. Nested starter documents and goals still delegate to the public document and assessment parsers so package boundaries stay intact.

## Why It Matters

This keeps the architectural direction from the parse-boundary work while reducing local parser machinery:

- JSON/content boundaries use explicit runtime schemas.
- The document package still adapts schema output into geometry domain types.
- Assessment and lesson content now follow the same boundary pattern.
- Geometry evaluation remains responsible for semantic validity, dependency graph diagnostics, and realizability.
- Public parser diagnostics remain stable for callers and lesson composition.

The intent is to keep Zod at content boundaries rather than pushing schema logic into geometry evaluation or edit operations.

## Verification

Ran full validation:

```bash
npm run check
```

Result: lint, format check, app/test typecheck, Vitest, and Vite production build all passed. The test suite reported 34 passing test files and 213 passing tests.
