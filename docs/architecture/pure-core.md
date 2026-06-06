# Pure Core And Imperative Shell

Euclid uses a pure-core, imperative-shell architecture.

## Rule

Package production code should be pure in the practical denotational sense: exported functions should be memoizable in theory.

For the same explicit inputs, a package function should return the same explicit output without depending on time, randomness, process state, browser state, storage, network, or hidden mutable module state.

## Pure Core

These layers are part of the pure core:

- `packages/geometry/src`
- `packages/activity/src`
- `packages/assessment/src`
- `packages/document/src`
- `packages/lesson/src`
- `packages/rendering/src`

They may use local implementation data structures such as `Map`, `Set`, or local mutation inside a function when the mutation is not observable and the function remains memoizable by its inputs.

They must not use:

- `Date`
- `Math.random`
- timers
- `fetch`
- `window`
- `document`
- browser storage
- module-level mutable state
- React or UI libraries

## Imperative Shell

The imperative shell lives in:

- `apps/web/src`

The shell may touch the DOM, register browser event handlers, manage React rendering, read from storage, or eventually perform network effects. It should translate effects into explicit data and commands before calling the pure core.

## Design Pressure

If a function cannot be memoized in theory because it implicitly depends on ambient state or a hidden mutable cache, it does not belong in the pure core.

If a function accepts a large mutable state object and reads only some hidden subset of it, prefer passing the explicit data it needs. This keeps function meaning small enough for humans and LLMs to reason about.
