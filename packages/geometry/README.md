# Geometry Package

Purpose: construction syntax, construction meaning, dependency evaluation, approximate realization, and pure edit commands.

Read this before changing any construction semantics.

## Owns

- `Construction`, `ConstructionProgram`, construction expressions, evaluated primitives, diagnostics.
- Measurement settings, authored segment length measurements, check/constraint intent, algebraic measurement expressions, and their pure evaluation.
- Free-point mobility (`free`/`fixed`) as authored geometry state.
- Branded world/scene coordinate types and constructors.
- Shared construction schemas for JSON/content boundaries.
- Dependency extraction and dependency graph evaluation.
- Exact construction meaning.
- Approximate realization into numeric primitives.
- Pure construction edits and deletion transforms.
- Construction provenance/explanation.
- Floating-point geometry helpers used by interpreters.

## Does Not Own

- Documents, persistence envelopes, lesson shells, or migrations.
- Rendering scenes, viewport projection, hit testing presentation, SVG, Canvas, DOM, or React.
- Activity policy or assessment goals.
- Browser effects, storage, network, randomness, time, or console logging.

## Start Here

- `src/model.ts`: construction ADT, expressions, primitives, diagnostics, branded coordinates.
- `src/constructionSchemas.ts`: Zod schemas for construction syntax at content boundaries.
- `src/measurement.ts`: measurement-expression parsing, unit/variable evaluation, and diagnostics for authored segment length measurements.
- `src/dependencies.ts`: dependency ids, graph, transitive dependents, deletion.
- `src/evaluate.ts`: graph planning and exact meaning.
- `src/realize.ts`: approximate realization and realization diagnostics.
- `src/approx.ts`: numeric geometry helpers.
- `src/edit.ts`: pure edit commands such as add/move/translate construction operations.
- `src/macro.ts`: data-driven macro expansion into ordinary construction records.
- `src/explain.ts`: provenance and headless inspection.
- `src/names.ts`: point label generation.
- `src/index.ts`: explicit public entrypoint.

## Local Rules

- Meaning and realization are separate. A construction may have meaning but no current primitive.
- Evaluation must use explicit dependency graph planning; source order is not semantic order.
- Add construction variants as discriminated-union cases, then update dependencies, meaning, realization, explanation, schemas, edits, and tests together.
- `shapeRole` is authored presentation intent for line/circle-producing constructions. Keep it on construction syntax and realized primitives; do not put it in exact construction expressions.
- `mobility` is authored state on free points. Fixed points remain points in the construction graph, but movement edits and constraint measurement application must treat them as immovable.
- Segment length measurements and measurement settings are authored geometric state. Keep their data shape and evaluation in geometry; assessment, rendering, and label layout may interpret evaluated results but should not own them.
- `intent: "constraint"` records that a future solver may use the measurement as a constraint. Until solver behavior exists, constraint measurements still only evaluate and report diagnostics.
- Constraint measurements can be applied by explicit behavior only: either calibrate the unit scale while keeping points fixed, or keep the unit scale and solve exactly one movable free endpoint. The solver supports one distance constraint by moving along the current endpoint ray, and two distance constraints by intersecting the two fixed-center circles while preserving the movable point's current side of the fixed baseline when possible. If zero, two, or too many endpoints can move, or the local distance system is unsolvable, return an error instead of guessing.
- Zod is allowed in `constructionSchemas.ts`; do not import it into evaluation, realization, or edit modules.
- Construction-adding edits return `{ program, id, changed }`.
- Edits that rebuild a `ConstructionProgram` must preserve program-level metadata such as measurements.
- No-op edits should preserve the original program reference.
- Macro expansion may assemble authored construction records, but macros must expand to ordinary construction variants rather than adding hidden geometry semantics.
- Use `toWorldPoint` and `toScenePoint` at boundaries. Raw branded casts belong only inside their constructors.
- Public exports in `src/index.ts` must be explicit and intentional.

## Tests

- Geometry behavior: `src/*.test.ts`.
- Measurement behavior: `src/measurement.test.ts`.
- Architecture guards: `src/architecture.test.ts` and `tests/architecture/*.test.ts`.
- When adding a construction, follow `docs/how-to/add-a-construction.md`.
- Full verification for code changes: `npm run check`.
