# Euclid

Euclid is a TypeScript geometry app for Euclidean constructions.

The project starts from a denotational design stance inspired by Conal Elliott: define what constructions mean first, then keep rendering, editing, persistence, and interaction as separate interpretations of that meaning.

## Start

```bash
npm install
npm run dev
```

## Design Commitments

- Construction data is plain, typed, serializable TypeScript.
- The geometry core is deterministic and side-effect free.
- UI code interprets render scenes; it does not define geometric truth.
- Rendering code converts evaluated geometry into presentation-ready scene data without depending on React.
- Package-layer functions should be memoizable in theory; browser effects belong in the web app shell.
- New features should begin by naming the domain meaning before choosing widgets, storage, or drawing code.
- Documentation is written for both humans and LLM coding agents.

## Project Map

- `packages/geometry/src`: domain model, dependency graph, construction evaluation, and pure edit commands.
- `packages/document/src`: versioned document data, seed documents, and pure history wrappers.
- `packages/rendering/src`: viewport projection, renderable scene descriptions, label layout, and screen-space hit testing.
- `apps/web/src`: React composition, SVG/Canvas surfaces, gesture interpretation, and browser entry point.
- `tests/architecture`: repository boundary tests.
- `docs/llm`: agent-oriented project guidance.
- `docs/architecture`: design notes for the geometry model.

Cross-layer imports use package-style aliases: `@euclid/geometry`, `@euclid/document`, and `@euclid/rendering`.
