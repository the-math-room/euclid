# Journal: Hit-Testing and Snapping Consolidation

Date: June 7, 2026

## Stance & Rationale

Until now, hit testing for interaction in Euclid has been split:

- `findItemAtPosition` was used to find existing points or shapes (lines/circles).
- `findIntersectionAtPosition` was used to compute line-line, line-circle, and circle-circle intersections and snap to them.

These separate operations were invoked sequentially inside `GestureController.ts` within the gesture policy matching loop. This had several architectural weaknesses:

1. **Redundant Calculations**: If a gesture target priority list checked multiple targets sequentially, it would re-run hit testing or intersection searching multiple times for a single event.
2. **Fragile Prioritization**: The priority between snaps (e.g. snapping to a point vs. snapping to a curve intersection) was implicitly resolved by order of execution in the gesture controller rather than a unified sorted coordinate check.

## Solution: The SnapTarget Union and Unified Search

We introduced a unified query `findSnapTargets` in `packages/rendering/src/interaction.ts` that collects all candidate snap targets in screen space within a given threshold:

```typescript
export type SnapTarget =
  | Readonly<{ kind: "point"; item: RenderItem & { kind: "point" }; position: ScenePoint; distance: number }>
  | Readonly<{ kind: "intersection"; hit: IntersectionHit; position: ScenePoint; distance: number }>
  | Readonly<{ kind: "line"; item: RenderItem & { kind: "line" }; distance: number }>
  | Readonly<{ kind: "circle"; item: RenderItem & { kind: "circle" }; distance: number }>;
```

All candidates are sorted by screen-space distance to the pointer.
The GestureController then evaluates the tool's `pointerUpPriority` sequentially. For each priority item:

- It queries the sorted candidate list.
- Because the list is pre-sorted, it automatically grabs the closest target of that kind.
- It falls back to `pointerDownItem` matching where appropriate to preserve intent under drift.

This maintains our denotational design boundaries: rendering and interaction geometry calculations remain pure functions in `@euclid/rendering`, and the imperative gesture machine in `apps/web` acts purely as a policy router.
