# Headless EdTech SDK Direction

Euclid should differentiate as geometry infrastructure for learning products, not as a monolithic applet.

The core offer:

> A headless Euclidean construction engine with optional renderers and UI shells.

EdTech platforms should be able to adopt pieces independently:

- Use `@euclid/geometry` to define, edit, evaluate, and inspect construction programs without a DOM.
- Use `@euclid/assessment` as a reference set of semantic assessment predicates, or bring a custom assessment engine against geometry data.
- Use `@euclid/document` to persist versioned construction documents.
- Use `@euclid/rendering` to convert evaluated geometry into render scenes, SVG output, Canvas drawing, hit testing, and viewport math.
- Use the web app or future React components as one optional shell, not as the source of construction truth.

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

## Defer

- Do not start with LTI or LMS integration.
- Do not start with a hosted activity runtime.
- Do not split into independently published packages until the API surfaces are curated.
- Do not add analytics storage. If needed, expose semantic events that host platforms can record.
