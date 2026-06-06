# Add A Construction

Use this checklist when adding a new Euclidean construction.

## 1. Name The Meaning

Write the construction in domain terms before changing UI.

Examples:

- Point at an intersection.
- Perpendicular bisector of two points.
- Circle with given center and radius witness point.

## 2. Update Geometry

Touch these files:

- `packages/geometry/src/model.ts`
- `packages/geometry/src/dependencies.ts`
- `packages/geometry/src/evaluate.ts`
- `packages/geometry/src/realize.ts`
- `packages/geometry/src/evaluate.test.ts`

Add:

- A `Construction` union case.
- Any needed `EvaluatedPrimitive` case.
- Dependency extraction.
- Exact construction meaning.
- Approximate realization.
- Diagnostics for invalid graph structure or absent/degenerate realization.

## 3. Update Rendering

Touch these files:

- `packages/rendering/src/scene.ts`
- `packages/rendering/src/scene.test.ts`

Add:

- A render scene representation if needed.
- Conversion from evaluated primitive to render scene item.

## 4. Update Document Examples

Touch these files as needed:

- `packages/document/src/seed.ts`
- future example documents.

Keep examples serializable and versioned.

## 5. Update Web UI

Touch these files as needed:

- `apps/web/src/WorkspaceView.tsx`
- `apps/web/src/App.tsx`

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
