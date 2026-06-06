# Headless EdTech SDK Direction

Euclid should differentiate as geometry infrastructure for learning products, not as a monolithic applet.

The core offer:

> A headless Euclidean construction engine with optional renderers and UI shells.

EdTech platforms should be able to adopt pieces independently:

- Use `@euclid/geometry` to define, edit, evaluate, and inspect construction programs without a DOM.
- Use `@euclid/activity` to describe controlled learning policy such as allowed tools, locked constructions, deletion, and drag behavior.
- Use `@euclid/assessment` as a reference set of semantic assessment predicates, or bring a custom assessment engine against geometry data.
- Use `@euclid/document` to persist versioned construction documents.
- Use `@euclid/lesson` to package a starter document, constrained activity policy, and curriculum-authored assessment goals.
- Use `@euclid/rendering` to convert evaluated geometry into render scenes, SVG output, Canvas drawing, hit testing, and viewport math.
- Use the web app or future React components as one optional shell, not as the source of construction truth.

See `examples/headless-kernel/README.md` for a kernel-only adoption sketch, `examples/lessons/basic-line-intersection.lesson.json` for a portable lesson fixture, and `examples/assessment-goals/line-intersection-goal.json` for a curriculum-authored assessment goal fixture.

## Current SDK Shape

The repo now has a coherent headless path:

```text
lesson JSON
  -> @euclid/lesson parses document + policy + goals
  -> @euclid/geometry evaluates learner construction programs
  -> @euclid/assessment evaluates semantic goals
  -> @euclid/rendering optionally turns evaluation into view data
  -> apps/web optionally interprets the result in React
```

The important distinction is that `@euclid/lesson` is curriculum composition, not a runtime. A host product can load a lesson, decide how to render it, decide how strictly to enforce policy, and decide whether to use the reference assessment package or its own goal engine.

## Near-Term Differentiators

### Public Kernel Surface

`@euclid/geometry` is the flagship package. Its public API should feel stable, boring, and useful from Node or a browser:

- evaluate a construction program
- transform a construction program with pure edits
- inspect dependencies and dependents
- explain construction provenance
- report diagnostics for graph-invalid or unrealizable constructions

Do not make app behavior the only path to these capabilities.

### Inspectable Provenance

Every construction should be able to answer:

- What are you?
- What are your direct parents?
- What depends on you?
- Are you currently realized?
- If not, why not?
- What exact meaning do you have, if graph-valid?

This supports learner explanation, teacher review, structured analytics, and future assessment.

### Semantic Assessment Before Tool Breadth

Assessment should inspect construction meaning rather than pixel proximity. A useful assessment system can ask whether a learner constructed a point as an intersection of required objects, whether a target depends on the right sources, or whether a construction is equivalent under different labels.

Prefer this before adding many more construction tools.

The first assessment surface belongs in `@euclid/assessment` and should stay headless:

- construction kind checks
- dependency checks
- exact meaning checks
- realized incidence predicates that explicitly fail when primitives are unrealized
- a predicate/result interface that hosts can compose or replace
- serializable goal specs for curriculum-authored checks
- explicit goal JSON parsing so stored curriculum content can be validated before evaluation

### Controlled Activity Policy

Learning products often need constrained workspaces rather than a fully open editor. Activity policy should stay headless and describe permissions independently of React controls:

- allowed construction tools
- locked seed constructions
- delete permissions
- point drag permissions
- shape drag permissions

### Lesson Composition

Learning products need a portable activity definition that is more than a document and less than a hosted runtime. `@euclid/lesson` should stay headless and compose:

- a versioned starter document
- an activity policy
- assessment goals

It should not own construction meaning, app state, rendering, or hosted delivery concerns. Hosts can parse a lesson, render the document however they want, enforce or ignore the policy, and evaluate goals using the reference assessment package or their own engine.

## Near-Term Plan

### 1. Interpret Lessons In The App

The web app should eventually start from a `EuclidLesson` rather than a bare seed document. This does not mean the app owns lesson semantics. It means the app becomes an interpreter of lesson data:

- initialize document state from `lesson.document`
- derive available tools from `lesson.policy.allowedTools`
- respect locked constructions for delete and drag behavior
- evaluate `lesson.goals` against the current construction program

This is the first place where the headless SDK direction becomes visible in the product without compromising package boundaries.

### 2. Add A Lesson Runner Helper Only If Duplication Appears

The example test currently demonstrates the flow directly. If docs, tests, or app code start repeating the same parse/evaluate sequence, add a small helper in a package-shaped layer. Do not add it prematurely; keep `@euclid/lesson` as data and codec until repeated usage shows the right abstraction.

### 3. Keep Assessment Semantic

The next assessment improvements should deepen construction meaning rather than add pixel heuristics. Good candidates:

- label-independent matching for equivalent construction meanings
- richer dependency/provenance diagnostics for failed goals
- optional goal metadata for curriculum-facing feedback

### 4. Keep Package APIs Curated

Before any workspace or publishing split, keep package entrypoints explicit and small. New exports should be justified by examples, tests, or app usage.

## Defer

- Do not start with LTI or LMS integration.
- Do not start with a hosted activity runtime.
- Do not split into independently published packages until the API surfaces are curated.
- Do not add analytics storage. If needed, expose semantic events that host platforms can record.
