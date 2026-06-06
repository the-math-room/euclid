# Lesson Fixtures

These fixtures show the SDK story at the lesson layer: a starter document, a headless activity policy, and curriculum-authored assessment goals in one portable JSON value.

## Basic Line Intersection

[`basic-line-intersection.lesson.json`](./basic-line-intersection.lesson.json) asks a learner to construct two lines through four locked starter points and then construct their intersection.

It uses:

- `@euclid/lesson` to parse the lesson shell.
- `@euclid/geometry` to evaluate the learner construction program.
- `@euclid/assessment` to evaluate each lesson goal.

The fixture is covered by `tests/examples/lessonFixture.test.ts`.
