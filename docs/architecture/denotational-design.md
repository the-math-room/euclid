# Denotational Design Notes

Euclid models a construction as a small program whose meaning is geometric.

The core distinction:

- **Syntax**: typed construction records authored by users and tools.
- **Semantics**: evaluated Euclidean primitives derived from those records.
- **Dependency graph**: explicit references between construction records.
- **Document**: versioned persisted data containing a construction program.
- **Rendering**: renderable scene data derived from evaluated primitives.
- **Presentation**: React, SVG, DOM controls, exports, and editor affordances.

React owns composition and presentation. The geometry core owns meaning. Rendering converts evaluated meaning into scene data but does not own construction semantics.

Package-layer functions should be memoizable in theory: their meaning comes from explicit inputs, not ambient effects or hidden mutable module state.

Source order is not semantic order. A document is evaluated by its dependency graph, and invalid graph structure produces diagnostics rather than partial implicit behavior.

## Layer Map

- `packages/geometry/src`: construction syntax, dependency graph, and evaluation semantics.
- `packages/document/src`: versioned document data and seed/example documents.
- `packages/rendering/src`: viewport projection and renderable scene descriptions.
- `apps/web/src`: React components that compose documents, evaluation, rendering, and controls.

Cross-layer imports use package-style entrypoints such as `@euclid/geometry`.

The rendering layer models the 2D head-on view as a camera:

- **Viewport**: screen extent.
- **View camera**: world center, rotation, scale, and screen offset.
- **Screen view**: viewport plus camera.

Pan, zoom, and rotation are camera operations. They are not SVG transform shortcuts and do not alter construction meaning.

The dependency direction is intentionally one-way:

```text
app -> document -> geometry
app -> rendering -> geometry
```

Geometry does not know about documents, rendering, interaction, or React. Rendering does not know about documents or React. Document code does not know about rendering or React.

## Current Domain

The initial domain supports:

- Free points.
- Lines through two points.
- Circles with a center point and point on circumference.

This is deliberately small. It gives future construction operations a clear pattern without pretending the domain is complete.

## Extension Pattern

To add a construction:

1. Add a case to `Construction` in `packages/geometry/src/model.ts`.
2. Add the evaluated primitive shape if needed.
3. Add its dependency extraction to `packages/geometry/src/dependencies.ts`.
4. Implement the meaning in `packages/geometry/src/evaluate.ts`.
5. Keep invalid dependencies explicit as diagnostics.
6. Add scene conversion in `packages/rendering/src/scene.ts`.
7. Render the new scene item in `apps/web/src/WorkspaceView.tsx`.

The target style is algebraic and boring: explicit data, explicit cases, no implicit mutation.
