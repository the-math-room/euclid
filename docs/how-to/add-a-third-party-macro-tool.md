# Add A Third-Party Macro Tool

Use this checklist when adding a tool that expands into ordinary Euclid constructions.

Macro tools are data-backed authoring shortcuts. They should not add new geometry semantics. A macro receives user inputs, expands into construction records, and then Euclid evaluates those records through the normal construction graph.

## 1. Add One Tool File

Create a TypeScript file under:

```text
apps/web/src/construction/third-party-tools/
```

Export a `ThirdPartyMacroTool` as the default export.

Do not edit these central files:

- `apps/web/src/construction/tools.ts`
- `apps/web/src/construction/toolSession.ts`
- `apps/web/src/construction/thirdPartyToolRegistry.ts`

The registry discovers `*.ts` files in the directory automatically.

## 2. Define Tool Data

Each tool file provides:

- `definition`: a `ConstructionMacroDefinition` consumed by `@euclid/geometry`
- `descriptor`: toolbar label, icon, and gesture policy consumed by the web app

The macro definition should expand only to existing construction variants such as:

- `line-through`
- `circle-through`
- `circle-circle-intersection`

If the tool needs a new geometric meaning, stop and use `docs/how-to/add-a-construction.md` instead.

## 3. Keep Construction Assembly Out Of The App

The app file may describe macro steps as data. It must not imperatively assemble authored construction records in command code.

Geometry owns expansion through `applyConstructionMacro`. That keeps third-party tools as interpretable data rather than hidden UI behavior.

## 4. Use Authored Presentation Intent Deliberately

Macro steps may mark helper shapes with `shapeRole: "auxiliary"`.

Use that for construction helpers such as temporary circles or guide lines. The renderer will draw auxiliary shapes with less visual emphasis while preserving them as real construction objects.

## 5. Verify Discovery

Add focused tests when adding a representative tool:

- registry/tool descriptor discovery
- session flow from user inputs to expanded construction program
- geometry macro expansion if the macro uses new expansion features

Run:

```bash
npm run check
```
