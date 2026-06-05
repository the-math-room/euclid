# 0001: Initial Project Shape

## Status

Accepted for now.

## Context

Euclid should support Euclidean constructions with strong LLM assistance. The user preference is close to the Unix philosophy: small tools, focused parts, composability, and making the user powerful.

The main early choice is whether the app should use React, Elm, or a hand-rolled UI architecture.

## Decision

Use TypeScript, Vite, React, and SVG for the initial interface. Keep the geometry domain independent of React.

React is an interpreter of evaluated construction state. It does not define construction meaning.

## Alternatives

- **Elm**: stronger architectural constraints and excellent message/update/view clarity. Tradeoff: smaller ecosystem, less TypeScript-native, and less direct fit for common LLM coding workflows in this repository.
- **Hand-rolled UI**: maximum control and minimal conceptual surface. Tradeoff: would force early invention around rendering, state updates, accessibility, and tooling before the construction language is mature.
- **Plain TypeScript + Canvas/SVG without React**: viable later if React begins adding more weight than value. The current domain boundary keeps this migration possible.

## Consequences

- The UI can evolve quickly while the construction model remains portable.
- We must actively prevent construction semantics from leaking into components.
- Dependency graph evaluation is a first-class part of the domain model.
- ESLint, Prettier, and Vitest are part of the baseline development loop.
