# Euclid

Euclid is a TypeScript Euclidean construction project built around a denotational core.

This README is for quick orientation. For agent routing, start with:

- `docs/llm/AGENT_GUIDE.md`
- `docs/llm/REPO_MAP.md`
- `docs/architecture/denotational-design.md`
- `docs/architecture/layers.md`

## Core Commitment

Construction meaning lives in `packages/geometry/src`. Other layers interpret that meaning:

- document parses and stores it
- activity constrains allowed actions
- assessment evaluates goals over it
- rendering projects it into scene data
- React presents and wires it

Do not let UI, persistence, rendering, or assessment become the owner of construction semantics.

## Attention Map

- `packages/geometry/src`: construction model, dependency graph, exact meaning, approximate realization, pure edits.
- `packages/document/src`: versioned document data, document parsing, serialization, history wrappers.
- `packages/activity/src`: headless policy for tools, deletion, locking, and dragging.
- `packages/assessment/src`: reference assessment predicates and serializable goal evaluation.
- `packages/lesson/src`: headless lesson shell composing document, policy, and goals.
- `packages/rendering/src`: viewport math, scene construction, label layout, hit testing, Canvas/SVG rendering helpers.
- `apps/web/src`: React shell, browser effects, controller wiring, gestures, workspace UI.
- `tests/architecture`: executable architecture rules.
- `examples`: portable fixtures and headless SDK examples.

## Repo-Wide Rules

- Use package entrypoints such as `@euclid/geometry`; avoid cross-package deep imports.
- Keep package production code pure and browser-free.
- Keep Zod at content/schema parse boundaries.
- Use `toWorldPoint` and `toScenePoint` at coordinate boundaries; do not raw-cast branded coordinates outside their constructors.
- Add construction semantics in geometry first, then wire interpreters.
- Do not add wildcard exports to package entrypoints.

## Verification

For code changes, run:

```bash
npm run check
```

For documentation-only changes, run Prettier on touched docs.
