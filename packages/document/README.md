# Document Package

Owns versioned persistent data.

## Owns

- `EuclidDocument` shape.
- Seed and example documents.
- Parse and serialize boundaries.
- Future migrations between document schema versions.

Functions in this package should be memoizable in theory.

## Must Not Own

- Rendering, projection, or presentation.
- React or browser interaction.
- Construction semantics beyond referencing geometry types.

## Allowed Imports

- `@euclid/geometry`.
- Local document modules.

## Key Files

- `src/model.ts`: document model.
- `src/codec.ts`: parse and serialize functions.
- `src/seed.ts`: seed document.
- `src/index.ts`: public package entrypoint.

## Change Pattern

When changing persistence, keep the document version explicit and add codec tests for accepted and rejected input.
