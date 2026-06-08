# 2026-06-08: Third-Party Macro Tools

## Summary

This update turned the third-party tool idea from preserved policy data into an executable reference path.

The immediate test case was an equilateral-triangle tool. The important architectural goal was broader than that single tool: a third-party author should be able to add a macro tool by dropping one file into a directory, without editing Euclid's central toolbar, session, lesson, or geometry code.

The result is a data-backed macro system:

- macro definitions expand into ordinary Euclid construction records
- the web app auto-discovers third-party macro tool files
- the central app no longer references the equilateral tool specifically
- Free Draw exposes discovered tools through the same `activeTools` list as built-ins

## Why

Earlier work opened the activity policy boundary so lesson JSON could preserve extension tool ids. That was necessary but incomplete. Policy could carry a third-party id, but the reference web app still only knew how to execute built-in tools wired directly into `tools.ts` and `toolSession.ts`.

That left a gap between the SDK direction and the app reality:

- activity policy was extensible
- lesson parsing was extensible
- toolbar descriptors were centralized
- but executable third-party tools still required code edits in the app core

The equilateral-triangle tool was a useful pressure test because it should not be a new construction meaning. It is a macro over the existing Euclidean primitives: two helper circles, a chosen circle-circle intersection, and three visible triangle sides.

That means the tool should be data interpreted by Euclid, not a new hidden semantic branch.

## How

Geometry gained a macro expander in `packages/geometry/src/macro.ts`.

The macro definition is serializable in shape:

- named point inputs
- side-of-line direction inputs
- ordered construction steps
- id and label templates
- optional selected output steps

`applyConstructionMacro` validates the referenced inputs against the current evaluated program and expands the macro into ordinary construction records. The expansion can create existing construction variants such as `circle-through`, `circle-circle-intersection`, and `line-through`. It does not add new geometry meaning.

For the equilateral-triangle macro, the tool data expands to:

- circle centered at the first selected point through the second point
- circle centered at the second selected point through the first point
- one circle-circle intersection chosen by the side click
- the base line
- the two side lines

The helper circles use `shapeRole: "auxiliary"`, so the authored construction remains real while rendering gives it less visual emphasis.

## Directory-Based Discovery

The web app now has a third-party tool directory:

```text
apps/web/src/construction/third-party-tools/
```

Each file exports a `ThirdPartyMacroTool`:

- `definition`: the geometry macro definition
- `descriptor`: toolbar label, icon key, and gesture policy

`thirdPartyToolRegistry.ts` discovers `*.ts` files in that directory with Vite's eager glob import. `tools.ts` consumes the discovered descriptors. `toolSession.ts` consumes the discovered macro definitions and creates generic macro sessions for them.

The session behavior is generic:

1. collect the macro's point inputs through normal point-selection/input routing
2. collect the side-of-line input through a world-space click
3. call `applyConstructionMacro`
4. push the expanded ordinary construction program through existing history and selection state

This keeps the third-party tool executable while preserving the app's role as an interpreter and command router.

## Scrubbing The Core

After the equilateral tool worked, we deliberately scrubbed the codebase for equilateral-specific references.

That pass found and removed several subtle assumptions:

- the central toolbar icon map had a `triangle` icon key
- tests imported `equilateralTriangleToolId` directly
- geometry macro tests were written as if the macro engine itself were equilateral-specific
- the how-to used equilateral wording where a generic helper-shape example was enough

The core app now has a generic `macro` icon key. Registry and session tests assert that discovered third-party tools work, not that a particular equilateral id exists. The only live equilateral-specific code belongs in the third-party tool file itself.

That is the real extensibility test. If the core has to know the specific tool name, the extension point is still leaking.

## Debt And Future Work

This pass created a working reference path, but it also exposed several debts.

First, third-party tools are TypeScript files, not external content files. That is fine for repo-local extension, but not enough for a host application, marketplace, or lesson bundle that wants to load tool data without rebuilding the app.

Second, macro definitions are typed but not parsed from unknown content. If tools become JSON or remote/plugin-provided content, they need a schema boundary and diagnostics, likely similar to the document and lesson codecs.

Third, the input vocabulary is intentionally small. Current macros support point inputs and one side-of-line direction input. More tools will likely need line inputs, circle inputs, numeric parameters, repeated inputs, optional inputs, and better prompt/step labels.

Fourth, icons are still chosen from a small built-in key set. That keeps the toolbar safe, but third-party authors cannot yet provide their own icon asset or accessible icon metadata.

Fifth, the macro expander currently supports only a subset of construction step kinds. That is enough for the equilateral-triangle reference tool, but the expander should grow by explicit supported cases rather than by letting app code assemble arbitrary construction records.

Finally, macro output has no grouping/provenance record. After expansion, the program contains ordinary constructions, which is good for geometry semantics. But authors may eventually want to inspect, select, delete, explain, or undo a macro as a named unit. That needs careful design so grouping metadata does not become hidden geometry meaning.

## Verification

Focused checks were run around macro expansion, third-party discovery, tool sessions, lessons, and architecture guards:

```bash
npx vitest run apps/web/src/construction/tools.test.ts apps/web/src/construction/toolSession.test.ts apps/web/src/lessons/lessons.test.ts packages/geometry/src/macro.test.ts tests/architecture/pure-core.test.ts
```

The final full verification passed:

```bash
npm run check
```

The final suite had 38 passing test files, 233 passing tests, and a successful production build.
