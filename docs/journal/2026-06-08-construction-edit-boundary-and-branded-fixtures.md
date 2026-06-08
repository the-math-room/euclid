# Journal Entry: Construction Edit Boundary And Branded Test Fixtures

**Date:** June 8, 2026

## Context & Motivation

This update paid down a small but important architectural debt in the construction pipeline.

Euclid's architecture says construction meaning belongs in `packages/geometry/src`, while React and app code should interpret evaluated geometry and wire commands. Most construction creation already followed that rule through pure edit functions such as `addLineThroughPoints`, `addCircleThroughPoints`, and intersection helpers. Free-point creation was the exception.

Two app-side paths still knew how to assemble a free-point construction record:

- `apps/web/src/construction/pointInput.ts`
- `apps/web/src/construction/useConstructionController.ts`

That duplication was not large, but it had the wrong ownership. Free-point labels, ids, construction shape, and append semantics are construction rules. Keeping that knowledge in app code made it easier for future UI work to drift from the edit-module contract.

The same pass also addressed test debt around branded coordinates. Several tests were creating `ScenePoint` and `WorldPoint` values with direct casts such as `as ScenePoint` and `as WorldPoint`. That worked mechanically, but it bypassed the explicit coordinate boundary constructors that the architecture wants future code to use.

## Construction Edit Boundary

The geometry edit module now owns free-point creation through `addFreePoint` in `packages/geometry/src/edit.ts`.

The helper follows the same command-result shape as the other construction-adding edits:

```ts
{
  program,
  id,
  changed,
}
```

This keeps the app command layer from needing to know how a free point gets its next label or how the construction record is shaped. `addFreePoint` currently always changes the program because placing a free point at a world coordinate is an authoring action with no duplicate-detection rule.

The point input resolver now delegates free-point creation to this edit helper. The controller also delegates select-mode point insertion through `resolvePointInput`, so the React hook no longer manually creates a construction record.

The resulting ownership is cleaner:

- `edit.ts` owns construction transformations.
- `pointInput.ts` resolves UI input into construction edits.
- `useConstructionController.ts` owns history, selection, tool state, and command wiring.
- React remains outside construction semantics.

## Branded Fixture Cleanup

The test cleanup replaced raw branded coordinate casts with the public constructors:

- `toScenePoint(...)` for render-scene, pointer, gesture, and preview fixtures.
- `toWorldPoint(...)` for camera and geometry fixtures.

This affected gesture, workspace, preview, scene, and viewport tests.

The production preview code also had a few local scene-coordinate casts when synthesizing draft line endpoints, midpoint previews, and cursor point previews. Those now use `toScenePoint` as well. That keeps even short-lived presentation coordinates passing through the same explicit boundary used elsewhere.

After the cleanup, the only remaining direct `as WorldPoint` and `as ScenePoint` casts are inside the brand constructor implementations themselves in `packages/geometry/src/model.ts`.

## Why This Matters

This was not about reducing lines of code. It was about making the project rules harder to accidentally violate.

Free-point creation is the most basic construction operation. If that operation lives partly in UI code, future tools can copy the wrong pattern. Moving it into `edit.ts` makes the preferred path obvious and mechanically reusable.

Likewise, branded coordinate types are valuable only if ordinary code and tests respect the conversion points. Tests that cast around the brand make it easier to introduce world/scene confusion without noticing. Using the constructors in fixtures keeps tests aligned with the production model and makes boundary violations more visible.

## Verification

Focused checks were run during the update:

- `npx vitest run packages/geometry/src/edit.test.ts apps/web/src/construction/pointInput.test.ts`
- `npx vitest run apps/web/src/GestureController.test.ts tests/WorkspaceView.test.tsx`
- `npx vitest run tests/workspacePreview.test.ts packages/rendering/src/viewport.test.ts packages/rendering/src/scene.test.ts`
- `npx tsc --noEmit -p tsconfig.test.json`

The final full verification passed:

- `npm run check`
- 34 passing test files
- 214 passing tests
- successful production build
