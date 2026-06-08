# Assessment Package

Purpose: reference assessment over construction programs and evaluations.

Read this when changing goal specs, goal parsing, goal-id resolution, or assessment predicates.

## Owns

- Reference predicates over construction kind, dependencies, exact meaning, and approximate incidence.
- Predicate composition helpers.
- Serializable `AssessmentGoal` specs.
- Zod-backed goal JSON parse/serialize boundary.
- Mapping curriculum goal references to learner construction ids.

## Does Not Own

- Construction syntax, meaning, editing, or approximate realization.
- Authored measurement assertions and measurement-expression syntax.
- Rendering, projection, SVG, Canvas, DOM, React, or browser interaction.
- Lesson composition.

## Start Here

- `src/assessment.ts`: low-level reference predicates and predicate composition.
- `src/goals.ts`: serializable goal model and goal evaluation.
- `src/goalCodec.ts`: Zod-backed goal parse/serialize boundary.
- `src/goalResolution.ts`: explicit mapping between target references and learner constructions.
- `src/index.ts`: explicit public entrypoint.

## Local Rules

- Assessment interprets geometry; it does not define construction meaning.
- Prefer predicate-shaped helpers over a large rubric engine.
- Keep goal resolution explicit over typed discriminated unions. Do not use reflective object traversal to recover construction-expression semantics.
- `geometric-equivalent` goals should evaluate denotation, not labels or a single construction recipe.
- If future goals ask about authored measurements, consume measurement state from `@euclid/geometry`; do not define a parallel measurement model here.
- Zod belongs in `goalCodec.ts`, not predicate or resolution internals.
- Public exports in `src/index.ts` must be explicit and intentional.

## Tests

- Predicate behavior: `src/assessment.test.ts`.
- Goal behavior: `src/goals.test.ts`.
- Goal codec behavior: `src/goalCodec.test.ts`.
- Full verification for code changes: `npm run check`.
