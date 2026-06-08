# Activity Package

Purpose: headless policy over what actions a learner may take.

Read this when changing tool availability, locking, deletion, or drag permissions.

## Owns

- Activity policy model.
- Built-in reference tool ids.
- Generic extension tool id validation.
- Helpers for allowed tools, locked constructions, deletion, and dragging.

## Does Not Own

- Construction syntax, meaning, editing, or evaluation.
- Assessment goals or goal predicates.
- Rendering, projection, hit testing, SVG, Canvas, DOM, React, or browser interaction.

## Start Here

- `src/policy.ts`: policy types, built-in tool tuple, reference policies, permission helpers.
- `src/index.ts`: explicit public entrypoint.

## Local Rules

- `ActivityTool` is a generic non-empty string so host/custom tool ids can pass through policy.
- `BuiltInActivityTool` is the current reference implementation's known tool set.
- Use `isActivityTool` at JSON/plugin boundaries for generic ids.
- Use `isBuiltInActivityTool` only when code needs to know whether the reference web app can interpret a tool.
- Keep this package headless and pure.
- Public exports in `src/index.ts` must be explicit and intentional.

## Tests

- Policy behavior: `src/policy.test.ts`.
- Architecture guards: `tests/architecture/*.test.ts`.
- Full verification for code changes: `npm run check`.
