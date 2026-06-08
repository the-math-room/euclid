# Web App

Purpose: browser shell and presentation interpreter.

Read this when changing React composition, workspace controls, browser event handling, gesture wiring, lesson loading, object panels, or app styling.

## Owns

- React components and browser entrypoint.
- Application composition in `src/App.tsx` and `src/WorkspaceContainer.tsx`.
- Construction controller wiring: history, selected ids, active tool, undo/redo, command callbacks.
- DOM/SVG/Canvas presentation of render-scene data.
- Browser effects: URL state, fetches for custom lesson loading, keyboard listeners, pointer listeners.
- Gesture event adaptation and camera interaction state.

## Does Not Own

- Construction meaning or canonical construction creation rules.
- Dependency graph evaluation.
- Document parse rules.
- Rendering scene construction, projection math, hit testing, or label layout.
- Activity or assessment semantics.

## Start Here

- `src/App.tsx`: composition root; should stay thin.
- `src/WorkspaceContainer.tsx`: top-level workspace assembly.
- `src/construction/useConstructionController.ts`: construction history, selection, active tool, command wiring.
- `src/construction/pointInput.ts`: resolves UI point input into geometry edit commands.
- `src/construction/toolSession.ts`: multi-step tool sessions.
- `src/construction/tools.ts`: registered built-in tools and gesture policies.
- `src/GestureController.ts`: pure pointer/touch state machine.
- `src/useWorkspaceGestures.ts`: React DOM event adapter into `GestureController`.
- `src/WorkspaceView.tsx`: workspace presentation, SVG/Canvas surfaces, HUD.
- `src/workspacePreview.ts`: preview scene data for draft geometry.
- `src/view/useCameraController.ts`: camera keyboard/control state.

## Local Rules

- Keep React as an interpreter. If a change needs new construction meaning, add it in `@euclid/geometry` first.
- Do not construct authored geometry records directly in app command code. Use geometry edit helpers.
- Do not import geometry naming internals such as `generateNextPointLabel` into app code.
- Keep `GestureController.ts`, `workspacePreview.ts`, `workspaceCoordinates.ts`, construction tool/session helpers, and lesson authoring helpers ambient-free; they are pure app adapters.
- Browser effects belong in shell hooks/components, not package layers or pure app adapters.
- All non-select construction tools must have declarative gesture policy in `src/construction/tools.ts`.

## Tests

- App/component behavior: root `tests/*.test.tsx` and focused `apps/web/src/**/*.test.ts`.
- Gesture behavior: `apps/web/src/GestureController.test.ts`.
- Construction controller helpers: `apps/web/src/construction/*.test.ts`.
- Full verification for code changes: `npm run check`.
