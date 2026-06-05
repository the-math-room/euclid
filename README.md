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
- New features should begin by naming the domain meaning before choosing widgets, storage, or drawing code.
- Documentation is written for both humans and LLM coding agents.

## Project Map

- `src/geometry`: domain model, dependency graph, and construction evaluation.
- `src/document`: versioned document data and seed documents.
- `src/rendering`: viewport projection and renderable scene descriptions.
- `src/app`: React composition and SVG/DOM presentation.
- `src/main.tsx`: browser entry point.
- `docs/llm`: agent-oriented project guidance.
- `docs/architecture`: design notes for the geometry model.
