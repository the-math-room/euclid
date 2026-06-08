# Add Measurement Constraint Behavior

Use this checklist when adding or changing behavior for authored measurements, measurement expressions, point mobility, or constraint solving.

Measurement constraints are authored geometry state. They may be rendered, assessed, or edited by the app, but their data shape, expression evaluation, mobility rules, and solver behavior belong in `@euclid/geometry`.

## 1. Use The Project Vocabulary

Current measurement intent:

- `check`: passive measurement; reports whether the diagram matches the expression
- `constraint`: authored measurement that may be applied to change geometry

Current application behavior:

- `calibrate-unit`: keep points fixed and set the unit scale from the selected constraint
- `move-free-endpoint`: keep the unit scale and solve exactly one movable free endpoint

Current authored point mobility:

- `free`: default free point behavior
- `fixed`: point remains in the construction graph but movement edits and constraint solving treat it as immovable

Avoid older or vague words such as `assert`, `driving`, or generic `move` when naming new public APIs or UI controls.

## 2. Keep Ownership In Geometry

Touch geometry first:

- `packages/geometry/src/model.ts`: authored measurement and mobility types
- `packages/geometry/src/constructionSchemas.ts`: content-boundary schemas for geometry-owned fields
- `packages/geometry/src/measurement.ts`: expression parsing, variable/unit evaluation, and diagnostics
- `packages/geometry/src/edit.ts`: pure commands that change measurement state or apply constraints
- `packages/geometry/src/index.ts`: explicit public exports

Do not parse measurement expressions in React. Do not choose movable endpoints in React. Do not implement solver math in the app.

The app may:

- collect user input
- call geometry edit commands
- push changed programs into history
- display returned diagnostics or messages

The app must not:

- inspect a constraint system to decide what moves
- mutate construction records directly
- create a parallel measurement model

## 3. Preserve Explicit Invariants

Every constraint application command must make clear what remains fixed and what may change.

Examples:

- `calibrate-unit`: points stay where they are; unit scale changes
- `move-free-endpoint`: unit scale stays fixed; exactly one free endpoint may move

If a proposed behavior cannot name its fixed quantities and movable quantities clearly, stop and refine the model before implementing it.

## 4. Evaluate Before Solving

Solver behavior should consume evaluated measurements, not raw strings.

Use `evaluateMeasurements` to get:

- effective unit scale
- variable values
- parsed expression values
- realized endpoint positions
- diagnostics for invalid, unresolved, or mismatched measurements

A constraint must evaluate to a positive target length before it can be applied.

## 5. Respect Point Mobility

Only free-point constructions may be moved by measurement solving.

Treat a free point with `mobility: "fixed"` as immovable.

When a measured segment has:

- zero movable endpoints: return an error
- one movable endpoint: this is a possible local solve
- two movable endpoints: return an error unless a future command provides an explicit policy for choosing which point moves

Do not infer the movable point from UI selection when geometry has enough authored state to decide.

## 6. Prefer Small Local Solvers

The current supported `move-free-endpoint` systems are intentionally narrow:

- one distance constraint for one movable point
- two distance constraints for one movable point

For one distance constraint, move the endpoint along its current ray from the fixed endpoint.

For two distance constraints, treat the constraints as two fixed-center circles and place the movable point at a circle-circle intersection.

When two intersections are possible, preserve the movable point's current clockwise/counterclockwise side of the fixed baseline when possible. If the current point is on the baseline, choose the nearest valid intersection.

Use existing Euclidean helpers in `packages/geometry/src/approx.ts` when they fit. Do not introduce an optimization dependency for a small exact local case.

## 7. Error Instead Of Guessing

Constraint application results should be total at the boundary.

Return an explicit error for:

- missing measurement
- non-constraint measurement
- invalid, unresolved, non-positive, or unrealized measurement
- zero movable endpoints
- ambiguous movable endpoints
- coincident endpoints for one-ray movement
- unsupported local systems
- unsolvable local systems

Avoid silent partial solves. If a system has two valid local constraints and they do not intersect, do not satisfy only one of them.

## 8. Update Rendering And UI As Interpreters

Rendering may consume evaluated measurement status and labels. It should not own measurement meaning.

The web UI may expose:

- unit scale controls
- symbol value controls
- check/constraint intent controls
- point mobility controls
- apply/solve actions
- diagnostics and returned messages

Keep user-facing labels descriptive:

- `Unit scale`
- `Symbol`
- `Value in units`
- `Expression`
- `Check only`
- `Constraint`
- `Calibrate unit`
- `Solve endpoint`

## 9. Test Success And Refusal

Add focused tests before relying on the behavior.

Geometry tests should cover:

- expression evaluation and diagnostics
- unit calibration
- one-constraint endpoint movement
- two-constraint circle-circle solving
- orientation preservation
- fixed points refusing movement
- zero movable endpoints
- two movable endpoints
- unsupported systems
- unsolvable systems
- no-op identity when appropriate

App tests should cover command wiring and displayed messages, not solver math.

Document tests should cover parsing if the authored data shape changes.

## 10. Update Local Guidance

When a measurement constraint change affects future agent choices, update:

- `packages/geometry/README.md`
- `apps/web/README.md` if UI command routing changes
- `docs/llm/AGENT_GUIDE.md`
- `docs/llm/REPO_MAP.md`
- a journal entry when the change uncovers a new principle or debt

## 11. Known Debt

The current feature is powerful but still too manual.

Future work should improve:

- guided workflows for fixing/freeing points
- pre-solve explanations of what will move
- friendlier error messages with concrete next steps
- solving from selected points, not only measurement rows
- visual grouping of related constraints
- consistency checking for more than two constraints
- variable solving from geometry
- provenance explaining why a point moved
