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

1. `docs/llm/REPO_MAP.md`
2. `docs/architecture/denotational-design.md`
3. `docs/architecture/layers.md`
4. The package README for the layer you are changing.
5. The source files named by that package README.

## Rules For Future Agents

### Meaning Boundaries

- Do not put construction semantics in React components.
- Do not make rendering state the source of truth.
- Do not encode geometry as loose strings when a discriminated union is possible.
- Do not add a dependency for a small algebraic operation unless it changes correctness or maintainability materially.
- Do not mix world-space coordinates (`WorldPoint`) with viewport-relative/screen coordinates (`ScenePoint`). They are incompatible compile-time branded types. Perform coordinate projection and conversion explicitly at boundaries.

### Layering

- Keep layer direction explicit: `geometry` must not import `document`, `rendering`, `app`, or UI libraries.
- Keep `rendering` React-free. Rendering returns scene data; React turns scene data into DOM/SVG.
- Keep `document` independent from rendering and UI.
- Keep package production code pure. See `docs/architecture/pure-core.md`.

### Meaning vs. Realization

- A construction has meaning (what it is) independent of its approximate realization (what its floating-point coordinates are). These are distinct evaluation phases.
- A construction can have meaning but no current realization. Example: a line through two coincident points is still a valid construction expression, but has no realizable line primitive to render.
- Approximate realization belongs in `realize.ts` and `approx.ts`. Exact meaning belongs in `evaluate.ts`. Do not conflate them.

### Edit Operations

- Construction edits are pure transformations in `edit.ts`.
- Point movement returns a `ConstructionProgram`. Construction-adding edits return command results with `{ program, id, changed }`, where `id` is the construction created or found by idempotent duplicate detection.
- Edit results should preserve the original program reference when the edit is a no-op. This enables cheap identity checks.
- Do not create ad-hoc point or line creation logic in UI code. Use the edit module.

### Extension Pattern

- When adding a construction, follow `docs/how-to/add-a-construction.md`.
- Update model, dependency extraction, exact meaning, approximate realization, and tests together.
- Keep dependency graph semantics explicit. Do not rely on source order as the meaning of a document.

### App Shell

- `App.tsx` is a composition root. It should wire packages together and render JSX. It should not contain construction logic.
- `useConstructionController.ts` owns construction history, tool state, selection, and command wiring. Construction-level state changes belong here.
- `useWorkspaceGestures.ts` owns gesture interpretation. It translates pointer events into construction commands. `WorkspaceView.tsx` composes workspace surfaces and should not own construction state.
- Prefer command-shaped changes and serializable data over hidden mutable UI state.

### Verification

- **Automatic Prettier Formatting**: Immediately run `npx prettier --write <file>` after writing or modifying any file that is subject to the project's Prettier policy.
- **Lightweight Intermediate Verification**: When modifying multiple files as part of an implementation plan, run a lightweight check (e.g., target typechecking with `npx tsc --noEmit` or running the specific test file affected via `npx vitest run <path_to_test>`) after each file modification before proceeding to the next file, to catch issues early without the overhead of a full workspace-wide check.
- **Mandatory Final Verification**: Before declaring any task complete or asking for feedback, you MUST propose running `npm run check` using the `run_command` tool (set `SafeToAutoRun` to `false`) and wait for the user to approve and run it (unless you have only updated documentation). Do not hand back code to the user until this check has run and passed.
- **Static Code Audit**: If terminal execution tools are unavailable or fail, you MUST perform a manual static audit of all modified/new files:
  - **No Empty Arrow Functions**: Avoid `() => {}` in callbacks, mock handlers, or tests (use `vi.fn()` or include a comment inside like `// no-op` to satisfy `@typescript-eslint/no-empty-function`).
  - **Prettier Conformity**: Verify trailing commas, single quotes, and semicolons are consistent with formatting rules.
  - **No Implicit `any`**: Strictly define types for all new parameters or variables.
  - **Clean Imports**: Ensure every added import exists and unused imports are cleaned up.

## Useful Vocabulary

- **Construction**: a user-authored geometric object such as a point, line, circle, intersection, parallel line, perpendicular line, or midpoint.
- **Construction Program**: a serializable list of constructions that forms the ground truth of a document.
- **Document**: versioned persistent data containing a construction program.
- **Dependency**: a reference from one construction to another.
- **Evaluation**: resolving construction meanings and approximate realizations from a construction program.
- **Meaning**: the exact construction expression — what a construction _is_ independent of coordinates.
- **Realization**: approximate numeric primitives derived from meaning — what a construction's floating-point position _currently looks like_.
- **Render scene**: presentation-ready data derived from realized primitives, including label placement and viewport projection.
- **Label layout**: optimization-based placement of point labels to avoid overlapping obstacles.
- **Intersection snapping**: when the point tool detects and constructs a curve intersection point rather than a free point.
- **Point drag**: direct manipulation of free point positions, batched into a single undo step.
- **Draft preview**: the real-time ghost geometry drawn between the first click and the second in multi-step tool interactions (e.g. the ghost line when the first point of a line tool is set). Draft state lives in `useConstructionController.ts`; preview rendering lives in `workspacePreview.ts`.
- **Witness point**: the free point that determines the position of a derived line (parallel or perpendicular). When the derived line is dragged, only the witness point moves.
- **Interpretation**: a view of the same construction program, such as rendering, serialization, validation, or export.

## Lessons From The Initial Scaffold

- `dist/` and `node_modules/` are generated outputs and belong in `.gitignore`.
- Tooling should be added early because LLM-generated changes otherwise drift in style.
- Dependencies belong in the project vocabulary immediately; Euclidean construction is a graph of meanings, not a drawing order.
- React is acceptable for the first interface because the project keeps the geometry core independent of React.
