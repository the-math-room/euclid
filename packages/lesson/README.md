# Lesson Package

Purpose: headless curriculum shell that composes a starter document, activity policy, and assessment goals.

Read this when changing lesson JSON shape, lesson parsing, lesson serialization, or composition of document/policy/goals.

## Owns

- `EuclidLesson` serializable model.
- Stable lesson identity.
- Zod-backed lesson JSON parse/serialize boundary.
- Composition of document decoder, activity policy grammar, and assessment goal decoder.

## Does Not Own

- Construction syntax, meaning, editing, or evaluation.
- Assessment predicate implementations.
- Rendering, projection, SVG, Canvas, DOM, React, or browser interaction.
- Host/LMS/runtime metadata.

## Start Here

- `src/model.ts`: lesson model.
- `src/codec.ts`: Zod-backed lesson parse/serialize boundary and composition of lower-level decoders.
- `src/index.ts`: explicit public entrypoint.
- `../../examples/lessons/basic-line-intersection.lesson.json`: portable fixture.

## Local Rules

- Stay a composition layer. Depend on document, activity, and assessment packages; do not define their semantics here.
- Preserve custom extension tool ids in policy content even when the reference web app cannot execute them yet.
- Use object decoders when composing already-parsed nested content. Avoid JSON string round trips between packages.
- `EuclidLesson.id` is stable curriculum identity; hosts should persist learner state by id.
- Do not expand lesson core for host-specific runtime data; prefer host wrappers.
- Public exports in `src/index.ts` must be explicit and intentional.

## Tests

- Lesson codec behavior: `src/codec.test.ts`.
- Fixture behavior: `tests/examples/lessonFixture.test.ts`.
- Full verification for code changes: `npm run check`.
