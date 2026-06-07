# 2026-06-07: Tool Policy Extensibility

## Summary

Opened the activity policy boundary for future user-defined and third-party tools, while keeping the current web app grounded in the built-in reference tools it can actually interpret.

This was a debt pass against the architectural precepts, especially SDK-first extensibility and front-loaded predictability.

## What Changed

`@euclid/activity` now separates generic tool ids from built-in reference tools:

- `ActivityTool` is any non-empty string tool id.
- `BuiltInActivityTool` is the current built-in reference union from `activityTools`.
- `isActivityTool` validates generic non-empty tool ids.
- `isBuiltInActivityTool` answers whether a tool id is part of the current built-in reference implementation.

Lesson parsing now preserves extension tool ids instead of rejecting them. This keeps custom host/plugin tool policy data from being destroyed at the lesson JSON boundary, even before the web app can render or execute those custom tools.

## Web App Descriptor Registry

The web app now has a single construction tool descriptor list in [apps/web/src/construction/tools.ts](../../apps/web/src/construction/tools.ts). Each built-in descriptor carries:

- tool id
- label
- icon key
- gesture policy

The toolbar in [apps/web/src/WorkspaceContainer.tsx](../../apps/web/src/WorkspaceContainer.tsx) renders from those descriptors instead of hardcoding one button per tool. The authoring panel also uses the same descriptor list for its allowed-tools checklist.

This does not make custom tools fully executable yet. It does make the next step clearer: host/user tools need to register compatible descriptors and sessions rather than requiring scattered app edits.

## Bug Fixed During The Pass

[apps/web/src/lessons/AuthoringPanel.tsx](../../apps/web/src/lessons/AuthoringPanel.tsx) previously mutated captured `Set` state while toggling locked and goal ids. That has been replaced with independent immutable state updates so an object cannot be both starter and goal without relying on stale captured values.

## Why It Matters

The previous model treated the activity package as the source of all possible tools. That was too narrow for the strategic direction. The activity layer should describe policy over tool ids, not own the complete universe of tool implementations.

The current shape keeps two truths separate:

- package-level policy can carry future extension ids
- the current web app only activates registered built-in tools it knows how to interpret

This is a better fit for SDK adoption, lesson sharing, and eventual user-authored tools.

## Verification

Ran the focused tests for activity policy, lesson parsing, construction tool policy, and authoring behavior.

Ran full validation:

```bash
npm run check
```

Result: lint, format check, app/test typecheck, Vitest, and Vite production build all passed.
