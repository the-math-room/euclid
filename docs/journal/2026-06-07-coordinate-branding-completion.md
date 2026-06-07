# 2026-06-07: Coordinate Branding Completion

## Summary

Finished the coordinate-branding pass so construction storage now reflects the architectural commitment that world-space geometry and viewport-relative scene coordinates are distinct domains.

Previously, `WorldPoint` and `ScenePoint` existed, and projection/unprojection APIs used them, but the core construction model still stored free-point coordinates as plain `Point2`. That left the most important geometry state vulnerable to accidental scene/world coordinate mixing.

## What Changed

`packages/geometry/src/model.ts` now uses `WorldPoint` for:

- free-point positions in `ConstructionProgram`
- evaluated point primitive positions
- evaluated line endpoints
- evaluated circle center and circumference point

`moveFreePoint` now requires a `WorldPoint`, so callers must cross the screen/world boundary explicitly before mutating construction state. Derived realization code wraps computed intersections, midpoints, three-point circle centers, and derived-line points as world coordinates.

Rendering now consumes world-branded evaluated primitives directly and projects them into `ScenePoint` render items. This removes the previous rebranding at render-scene construction time and makes the interpretation boundary clearer.

## JSON Boundaries

Document and assessment-goal parsing still accept ordinary JSON coordinate objects, but decoded free-point positions are now branded at the parse boundary with `toWorldPoint`.

The document codec also rejects malformed free-point coordinate objects instead of silently coercing values. This keeps persisted lesson/document data plain JSON while preserving type safety once data enters the TypeScript core.

## Why It Matters

This closes the gap between the architectural precept and the implementation:

- `ConstructionProgram` now stores world-space geometry.
- `RenderScene`, hit testing, gestures, and previews remain scene-space.
- Projection and unprojection are the explicit boundaries between those domains.

The compiler now catches attempts to pass unbranded screen-like points into construction edits or typed construction fixtures.

## Verification

Ran full validation:

```bash
npm run check
```

Result: lint, format check, app/test typecheck, Vitest, and Vite production build all passed. The test suite reported 34 passing test files and 208 passing tests.
