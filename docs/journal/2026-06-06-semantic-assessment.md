# 2026-06-06: Semantic Assessment Helpers

## Summary

Added the first small headless assessment surface as a package-shaped `@euclid/assessment` layer.

The goal is to support edTech-style validation through construction semantics and explicit realization state, not through app UI behavior or pixel-only checks.

Assessment was intentionally split out of `@euclid/geometry`. Geometry owns construction syntax, dependency graph evaluation, exact meaning, realization, and provenance. Assessment is a reference interpretation over those facts. Hosts can use Euclid's assessment package, extend it, or replace it with their own policy layer.

## Package Boundary

Added the package-shaped layer:

- `packages/assessment/README.md`
- `packages/assessment/src/assessment.ts`
- `packages/assessment/src/goals.ts`
- `packages/assessment/src/goalCodec.ts`
- `packages/assessment/src/index.ts`

Added the package alias:

- `@euclid/assessment`

Updated architecture tests so assessment may import `@euclid/geometry` but may not import document, rendering, app, React, DOM, or UI libraries. Geometry, document, and rendering may not import assessment.

## API

Added `packages/assessment/src/assessment.ts` with:

- `AssessmentContext`
- `AssessmentPredicate`
- `AssessmentResult`
- `hasConstructionKind`
- `constructionIdsOfKind`
- `directlyDependsOn`
- `dependsOn`
- `hasConstructionMeaning`
- `isPointOnLine`
- `isPointOnCircle`
- `requiresConstructionKind`
- `requiresDependency`
- `requiresMeaning`
- `requiresPointOnLine`
- `requiresPointOnCircle`
- `assessAll`
- `assessAny`

The dependency and meaning helpers inspect construction syntax and evaluated meaning. The point-line and point-circle incidence predicates inspect approximate realized primitives and return `false` when required primitives are absent or unrealized.

The `requires*` helpers are reference predicate factories. They return structured pass/fail results with codes, messages, and evidence, so hosts can compose Euclid's defaults or substitute their own assessment policy.

Added `packages/assessment/src/goals.ts` with:

- `AssessmentGoal`
- `predicateForGoal`
- `evaluateGoal`

`AssessmentGoal` is a serializable discriminated union for curriculum-authored checks. It can express primitive checks and `all` / `any` compositions, then compile into the predicate interface.

Added `packages/assessment/src/goalCodec.ts` with:

- `serializeAssessmentGoal`
- `parseAssessmentGoal`

The codec validates goal JSON structure at curriculum/content boundaries without requiring referenced construction IDs to exist in a particular student program.

Added the first headless SDK examples:

- `examples/headless-kernel/README.md`
- `examples/assessment-goals/line-intersection-goal.json`

The assessment goal fixture is covered by `tests/examples/assessmentGoalFixture.test.ts`, so the example stays aligned with the public `@euclid/assessment` API.

Curated package entrypoints to use explicit named exports rather than wildcard exports. Added a boundary test that rejects wildcard exports from package `src/index.ts` files. Package READMEs now document the intentional public API groups for geometry, assessment, document, and rendering.

## Why

This is the first code-level step toward the headless edTech SDK direction. Assessment is intentionally separate from geometry meaning: a learning platform can use this reference package or provide its own assessment engine over `@euclid/geometry` data.

A learning platform can now ask questions such as:

- Did the learner create a line construction?
- Does this constructed point depend on the expected source points?
- Does this construction have the exact expected meaning?
- Is this realized point currently on this realized line or circle?

These checks are intentionally small and composable rather than a large assessment engine.

## Strategic Implication

Euclid now has three distinct headless surfaces:

- `@euclid/geometry`: construction meaning, evaluation, realization, edits, provenance.
- `@euclid/assessment`: reference assessment predicates and serializable goal evaluation.
- `@euclid/rendering`: render-scene interpretation, viewport math, hit testing, SVG/Canvas output.

This supports the infrastructure story: edTech teams can adopt the kernel, the reference assessment layer, the rendering layer, or their own replacements independently.

## Validation

The final validation after assessment package extraction, predicate interfaces, serializable goals, and goal codec work passed:

```bash
npm run check
```

Result:

- 22 test files passed.
- 132 tests passed.
- Production build succeeded.
