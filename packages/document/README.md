# Document Package

Purpose: versioned persistent document data and pure document history.

Read this when changing persisted document shape, document parsing, serialization, seed documents, or history behavior.

## Owns

- `EuclidDocument` envelope.
- Document schema version.
- Public parse/serialize facade.
- Zod-backed document and construction-program decoding.
- Persistence of geometry-owned construction-program fields such as constructions and measurement assertions.
- Seed document.
- Pure undo/redo history wrapper.

## Does Not Own

- Construction meaning, realization, editing, or assessment.
- Measurement-expression semantics.
- Rendering, projection, SVG, Canvas, DOM, React, or browser interaction.
- Lesson composition.

## Start Here

- `src/model.ts`: document model.
- `src/codec.ts`: public text parse/serialize facade.
- `src/documentDecoder.ts`: object decoder for document envelope and program shape.
- `src/constructionDecoder.ts`: construction decoder using geometry-owned construction schemas.
- `src/history.ts`: pure history state transitions.
- `src/seed.ts`: reference seed document.
- `src/index.ts`: explicit public entrypoint.

## Local Rules

- Parse unknown content into typed domain values at the boundary. Do not cast persisted construction JSON into `Construction`.
- Decode geometry-owned program fields using geometry-owned schemas where available; do not redefine their semantics in this package.
- Document code may depend on `@euclid/geometry`; it must not depend on rendering, lesson, assessment, activity, app, or UI libraries.
- Keep string parsers as text-boundary conveniences and object decoders as package-composition APIs.
- History transitions must be pure and preserve useful identity/no-op behavior.
- Public exports in `src/index.ts` must be explicit and intentional.

## Tests

- Codec and boundary behavior: `src/architecture.test.ts`.
- History behavior: `src/history.test.ts`.
- Full verification for code changes: `npm run check`.
