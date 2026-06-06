# Add A Construction

Use this checklist when adding a new Euclidean construction.

## 1. Name The Meaning

Write the construction in domain terms before changing UI.

Examples:

- Point at the intersection of two lines.
- Perpendicular bisector of two points.
- Circle with given center and radius witness point.

A construction should have a clear denotational meaning independent of its approximate floating-point realization. State what the construction _is_ before worrying about how to compute its coordinates.

## 2. Update Geometry

### Model

- `packages/geometry/src/model.ts`

Add a `Construction` union case with a unique `kind` discriminant. Add any needed `EvaluatedPrimitive` case if the construction produces a new shape kind.

### Dependencies

- `packages/geometry/src/dependencies.ts`

Add dependency extraction for the new kind. Ensure `transitiveDependentsOf` and `deleteConstructions` handle cascading correctly.

### Meaning

- `packages/geometry/src/evaluate.ts`

Add the exact construction meaning in `meaningFor`. This captures _what the construction is_ — its provenance and structural references — independent of any coordinate computation.

### Realization

- `packages/geometry/src/realize.ts`
- `packages/geometry/src/approx.ts` (if new floating-point helpers are needed)

Add approximate numeric realization in `realizeOne`. Return a diagnostic for invalid graph structure (missing dependencies) or degenerate geometry (coincident points, parallel lines). A construction can have meaning without a current realization.

### Edit Operations

- `packages/geometry/src/edit.ts`

If the construction can be created interactively, add a pure creation function with idempotent duplicate detection. Construction-adding edits should return `{ program, id, changed }`, where `id` is the construction created or found. The result should preserve the original program reference when the edit is a no-op.

### Tests

- `packages/geometry/src/evaluate.test.ts`
- `packages/geometry/src/edit.test.ts` (if adding edit operations)
- `packages/geometry/src/approx.test.ts` (if adding geometry helpers)

Test the full pipeline: evaluation with valid dependencies, missing dependencies, degenerate geometry, and the meaning/realization distinction (meaning should exist even when realization fails).

## 3. Update Rendering

Touch these files:

- `packages/rendering/src/scene.ts`
- `packages/rendering/src/scene.test.ts`
- `packages/rendering/src/interaction.ts` (if hit testing needs changes)
- `packages/rendering/src/canvasRenderer.ts`
- `packages/rendering/src/svgRenderer.ts`

Add:

- A render scene representation if needed (new `RenderItem` variant).
- Conversion from evaluated primitive to render scene item, including label layout if it is a point.
- Hit testing support for interactive selection.
- Rendering in both Canvas and SVG backends.

## 4. Update Document Examples

Touch these files as needed:

- `packages/document/src/seed.ts`
- future example documents.

Keep examples serializable and versioned.

## 5. Update Web UI

Touch these files as needed:

- `apps/web/src/construction/useConstructionController.ts` (if adding interactive creation or tool modes)
- `apps/web/src/useWorkspaceGestures.ts` (if adding gesture handling for the new shape)
- `apps/web/src/WorkspaceView.tsx` (if adding SVG/Canvas surface rendering for the new shape)
- `apps/web/src/App.tsx` (if adding toolbar UI for the new tool)

React should render scene data. It should not define construction meaning.

## 6. Update Docs

Touch these files if behavior changed:

- `docs/architecture/denotational-design.md`
- `docs/llm/REPO_MAP.md`
- package README files.

## 7. Verify

Run:

```bash
npm run check
```
