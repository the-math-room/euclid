# 0002: Package-Shaped Source Layout

## Status

Accepted.

## Context

Euclid is still small enough to remain a single npm project. At the same time, the core layers should stay decoupled enough to reason about within LLM context limits and eventually split into packages if independent builds, versions, or ownership become useful.

## Decision

Use a package-shaped source tree without npm workspaces for now:

```text
apps/web/src
packages/activity/src
packages/assessment/src
packages/geometry/src
packages/document/src
packages/rendering/src
tests/architecture
```

Use package-style aliases for cross-layer imports:

```text
@euclid/geometry
@euclid/activity
@euclid/assessment
@euclid/document
@euclid/rendering
```

Each package exposes a `src/index.ts` entrypoint. Cross-package imports should use the entrypoint, not internal module paths.

## Consequences

- Layer intent is visible in paths and imports.
- A future npm workspace split should be mostly mechanical.
- The current build remains simple: one Vite app and one npm project.
- Architecture tests enforce dependency direction and entrypoint use.

## Deferred

- No package publishing metadata yet.
- No separate package build outputs yet.
- No npm workspace setup until independent builds or versioning become valuable.
