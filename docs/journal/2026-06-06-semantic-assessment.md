# 2026-06-06: Semantic Assessment Helpers

## Summary

Added the first small headless assessment surface as a package-shaped `@euclid/assessment` layer.

The goal is to support edTech-style validation through construction semantics and explicit realization state, not through app UI behavior or pixel-only checks.

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

## Why

This is the first code-level step toward the headless edTech SDK direction. Assessment is intentionally separate from geometry meaning: a learning platform can use this reference package or provide its own assessment engine over `@euclid/geometry` data.

A learning platform can now ask questions such as:

- Did the learner create a line construction?
- Does this constructed point depend on the expected source points?
- Does this construction have the exact expected meaning?
- Is this realized point currently on this realized line or circle?

These checks are intentionally small and composable rather than a large assessment engine.
