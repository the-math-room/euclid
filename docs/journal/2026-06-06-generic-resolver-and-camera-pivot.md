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

## Follow-Up: Tool Gesture Policy

After duplicate point aliases appeared in circle and construction workflows, gesture routing was moved toward a declarative policy table in `apps/web/src/construction/tools.ts`.

The important design point is future tool growth:

- Built-in construction tools declare a `ConstructionToolGesturePolicy`.
- The policy describes pointer-up priority, such as whether to prefer intersections, existing points, existing lines, or empty-space point creation.
- Tests require every non-select built-in tool to have a policy entry.
- Unregistered construction tools fall back to a conservative default policy: existing point, existing line, intersection, then empty-space point creation.
- Future user-created tools should provide the same kind of policy data instead of requiring new conditional branches inside `useWorkspaceGestures.ts`.

This keeps the current app behavior explicit while preserving a path toward user-defined tools.

## Tech Debt Pass

Addressed several architecture pain points found after the tool and lesson-player work:

- `@euclid/activity` now exports `activityTools` and `isActivityTool` as the source of truth for activity tool validation.
- `@euclid/lesson` now requires stable `EuclidLesson.id`, and the web app persists/reset lesson programs by id rather than array index.
- Removed hidden module-level label layout caching from `@euclid/rendering` so rendering production code stays pure by explicit inputs.

Remaining pressure: `useConstructionController.ts` still owns a large per-tool command state machine. The next larger architectural move should be a command/session registry that pairs with the gesture policy table.
