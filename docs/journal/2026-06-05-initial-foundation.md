# 2026-06-05: Initial Foundation

## Summary

Started Euclid as a TypeScript geometry app for Euclidean constructions, with an explicit bias toward denotational design, LLM-assisted development, and small composable parts.

The first milestone established a working Vite/React app, a pure geometry core, agent-facing documentation, development tooling, tests, architecture guardrails, and GitHub Pages deployment.

## Project Direction

The central design commitment is that a construction document has meaning independent of its presentation.

- Construction records are plain typed data.
- Geometry evaluation is deterministic and side-effect free.
- React interprets evaluated geometry; it does not define geometry semantics.
- Dependency graph evaluation is first-class.
- Import direction matters: the geometry core must not depend on the UI.
- Generated outputs such as `dist/` and `node_modules/` stay outside version control.

The user philosophy recorded so far: Unix-style tools, do one thing well, make the user powerful.

## Implementation Notes

Created the initial Vite + React + TypeScript application.

Added the first geometry domain:

- Free points.
- Lines through two points.
- Circles through a center point and point on the circumference.

Added a seed construction rendered as SVG in the app workspace.

Refined evaluation from source-order traversal into explicit dependency graph evaluation. This means forward references can work, while missing dependencies, duplicate IDs, cycles, and invalid point dependencies are reported as diagnostics.

Added architecture guardrail tests:

- Geometry code must not import React, React DOM, Lucide, or app modules.
- App code must not import generated output such as `dist/` or `node_modules/`.
- Construction programs must stay JSON-serializable.
- Evaluation must be deterministic.
- Evaluation must not mutate its input program.

Split the scaffold into clearer layers:

- `packages/document/src` now owns versioned document data and the seed document.
- `packages/rendering/src` now owns viewport projection and renderable scene descriptions.
- `apps/web/src` now renders scene data through React/SVG rather than computing primitive projection directly.
- `packages/geometry/src` no longer contains seed document data or viewport projection code.

Strengthened import-boundary tests so geometry, document, and rendering code keep their dependency directions explicit.

Reshaped the source tree toward a future monorepo/package split without adding workspace tooling yet:

- `apps/web/src`.
- `packages/geometry/src`.
- `packages/document/src`.
- `packages/rendering/src`.
- `tests/architecture`.

Added package entrypoints at each `packages/*/src/index.ts` so cross-layer imports can begin behaving like package imports.

Added package-style aliases:

- `@euclid/geometry`.
- `@euclid/document`.
- `@euclid/rendering`.

Recorded the package-shaped layout in `docs/decisions/0002-package-shaped-layout.md`.

Added a minimal document persistence boundary:

- `serializeEuclidDocument`.
- `parseEuclidDocument`.

The parser currently validates the document envelope and schema version without introducing a schema dependency.

Added LLM-oriented navigation docs:

- Package READMEs for geometry, document, rendering, and the web app.
- `docs/llm/REPO_MAP.md` for attention routing.
- `docs/how-to/add-a-construction.md` as the construction extension checklist.

Refactored architecture boundary tests around a declarative layer policy table so future layer changes are easier to review and extend.

Made the pure-core, imperative-shell boundary explicit:

- Package production code should be memoizable in theory.
- Browser, DOM, storage, network, time, randomness, and React effects belong in `apps/web/src`.
- Architecture tests now reject common ambient effects and module-level mutable state in package production code.

Added the first view-level interactions:

- Selection in the web shell.
- Screen rotation as an explicit rendering view transform.
- Rotated grid and primitives.
- Point labels that remain oriented to the user instead of rotating with the construction plane.

Rotation lives in `packages/rendering/src` as view interpretation, not in geometry construction meaning.

Promoted pan, zoom, and rotation into an algebraic 2D camera model:

- `Viewport`.
- `ViewCamera`.
- `ScreenView`.
- pure camera operations for pan, zoom, and rotation.

The app shell stores a camera and applies camera operations; rendering interprets evaluated geometry through the camera.

Clarified camera pan semantics:

- `moveCameraInScreen` describes camera motion.
- Moving the camera left makes the scene appear to move right.
- Dragging the scene in the app is direct manipulation, so the app shell negates drag deltas before applying camera motion.

Split the web app shell into focused modules:

- `useCameraController` owns camera interaction state and shell adapters.
- `ViewControls` renders camera controls.
- `ObjectList` renders selectable constructions.
- `SelectionDetails` renders the selected construction inspector.
- `App` is back to composition instead of owning every handler and panel.

## Tooling

Added the project development baseline:

- ESLint.
- Prettier.
- Vitest.
- `npm run check` as the main local verification command.

`npm run check` runs linting, format checking, app typechecking, test typechecking, tests, and production build.

Split TypeScript configuration after the first guardrail tests exposed a convenience shortcut:

- `tsconfig.base.json` holds shared strict compiler options.
- `tsconfig.app.json` typechecks browser app code without Node or Vitest globals.
- `tsconfig.test.json` typechecks tests with Node and Vitest types.
- `tsconfig.json` is now a solution-style file referencing both app and test configs.

Replaced an early regex-based import scanner with the TypeScript compiler parser so architecture tests inspect actual import/export syntax.

## Documentation

Added documentation intended for both humans and LLM coding agents:

- `AGENTS.md`.
- `docs/llm/AGENT_GUIDE.md`.
- `docs/architecture/denotational-design.md`.
- `docs/decisions/0001-project-shape.md`.

The first ADR records the current UI choice: React and SVG for the initial app, with the geometry core kept independent so Elm, hand-rolled UI, or another interpreter remains possible later.

## Deployment

Configured GitHub Pages deployment through GitHub Actions.

The app uses Vite `base: "/euclid/"`, builds on pushes to `main`, uploads `dist/`, and deploys through the official Pages artifact flow.

## Validation

The latest verification passed:

```bash
npm run check
```

Results:

- ESLint passed.
- Prettier format check passed.
- App typecheck passed.
- Test typecheck passed.
- Vitest passed across evaluator, document, rendering, and architecture guardrails.
- Production build passed.

## Open Questions

- What should the persistent construction document format look like?
- How exact should geometry be: floating point, symbolic, algebraic, or hybrid?
- What interaction model best fits powerful Euclidean construction: modal tools, command palette, direct manipulation, or a command language?
- How should undo/redo be represented: command log, event log, or document snapshots?
- How visible should the dependency graph be to users?
- At what point would React stop helping and start obscuring the core application model?
