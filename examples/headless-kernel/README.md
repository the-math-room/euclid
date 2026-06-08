# Headless Kernel Example

Purpose: demonstrate the SDK story without React, SVG, Canvas, DOM, or browser APIs.

Read this when changing the headless example or checking whether geometry and assessment can be used outside the web app.

## Shows

- `@euclid/geometry` evaluating a construction program.
- `@euclid/geometry` explaining a construction.
- `@euclid/assessment` parsing and evaluating a curriculum-authored goal.

## Boundary

This example should stay headless. Do not add React state, rendering scenes, viewport/camera state, browser fetches, or UI-specific objects.

Construction fixture data here should use the same domain types and branded coordinate constructors used by tests.

## Related Files

- `examples/assessment-goals/line-intersection-goal.json`: goal fixture used by this example family.
- `tests/examples/assessmentGoalFixture.test.ts`: executable coverage for the assessment goal fixture.

## Tests

Run or update `tests/examples/*.test.ts` for fixture changes.
