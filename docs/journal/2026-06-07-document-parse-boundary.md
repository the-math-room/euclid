# 2026-06-07: Document Parse Boundary

## Summary

Moved the document codec closer to “parse, don’t validate” by making `parseEuclidDocument` construct typed construction records from unknown JSON instead of shallow-checking the document envelope and casting construction entries.

This is intentionally a small step. Euclid does not yet know the final shape of user-authored tools, curriculum authoring, assessment references, migrations, or future construction extensions. The change hardens the current persisted document boundary without introducing a schema framework or pretending the broader content model is settled.

## What Changed

`packages/document/src/codec.ts` now decodes every supported construction kind explicitly:

- `free-point`
- `line-through`
- `circle-through`
- `circle-three-points`
- `line-line-intersection`
- `line-circle-intersection`
- `circle-circle-intersection`
- `parallel-line`
- `perpendicular-line`
- `midpoint`

The codec now constructs each `Construction` variant directly on success. Unknown or malformed JSON is rejected before it enters the typed geometry core.

The free-point coordinate path also now rejects missing or malformed `position` records consistently, while still branding valid decoded JSON coordinates with `toWorldPoint`.

## Why It Matters

The previous codec validated that `program.constructions` was an array, handled one free-point coordinate case, and then cast remaining values to `Construction`. That let invalid persisted documents become typed `EuclidDocument` values.

The new boundary better matches the architectural commitments:

- JSON remains plain persisted data.
- `document` owns parsing and serialization for versioned documents.
- `geometry` receives typed construction syntax instead of unchecked shape assertions.
- World-space free-point coordinates are branded at the JSON boundary.

This also makes the coordinate-branding journal entry true in the stronger sense: malformed free-point positions no longer fall through to a cast path.

## Tests

Added document codec coverage for:

- round-tripping every currently supported construction kind
- rejecting unsupported construction kinds
- rejecting malformed free-point positions
- rejecting malformed dependency tuples
- rejecting invalid intersection indexes

## Verification

Ran focused and full validation:

```bash
npx vitest run packages/document/src/architecture.test.ts
npm run typecheck:app
npm run typecheck:test
npm run check
```

Result: focused document tests passed, app and test typechecking passed, and the full workspace check passed. The full test suite reported 34 passing test files and 213 passing tests.
