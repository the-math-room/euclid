# Lesson Fixtures

Purpose: portable JSON fixtures for the lesson layer.

Read this when changing example lesson content or checking the expected host flow for `EuclidLesson`.

## Shows

- A starter document.
- A headless activity policy.
- Curriculum-authored assessment goals.
- A portable JSON value that can be parsed without the web app.

## Boundary

Lesson fixtures should stay portable JSON. Do not include React state, viewport/camera state, rendering preferences, LMS identifiers, analytics storage, browser state, or hosted runtime concerns.

If a host needs those fields, prefer a host-specific wrapper around `EuclidLesson` instead of expanding the lesson core.

## Related Files

- `basic-line-intersection.lesson.json`: lesson fixture.
- `tests/examples/lessonFixture.test.ts`: executable fixture coverage.
- `packages/lesson/README.md`: lesson package rules.

## Tests

Run or update `tests/examples/*.test.ts` for fixture changes.
