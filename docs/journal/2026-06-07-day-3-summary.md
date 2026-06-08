# 2026-06-07: Day 3 Summary — Type Boundaries, Algebraic Interpreters, And Parse Discipline

## Development Focus

Day 3 was primarily an architectural debt day.

The work moved Euclid from “working modular prototype” toward a more disciplined headless SDK shape. The recurring theme was boundary clarity:

- distinguish world-space geometry from scene-space presentation
- parse userland data into trusted domain values once
- keep runtime schemas at content boundaries
- keep React, rendering, and browser concerns as interpreters rather than semantic owners
- make construction interpretation explicit and total
- remove casts and incidental round trips where stronger types can carry the intent

The day did not add a major new construction tool. It made the existing construction system harder to accidentally misuse.

## Denotational Boundary Maturity

The coordinate-branding work was completed so the central construction state now reflects the architectural model:

- free-point positions in construction programs are `WorldPoint`
- evaluated primitives expose world-space coordinates
- rendering, hit testing, gestures, and previews use `ScenePoint`
- projection and unprojection are explicit boundaries

This closed an important gap. Earlier, the project had branded coordinate types, but the core construction records still stored plain `Point2`. Day 3 made the type system enforce the distinction where it matters most: construction storage and mutation.

The same theme appeared in later cleanup work. Anonymous numeric tolerances were replaced with semantic constants such as `REALIZATION_EPSILON`, `SCENE_GEOMETRY_EPSILON`, `LABEL_LAYOUT_SCORE_EPSILON`, `PREVIEW_DIRECTION_EPSILON`, and `DEFAULT_ASSESSMENT_EPSILON`. The principle is that two tolerances can share a number without sharing a meaning.

## Parse, Don't Validate

A large part of the day focused on content boundaries.

The document codec was hardened so persisted construction JSON is decoded into concrete construction variants before entering the typed geometry core. This replaced shallow validation plus casts with explicit construction parsing.

That initially made the document codec too large, so it was split into focused modules:

- `codec.ts`: public text facade
- `documentDecoder.ts`: versioned document envelope and construction program decoding
- `constructionDecoder.ts`: construction-level decoding and diagnostics

Zod was then introduced at userland JSON/content boundaries:

- document envelopes
- construction syntax
- assessment goals
- lesson envelopes
- activity policies

Eventually the construction schemas were moved into `@euclid/geometry` as shared schema definitions. This was a deliberate boundary decision: construction JSON shape is part of construction syntax, so geometry can own that grammar, while document and assessment still own their caller-facing diagnostics.

The resulting principle is precise:

- Zod may shape content grammar at trust boundaries.
- Zod should not shape geometry evaluation, realization, or edit semantics.
- React should not shape construction semantics at all.

## Algebraic Interpretation

The geometry core was refactored toward native TypeScript algebraic data type interpretation.

Construction interpretation now follows a clearer pattern:

- `dependencyIds`: construction to dependency references
- `expressionFor`: construction to exact construction expression
- `realizeOne`: construction to approximate primitive or diagnostic
- `explanationFor`: construction to human-readable provenance text
- `translatedPointIds`: construction to shape-translation targets

These are intentionally total switches over the `Construction` discriminated union. The day clarified that the switch is not a validation smell. It is the TypeScript equivalent of folding over a runtime ADT.

We considered whether to introduce a custom `matchConstruction` eliminator or a pattern-matching dependency. The decision was to hold. Native `switch` remains the better tradeoff until repeated case analysis becomes harder to maintain than the abstraction.

## Assessment Became Less Recipe-Bound

Assessment continued moving away from labels, IDs, and exact learner recipes.

The earlier label-independent assessment work introduced geometric-equivalent goals. Those compare the learner's constructed result to a target construction under deterministic coordinate perturbations. This allows multiple construction paths to satisfy the same mathematical goal.

Goal resolution was also refactored away from reflective object traversal and casts. It now uses explicit pattern matching over typed `AssessmentGoal` and `ConstructionExpression` values. This kept Zod at the parse boundary and kept internal assessment logic typed and semantic.

The high-level direction is that assessment should evaluate geometric denotation and construction relationships, not UI labels or accidental construction IDs.

## Rendering And Interaction Tightening

Rendering and interaction received several debt reductions.

Canvas and SVG style resolution were unified through a shared pure style resolver so the two renderers no longer drift in defaults.

Hit testing was consolidated around typed snap targets. Interaction now produces ranked candidates for points, intersections, lines, and circles, and the gesture controller applies tool policy over those candidates.

Gesture behavior is now more headless-testable because the framework-agnostic controller can be tested directly, while React remains a shallow event adapter.

Rendering tests also stopped using broad `as unknown as RenderScene` / `RenderItem` casts for normal fixtures. Typed test builders now construct branded scene points and render items directly.

## Package Composition And SDK Shape

The activity policy layer was opened for future user-defined and third-party tools by separating generic tool IDs from built-in reference tools. The current web app still only executes registered built-in tools, but lesson/activity policy can now preserve extension IDs instead of destroying them at parse time.

Lesson parsing also became cleaner. Document and assessment packages now expose object-level decoders in addition to string parsers. The lesson package composes those decoders directly instead of serializing nested objects back to JSON text just to reuse parser APIs.

The principle that emerged:

- string parsers are convenience APIs for text boundaries
- object decoders are composition APIs for already-parsed content

This is a better fit for SDK usage, where host applications may already have JSON-like content in memory.

## Security And Deployment Hygiene

The Lighthouse/security-header pass led to low-pain improvements:

- source HTML keeps a dev-friendly CSP for Vite local development
- production builds rewrite the CSP meta tag to remove local HTTP/WebSocket sources
- a referrer meta fallback was added

This does not solve true HTTP response headers on GitHub Pages. Full header hardening still belongs to the deployment host or CDN. The current approach improves the static deployment without making the local workflow painful.

## Symbolic Proof Direction

We briefly evaluated whether geometric proof from denotation has a stock solution.

The conclusion: yes in the broader field, no as a low-friction TypeScript dependency. GeoGebra's automated reasoning tools are the closest practical reference point. For Euclid, the right near-term move is not to embed a prover. It is to keep strengthening the denotational model so a future export or integration boundary can emit prover-friendly symbolic statements.

This keeps exact meaning, approximate realization, and future proof/export concerns separate.

## Principles Clarified

Day 3 clarified several project rules:

- **Parse at boundaries, interpret inside.** Runtime schemas turn unknown content into trusted domain data. Internal semantic functions should operate on typed ADTs.
- **Dependencies can shape design only at the right layer.** Zod can shape content grammar. React cannot shape geometry semantics.
- **Switches over construction variants are ADT folds.** They are appropriate when localized, exhaustive, and semantic.
- **Tests should not lie about domain shapes.** Prefer small typed fixture builders over broad casts.
- **String parsers are not package-composition APIs.** Expose object decoders when higher-level packages already have parsed values.
- **Tolerances are semantic.** Name them by role rather than centralizing all floating-point thresholds behind one vague epsilon.
- **Security metadata is not full header policy.** Static HTML can help, but deployment headers need deployment infrastructure.

## Workspace Status

By the end of Day 3:

- construction storage and rendering boundaries have stronger coordinate typing
- content parsing is Zod-backed at userland boundaries
- construction schemas are shared from geometry
- geometry interpretation is more algebraic and explicit
- assessment logic has fewer casts and less recipe coupling
- rendering and interaction tests are more headless and type-honest
- lesson composition uses object decoders instead of JSON round trips
- production CSP meta output is stricter than local development

The project remains aligned with the same dependency direction:

```text
apps/web -> document/activity/assessment/lesson/rendering -> geometry
```

Geometry remains the semantic core. React remains an interpreter.

**Status**: Full validation passing. The final Day 3 checks reported 34 passing test files, 213 passing tests, and a successful production build.
