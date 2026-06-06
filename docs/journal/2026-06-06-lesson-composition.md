# Lesson Composition Layer

Added `@euclid/lesson` as the headless curriculum composition package.

## What Changed

- Added `EuclidLesson` with `schemaVersion`, `title`, starter `document`, activity `policy`, and assessment `goals`.
- Added `parseEuclidLesson` and `serializeEuclidLesson` for lesson JSON boundaries.
- Delegated nested document and assessment validation to `@euclid/document` and `@euclid/assessment`.
- Validated lesson activity policy structure locally.
- Added architecture tests so lesson may compose document, activity, and assessment but cannot import geometry, rendering, app, interaction, or UI libraries.
- Added `examples/lessons/basic-line-intersection.lesson.json` as a portable lesson fixture.
- Added a headless example test that parses the lesson, checks its activity policy, evaluates the starter program as incomplete, and evaluates a completed learner program as passing.

## Strategic Meaning

The lesson package gives edTech hosts a portable activity format without turning Euclid into a hosted runtime.

This keeps the SDK layers clear:

- `@euclid/geometry`: construction meaning.
- `@euclid/document`: persisted construction document.
- `@euclid/activity`: learner action policy.
- `@euclid/assessment`: reference semantic goals.
- `@euclid/lesson`: composition of document, policy, and goals.

## Follow-Up

- Decide whether the web app should load a lesson directly or keep using document/activity/assessment pieces separately during early iteration.
- Add an explicit lesson-runner helper if the example test starts getting duplicated by docs or app code.

## Documentation Update

Clarified the strategic plan after adding the first fixture:

- The current SDK path is now lesson JSON -> lesson parsing -> geometry evaluation -> assessment evaluation -> optional rendering/app interpretation.
- The next product-facing strategic move is to let the web app interpret a `EuclidLesson` as its starting point.
- A lesson-runner helper should wait until the parse/evaluate flow is duplicated enough to reveal the right abstraction.
- Lesson fixtures should remain portable JSON and avoid host/runtime concerns.
