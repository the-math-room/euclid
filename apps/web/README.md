# Web App

Owns browser composition and presentation.

## Owns

- React components.
- SVG/DOM rendering of render scene data.
- Browser entrypoint and application shell.
- Future interaction wiring.

This app is the imperative shell. It may perform browser effects, but it should pass explicit data into package-layer functions.

## Must Not Own

- Construction semantics.
- Document parsing rules.
- Viewport projection math beyond passing scene data to components.

## Allowed Imports

- `@euclid/document`.
- `@euclid/geometry`.
- `@euclid/rendering`.
- React and UI libraries.

## Key Files

- `src/main.tsx`: browser entrypoint.
- `src/App.tsx`: app composition.
- `src/WorkspaceView.tsx`: SVG interpretation of render scene data.
- `src/styles.css`: app styling.

## Change Pattern

When changing UI, prefer composing existing layer APIs. If a UI change needs new meaning, add that meaning to the lower layer first.
