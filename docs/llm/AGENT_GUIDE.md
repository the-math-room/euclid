# Agent Guide

This project is intentionally structured for LLM-assisted development.

## First Principles

1. Preserve denotational boundaries.
2. Keep the geometry model plain and explicit.
3. Prefer small total functions over hidden object behavior.
4. Add documentation where it changes future agent choices.
5. Follow the Unix bias: small pieces, clear composition, powerful users.

## Attention Order

When changing behavior, inspect files in this order:

1. `docs/architecture/denotational-design.md`
2. `src/geometry/model.ts`
3. `src/geometry/dependencies.ts`
4. `src/geometry/evaluate.ts`
5. `src/rendering/scene.ts`
6. The UI file that interprets the render scene.

## Rules For Future Agents

- Do not put construction semantics in React components.
- Do not make rendering state the source of truth.
- Do not encode geometry as loose strings when a discriminated union is possible.
- Do not add a dependency for a small algebraic operation unless it changes correctness or maintainability materially.
- When adding a construction, update the model, evaluator, seed construction, and documentation together.
- Keep dependency graph semantics explicit. Do not rely on source order as the meaning of a document.
- Keep layer direction explicit: `geometry` must not import `document`, `rendering`, `app`, or UI libraries.
- Keep `rendering` React-free. Rendering returns scene data; React turns scene data into DOM/SVG.
- Keep `document` independent from rendering and UI.
- Prefer command-shaped changes and serializable data over hidden mutable UI state.
- Before finishing a code change, run `npm run check` or state exactly why it was not run.

## Useful Vocabulary

- **Construction**: a user-authored geometric object such as a point, line, or circle.
- **Document**: versioned persistent data containing a construction program.
- **Dependency**: a reference from one construction to another.
- **Evaluation**: resolving construction meanings into concrete geometric primitives.
- **Render scene**: presentation-ready data derived from evaluated primitives.
- **Interpretation**: a view of the same construction program, such as rendering, serialization, validation, or export.

## Lessons From The Initial Scaffold

- `dist/` and `node_modules/` are generated outputs and belong in `.gitignore`.
- Tooling should be added early because LLM-generated changes otherwise drift in style.
- Dependencies belong in the project vocabulary immediately; Euclidean construction is a graph of meanings, not a drawing order.
- React is acceptable for the first interface because the project keeps the geometry core independent of React.
