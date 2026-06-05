# Geometry Package

Owns construction meaning.

## Owns

- Construction syntax types.
- Dependency extraction and graph shape.
- Deterministic evaluation into geometric primitives.
- Geometry diagnostics.

Functions in this package should be memoizable in theory.

## Must Not Own

- Documents, persistence, or schema migration.
- Rendering, projection, SVG, Canvas, or DOM.
- React, browser state, or user interaction.

## Allowed Imports

- Local geometry modules.
- Small dependency-free utilities if they become justified.

## Key Files

- `src/model.ts`: construction and evaluated primitive types.
- `src/dependencies.ts`: dependency extraction and graph construction.
- `src/evaluate.ts`: construction semantics.
- `src/index.ts`: public package entrypoint.

## Change Pattern

When adding construction meaning, update model, dependency extraction, evaluator, and geometry tests together.
