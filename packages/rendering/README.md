# Rendering Package

Owns renderable scene data derived from evaluated geometry.

## Owns

- Viewport projection.
- 2D camera model for pan, zoom, and rotation.
- Conversion from evaluated primitives to render scene items.
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
- `src/viewport.ts`: world-to-viewport projection.
- `src/index.ts`: public package entrypoint.

## Camera Semantics

`moveCameraInScreen(camera, delta)` moves the camera in screen coordinates. The rendered scene moves in the opposite direction.

Example: moving the camera left makes the construction appear to move right.

Direct manipulation in the web app is different: dragging the scene right should make the scene follow the pointer. The app shell adapts that gesture by negating the drag delta before calling `moveCameraInScreen`.

## Change Pattern

When adding a new evaluated primitive, add a render scene representation and tests before wiring it into the web app.
