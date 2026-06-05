# Web App

Owns browser composition and presentation.

## Owns

- React components.
- SVG/DOM rendering of render scene data.
- Browser entrypoint and application shell.
- Future interaction wiring.

This app is the imperative shell. It may perform browser effects, but it should pass explicit data into package-layer functions.

## Must Not Own

- Construction semantics.
- Document parsing rules.
- Viewport projection math beyond passing scene data to components.

## Allowed Imports

- `@euclid/document`.
- `@euclid/geometry`.
- `@euclid/rendering`.
- React and UI libraries.

## Key Files

- `src/main.tsx`: browser entrypoint.
- `src/App.tsx`: app composition.
- `src/WorkspaceView.tsx`: SVG interpretation of render scene data.
- `src/view/useCameraController.ts`: camera interaction state and shell adapters.
- `src/view/ViewControls.tsx`: camera controls.
- `src/objects/ObjectList.tsx`: construction list selection.
- `src/objects/SelectionDetails.tsx`: selected construction details.
- `src/styles.css`: app styling.

## Change Pattern

When changing UI, prefer composing existing layer APIs. If a UI change needs new meaning, add that meaning to the lower layer first.

## Instructions for LLM Agents

### 1. Architectural Guardrails (Enforced by Tests)

- **Imperative Shell**: This is the application shell. It is allowed to perform browser side-effects, use React hooks/state, Lucide icons, and TailwindCSS or standard CSS.
- **Strict Layering**: May import `@euclid/document`, `@euclid/geometry`, and `@euclid/rendering`.

### 2. State & Interaction Rules

- **React is an Interpreter**: Do not define geometry mathematical semantics or logic inside React components. Compositions must read from lower-level packages.
- **Event Handling**: Always call `event.stopPropagation()` on interactive SVG/Canvas shape elements to prevent clicks from bubbling to background viewport click actions (like adding a point).
- **Keyboard Listeners**: Keep global event keyboard handlers centralized inside `App.tsx`'s `useEffect` hooks. Ensure input/textarea nodes are bypassed to avoid hijacking user type inputs.

### 3. Verification Command

Always run the validation suite before finishing:

```bash
npm run check
```
