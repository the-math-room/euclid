# Rendering Package

Owns renderable scene data derived from evaluated geometry.

## Owns

- Viewport projection.
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

## Change Pattern

When adding a new evaluated primitive, add a render scene representation and tests before wiring it into the web app.
