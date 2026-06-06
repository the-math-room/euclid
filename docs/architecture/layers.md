# Layer Policy

Euclid is still a single npm project, but the source tree is shaped as if the core layers could become separate packages.

## Current Layout

```text
apps/web/src
packages/activity/src
packages/assessment/src
packages/geometry/src
packages/document/src
packages/lesson/src
packages/rendering/src
tests/architecture
```

## Dependency Direction

Allowed production dependencies:

```text
apps/web -> packages/document
apps/web -> packages/activity
apps/web -> packages/assessment
apps/web -> packages/geometry
apps/web -> packages/lesson
apps/web -> packages/rendering
packages/activity -> packages/geometry
packages/assessment -> packages/geometry
packages/document -> packages/geometry
packages/lesson -> packages/activity
packages/lesson -> packages/assessment
packages/lesson -> packages/document
packages/rendering -> packages/geometry
```

Forbidden dependencies:

```text
packages/activity -> packages/assessment
packages/activity -> packages/document
packages/activity -> packages/lesson
packages/activity -> packages/rendering
packages/activity -> apps/web
packages/geometry -> packages/document
packages/geometry -> packages/activity
packages/geometry -> packages/assessment
packages/geometry -> packages/lesson
packages/geometry -> packages/rendering
packages/geometry -> apps/web
packages/assessment -> packages/activity
packages/assessment -> packages/document
packages/assessment -> packages/lesson
packages/assessment -> packages/rendering
packages/assessment -> apps/web
packages/document -> packages/rendering
packages/document -> packages/activity
packages/document -> packages/assessment
packages/document -> packages/lesson
packages/document -> apps/web
packages/lesson -> packages/geometry
packages/lesson -> packages/rendering
packages/lesson -> apps/web
packages/rendering -> packages/document
packages/rendering -> packages/activity
packages/rendering -> packages/assessment
packages/rendering -> packages/lesson
packages/rendering -> apps/web
```

React and UI libraries belong in `apps/web`, not in package layers.

Package layers are the pure core. Browser and React effects belong in the web app shell. See `docs/architecture/pure-core.md`.

## Test Boundaries

Tests should generally obey the same layer boundaries as production code.

- Geometry tests may import geometry.
- Activity tests may import activity and geometry.
- Assessment tests may import assessment and geometry.
- Document tests may import document and geometry.
- Lesson tests may import lesson, document, activity, and assessment.
- Rendering tests may import rendering and geometry.
- App tests may compose app, document, geometry, and rendering.
- Architecture tests may inspect every layer.

This prevents test fixtures from becoming hidden cross-layer dependencies.

## Future Package Split

Each package has a `src/index.ts` entrypoint. Cross-layer imports should use the target package entrypoint rather than internal files when practical.

Preferred:

```ts
import { evaluateConstruction } from "@euclid/geometry";
```

Avoid:

```ts
import { evaluateConstruction } from "../../geometry/src/evaluate";
```

This keeps a future move to npm workspaces or separate packages mostly mechanical:

```text
packages/geometry
packages/activity
packages/assessment
packages/document
packages/lesson
packages/rendering
apps/web
```

Do not add package build steps, publishing metadata, or workspace tooling until the boundaries need independent versioning or independent builds.
