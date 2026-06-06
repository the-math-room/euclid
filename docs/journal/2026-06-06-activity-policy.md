# 2026-06-06: Headless Activity Policy

## Summary

Added a package-shaped `@euclid/activity` layer for controlled learning experiences.

The package is headless. It describes what a learner may do without coupling policy to React controls, SVG/Canvas surfaces, or browser events.

## API

Added `packages/activity/src/policy.ts` with:

- `ActivityPolicy`
- `ActivityTool`
- `DragPolicy`
- `openActivityPolicy`
- `readOnlyActivityPolicy`
- `canUseTool`
- `allowedToolsInOrder`
- `isConstructionLocked`
- `canDeleteConstruction`
- `canDragConstruction`

The first policy model covers:

- allowed tools
- locked constructions
- delete permission
- free-point drag permission
- shape drag permission

## Boundaries

`@euclid/activity` may import `@euclid/geometry` for construction IDs and construction shape. It must not import assessment, document, rendering, app, React, DOM, or UI libraries.

Architecture tests now include activity in import-boundary, purity, module-mutable-state, and explicit-entrypoint checks.

## Why

This supports the edTech infrastructure direction. A host product can use the geometry kernel and rendering layer while applying curriculum-specific constraints such as read-only exploration, locked seed objects, or point-and-line-only construction tasks.
