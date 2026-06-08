# Future Feature Backlog

This backlog captures known future features and design pressure. It is LLM-facing: use it to route attention, preserve intent, and avoid treating old debt as a new discovery.

Items here are not commitments for the next change. Before implementing any item, still inspect the relevant package README and existing tests.

## Point Movement And Mobility

### Drag Fixed Points Directly

Current behavior treats `mobility: "fixed"` as immovable for point movement and constraint solving.

Desired behavior: when the user directly clicks and drags a fixed point, it should move anyway. "Fixed" should mean fixed for solver and dependent automatic movement, not impossible for the author to edit.

Likely shape:

- Keep `mobility: "fixed"` as authored geometry state.
- Add an explicit edit command or drag mode that represents direct author intent.
- Preserve solver behavior: fixed points remain immovable when satisfying constraints.
- Update UI copy if "fixed" becomes misleading; possible language: `anchored`, `pinned for solving`, or `fixed for constraints`.

### Drag Fully Derived Points By Translating Their Inputs

Desired behavior: when a point is fully derived from other points, clicking and moving that derived point should translate the point and all points it is derived from by the same vector.

Example: dragging a midpoint should translate both endpoints by the drag vector, preserving the midpoint relationship.

Likely shape:

- Geometry should expose a pure edit command for derived-point translation.
- Use dependency/provenance information to identify the upstream free points that determine the selected point.
- Respect point mobility and activity policy.
- Return an error or no-op when the derived point depends on immovable or non-translatable inputs.

Open design question: this should probably be limited to derived points whose dependency cone resolves to free points with a coherent translation, not arbitrary construction graphs.

## Measurement And Solver Features

### Angle Measures

Implement angle measures much like segment length measurements.

Desired behavior:

- Author angle measurements over three point ids or two rays/lines once those exist.
- Support numeric and algebraic expressions.
- Evaluate against current geometry with diagnostics.
- Render angle labels with layout support.
- Later allow angle constraints to participate in solver behavior.

Likely geometry work:

- Add an angle measurement variant to the measurement model.
- Extend geometry-owned schemas and document decoding through existing geometry schemas.
- Extend `evaluateMeasurements` or split measurement evaluation by measurement kind.
- Add rendering scene items for angle labels/arcs.
- Keep assessment as a consumer, not the owner, of angle semantics.

### Constraint-Respecting Point Drag

Desired behavior: dragging points should respect authored constraint measurements instead of freely invalidating them.

Likely shape:

- Treat drag as a proposed edit followed by local constraint solving.
- Preserve explicit rules for what may move.
- Avoid guessing when multiple constrained points could move.
- Surface constraint conflicts during drag instead of only after mouseup.

This is a major ergonomics feature and should build on the existing measurement constraint behavior rather than bypass it in React.

### Global Solver

Desired behavior: a global solver button solves all constraints simultaneously.

Likely shape:

- Geometry owns the solver entrypoint and result diagnostics.
- The app exposes the command and shows a solution report.
- The solver should distinguish unsupported systems, inconsistent systems, underconstrained systems, and successful solves.
- Initial implementation may support a narrow class of systems but must report unsupported cases explicitly.

This should not be implemented by repeatedly clicking local `Solve endpoint` commands in the app. It needs a geometry-level plan for the whole constraint system.

## New Construction Meanings

### Angle Bisector

Implement angle bisector as a construction.

Likely shape:

- Add a construction variant in geometry.
- Define dependencies, exact meaning, approximate realization, explanation, schemas, edits, rendering/hit testing, tool sessions, and tests.
- Follow `docs/how-to/add-a-construction.md`.

Open design question: decide whether the authored input is three points, two rays, two lines, or a mix once rays/segments exist.

### Line Segments And Rays

Implement line segments and rays as first-class constructions or authored shape variants.

Desired behavior:

- Segment: finite shape between two points.
- Ray: half-line from an origin through another point.
- They should participate in rendering, hit testing, snapping, measurements, assessment, and future constraints.

Open design question: decide whether segment/ray are new construction meanings or presentation/domain variants of line-through. They likely need distinct meaning because incidence, hit testing, and snapping differ from infinite lines.

## Snapping And Input

### Snap New Points To Curves

Desired behavior: when placing a new point near a line, circle, segment, or ray, the point should snap to the curve.

Likely shape:

- Hit testing/picking may identify nearby curves in rendering or app interaction space.
- Geometry must still own the resulting authored construction meaning.
- Snapping to an existing curve should probably create a dependent point-on-curve construction, not a free point with coincident coordinates.

Open design question: introduce explicit `point-on-line`, `point-on-circle`, `point-on-segment`, and `point-on-ray` construction variants, or route through another constraint mechanism.

## Cross-Cutting Rules

- Put new construction meaning in `packages/geometry/src`.
- Keep React as command routing and interpretation, not semantic ownership.
- Add focused tests for both success and refusal/unsupported behavior.
- Preserve explicit dependency graph evaluation.
- Update LLM-facing docs when a feature uncovers a reusable pattern.
