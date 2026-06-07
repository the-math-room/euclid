# 2026-06-06: Parallel, Perpendicular, and Midpoint Construction Tools

## Summary

Added three new Euclidean construction primitives — parallel line, perpendicular line, and midpoint — as a complete vertical slice from the geometry kernel through the activity policy, assessment layer, and interactive web UI.

The goal was to implement tools that follow the same denotational discipline as the existing construction set: meaning is defined independently of realization, editing is pure, and the UI is strictly an interpreter of geometry state.

## What Changed

### Geometry Kernel (`packages/geometry`)

All three constructions follow the established `add-a-construction.md` checklist:

**`parallel-line`** — a line through a witness point with the same direction vector as a reference line.

**`perpendicular-line`** — a line through a witness point with the direction vector rotated 90° from a reference line. The rotation is `(-dy, dx)`, matching the sign convention used throughout `realize.ts`.

**`midpoint`** — a point at the arithmetic mean of two parent point positions.

For each:

- `model.ts`: new `Construction` union case and `ConstructionExpression` variant.
- `dependencies.ts`: dependency extraction added to `dependencyIds`.
- `evaluate.ts`: `meaningFor` case preserving the exact structural references.
- `realize.ts`: numeric realization from parent primitive positions.
- `edit.ts`: `addParallelLine`, `addPerpendicularLine`, `addMidpoint` — pure helpers with idempotent duplicate detection, returning `{ program, id, changed }`. `translateShape` extended to translate the witness point of line tools and both parent points of midpoints.
- `explain.ts`: natural language provenance strings.

### Activity Policy (`packages/activity`)

Added `"perpendicular"` and `"midpoint"` to `ActivityTool`, `openActivityPolicy`, and the default order in `allowedToolsInOrder`. Both tools are enabled in open policies and can be selectively removed in curriculum-specific policies.

### Assessment (`packages/assessment`)

- `goalCodec.ts`: decode/validate `"perpendicular-line"` and `"midpoint"` expression kinds.
- `assessment.ts`: `sameExpression` comparison for both new kinds. Midpoint comparison is order-independent (`[A, B]` matches `[B, A]`), reflecting that a midpoint between two points is symmetric.

### Web Studio (`apps/web`)

**Parallel line tool** (implemented earlier; assessment fixed in this session):

- Two-step interaction: select a reference line, then click or place a witness point.
- Objective detection was broken because `sameExpression` lacked the `"parallel-line"` case. Fixed.
- Lesson 4 ("Parallel Line") corrects point C's locked state so it is free to drag; dragging it translates the parallel line dynamically.

**Perpendicular line tool**:

- Identical interaction pattern to parallel: select reference line, then select or place witness point.
- Draft preview renders a ghost line through the cursor using the rotated direction, giving immediate visual feedback on the perpendicular orientation before the second click.

**Midpoint tool**:

- Two-step point selection, mirroring the line tool: click the first parent point, then click the second.
- Draft preview draws a segment from the first selected point to the cursor and a ghost midpoint at the average scene position, letting the learner preview the result before placing it.

Toolbar buttons added:

- Parallel: rotated `Equal` icon.
- Perpendicular: `BetweenHorizonalEnd` icon.
- Midpoint: `Milestone` icon.

## Design Notes

The parallel and perpendicular tools share the same two-step "line then point" interaction. The midpoint tool shares the two-step "point then point" interaction with the line tool. These patterns reuse the same draft state machine in `useConstructionController.ts`, reducing surface area for bugs.

The perpendicular realization uses `(-dy, dx)` rather than `(dy, -dx)` to match the screen-space orientation users expect: a horizontal reference line produces a vertical perpendicular going upward from the witness point.

Midpoint `sameExpression` is order-independent because the mathematical operation is symmetric. This matters for assessment: a curriculum author should not need to specify which of the two parent points is "first."

## Validation

```bash
npm run check
```

- 27 test files, 157 tests passed.
- Production build succeeded.
