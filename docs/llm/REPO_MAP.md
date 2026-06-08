# Repo Map

Use this file to route attention before editing.

## Assessment

Start here:

- `packages/assessment/README.md`
- `packages/assessment/src/assessment.ts`
- `packages/assessment/src/goalCodec.ts`
- `packages/assessment/src/goalResolution.ts`
- `packages/assessment/src/goals.ts`

Run or update:

- `packages/assessment/src/*.test.ts`

## Activity Policy

Start here:

- `packages/activity/README.md`
- `packages/activity/src/policy.ts`

Run or update:

- `packages/activity/src/*.test.ts`

## Construction Meaning

Start here:

- `packages/geometry/README.md`
- `packages/geometry/src/model.ts`
- `packages/geometry/src/constructionSchemas.ts`
- `packages/geometry/src/dependencies.ts`
- `packages/geometry/src/evaluate.ts`
- `packages/geometry/src/explain.ts`
- `packages/geometry/src/realize.ts`
- `packages/geometry/src/approx.ts`
- `packages/geometry/src/edit.ts`
- `packages/geometry/src/names.ts`

Run or update:

- `packages/geometry/src/*.test.ts`

## Documents And Persistence

Start here:

- `packages/document/README.md`
- `packages/document/src/model.ts`
- `packages/document/src/history.ts`
- `packages/document/src/codec.ts`
- `packages/document/src/documentDecoder.ts`
- `packages/document/src/constructionDecoder.ts`
- `packages/document/src/seed.ts`

Run or update:

- `packages/document/src/*.test.ts`

## Lessons

Start here:

- `packages/lesson/README.md`
- `packages/lesson/src/model.ts`
- `packages/lesson/src/codec.ts`

Run or update:

- `packages/lesson/src/*.test.ts`

## Rendering

Start here:

- `packages/rendering/README.md`
- `packages/rendering/src/scene.ts`
- `packages/rendering/src/viewport.ts`
- `packages/rendering/src/labelLayout.ts`
- `packages/rendering/src/interaction.ts`
- `packages/rendering/src/canvasRenderer.ts`
- `packages/rendering/src/svgRenderer.ts`
- `packages/rendering/src/style.ts`
- `packages/rendering/src/theme.ts`

Run or update:

- `packages/rendering/src/*.test.ts`

## Web UI

Start here:

- `apps/web/README.md`
- `apps/web/src/App.tsx`
- `apps/web/src/construction/useConstructionController.ts`
- `apps/web/src/WorkspaceView.tsx`
- `apps/web/src/workspacePreview.ts`
- `apps/web/src/WorkspaceContainer.tsx`
- `apps/web/src/GestureController.ts`
- `apps/web/src/useWorkspaceGestures.ts`

## Examples

Start here:

- `examples/headless-kernel/README.md`
- `examples/lessons/README.md`
- `examples/lessons/basic-line-intersection.lesson.json`
- `examples/assessment-goals/line-intersection-goal.json`

Run or update:

- `tests/examples/*.test.ts`

## Architecture Boundaries

Start here:

- `docs/architecture/layers.md`
- `docs/architecture/pure-core.md`
- `docs/architecture/denotational-design.md`
- `docs/strategy/headless-edtech-sdk.md`
- `docs/journal/2026-06-06-headless-sdk-and-provenance.md`
- `tests/architecture/import-boundaries.test.ts`

Run:

```bash
npm run check
```

## Journal (Most Recent First)

- `docs/journal/2026-06-07-security-meta-and-tolerances.md` — hardened production CSP meta output, added referrer meta, and replaced bare epsilon literals with semantic tolerance constants.
- `docs/journal/2026-06-07-boundary-composition-and-fixtures.md` — added object-level content decoders for package composition and typed rendering test fixtures.
- `docs/journal/2026-06-07-geometry-algebraic-interpreters.md` — refactored geometry construction interpreters toward exhaustive native TypeScript ADT folds.
- `docs/journal/2026-06-07-shared-construction-schemas.md` — moved canonical construction Zod schemas into geometry for reuse by document and assessment parsers.
- `docs/journal/2026-06-07-goal-resolution-pattern-matching.md` — replaced reflective assessment goal-resolution traversal with explicit construction-expression pattern matching.
- `docs/journal/2026-06-07-zod-document-boundary.md` — added Zod at document, assessment-goal, and lesson content boundaries.
- `docs/journal/2026-06-07-document-decoder-split.md` — split the document codec into facade, document decoder, and construction decoder modules.
- `docs/journal/2026-06-07-document-parse-boundary.md` — hardened `parseEuclidDocument` so persisted construction JSON is explicitly parsed into typed construction variants instead of cast.
- `docs/journal/2026-06-07-coordinate-branding-completion.md` — completed world/scene coordinate branding in construction storage, realization, parsing boundaries, and fixtures.
- `docs/journal/2026-06-07-rendering-style-consolidation-and-gesture-tests.md` — unified style resolution across Canvas/SVG and pure headless testing of GestureController.
- `docs/journal/2026-06-07-architectural-precepts.md` — architectural precepts codifying design philosophy (denotational design, UI interpretation, branded types, and extensibility).
- `docs/journal/2026-06-06-lesson-authoring-and-gesture-decoupling.md` — visual lesson authoring panel, magic auto-detect algorithm, and GestureController decoupling.
- `docs/journal/2026-06-06-parallel-perpendicular-midpoint.md` — parallel line, perpendicular line, and midpoint tools (full kernel-to-UI vertical slice).
- `docs/journal/2026-06-06-day-2-summary.md` — Day 2 narrative summary.
- `docs/journal/2026-06-06-generic-resolver-and-camera-pivot.md` — generic assessment resolver and camera pivot fix.
- `docs/journal/2026-06-06-lesson-persistence-and-resolution.md` — multi-lesson persistence and ID resolution.
- `docs/journal/2026-06-06-lesson-composition.md` — `@euclid/lesson` composition layer.
- `docs/journal/2026-06-06-semantic-assessment.md` — `@euclid/assessment` and serializable goals.
- `docs/journal/2026-06-06-activity-policy.md` — `@euclid/activity` headless policy package.
- `docs/journal/2026-06-06-headless-sdk-and-provenance.md` — headless SDK direction and provenance API.
- `docs/journal/2026-06-06-coordinate-branding-and-features.md` — branded coordinates and shape translation.
- `docs/journal/2026-06-05-initial-foundation.md` — Day 1: initial foundation.
