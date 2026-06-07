# Activity Package

Owns headless activity policy for controlled learning experiences.

## Owns

- Tool availability policy.
- Locked construction policy.
- Delete permission policy.
- Point and shape drag permission policy.
- Small reference policy helpers.

Functions in this package should be memoizable in theory.

## Must Not Own

- Construction syntax or meaning.
- Construction editing.
- Assessment goals or predicates.
- Rendering, projection, SVG, Canvas, or DOM.
- React, browser state, or user interaction.

## Allowed Imports

- `@euclid/geometry`.
- Local activity modules.

## Key Files

- `src/policy.ts`: activity policy model and helpers.
- `src/index.ts`: public package entrypoint.

## Public API

The package entrypoint uses explicit named exports. Treat these groups as the intentional activity surface:

- Policy model: `ActivityPolicy`, `ActivityTool`, `DragPolicy`.
- Tool source of truth: `activityTools`, `isActivityTool`.
- Reference policies: `openActivityPolicy`, `readOnlyActivityPolicy`.
- Policy helpers: `canUseTool`, `allowedToolsInOrder`, `isConstructionLocked`, `canDeleteConstruction`, `canDragConstruction`.

`ActivityTool` is derived from the exported `activityTools` tuple. The `openActivityPolicy` enables all tools from that tuple. Curriculum-specific policies restrict the set by listing only the tools relevant to the activity.

Use `isActivityTool` at JSON or plugin boundaries instead of duplicating string checks in another package.

Do not add wildcard exports to `src/index.ts`. New public exports should be named intentionally.

## Design Intent

Activity policy is an interpretation layer over geometry and app capabilities. It lets curriculum authors and host products describe what a learner may do without coupling that policy to React controls or browser event handling.

The web app may later interpret this package, but the package itself stays headless.

## Verification Command

Always run the validation suite before finishing:

```bash
npm run check
```
