# 2026-06-08: Measurement Constraints And The First Local Solver

## Summary

This update moved authored length measurements from passive labels toward executable geometric constraints.

The motivating example was an equilateral-triangle relationship expressed through measurements instead of a special-purpose triangle command:

- fix points A and B
- call distance AB `x`
- add a free point C
- constrain AC to `x`
- constrain BC to `x`
- solve C from those two constraints

The important shift is that measurements are now part of core geometry state, not assessment-only annotations or renderer labels. If an author says a segment has length `x`, and another segment also has length `x`, that relationship can affect the construction program.

## Why

The first instinct around measurements could have been to treat them as assessment data: a future lesson might ask a student to fill in `x`, or check that two expressions match.

That would have been too weak.

A measurement expression is not only a question. It can be an authored geometric claim. If the construction program says AB is `x`, AC is `x`, and BC is `x`, that is enough information to place C when A and B are fixed and C is the only movable point.

That makes measurement constraints part of `@euclid/geometry`:

- the app can expose controls
- rendering can show labels and diagnostics
- assessment can later ask questions about them
- but geometry owns the data shape, expression evaluation, mobility rules, and solving behavior

React should not decide which point moves. It should ask geometry to apply a constraint and then display the result.

## Vocabulary Cleanup

Before adding solver behavior, we cleaned up the command vocabulary.

The old words were too vague:

- `assert`
- `drive`
- `move`
- `unit = 3`
- `x = 2`

The new vocabulary is more explicit:

- `check`: a passive measurement that reports whether the diagram matches the expression
- `constraint`: an authored measurement that may be applied to change geometry
- `calibrate-unit`: keep points where they are and set the measurement unit scale from the selected constraint
- `move-free-endpoint`: keep the unit scale and solve exactly one movable free endpoint
- unit scale: world-space length represented by one measurement unit
- symbol value: numeric value, in measurement units, assigned to a variable such as `x`

This clarified the model enough to delete the old `assertion`/`driving` naming and rename segment length records to measurements.

The principle uncovered here is simple: if a control changes geometry, its name should say what remains fixed and what is allowed to change.

## Fixed Points

Solver behavior required a more explicit notion of point mobility.

Free points can now be authored as:

- `free`
- `fixed`

A fixed point is still a point in the construction graph. It can still be referenced by lines, circles, measurements, and macros. The only difference is that movement edits and measurement-constraint solving treat it as immovable.

This was necessary for principled solving. If both endpoints of a measured segment can move, geometry cannot choose one without guessing. If neither endpoint can move, geometry cannot satisfy the constraint by moving an endpoint. Fixed/free state gives the solver an explicit rule instead of relying on UI selection accident.

## The First Solver

The first solver remains intentionally local.

When applying `move-free-endpoint`, geometry asks:

1. Does the selected constraint have exactly one movable free endpoint?
2. Are there other applicable constraint measurements involving the same movable endpoint?
3. Is this a supported local system?

The supported systems are:

- one distance constraint for one movable point
- two distance constraints for one movable point

With one distance constraint, geometry preserves the existing ray from the fixed endpoint through the movable endpoint and moves the endpoint to the target length.

With two distance constraints, geometry interprets them as two circles:

- fixed endpoint 1 is center 1
- target length 1 is radius 1
- fixed endpoint 2 is center 2
- target length 2 is radius 2

The movable point is placed at a circle-circle intersection.

When the two circles intersect in two possible places, geometry preserves the movable point's current side of the fixed baseline when possible. That gives the solver a stable clockwise/counterclockwise preference without adding a new UI choice yet.

## Error Instead Of Guessing

The solver deliberately refuses unsupported cases.

It returns errors when:

- the measurement is not a constraint
- the expression cannot evaluate to a positive length
- no endpoint can move
- both endpoints can move
- more than two applicable constraints target the same movable point
- two distance constraints do not intersect
- coincident endpoints do not define a movement direction for the one-constraint fallback

This is important debt containment. A bad solver is worse than no solver if it silently changes the wrong object. For now, the system should make small principled moves or tell the user it cannot.

## Principles Uncovered

Measurements are authored geometry state.

They are not only labels, assessment prompts, or renderer concerns. Other layers may interpret measurements, but core geometry owns their meaning and edit behavior.

Constraint application needs an explicit invariant.

Every command should say what is fixed and what may move. `calibrate-unit` fixes points and changes the unit scale. `move-free-endpoint` fixes the unit scale and changes exactly one free point.

Local solvers should be total at the boundary.

The implementation can support only a narrow class of systems, but the command result must still account for failure. Unsupported and unsolvable systems are ordinary outcomes, not exceptions.

Orientation is a policy choice.

For two circle intersections, either point may satisfy the constraints. Preserving the current side of the baseline is a reasonable default because it minimizes surprise and avoids arbitrary flipping.

The app is still an interpreter.

The UI exposes `Solve endpoint`, but it does not inspect constraints, choose endpoints, intersect circles, or move points directly. It delegates to geometry and shows the returned message.

## Lessons Learned

The naming cleanup was not cosmetic. The solver would have been much harder to reason about while commands were called "assert" and "drive." Once the names said what they did, the implementation shape became clearer.

Fixed/free point state is not just a UI affordance. It is solver input. Without it, even simple constraints become ambiguous.

The existing Euclidean primitive helpers paid off. The two-constraint solver could use the existing circle-circle intersection operation instead of introducing a numeric optimization dependency.

Tests are the right place to encode solver humility. The most important tests are not only "C moves to the equilateral point." They are also "two possible orientations preserve the current side," "non-intersecting constraints fail," and "more than two constraints fail."

## Debt And Future Work

The largest debt is user ergonomics.

Right now the feature is powerful but too manual. A user has to understand selected points, measurement expressions, fixed point state, unit scale, symbol values, constraint intent, and the difference between calibrating and solving. That is too much raw machinery for ordinary use.

The UI needs a more guided workflow:

- clearer affordances for fixed vs free points
- better indication of which constraints are solvable
- visible explanation of what `Solve endpoint` will move before it moves anything
- friendlier error messages with concrete next steps
- a way to solve from the selected point, not only from a selected measurement row
- automatic discovery of related constraints in the panel
- better visual feedback for satisfied, unresolved, unsatisfied, and applied constraints

The solver is also intentionally narrow.

Future solver work should consider:

- more than two constraints with consistency checking
- line, circle, midpoint, parallel, and perpendicular constraints
- moving derived witness points where appropriate
- solving variables from geometry instead of requiring symbol values first
- choosing among multiple movable points through an explicit user or policy decision
- retaining provenance for why a point moved
- making solver behavior deterministic across document load/save boundaries

There is also model debt around unit and variable semantics.

The current model supports a global unit scale and global variable assignments. That is enough for the first feature, but future lessons may need scoped variables, symbolic equality, unknown solving, or multiple measurement systems. We should not add those until a lesson or authoring workflow demands them, but the pressure is visible.

Finally, constraint solving needs a how-to.

We now have enough moving parts that future agents need an LLM-facing guide for adding solver behavior. It should document the expected path:

1. model the authored state in geometry
2. evaluate expressions and diagnostics in `measurement.ts`
3. implement pure edit behavior in `edit.ts`
4. keep React as command routing only
5. add success, ambiguity, unsupported, and unsolvable tests
6. update package READMEs when a boundary rule changes

## Verification

Focused checks were run around measurement evaluation, geometry edits, controller wiring, and selection details:

```bash
npx vitest run packages/geometry/src/edit.test.ts packages/geometry/src/measurement.test.ts apps/web/src/construction/useConstructionController.test.tsx tests/SelectionDetails.test.tsx
npm run typecheck
```

The final full verification passed:

```bash
npm run check
```

The final suite had 39 passing test files, 262 passing tests, and a successful production build.
