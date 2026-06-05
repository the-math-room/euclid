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

- `src/document` now owns versioned document data and the seed document.
- `src/rendering` now owns viewport projection and renderable scene descriptions.
- `src/app` now renders scene data through React/SVG rather than computing primitive projection directly.
- `src/geometry` no longer contains seed document data or viewport projection code.

Strengthened import-boundary tests so geometry, document, and rendering code keep their dependency directions explicit.

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
- Vitest passed with nine tests across evaluator and architecture guardrails.
- Production build passed.

## Open Questions

- What should the persistent construction document format look like?
- How exact should geometry be: floating point, symbolic, algebraic, or hybrid?
- What interaction model best fits powerful Euclidean construction: modal tools, command palette, direct manipulation, or a command language?
- How should undo/redo be represented: command log, event log, or document snapshots?
- How visible should the dependency graph be to users?
- At what point would React stop helping and start obscuring the core application model?
