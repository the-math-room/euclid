# Lesson Composition Layer

Added `@euclid/lesson` as the headless curriculum composition package.

## What Changed

- Added `EuclidLesson` with `schemaVersion`, `title`, starter `document`, activity `policy`, and assessment `goals`.
- Added `parseEuclidLesson` and `serializeEuclidLesson` for lesson JSON boundaries.
- Delegated nested document and assessment validation to `@euclid/document` and `@euclid/assessment`.
- Validated lesson activity policy structure locally.
- Added architecture tests so lesson may compose document, activity, and assessment but cannot import geometry, rendering, app, interaction, or UI libraries.

## Strategic Meaning

The lesson package gives edTech hosts a portable activity format without turning Euclid into a hosted runtime.

This keeps the SDK layers clear:

- `@euclid/geometry`: construction meaning.
- `@euclid/document`: persisted construction document.
- `@euclid/activity`: learner action policy.
- `@euclid/assessment`: reference semantic goals.
- `@euclid/lesson`: composition of document, policy, and goals.

## Follow-Up

- Add a fixture under `examples/lessons` once the first lesson shape is used by the app or examples.
- Decide whether the web app should load a lesson directly or keep using document/activity/assessment pieces separately during early iteration.
