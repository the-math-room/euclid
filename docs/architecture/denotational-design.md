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

Source order is not semantic order. A document is evaluated by its dependency graph, and invalid graph structure produces diagnostics rather than partial implicit behavior.

## Layer Map

- `src/geometry`: construction syntax, dependency graph, and evaluation semantics.
- `src/document`: versioned document data and seed/example documents.
- `src/rendering`: viewport projection and renderable scene descriptions.
- `src/app`: React components that compose documents, evaluation, rendering, and controls.

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

1. Add a case to `Construction` in `src/geometry/model.ts`.
2. Add the evaluated primitive shape if needed.
3. Add its dependency extraction to `src/geometry/dependencies.ts`.
4. Implement the meaning in `src/geometry/evaluate.ts`.
5. Keep invalid dependencies explicit as diagnostics.
6. Add scene conversion in `src/rendering/scene.ts`.
7. Render the new scene item in `src/app/WorkspaceView.tsx`.

The target style is algebraic and boring: explicit data, explicit cases, no implicit mutation.
