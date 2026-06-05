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
- UI code interprets construction state; it does not define geometric truth.
- New features should begin by naming the domain meaning before choosing widgets, storage, or drawing code.
- Documentation is written for both humans and LLM coding agents.

## Project Map

- `src/geometry`: domain model, construction evaluation, and viewport projection.
- `src/app`: React application state and screens.
- `src/main.tsx`: browser entry point.
- `docs/llm`: agent-oriented project guidance.
- `docs/architecture`: design notes for the geometry model.
