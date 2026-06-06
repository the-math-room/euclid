# Geometry Package

Owns construction meaning.

## Owns

- Construction syntax types.
- Dependency extraction and graph shape.
- Deterministic evaluation into exact construction meanings.
- Approximate realization into geometric primitives for downstream interpreters.
- Pure construction editing transformations.
- Construction provenance and explanation for headless inspection.
- Approximate floating-point geometry helpers.
- Point label generation.
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
- `src/dependencies.ts`: dependency extraction, graph construction, transitive dependents, cascading deletion.
- `src/evaluate.ts`: graph planning and exact construction meaning. Delegates to `realize.ts` for approximate primitives.
- `src/explain.ts`: construction provenance, direct parents/dependents, transitive traces, realization state, and diagnostics for headless inspection.
- `src/realize.ts`: approximate numeric realization. Converts constructions to floating-point primitives. Produces diagnostics for degenerate or invalid geometry.
- `src/approx.ts`: shared floating-point geometry helpers (`lineLineIntersection`, `samePoint`, `cross`). Used by both `realize.ts` and `@euclid/rendering` for interaction hit testing.
- `src/edit.ts`: pure construction edit helpers (`moveFreePoint`, `addLineThroughPoints`, `addLineLineIntersection`). Construction-adding edits return `{ program, id, changed }` and preserve the original program reference for no-op edits.
- `src/names.ts`: point label generation (`generateNextPointLabel`).
- `src/index.ts`: public package entrypoint.

## Public API

The package entrypoint uses explicit named exports. Treat these groups as the intentional SDK surface:

- Model and branded coordinates: `ConstructionProgram`, `Construction`, `ConstructionExpression`, `EvaluatedPrimitive`, `Evaluation`, `Point2`, `WorldPoint`, `ScenePoint`, `toWorldPoint`, `toScenePoint`.
- Evaluation and realization: `evaluateConstruction`, `realizeConstructions`.
- Pure edits: `moveFreePoint`, `addLineThroughPoints`, `addCircleThroughPoints`, `addCircleThreePoints`, `addLineLineIntersection`, `addLineCircleIntersection`, `addCircleCircleIntersection`, `translateShape`.
- Dependency inspection and deletion: `dependencyIds`, `dependencyGraphFor`, `transitiveDependentsOf`, `deleteConstructions`.
- Provenance: `explainConstruction`, `traceDependencies`, `traceDependents`.
- Floating-point helpers used by interpreters: `lineLineIntersection`, `lineCircleIntersections`, `circleCircleIntersections`, `samePoint`, `cross`, `dot`.
- Naming: `generateNextPointLabel`.

Do not add wildcard exports to `src/index.ts`. New public exports should be named intentionally.

## Meaning And Realization

The construction graph is the ground truth. Evaluation produces two distinct things:

- `meanings`: graph-valid exact construction expressions. These capture _what a construction is_ — its provenance, references, and structural role — independent of any floating-point computation.
- `primitives`: approximate floating-point realizations used by rendering, hit testing, and interaction. These capture _what a construction currently looks like_.

A construction can have meaning without a current realization. For example, a line through two coincident points is still a valid construction expression, but there is no realizable line primitive to render. Dependent realizations should disappear and reappear as their dependencies become constructible again.

Floating coordinates and complex-number style helpers are allowed as realization techniques, not as the document's semantic ground truth. This distinction matters because future extensions may use exact arithmetic, symbolic representations, or algebraic number fields for the meaning layer while keeping approximate realization for display.

## Change Pattern

When adding construction meaning, update model, dependency extraction, exact meaning, realization, and geometry tests together. Follow the checklist in `docs/how-to/add-a-construction.md`.

## Headless Inspection

The geometry package should be useful without React, rendering, or a browser. `explainConstruction` turns a construction plus an evaluation into structured provenance:

- direct parent constructions
- direct dependent constructions
- exact meaning, when graph-valid
- approximate primitive, when currently realized
- diagnostics explaining graph or realization failures

This is intentionally semantic rather than visual. Learning systems can inspect what a learner constructed, not just where pixels ended up.

## Instructions for LLM Agents

### 1. Architectural Guardrails (Enforced by Tests)

- **Zero UI/React/External Imports**: This package must NOT import React, DOM, or UI styling/icons libraries.
- **Pure Functions Only**: Do not use global mutable state or module-level variables. All functions must be deterministic and side-effect free (free from `Date`, `fetch`, `Math.random`, etc.).
- **No Console Logging**: The use of `console` APIs in production files is prohibited and will cause Vitest architecture checks to fail.
- **JSON-Serializable Output**: Ensure all geometry models (`Construction`, `EvaluatedPrimitive`) remain serializable.
- **Coordinate Branding**: Enforce type-safety between the world-space coordinate system (`WorldPoint`) and the screen-relative viewport coordinates (`ScenePoint`). They are compile-time incompatible brands. All point operations must preserve these types, and coordinate conversion must occur at boundaries using conversion helpers.

### 2. Extending Geometry

- **Add a New Primitive**: Follow the checklist in `docs/how-to/add-a-construction.md`.
- **Discriminated Union**: Always extend the `Construction` union in `src/model.ts` using a unique `kind` field.
- **Dependency Graph**: Implement transitively correct dependency calculations in `src/dependencies.ts` (e.g. `transitiveDependentsOf`, `deleteConstructions`).
- **Meaning vs. Realization**: Add the exact meaning case in `evaluate.ts` and the approximate realization case in `realize.ts`. These are separate responsibilities.
- **Edit Operations**: If the new construction can be created interactively, add a pure creation function in `edit.ts` with idempotent duplicate detection. Construction-adding edits should return `{ program, id, changed }` so app commands can select created or pre-existing constructions without duplicating canonicalization rules.

### 3. Verification Command

Always run the validation suite before finishing:

```bash
npm run check
```
