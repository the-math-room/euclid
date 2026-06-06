# Rendering Package

Owns renderable scene data derived from evaluated geometry.

## Owns

- Viewport projection.
- 2D camera model for pan, zoom, and rotation.
- Conversion from evaluated primitives to render scene items.
- Backend-neutral label placement for render scene data.
- Rendering-level tests that are independent from React.

Functions in this package should be memoizable in theory.

## Must Not Own

- Construction semantics.
- Document persistence.
- React, DOM, SVG elements, or browser interaction.

## Allowed Imports

- `@euclid/geometry`.
- Local rendering modules.

## Key Files

- `src/scene.ts`: evaluated geometry to render scene conversion.
- `src/labelLayout.ts`: deterministic label candidate generation and scoring.
- `src/viewport.ts`: world-to-viewport projection.
- `src/index.ts`: public package entrypoint.

## Camera Semantics

`moveCameraInScreen(camera, delta)` moves the camera in screen coordinates. The rendered scene moves in the opposite direction.

Example: moving the camera left makes the construction appear to move right.

Direct manipulation in the web app is different: dragging the scene right should make the scene follow the pointer. The app shell adapts that gesture by negating the drag delta before calling `moveCameraInScreen`.

## Change Pattern

When adding a new evaluated primitive, add a render scene representation and tests before wiring it into the web app.

## Instructions for LLM Agents

### 1. Architectural Guardrails (Enforced by Tests)

- **Zero React/DOM/UI Imports**: This package must NOT import React, DOM, or Lucide icon libraries.
- **Pure Functions Only**: Do not use global mutable state or module-level variables. All functions must be deterministic and side-effect free.
- **No Console Logging**: The use of `console` APIs in production files is prohibited and will cause Vitest architecture checks to fail.
- **Strict Layering**: May import `@euclid/geometry` but must NOT import `@euclid/document` or app packages.

### 2. Projections & Render-scene Abstractions

- **No UI Coupling**: This package converts geometry primitives to abstract renderable shapes (`SceneItem`). The React component layer handles actual SVG/Canvas DOM rendering.
- **Dual-View Rendering Support**: Ensure canvas rendering helpers in [canvasRenderer.ts](file:///home/johna/Projects/euclid/packages/rendering/src/canvasRenderer.ts) and SVG render logic remain mathematically aligned.
- **Camera Math**: Direct panning operations must be handled using the pure algebraic camera functions in [viewport.ts](file:///home/johna/Projects/euclid/packages/rendering/src/viewport.ts).

### 3. Verification Command

Always run the validation suite before finishing:

```bash
npm run check
```
