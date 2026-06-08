# 2026-06-08: Authored Shape Presentation And Selection Routing

## Summary

This update added a small but important authoring feature: line and circle constructions can now be marked as primary or auxiliary.

The motivating classroom example is an equilateral triangle construction. The two circles used to locate the third vertex are real construction objects, but they are not the visual focus of the final triangle. The user should be able to mark those circles as helpers so the UI can draw them with less emphasis while keeping the triangle front and center.

The implementation also exposed and fixed a selection-routing bug. After the feature landed, ordinary select-mode clicks could clear selection, but could not select another object. That bug was not caused by shape roles directly; the new object-editing workflow made it more visible.

## Why This Belongs In Geometry

The key design choice was to model the feature as authored presentation intent, not as renderer-only state.

`shapeRole` is now part of shape-producing construction syntax:

- `primary`
- `auxiliary`

Missing `shapeRole` means `primary`, so older or simpler construction documents stay compact and compatible.

This field belongs in geometry because it is authored on the construction program. If a student or author says "this circle is auxiliary," that decision should survive rendering backend changes, document persistence, assessment views, and future export paths.

But it is not exact construction meaning. A line through A and B is still the line through A and B whether it is primary or auxiliary. For that reason, `shapeRole` is not part of construction expressions. It is carried on construction records and then normalized onto realized primitives, where interpreters can consume it.

That keeps the denotational split intact:

- construction expression: what the object geometrically is
- construction record: authored object plus metadata
- realized primitive: current numeric shape plus normalized interpreter fields
- render scene/style: visual interpretation

## How The Feature Was Added

Geometry added a `ShapeRole` type and optional `shapeRole` fields to the existing line/circle-producing construction variants. Realization now defaults the role onto evaluated line and circle primitives with `primary` as the fallback.

The edit boundary gained `setConstructionShapeRole`. It is a pure program transformation that:

- applies only to shape constructions
- preserves program identity for no-ops
- removes the field when setting a shape back to `primary`

That last point matters. The default-as-absence model keeps documents smaller and makes future migrations easier.

Rendering now carries `shapeRole` through scene items. The shared style resolver maps auxiliary shapes to dashed, semi-transparent strokes. Canvas and SVG both consume the same resolved style, so the two backends stay aligned.

The web app wires the edit as a command:

- `useConstructionController.ts` exposes `handleSetShapeRole`
- `SelectionDetails.tsx` shows a role selector for shape constructions
- `WorkspaceContainer.tsx` passes the command down
- `ObjectList.tsx` surfaces auxiliary status in the object list
- `WorkspaceView.tsx` applies role classes for inline SVG rendering

React still does not define what a shape role means. It exposes controls and renders interpreted scene data.

## Selection Routing Bug

After the feature landed, selecting objects exposed a controller bug.

The select tool had a no-op entry in `toolSessionRegistry`. `handleSelect` checked only whether the active tool had a session. Since `select` had one, ordinary selection was routed through construction-session handling, where the no-op select session swallowed the click before normal selection logic ran.

The fix was narrow: construction-tool session routing now applies only when `activeTool !== "select"`.

This preserves the intended split:

- select mode performs ordinary selection and clearing
- non-select tools may interpret clicks as construction steps
- gesture code remains responsible for pointer mechanics and hit detection
- the controller remains responsible for selection state and tool-session routing

A controller-level regression test now proves that select mode can select a point, select a line, and clear selection.

## Why This Matters

This feature is small, but it exercises most of the architecture.

It demonstrates that Euclid can add authored metadata without confusing it with geometric meaning. It also shows why vertical-slice tests matter. The geometry and rendering behavior can be correct while the app controller still drops the user interaction that exposes the feature.

The follow-up how-to captures the repeatable path for this kind of change:

- add authored presentation syntax in geometry
- keep exact meaning unchanged
- normalize for interpreters during realization
- interpret style in rendering
- wire UI through pure edit commands
- test both the data path and interaction path

## Verification

Focused checks were run during the update:

```bash
npx vitest run packages/geometry/src/edit.test.ts packages/geometry/src/evaluate.test.ts packages/rendering/src/scene.test.ts packages/rendering/src/canvasRenderer.test.ts packages/rendering/src/svgRenderer.test.ts packages/document/src/architecture.test.ts tests/SelectionDetails.test.tsx
npx vitest run apps/web/src/construction/useConstructionController.test.tsx apps/web/src/GestureController.test.ts tests/WorkspaceView.test.tsx apps/web/src/construction/toolSession.test.ts apps/web/src/construction/tools.test.ts
```

The final full verification passed:

```bash
npm run check
```

The final suite had 37 passing test files, 226 passing tests, and a successful production build.
