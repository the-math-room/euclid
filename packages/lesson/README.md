# Lesson Package

Owns the headless composition format for learning activities.

## Owns

- `EuclidLesson` as a serializable activity shell.
- Composition of a starter document, activity policy, and assessment goals.
- Parse and serialize boundaries for lesson JSON.

Functions in this package should be memoizable in theory.

## Must Not Own

- Construction syntax or meaning.
- Construction editing.
- Reference assessment predicate implementations.
- Rendering, projection, SVG, Canvas, or DOM.
- React, browser state, or user interaction.

## Allowed Imports

- `@euclid/document`.
- `@euclid/activity`.
- `@euclid/assessment`.
- Local lesson modules.

## Key Files

- `src/model.ts`: lesson model.
- `src/codec.ts`: explicit parse and serialize boundary for lesson JSON.
- `src/index.ts`: public package entrypoint.

## Public API

The package entrypoint uses explicit named exports. Treat these groups as the intentional lesson surface:

- Lesson model: `EuclidLesson`.
- Codec boundary: `LessonParseResult`, `parseEuclidLesson`, `serializeEuclidLesson`.

Do not add wildcard exports to `src/index.ts`. New public exports should be named intentionally.

## Design Intent

Lessons are product-level curriculum data, but still headless. They describe the initial construction document, allowed learner actions, and goals a host can evaluate.

This package should stay a composition layer. It may depend on document, activity, and assessment packages, but lower-level packages should not depend on it.

## Verification Command

Always run the validation suite before finishing:

```bash
npm run check
```
