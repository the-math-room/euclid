# 2026-06-06: Day 2 — Building the Infrastructure Layer

## The Story

Day 1 left us with a geometry kernel that could evaluate a construction graph and a React app that could render it. Day 2's question was: what does Euclid actually *want to be*?

The answer that emerged was not "a geometry applet." It was something more constrained and more useful: a **headless geometry infrastructure layer** for edTech products. The kernel should be inspectable, assessable, and embeddable without coupling to any particular UI. The web app is one possible interpreter of the geometry — not the thing itself.

That framing changed everything about what we built.

---

## Making the Kernel Trustworthy

Before the infrastructure story could hold, the kernel needed to be tighter. We started by introducing **branded coordinates** — `WorldPoint` and `ScenePoint` — as compile-time intersection brands on `Point2`. The distinction between world-space math coordinates and viewport-relative screen pixels was always semantically meaningful, but TypeScript had been treating them as the same type. Enforcing the brand at the type boundary meant that any coordinate passing through the wrong layer would fail to compile, not just fail at runtime.

Alongside that, we expanded **direct manipulation** so that shapes — not just free points — could be dragged. Dragging a line or circle translates its underlying free point dependencies in world space. Dependent constructions recalculate automatically, so nothing in the pure evaluation graph is broken by the edit. This gave us a much more natural canvas interaction model.

Finally, we added **smooth keyboard viewport control** (pan, zoom, rotate via arrow keys and brackets) using a custom key-repeat mechanism to bypass the OS delay that makes navigation feel sticky.

---

## Building the Package Stack

With the kernel behavior settled, we extracted the next three layers.

**`@euclid/activity`** is the simplest: it holds what a learner is *allowed to do* in a given activity. Which tools are available? Which constructions are locked? Can items be deleted? Can shapes be dragged? These are curriculum decisions, not geometry decisions, and they belong in their own headless package that doesn't know about React or SVG.

**`@euclid/assessment`** is the most consequential. Rather than assess learners by checking pixel positions or hardcoded IDs, the assessment layer operates on construction *meaning* — the structural relationships in the dependency graph. A predicate like `requiresMeaning` doesn't ask "is there a construction named `line-ab`?" It asks "is there a construction whose expression is exactly `line-through` with points `A` and `B`?" This distinction makes assessment robust to renaming, reordering, and idiomatic variation in how learners construct things.

The assessment API was designed as small, composable predicates: `requiresConstructionKind`, `requiresDependency`, `requiresMeaning`, `requiresPointOnLine`. Hosts can use these as-is, compose them with `assessAll` / `assessAny`, or replace them entirely with their own engine over the same `@euclid/geometry` data.

**`@euclid/lesson`** wraps the three concerns — a starter document, an activity policy, and a list of assessment goals — into a portable, serializable lesson format. A `.lesson.json` file is a complete curriculum activity specification. The lesson codec validates structure at the JSON boundary without assuming anything about the learner's current program.

---

## Bringing It Into the App

With the layers defined, we wired them into the web app as a **lesson player**.

The objectives panel gave learners real-time step-by-step feedback: each goal in the lesson's goal list evaluates live against the current construction graph and shows a pass/fail checkmark. Completing all objectives surfaces a visual "solved" state.

This required solving a subtle problem: **ID mismatch**. A lesson's goal might reference `"line-ab"` (a curriculum-authored label), but a learner might have constructed an equivalent line that the kernel named `"line-a-b"`. We wrote an `assessmentResolver` that walks the current evaluation to find constructions whose *meaning* matches the lesson's goal references, regardless of what string ID was assigned. This resolver uses structural property reflection rather than hardcoded switches, so future construction primitives are handled automatically without touching the resolver.

We also wired **multi-lesson persistence**: each lesson stores its construction state separately, so learners can switch activities without losing work. A reset button restores any lesson to its starter state.

Finally, we untangled the **camera rotation pivot bug** that had been lurking since Day 1. Panning the viewport was adjusting a screen offset, so rotating after a pan would pivot around the original origin rather than the current screen center. The fix was simple once the mental model was clear: panning should move the camera's world-space center, not collect a screen delta. After that change, rotation always pivots on the center of what the user is currently looking at.

---

## Late in the Day: New Construction Tools

The final push of the day added three new geometric primitives: **parallel lines**, **perpendicular lines**, and **midpoints**.

Each follows the same full-stack discipline: new `Construction` and `ConstructionExpression` variants in the kernel, realization math that derives coordinates from the parent primitives, edit helpers that return `{ program, id, changed }` and detect duplicates, and assessment `sameExpression` comparison cases.

Parallel and perpendicular tools share the same two-step interaction: select a reference line, then click or place a witness point. The draft preview renders a ghost line through the cursor oriented correctly before the second click lands.

Midpoint uses the two-step point-selection pattern: pick the first parent, then pick the second, with a ghost midpoint and segment drawn at the average cursor position in real time.

Assessment comparison for midpoints is order-independent — `[A, B]` matches `[B, A]` — because the mathematical operation is symmetric and curriculum authors shouldn't need to specify which parent comes first.

---

## Where Things Stand

By the end of Day 2, the package stack looks like this:

```
apps/web
  └── @euclid/lesson
        ├── @euclid/activity
        ├── @euclid/assessment
        │     └── @euclid/geometry
        └── @euclid/document
              └── @euclid/geometry
  └── @euclid/rendering
        └── @euclid/geometry
```

The pure core is completely side-effect free, serializable, and independently testable. The web app is an interpreter of geometry state, not the authority on it. A curriculum lesson is a portable JSON document. An assessment is a semantic query, not a pixel check.

That's the infrastructure story. Everything else — a richer curriculum library, a hosted runtime, analytics, mobile polish — sits on top of this foundation cleanly.

**157 tests passing. Production build green.**
