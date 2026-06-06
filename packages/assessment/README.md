# Assessment Package

Owns reference assessment helpers over construction programs and evaluations.

## Owns

- Reference predicates for construction kind checks.
- Reference dependency checks for direct and transitive construction provenance.
- Reference exact meaning checks.
- Reference approximate incidence predicates over realized primitives.
- A small predicate/result interface for composing reference or host-defined checks.

Functions in this package should be memoizable in theory.

## Must Not Own

- Construction syntax or meaning.
- Construction editing.
- Approximate realization.
- Rendering, projection, SVG, Canvas, or DOM.
- React, browser state, or user interaction.

## Allowed Imports

- `@euclid/geometry`.
- Local assessment modules.

## Key Files

- `src/assessment.ts`: reference assessment predicates.
- `src/index.ts`: public package entrypoint.

## Design Intent

Assessment is an interpretation of construction meaning, not the owner of meaning. Hosts may use this package as a reference implementation or bring their own assessment engine against `@euclid/geometry` data.

Keep this package small and composable. Prefer predicate-shaped helpers over a large rubric engine until repeated usage makes larger abstractions obvious.

## Predicate Interface

The reference interface is:

```ts
type AssessmentContext = Readonly<{
  program: ConstructionProgram;
  evaluation: Evaluation;
}>;

type AssessmentPredicate = (context: AssessmentContext) => AssessmentResult;
```

Reference predicate factories include:

- `requiresConstructionKind`
- `requiresDependency`
- `requiresMeaning`
- `requiresPointOnLine`
- `requiresPointOnCircle`
- `assessAll`
- `assessAny`

Hosts can compose these, wrap them with curriculum-specific metadata, or replace them with their own predicate implementations.

## Verification Command

Always run the validation suite before finishing:

```bash
npm run check
```
