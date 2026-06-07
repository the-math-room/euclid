# 2026-06-07: Architectural Precepts

## Summary

This journal entry captures and codifies the core engineering philosophy of Euclid. As the project transitions from a prototype into an SDK framework, these architectural guidelines serve as guardrails for future developers and LLM agents to maintain strict separation of concerns, type safety, and headless execution.

---

## The Five Precepts of Euclid

### 1. Meaning is Independent of Realization (Denotational Design)

Mathematical expressions and visual/coordinate realities exist in separate evaluation phases. A construction's _meaning_ (what it is and how it depends on parent elements) is defined purely in [packages/geometry/src/model.ts](file:///home/johna/Projects/euclid/packages/geometry/src/model.ts) and evaluated in [packages/geometry/src/evaluate.ts](file:///home/johna/Projects/euclid/packages/geometry/src/evaluate.ts).

- **Meaning Integrity**: A derived geometry, such as a line passing through two points, remains a valid mathematical statement even if the parent points are dragged to the same coordinates (coincident) and the line's _realization_ fails (cannot compute a direction vector).
- **Evaluation Pipeline**: The engine evaluates the exact dependency graph first, producing mathematical coordinates. Approximate geometry representations (like lines, circles, and bounding rects) are resolved subsequently for rendering.

### 2. React is an Interpreter, Not an Owner

The user interface layer is a thin, imperative presentation shell. React, SVG surfaces, and Canvas drawing APIs do not declare or manipulate geometric state directly; they only interpret the output of the headless package kernels.

- **Zero UI Bleed**: The core engine packages (`@euclid/geometry`, `@euclid/assessment`, `@euclid/lesson`) have zero dependencies on the DOM, browser window contexts, or React hooks. The assessment suite can be executed headlessly on a backend server for automatic grading or analysis.
- **Gesture Decoupling**: Raw pointer interactions are captured by a shallow React adapter ([useWorkspaceGestures.ts](file:///home/johna/Projects/euclid/apps/web/src/useWorkspaceGestures.ts)) and forwarded to the pure TypeScript state machine ([GestureController.ts](file:///home/johna/Projects/euclid/apps/web/src/GestureController.ts)) to preserve framework-independence.

### 3. Type-Enforced Coordinate Boundaries

To prevent viewport transformations (zooming, panning, rotating, canvas resizing) from corrupting the core geometry model, screen-space pixel coordinates and world-space mathematical coordinates are treated as separate, incompatible domains.

- **Branded Intersection Types**: The engine enforces coordinate safety using branded types `WorldPoint` and `ScenePoint` on top of standard vectors.
- **Boundary Projection**: The compiler actively blocks coordinate cross-contamination. Projection and unprojection math must occur explicitly using client rects and scale factors (e.g. [workspaceCoordinates.ts](file:///home/johna/Projects/euclid/apps/web/src/workspaceCoordinates.ts)) at the application boundary.

### 4. Front-Loaded Predictability over Ad-Hoc Speed

The architecture absorbs domain complexity upfront to guarantee that adding the fiftieth geometric construction or tool is as safe and isolated as adding the second.

- **Checklists over Spaghetti**: Extending Euclid requires modifying distinct, isolated modules (defining the token, implementing dependency trackers, adding approximate realization, updating assessment matches, and adding UI registries). This structured workflow prevents feature complexity from building up as tangled event handler code.
- **Bug Containment**: Visual glitches (e.g., label layout collisions or canvas panning overflows) cannot mathematically corrupt the underlying `ConstructionProgram` representation.

### 5. SDK-First Extensibility

Euclid is designed as modular learning infrastructure rather than a single coupled application.

- **Decoupled Adoption**: Third-party developers can adopt the package components independently (e.g. using the `@euclid/geometry` engine for headless math, `@euclid/assessment` for grading, or `@euclid/rendering` for visualization).
- **Safe Customization**: The core mathematical kernel remains closed to unintended modifications. Curriculum authors can define custom activity policies, lesson objectives, and tools through designated, non-destructive lifecycle extension APIs.
