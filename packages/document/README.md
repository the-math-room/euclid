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
- `src/codec.ts`: public parse and serialize facade.
- `src/documentDecoder.ts`: document envelope and construction-program decoder.
- `src/constructionDecoder.ts`: construction variant decoder.
- `src/jsonDecoder.ts`: small JSON decoding primitives shared by document decoders.
- `src/seed.ts`: seed document.
- `src/index.ts`: public package entrypoint.

## Public API

The package entrypoint uses explicit named exports. Treat these groups as the intentional document surface:

- Document model and fixture: `EuclidDocument`, `seedDocument`.
- Codec boundary: `DocumentParseResult`, `parseEuclidDocument`, `serializeEuclidDocument`.
- Pure history wrapper: `DocumentHistory`, `createHistory`, `pushState`, `undo`, `redo`, `canUndo`, `canRedo`.

Do not add wildcard exports to `src/index.ts`. New public exports should be named intentionally.

## Change Pattern

When changing persistence, keep the document version explicit and add codec tests for accepted and rejected input.

## Instructions for LLM Agents

### 1. Architectural Guardrails (Enforced by Tests)

- **Zero UI/React/External Imports**: This package must NOT import React, DOM, or UI styling/icons libraries.
- **Pure Functions Only**: Do not use global mutable state or module-level variables. All functions must be deterministic and side-effect free.
- **No Console Logging**: The use of `console` APIs in production files is prohibited and will cause Vitest architecture checks to fail.
- **Strict Layering**: May import `@euclid/geometry` but must NOT import `@euclid/rendering` or app packages.

### 2. History & Persistence Boundaries

- **Document History**: Design document state transitions (`DocumentHistory`) as pure functional state wrappers (e.g. `undo`, `redo`, `pushState`, `canUndo`, `canRedo`) in `src/history.ts`.
- **History Snapshot Deduplication**: Ensure consecutive identical document states are filtered out when pushing to history to prevent duplicate state history snapshots.
- **Codec Schema Validation**: Keep document parsing/serialization validation checks defined explicitly in `src/codec.ts`.

### 3. Verification Command

Always run the validation suite before finishing:

```bash
npm run check
```
