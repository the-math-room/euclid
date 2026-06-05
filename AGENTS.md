# Agent Instructions

Start with `docs/llm/AGENT_GUIDE.md`.

This repo is optimized for LLM-assisted development, but the core rules are simple:

- Keep construction meaning in `src/geometry`.
- Keep React as an interpreter of evaluated geometry, not the owner of geometry semantics.
- Preserve explicit dependency graph evaluation.
- Run `npm run check` before claiming a behavior change is complete.
