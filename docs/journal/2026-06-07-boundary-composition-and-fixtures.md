# 2026-06-07: Boundary Composition And Fixtures

## Summary

Removed two sources of incidental debt:

- lesson parsing no longer serializes nested objects back to JSON text just to reuse document and assessment parsers
- rendering tests no longer rely on broad `as unknown as RenderScene` / `RenderItem` casts for ordinary fixtures

Also updated the denotational design notes so the documented construction set and interpreter style match the current code.

## What Changed

`packages/document/src/codec.ts` now exports `decodeEuclidDocument(value: unknown)` as an object-level decoder alongside the existing `parseEuclidDocument(text: string)` convenience API.

`packages/assessment/src/goalCodec.ts` now exports `decodeAssessmentGoal(value: unknown)` as an object-level decoder alongside the existing `parseAssessmentGoal(text: string)` convenience API.

`packages/lesson/src/codec.ts` now composes those object-level decoders directly for nested lesson content:

- starter documents use `decodeEuclidDocument`
- assessment goals use `decodeAssessmentGoal`

This removes the previous `JSON.stringify(...)` round trips inside lesson decoding.

Added `packages/rendering/src/renderTestFixtures.ts` with typed test builders for:

- `scenePoint`
- `renderScene`
- `gridLine`
- `pointItem`
- `lineItem`
- `circleItem`

Updated rendering tests to use those builders instead of casting plain objects through `unknown`.

Updated `docs/architecture/denotational-design.md` so the current domain includes circle-through-three-points, parallel lines, perpendicular lines, and midpoints. The same document now records construction interpreters as intentional folds over the runtime construction ADT.

## Principle: Text Parsers Are Not Composition APIs

String parsers are useful public convenience boundaries. They are the right API when a caller has text from storage, import, an editor, or a URL.

They are not the right API when a caller already has parsed JSON-like data.

For package composition, object-level decoders are the better boundary:

- they avoid serialize-then-parse round trips
- they keep diagnostics owned by the package that understands the schema
- they let higher-level packages compose nested content without pretending it is text again
- they preserve the same parse boundary while removing incidental representation churn

The lesson package should compose document and assessment decoders, not their text parser conveniences.

## Principle: Tests Should Not Lie About Domain Shapes

The rendering tests had broad casts from partial plain objects into branded scene/domain types. That made the tests short, but it weakened the same coordinate and render-item type guarantees the production code relies on.

Typed fixture builders are a better compromise:

- tests stay compact
- `ScenePoint` branding is preserved through `toScenePoint`
- render item variants are constructed through typed helpers
- future render-item shape changes fail in fixture code instead of being hidden behind casts

This is not about eliminating every cast in every test. It is about avoiding casts where a small builder can encode the intended domain shape directly.

## Verification

Ran focused parser tests:

```bash
npx vitest run packages/document/src/architecture.test.ts packages/assessment/src/goalCodec.test.ts packages/lesson/src/codec.test.ts tests/examples/lessonFixture.test.ts tests/examples/assessmentGoalFixture.test.ts
```

Result: 5 passing test files and 27 passing tests.

Ran focused rendering tests:

```bash
npx vitest run packages/rendering/src/canvasRenderer.test.ts packages/rendering/src/svgRenderer.test.ts packages/rendering/src/interaction.test.ts packages/rendering/src/labelLayout.test.ts
```

Result: 4 passing test files and 24 passing tests.

Ran full validation:

```bash
npm run check
```

Result: lint, format check, app/test typecheck, Vitest, and Vite production build all passed. The test suite reported 34 passing test files and 213 passing tests.
