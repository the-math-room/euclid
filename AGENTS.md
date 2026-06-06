# Agent Instructions

Start with `docs/llm/AGENT_GUIDE.md`.

This repo is optimized for LLM-assisted development, but the core rules are simple:

- Keep construction meaning in `packages/geometry/src`.
- Keep React as an interpreter of evaluated geometry, not the owner of geometry semantics.
- Preserve explicit dependency graph evaluation.
- You MUST propose running `npm run check` via the `run_command` tool (set `SafeToAutoRun` to `false`) before declaring any task complete or handing code back (unless you have only updated documentation). Wait for the user to approve and run it to verify everything passes.
