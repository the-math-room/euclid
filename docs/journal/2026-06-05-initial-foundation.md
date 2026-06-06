# 2026-06-05: Initial Foundation

## Summary

Day 1 took Euclid from an empty project idea to a working TypeScript geometry app with a pure construction core, a React browser shell, SVG and Canvas rendering, interactive construction tools, dependency-aware evaluation, architecture guardrails, deployment, and LLM-oriented documentation.

The central decision was made early and held through the day: a construction document has meaning independent of its presentation. Geometry owns construction meaning. Rendering interprets evaluated geometry into scene data. React composes the app and translates browser gestures into explicit commands.

## Design Commitments

The project started from a denotational design stance inspired by Conal Elliott: define what constructions mean first, then choose representations and algorithms that preserve that meaning.

The practical commitments established today:

- Construction records are plain, typed, serializable TypeScript data.
- Geometry evaluation is deterministic and side-effect free.
- Source order is not semantic order; dependency graph evaluation is explicit.
- A construction can have meaning even when it has no current floating-point realization.
- React interprets evaluated geometry; it does not define geometry semantics.
- Package-layer functions should be memoizable in theory.
- Browser, DOM, storage, network, time, randomness, and React effects belong in the app shell.
- Import direction matters: `geometry` must not depend on document, rendering, or app code.
- Generated outputs such as `dist/` and `node_modules/` stay outside version control.

The user philosophy recorded for the project: Unix-style tools, do one thing well, and make the user powerful.

## Project Shape

Created the initial Vite + React + TypeScript app, then quickly reshaped it into package-like layers without adding workspace tooling yet:

- `packages/geometry/src`: construction syntax, dependency graph, exact meaning, approximate realization, pure edit commands, and geometry helpers.
- `packages/document/src`: versioned document data, seed/example documents, codec boundary, and pure history wrappers.
- `packages/rendering/src`: viewport projection, camera math, label layout, render scene construction, hit testing, and SVG/Canvas renderers.
- `apps/web/src`: React composition, app state wiring, browser gesture interpretation, SVG/Canvas workspace surfaces, and controls.
- `tests/architecture`: import and purity guardrails.

Added package-style aliases and entrypoints:

- `@euclid/geometry`
- `@euclid/document`
- `@euclid/rendering`

Recorded the package-shaped layout in `docs/decisions/0002-package-shaped-layout.md`.

## Geometry Core

The first construction domain supports:

- Free points.
- Lines through two points.
- Circles through a center point and point on the circumference.
- Line-line intersections.
- Line-circle intersections.
- Circle-circle intersections.

Evaluation was refined from simple source-order traversal into explicit dependency graph evaluation. Forward references can work, while missing dependencies, duplicate IDs, cycles, and invalid dependencies produce diagnostics.

The geometry pipeline now has a clear meaning/realization split:

- `evaluate.ts` handles graph planning and exact construction meaning extraction.
- `realize.ts` handles approximate numeric realization into floating-point primitives.
- `approx.ts` holds shared floating-point helpers such as line-line, line-circle, and circle-circle intersection routines.

This separation matters because a line through coincident points still has authored meaning even if there is no realizable line to draw. Likewise, an intersection of parallel lines is still a valid construction expression even when no point can currently be realized.

## Construction Edits

Extracted construction edits into `packages/geometry/src/edit.ts`.

The edit module now owns:

- `moveFreePoint`
- `addLineThroughPoints`
- `addCircleThroughPoints`
- `addCircleThreePoints`
- `addLineLineIntersection`
- `addLineCircleIntersection`
- `addCircleCircleIntersection`

Point movement returns a `ConstructionProgram`. Construction-adding edits return command results shaped as `{ program, id, changed }`.

That result contract was added after the app shell started accumulating local helpers to rediscover IDs after edits. Now the geometry edit layer returns the construction it created or found through duplicate detection, so `useConstructionController` does not duplicate canonicalization rules.

Edit results preserve the original `program` reference when nothing changes, which keeps history and React identity checks cheap.

## Rendering And Interaction

Rendering was split out of geometry early. The rendering package owns the viewport, camera, render scene construction, label placement, hit testing, and backend-neutral drawing.

Added an algebraic 2D camera model:

- `Viewport`
- `ViewCamera`
- `ScreenView`
- pure camera operations for pan, zoom, and rotation

Camera operations describe camera motion. Direct manipulation in the app shell adapts pointer deltas so dragging the scene makes the scene follow the pointer.

The first view interactions included:

- Selection.
- Screen rotation as a rendering view transform.
- Rotated grid and primitives.
- Point labels that remain screen-facing instead of rotating with the construction plane.

Added a Canvas renderer parallel to the SVG renderer. Both consume the same `RenderScene`, and tests keep the two rendering paths aligned.

Line render items distinguish drawing geometry from intersection geometry:

- `from` / `to`: the extended draw segment.
- `supportLine`: the screen-space line used for infinite-line intersection math.

This prevents test fixtures and production scenes from silently using different line semantics.

## Label Layout

Added optimization-based label placement in `packages/rendering/src/labelLayout.ts`.

The layout engine evaluates 8 compass positions across 3 distance rings per label. It scores candidates against:

- other point labels
- point marks
- line obstacles
- circle obstacles
- viewport bounds
- visual association ambiguity

The final placement uses greedy hill-climbing for multi-label coordination. Label layout is deliberately a rendering concern, not construction meaning.

## Intersection Snapping

Added screen-space construction snapping through `findIntersectionAtPosition`.

The interaction layer now detects:

- line-line intersections
- line-circle intersections
- circle-circle intersections

It returns command-shaped discriminated hits:

- `line-line-intersection`
- `line-circle-intersection`
- `circle-circle-intersection`

This keeps the app shell from re-inferring operand kinds from render items or evaluated primitives.

Circle-circle hit testing accounts for the flipped screen-space Y axis relative to world space when reporting `intersectionIndex`, so the constructed point matches the point the user tapped.

## App Shell

The web app started as a single broad component and was progressively split into focused shell modules.

By the end of the day:

- `App.tsx` is a composition root.
- `useConstructionController.ts` owns construction history, tool state, selection, evaluation memoization, keyboard shortcuts, and construction-mutating callbacks.
- `useCameraController.ts` owns camera interaction state and shell adapters.
- `useWorkspaceGestures.ts` owns tap, pan, pinch, point drag, pointer capture cleanup, and command dispatch.
- `workspaceCoordinates.ts` owns client-to-scene coordinate projection for workspace surfaces.
- `WorkspaceView.tsx` composes SVG/Canvas workspace surfaces, renderer toggle, Canvas drawing, and the mobile HUD.
- `construction/tools.ts` centralizes the `ActiveTool` union.
- `ViewControls`, `ObjectList`, and `SelectionDetails` render focused UI panels.

This moved construction semantics out of React components while still letting the app shell own browser-specific effects.

## Interactive Editing

Implemented the first interactive construction workflows:

- Add point.
- Build line through two points.
- Build circle through a center and boundary point.
- Build a circle from three points.
- Construct curve intersections by tapping near crossings.
- Use constructed intersection points as inputs for line and circle tools.
- Select objects.
- Toggle selection with `Ctrl+Click`.
- Select object ranges with `Shift+Click`.
- Delete selected objects.

Deletion is dependency-aware. `deleteConstructions` uses `transitiveDependentsOf` to remove downstream dependent geometry along with the selected constructions.

Free point dragging uses three command callbacks:

- `onBeginPointDrag`
- `onMovePoint`
- `onEndPointDrag`

During drag, the current program is updated without pushing a history entry for each move. At drag end, the pre-drag snapshot is pushed as one undo step. Constructed points are visually distinct and are not draggable.

## Undo And Redo

Added a pure-functional document history container in `packages/document/src/history.ts`.

The app shell wires it to:

- `Ctrl+Z`
- `Ctrl+Y`
- `Ctrl+Shift+Z`
- macOS Command-key adapters

History push skips identical program references, which works with the edit module's no-op identity rule.

## SVG Gesture Hardening

Fixed a stale SVG pointer-state bug found after constructing a line from both intersections of a pair of circles. Point dragging could stop working in SVG mode until switching to Canvas and back.

The fix:

- Explicitly releases pointer capture on `pointerup` and `pointercancel`.
- Handles `lostpointercapture`.
- Clears stale pointer state.
- Ends any active point drag when pointer state is abandoned.
- Adds a regression test for stale SVG pointer cleanup.

This was the immediate motivation for extracting gesture interpretation into `useWorkspaceGestures`.

## Persistence And Deployment

Added a minimal document persistence boundary:

- `serializeEuclidDocument`
- `parseEuclidDocument`

The parser validates the document envelope and schema version without introducing a schema dependency.

Configured GitHub Pages deployment through GitHub Actions. The app uses Vite `base: "/euclid/"`, builds on pushes to `main`, uploads `dist/`, and deploys through the official Pages artifact flow.

## Tooling And Guardrails

Added the development baseline:

- ESLint
- Prettier
- Vitest
- `npm run check`

`npm run check` runs linting, format checking, app typechecking, test typechecking, tests, and production build.

Split TypeScript configuration:

- `tsconfig.base.json`: shared strict compiler options.
- `tsconfig.app.json`: browser app code without Node or Vitest globals.
- `tsconfig.test.json`: tests with Node and Vitest types.
- `tsconfig.json`: solution-style references to app and test configs.

Replaced an early regex-based import scanner with the TypeScript compiler parser so architecture tests inspect actual import/export syntax.

Architecture guardrails now enforce:

- Geometry code must not import React, React DOM, Lucide, rendering, document, or app modules.
- Document code must not import rendering or app modules.
- Rendering code must not import document, app, React, DOM, or UI libraries.
- App code must not import generated output such as `dist` or `node_modules`.
- Package production code must avoid common ambient effects.
- Package production code must avoid module-level mutable state.
- Cross-package imports should use package entrypoints.

## Documentation For LLM-Assisted Development

Added and refined documentation intended for both humans and LLM coding agents:

- `AGENTS.md`
- `docs/llm/AGENT_GUIDE.md`
- `docs/llm/REPO_MAP.md`
- `docs/how-to/add-a-construction.md`
- `docs/architecture/denotational-design.md`
- `docs/architecture/layers.md`
- `docs/architecture/pure-core.md`
- package READMEs for geometry, document, rendering, and the web app

The docs now route future changes by layer, state ownership boundaries, describe the construction extension path, and record the current app-shell split.

The first ADR records the initial UI choice: React and SVG for the first app, while keeping geometry independent enough that another UI interpreter remains possible later.

## End-Of-Day Validation

The final Day 1 verification passed:

```bash
npm run check
```

Results:

- ESLint passed.
- Prettier format check passed.
- App typecheck passed.
- Test typecheck passed.
- Vitest passed: 17 test files, 101 tests.
- Production build passed.

## Open Questions

- What should the persistent construction document format look like?
- How exact should geometry be: floating point, symbolic, algebraic, or hybrid?
- What interaction model best fits powerful Euclidean construction: modal tools, command palette, direct manipulation, or a command language?
- How visible should the dependency graph be to users?
- At what point would React stop helping and start obscuring the core application model?
- Should the label layout engine be deterministic enough to test exact placements, or is scoring-threshold testing sufficient?
