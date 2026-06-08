# Rendering Package

Purpose: convert evaluated geometry into renderable scene data and backend-neutral drawing helpers.

Read this when changing viewport math, render-scene construction, label placement, hit testing, Canvas rendering, or SVG rendering.

## Owns

- 2D camera and viewport projection/unprojection.
- Conversion from evaluated primitives to `RenderScene`.
- Display-only scene items for evaluated measurement labels.
- Scene-space grid, line extension, point roles, and label placement.
- Screen-space hit testing and intersection hit discovery.
- Canvas 2D drawing and standalone SVG string rendering.
- Rendering theme and style resolution.

## Does Not Own

- Construction syntax, meaning, edits, or dependency evaluation.
- Documents, lessons, activity policy, or assessment goals.
- React components, DOM event handling, browser state, or app gestures.

## Start Here

- `src/viewport.ts`: camera, world frame, project/unproject, pan/zoom/rotation.
- `src/scene.ts`: evaluation-to-scene conversion.
- `src/labelLayout.ts`: deterministic label candidate scoring and placement.
- `src/interaction.ts`: hit testing and command-shaped intersection hits.
- `src/style.ts`: shared style resolution for Canvas and SVG.
- `src/canvasRenderer.ts`: draw `RenderScene` to Canvas-like context.
- `src/svgRenderer.ts`: render `RenderScene` as SVG string.
- `src/theme.ts`: visual tokens.
- `src/renderTestFixtures.ts`: typed rendering test builders.

## Local Rules

- Rendering is React-free. Return data or draw to provided contexts; do not own DOM components.
- Coordinates in scenes are `ScenePoint`; evaluated primitives use `WorldPoint`.
- Hit-testing helpers should return typed command-shaped data so the app does not re-infer construction operands.
- Label layout is part of scene construction, not a React concern.
- Canvas and SVG output should share style resolution rather than drifting in separate defaults.
- Shape roles such as auxiliary/primary are interpreted here as visual style, not as geometry semantics.
- Measurement labels are interpreted from `@euclid/geometry` measurement evaluation; rendering must not parse measurement expressions or solve constraints.
- Camera operations are algebraic camera updates, not SVG transform shortcuts.
- Public exports in `src/index.ts` must be explicit and intentional.

## Tests

- Rendering behavior: `src/*.test.ts`.
- Use `src/renderTestFixtures.ts` instead of broad casts for render fixtures.
- Full verification for code changes: `npm run check`.
