# 2026-06-06: Generic Goal Resolver, Refined Camera Pivot, and Codebase Refactoring

## Summary

Refactored the curriculum assessment resolver to be fully open-ended and generic, decoupled the camera panning and rotation pivot math, and simplified the main React application by splitting `WorkspaceContainer` out of `App.tsx`.

## What Changed

- **Generic Goal Resolver (`assessmentResolver.ts`)**:
  - Rewrote `matchExpression` and `mapExpressionIds` to be completely generic.
  - Replaced the large hardcoded switch statement of geometric expression types with a dynamic property visitor.
  - Automatically handles symmetric field pairs (like `firstCircle` and `secondCircle` in circle-circle intersections) and arrays of construction IDs, enabling seamless support for future geometric constructions without modifying the assessment resolver.
  - Added comprehensive integration tests in `assessmentResolver.test.ts` validating starter (unsolved), solved, and incorrect (non-solution) states for the Perpendicular Bisector lesson.

- **Refined Camera Rotation Pivot (`viewport.ts` & `viewport.test.ts`)**:
  - Refactored `moveCameraInScreen` to adjust the camera's `center` in world-coordinates (taking current camera rotation into account) instead of mutating `screenOffset`.
  - Added a test case in `viewport.test.ts` to guarantee that the visible scene center remains the rotation pivot after panning.

- **Workspace Component Architecture (`App.tsx` & `WorkspaceContainer.tsx`)**:
  - Extracted the monolithic `WorkspaceContainer` component from `App.tsx` into its own module at `WorkspaceContainer.tsx`.
  - Cleared state-management clutter in `App.tsx`, leaving it focused purely on multi-lesson persistence and resets.

## Strategic Meaning

This refactoring aligns with the **open-architecture principle** for the Headless EdTech SDK. The assessment engine is now decoupled from the exact set of construction primitives, making the system open to extension. Additionally, refining the camera pivot logic guarantees a smooth and mathematically correct pan/rotate interaction model on mobile and desktop viewports.
