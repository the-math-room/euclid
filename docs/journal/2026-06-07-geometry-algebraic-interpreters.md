# 2026-06-07: Geometry Algebraic Interpreters

## Summary

Refactored geometry construction interpretation toward a more algebraic native TypeScript style.

The goal was not to remove runtime dispatch entirely. `Construction` is persisted heterogeneous data, so some runtime case analysis is intrinsic. The goal was to make that dispatch explicit, total, and localized in semantic interpreters rather than scattered as ad-hoc `if` chains.

## What Changed

`packages/geometry/src/evaluate.ts` now separates:

- `meaningFor`: the common wrapper from construction syntax to construction meaning
- `expressionFor`: the total interpreter from `Construction` to `ConstructionExpression`

`packages/geometry/src/dependencies.ts` now treats `dependencyIds` as a closed interpreter over `Construction`.

`packages/geometry/src/realize.ts` now uses `realizeOne` as the top-level realization interpreter. Variant-specific realization logic lives in focused helpers such as:

- `realizeLineThrough`
- `realizeCircleThrough`
- `realizeCircleThreePoints`
- `realizeLineCircleIntersection`
- `realizeCircleCircleIntersection`
- `realizeParallelLine`
- `realizePerpendicularLine`
- `realizeMidpoint`

Repeated diagnostic construction and intersection-point result handling were factored into small helpers.

`packages/geometry/src/edit.ts` now exposes shape-translation target selection as `translatedPointIds`, a closed interpreter over construction variants. This preserves existing behavior: free-point movement is still owned by `moveFreePoint`, not `translateShape`.

`packages/geometry/src/explain.ts` now treats `explanationFor` as a total string interpreter over `Construction`.

## Principle: Switches As ADT Folds

The repeated switches are intentional. In this codebase, `Construction` is a runtime algebraic data type:

- documents persist constructions as data
- construction programs contain heterogeneous arrays
- several packages interpret the same data in different ways
- graph evaluation cannot statically know which variant each runtime element contains

That means runtime case analysis is not a validation smell. It is the fold/eliminator over the construction ADT.

The maintainability rule is:

- keep switches inside semantic interpreters
- make each switch total over the construction union
- keep variant-specific work in focused helpers when the branch is non-trivial
- avoid UI or rendering code inventing construction meaning
- adding a construction should force deliberate updates to each interpreter

This gives us algebraic clarity without importing a pattern-matching library or hiding dispatch behind a custom visitor too early.

## Principle: Parse Boundaries Are Different From Interpretation

Zod remains appropriate at JSON/content boundaries. It turns unknown userland data into trusted construction syntax.

Realization is different. `realizeOne` already receives a typed `Construction`; it is not parsing loose data. Its checks are semantic and numeric:

- dependency primitives may be absent
- dependencies may realize to the wrong primitive kind
- points may be coincident
- lines may be parallel
- circles may not intersect
- an intersection index may be out of bounds for the current realization

Those are not parse-time facts. A construction can be valid syntax and valid meaning while still having no current approximate realization.

If repetition grows in realization, the next useful abstraction is typed dependency resolution with small result types, not Zod.

## Why Not Add A Custom Eliminator Yet

We considered a `matchConstruction` eliminator. It would centralize dispatch and feel closer to typed pattern matching, but it would also add project-specific ceremony.

For now, native TypeScript `switch` is the better tradeoff:

- easy to read
- easy to debug
- idiomatic for discriminated unions
- exhaustive under TypeScript narrowing
- simple for future agents to extend

An eliminator may become worthwhile if construction interpreters proliferate enough that the repeated case lists become harder to maintain than the abstraction.

## Verification

Ran focused geometry tests:

```bash
npx vitest run packages/geometry/src/evaluate.test.ts packages/geometry/src/dependencies.test.ts packages/geometry/src/edit.test.ts packages/geometry/src/explain.test.ts
```

Result: 4 passing test files and 41 passing tests.

Ran full validation:

```bash
npm run check
```

Result: lint, format check, app/test typecheck, Vitest, and Vite production build all passed. The test suite reported 34 passing test files and 213 passing tests.
