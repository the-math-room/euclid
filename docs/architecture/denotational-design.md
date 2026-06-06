# Denotational Design Notes

Euclid models a construction as a small program whose meaning is geometric.

The core distinction:

- **Syntax**: typed construction records authored by users and tools.
- **Meaning**: exact construction expressions and provenance derived from syntax.
- **Realization**: approximate numeric primitives derived from meaning for rendering and interaction.
- **Dependency graph**: explicit references between construction records.
- **Document**: versioned persisted data containing a construction program.
- **Rendering**: renderable scene data derived from evaluated primitives.
- **Presentation**: React, SVG, DOM controls, exports, and editor affordances.

React owns composition and presentation. The geometry core owns meaning. Rendering converts approximate realization into scene data but does not own construction semantics.

Euclid should favor meaning over representation in the Conal Elliott sense: first state what a construction denotes, then choose representations and algorithms that preserve that denotation. Floating point coordinates, vector arithmetic, and complex-number formulas are implementation techniques for approximate realization. They are not the ground truth of a construction document.

Package-layer functions should be memoizable in theory: their meaning comes from explicit inputs, not ambient effects or hidden mutable module state.

Source order is not semantic order. A document is evaluated by its dependency graph, and invalid graph structure produces diagnostics rather than partial implicit behavior.

## Meaning vs. Realization

Evaluation currently exposes both:

- `meanings`: graph-valid exact construction expressions.
- `primitives`: approximate realized primitives suitable for rendering.

These are produced by separate modules:

- `evaluate.ts` handles topological ordering and meaning extraction.
- `realize.ts` handles approximate numeric computation.
- `approx.ts` contains shared floating-point geometry helpers.

A construction can have meaning without a current approximate primitive. For example, a line through two point dependencies is still an authored construction expression, but if those points currently coincide, there is no realized line primitive to render. A line-line intersection of parallel lines has meaning (it _is_ an intersection construction) but no current realization. Dependent realizations should disappear and reappear as their dependencies become constructible again.

This separation is not merely organizational. It preserves the option of exact arithmetic, symbolic representations, or algebraic number fields in the meaning layer while keeping approximate realization for display. The meaning layer should eventually be the canonical representation for correctness, export, proof, and theorem checking. The realization layer is for pixels.

## Construction Edits

Construction edits are pure transformations in `edit.ts`:

- `moveFreePoint`: relocates a free point. Returns the original program reference unchanged if the point is not found, is not free, or the position has not changed.
- `addLineThroughPoints`: adds a line with idempotent duplicate detection and stable dependency-based IDs.
- `addLineLineIntersection`: adds an intersection point with automatic label generation.

Construction-adding edits return `{ program, id, changed }` so app commands can select the construction the edit denotes without rediscovering IDs. Edit results should preserve structural identity when nothing changes, enabling cheap reference equality checks in React and history management.

## Layer Map

- `packages/geometry/src`: construction syntax, dependency graph, exact meaning, approximate realization, and pure edit transformations.
- `packages/assessment/src`: reference assessment predicates over construction programs and evaluations.
- `packages/document/src`: versioned document data, history container, and seed/example documents.
- `packages/rendering/src`: viewport projection, label layout, hit testing, and renderable scene descriptions.
- `apps/web/src`: React components that compose documents, evaluation, rendering, and controls.

Cross-layer imports use package-style entrypoints such as `@euclid/geometry`.

The rendering layer models the 2D head-on view as a camera:

- **Viewport**: screen extent.
- **View camera**: world center, rotation, scale, and screen offset.
- **Screen view**: viewport plus camera.

Pan, zoom, and rotation are camera operations. They are not SVG transform shortcuts and do not alter construction meaning.

Camera pan commands describe camera motion. Panning updates the camera's world center so the visible viewport center remains the rotation pivot. Direct manipulation gestures may invert pointer deltas before applying camera motion so the scene follows the pointer.

The dependency direction is intentionally one-way:

```text
app -> document -> geometry
app -> assessment -> geometry
app -> rendering -> geometry
```

Geometry does not know about documents, rendering, interaction, or React. Rendering does not know about documents or React. Document code does not know about rendering or React.

## Current Domain

The initial domain supports:

- Free points.
- Lines through two points.
- Circles with a center point and point on circumference.
- Line-line, line-circle, and circle-circle intersection points.

This is deliberately small. It gives future construction operations a clear pattern without pretending the domain is complete.

## Label Layout

Point labels are placed by an optimization-based layout engine (`labelLayout.ts`) during scene construction. The engine evaluates 8 compass positions × 3 distance rings per label, scores candidates against obstacles (other points, lines, circles, viewport boundaries), and uses greedy hill-climbing for multi-label coordination. Label placement is a rendering concern, not a construction concern.

## Interaction Model

The current interaction model uses modal tools:

- **Select mode**: tap to select, drag to pan, multi-touch pinch to zoom, drag free points to reposition.
- **Point mode**: tap to add a free point or construct a curve intersection. Intersection snapping is automatic: when the point tool detects a tap near a curve crossing, it creates an intersection construction rather than a free point.
- **Line mode**: tap two points to construct a line through them.

Point drag batches the entire gesture into a single undo step by snapshotting the program at drag start and pushing it to history at drag end.

## Aspirational Design Principles

The following principles guide future development even where the current implementation has not fully realized them:

- **Exact arithmetic**: the meaning layer should eventually support exact or symbolic representations, not just floating-point approximations. Current realization uses IEEE 754 doubles, which is adequate for display but not for correctness proofs or symbolic export.
- **Construction programs as first-class values**: a construction program should be composable, diffable, and transformable as a value. The current `ConstructionProgram` type is a step toward this but does not yet support composition of sub-constructions.
- **Multiple interpretations**: the same construction program should support multiple interpretations — rendering, export, validation, proof checking, animation — without privileging any one. The current architecture separates meaning from rendering but has only one interpretation pathway.
- **Algebraic structure**: construction operations should eventually form algebraic structures (semigroups, monoids) where composition laws hold by construction. The current edit module is a step toward this.

## Extension Pattern

To add a construction:

1. Add a case to `Construction` in `packages/geometry/src/model.ts`.
2. Add the evaluated primitive shape if needed.
3. Add its dependency extraction to `packages/geometry/src/dependencies.ts`.
4. Implement the meaning in `packages/geometry/src/evaluate.ts`.
5. Implement approximate realization in `packages/geometry/src/realize.ts`.
6. Keep invalid dependencies and absent/degenerate realization explicit as diagnostics.
7. Add scene conversion in `packages/rendering/src/scene.ts`.
8. Add hit testing in `packages/rendering/src/interaction.ts` if the shape is selectable.
9. Add rendering in both `packages/rendering/src/canvasRenderer.ts` and `packages/rendering/src/svgRenderer.ts`.
10. Render the new scene item in `apps/web/src/WorkspaceView.tsx`.
11. If the construction can be created interactively, add an edit function in `packages/geometry/src/edit.ts` and wire it through `apps/web/src/construction/useConstructionController.ts`.

The target style is algebraic and boring: explicit data, explicit cases, no implicit mutation.
