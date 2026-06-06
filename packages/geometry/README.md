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
- `src/edit.ts`: pure construction edit helpers.
- `src/evaluate.ts`: construction semantics.
- `src/index.ts`: public package entrypoint.

## Change Pattern

When adding construction meaning, update model, dependency extraction, evaluator, and geometry tests together.

## Instructions for LLM Agents

### 1. Architectural Guardrails (Enforced by Tests)

- **Zero UI/React/External Imports**: This package must NOT import React, DOM, or UI styling/icons libraries.
- **Pure Functions Only**: Do not use global mutable state or module-level variables. All functions must be deterministic and side-effect free (free from `Date`, `fetch`, `Math.random`, etc.).
- **No Console Logging**: The use of `console` APIs in production files is prohibited and will cause Vitest architecture checks to fail.
- **JSON-Serializable Output**: Ensure all geometry models (`Construction`, `EvaluatedPrimitive`) remain serializable.

### 2. Extending Geometry

- **Add a New Primitive**: Follow the checklist in [add-a-construction.md](file:///home/johna/Projects/euclid/docs/how-to/add-a-construction.md).
- **Discriminated Union**: Always extend the `Construction` union in [model.ts](file:///home/johna/Projects/euclid/packages/geometry/src/model.ts) using a unique `kind` field.
- **Dependency Graph**: Implement transitively correct dependency calculations in [dependencies.ts](file:///home/johna/Projects/euclid/packages/geometry/src/dependencies.ts) (e.g. `transitiveDependentsOf`, `deleteConstructions`).

### 3. Verification Command

Always run the validation suite before finishing:

```bash
npm run check
```
