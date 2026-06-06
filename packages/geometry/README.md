# Geometry Package

Owns construction meaning.

## Owns

- Construction syntax types.
- Dependency extraction and graph shape.
- Deterministic evaluation into exact construction meanings.
- Approximate realization into geometric primitives for downstream interpreters.
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
- `src/approx.ts`: shared floating-point realization helpers.
- `src/dependencies.ts`: dependency extraction and graph construction.
- `src/edit.ts`: pure construction edit helpers.
- `src/evaluate.ts`: graph planning and exact construction meaning.
- `src/index.ts`: public package entrypoint.
- `src/realize.ts`: approximate numeric realization.

## Meaning And Realization

The construction graph is the ground truth. Evaluation exposes exact construction meanings separately from approximate primitives:

- `meanings`: graph-valid construction expressions and provenance.
- `primitives`: floating-point realizations used by rendering, hit testing, and interaction.

Floating coordinates and complex-number style helpers are allowed as realization techniques, not as the document's semantic ground truth.

## Change Pattern

When adding construction meaning, update model, dependency extraction, exact meaning, realization, and geometry tests together.

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
