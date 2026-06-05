# Denotational Design Notes

Euclid models a construction as a small program whose meaning is geometric.

The core distinction:

- **Syntax**: typed construction records authored by users and tools.
- **Semantics**: evaluated Euclidean primitives derived from those records.
- **Dependency graph**: explicit references between construction records.
- **Presentation**: SVG, canvas, DOM controls, exports, and editor affordances.

React owns interaction and presentation. The geometry core owns meaning.

Source order is not semantic order. A document is evaluated by its dependency graph, and invalid graph structure produces diagnostics rather than partial implicit behavior.

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
6. Render the new primitive in the UI interpretation.

The target style is algebraic and boring: explicit data, explicit cases, no implicit mutation.
