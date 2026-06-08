# Geometry Package

Purpose: construction syntax, construction meaning, dependency evaluation, approximate realization, and pure edit commands.

Read this before changing any construction semantics.

## Owns

- `Construction`, `ConstructionProgram`, construction expressions, evaluated primitives, diagnostics.
- Measurement settings, authored segment length assertions, assertion/driving intent, algebraic measurement expressions, and their pure evaluation.
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
- `src/measurement.ts`: measurement-expression parsing, unit/variable evaluation, and diagnostics for authored segment length assertions.
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
- Segment length assertions and measurement settings are authored geometric state. Keep their data shape and evaluation in geometry; assessment, rendering, and label layout may interpret evaluated results but should not own them.
- `intent: "driving"` records that a future solver may use the measurement as a constraint. Until solver behavior exists, driving measurements still only evaluate and report diagnostics.
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
