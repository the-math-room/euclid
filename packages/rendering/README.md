# Rendering Package

Owns renderable scene data derived from evaluated geometry.

## Owns

- Viewport projection and world frame computation.
- 2D camera model for pan, zoom, and rotation.
- Conversion from evaluated primitives to render scene items.
- Label placement: optimization-based candidate generation, scoring against obstacles, and multi-label coordination.
- Line extension to viewport boundaries.
- Hit testing for interactive selection (points, lines, circles).
- Intersection detection at screen positions (for constructing intersection points).
- Backend-neutral rendering to Canvas 2D context and standalone SVG strings.
- Visual theme definition (colors, typography).
- Rendering-level tests that are independent from React.

Functions in this package should be memoizable in theory.

## Must Not Own

- Construction semantics or construction editing.
- Document persistence.
- React, DOM, SVG elements, or browser interaction.

## Allowed Imports

- `@euclid/geometry` (types and approximate geometry helpers like `lineLineIntersection`).
- Local rendering modules.

## Key Files

- `src/scene.ts`: evaluated geometry to render scene conversion. Integrates label layout, line extension, grid generation, and point role classification (free vs. constructed).
- `src/labelLayout.ts`: deterministic label candidate generation and scoring. Evaluates 8 compass positions × 3 distance rings per point, scores candidates against point/line/circle obstacles, viewport overflow, and association ambiguity, then uses greedy hill-climbing for multi-label coordination.
- `src/interaction.ts`: screen-space hit testing. `findItemAtPosition` prioritizes points over lines/circles. `findIntersectionAtPosition` detects curve intersections near a screen position and returns command-shaped discriminated hits (`line-line-intersection`, `line-circle-intersection`, or `circle-circle-intersection`).
- `src/viewport.ts`: world-to-viewport projection and unprojection. Camera model with center, rotation, scale, and screen offset.
- `src/canvasRenderer.ts`: draws a `RenderScene` to a Canvas 2D context with point role styling (free vs. constructed).
- `src/svgRenderer.ts`: renders a `RenderScene` to a standalone SVG string.
- `src/theme.ts`: centralized color palette, typography constants, and SVG stylesheet generation.
- `src/index.ts`: public package entrypoint.

## Camera Semantics

`moveCameraInScreen(camera, delta)` moves the camera in screen coordinates. The rendered scene moves in the opposite direction.

Example: moving the camera left makes the construction appear to move right.

Pan updates the camera's world center, not a persistent SVG-style screen transform. This keeps the visible viewport center as the rotation pivot after panning.

Direct manipulation in the web app is different: dragging the scene right should make the scene follow the pointer. The app shell adapts that gesture by negating the drag delta before calling `moveCameraInScreen`.

## Change Pattern

When adding a new evaluated primitive, add a render scene representation, label layout handling if applicable, hit testing support, and rendering in both Canvas and SVG backends before wiring it into the web app.

## Instructions for LLM Agents

### 1. Architectural Guardrails (Enforced by Tests)

- **Zero React/DOM/UI Imports**: This package must NOT import React, DOM, or Lucide icon libraries.
- **Pure Functions Only**: Do not use global mutable state or module-level variables. All functions must be deterministic and side-effect free.
- **No Console Logging**: The use of `console` APIs in production files is prohibited and will cause Vitest architecture checks to fail.
- **Strict Layering**: May import `@euclid/geometry` but must NOT import `@euclid/document` or app packages.

### 2. Projections & Render-scene Abstractions

- **No UI Coupling**: This package converts geometry primitives to abstract renderable shapes (`RenderItem`). The React component layer handles actual SVG/Canvas DOM rendering.
- **Command-Shaped Hits**: Interaction helpers should return typed, command-ready data such as discriminated intersection hits. The app shell should not have to re-infer operand kinds from render items or evaluated primitives.
- **Dual-View Rendering Support**: Ensure canvas rendering helpers in `src/canvasRenderer.ts` and SVG render logic in `src/svgRenderer.ts` remain mathematically aligned. Both must render the same scene identically.
- **Camera Math**: Direct panning operations must be handled using the pure algebraic camera functions in `src/viewport.ts`.
- **Label Layout**: Label placement is part of scene construction, not part of rendering. `layoutPointLabels` is called during `sceneForEvaluation` so that label positions are available to both Canvas and SVG renderers.
- **Coordinate Branding**: Ensure that coordinates in the world space are typed as `WorldPoint` and viewport/screen-relative coordinates are typed as `ScenePoint`. Use the conversion utilities in `@euclid/geometry` or `@euclid/rendering` where appropriate, and avoid using raw unbranded coordinates.

### 3. Verification Command

Always run the validation suite before finishing:

```bash
npm run check
```
