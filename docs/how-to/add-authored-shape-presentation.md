# Add Authored Shape Presentation

Use this checklist when adding user-authored presentation intent to existing geometric shapes.

This is not the same as adding a new construction. A presentation field changes how an existing construction should be interpreted by renderers or UI, but it does not change the construction's exact geometric meaning.

The `shapeRole` feature is the current model:

- `primary`: ordinary visible shape
- `auxiliary`: helper construction shape, rendered dashed and semi-transparent

## 1. Name The Intent

Choose a name that describes authored intent, not a renderer implementation.

Prefer domain names:

- `primary`
- `auxiliary`
- future: `hidden`, `guide`, or another construction-facing role

Avoid names that bake in one backend's style:

- `dashed`
- `transparent`
- `svgClass`

The role belongs to the construction program because the user authored it. The exact visual treatment belongs to rendering.

## 2. Update Geometry Syntax

Touch:

- `packages/geometry/src/model.ts`
- `packages/geometry/src/constructionSchemas.ts`
- `packages/geometry/src/index.ts`

Add the field to shape-producing construction variants only.

For `shapeRole`, that means:

- `line-through`
- `circle-through`
- `circle-three-points`
- `parallel-line`
- `perpendicular-line`

Do not add the field to exact construction expressions. A line's role is not part of what the line geometrically is.

Make the field optional when backwards compatibility matters. For `shapeRole`, missing means `primary`.

## 3. Default During Realization

Touch:

- `packages/geometry/src/realize.ts`

Realized primitives are the right place to normalize optional authored fields into concrete values for interpreters.

For `shapeRole`, every realized line and circle carries:

```ts
shapeRole: construction.shapeRole ?? "primary";
```

This keeps renderers simple and keeps persisted documents compact.

## 4. Add A Pure Edit Command

Touch:

- `packages/geometry/src/edit.ts`
- `packages/geometry/src/edit.test.ts`

Add a pure command for changing the authored field. The command should:

- only affect construction variants that own the field
- preserve the original program reference when the edit is a no-op
- avoid storing default values if the field is optional
- return a `ConstructionProgram`

For `shapeRole`, setting a shape back to `primary` removes the `shapeRole` field. This preserves the default-as-absence model.

## 5. Update Rendering Interpretation

Touch:

- `packages/rendering/src/scene.ts`
- `packages/rendering/src/style.ts`
- `packages/rendering/src/theme.ts`
- `packages/rendering/src/canvasRenderer.ts`
- `packages/rendering/src/svgRenderer.ts`
- `packages/rendering/src/renderTestFixtures.ts`

Keep rendering React-free.

The scene layer should carry the normalized authored field from evaluated primitives into render items. The style layer should translate that field into visual treatment. Canvas and SVG should both consume the same resolved style so they do not drift.

For `shapeRole`, auxiliary shapes are currently dashed and semi-transparent. That decision lives in rendering tokens/style, not in geometry.

## 6. Wire The Web UI As A Command

Touch:

- `apps/web/src/construction/useConstructionController.ts`
- `apps/web/src/objects/SelectionDetails.tsx`
- `apps/web/src/objects/ObjectList.tsx`
- `apps/web/src/WorkspaceContainer.tsx`
- `apps/web/src/WorkspaceView.tsx` if SVG classes or inline rendering need the field
- `apps/web/src/styles.css`

The app should not mutate construction records directly. Add a controller handler that calls the geometry edit command and pushes history only when the program changed.

UI components should expose the command, not own the construction rule.

## 7. Watch Tool Sessions

If the UI change touches selection or object details, verify that ordinary selection still routes through select-mode logic.

The select tool is not a construction session. Construction sessions should only intercept clicks for non-select tools. A no-op select session can accidentally swallow ordinary selection if the controller checks only for "has a session."

Add a regression test when selection state is part of the feature.

## 8. Test The Vertical Slice

Update or add tests at every interpretation boundary:

- geometry edit command and default behavior
- construction schema parsing for the optional field
- document or architecture parse-boundary tests
- render scene propagation
- shared style behavior
- Canvas output
- SVG output
- UI command wiring
- selection regression if object editing was touched

Prefer focused tests first, then run the full check for code changes:

```bash
npm run check
```

## 9. Update Local Guidance

Touch these when future agents need the rule:

- `packages/geometry/README.md`
- `packages/rendering/README.md`
- `docs/llm/REPO_MAP.md`
- a journal entry explaining why the field belongs where it does

The durable rule for `shapeRole` is:

`shapeRole` is authored presentation intent for line/circle-producing constructions. Keep it on construction syntax and realized primitives; do not put it in exact construction expressions.
