# Web App

Owns browser composition and presentation.

## Owns

- React components.
- SVG/DOM rendering of render scene data.
- Canvas rendering integration.
- Browser entrypoint and application shell.
- Multi-touch gesture interpretation (tap, pan, pinch-to-zoom, point drag).
- Construction controller: history, tool state, selection, and command wiring.
- Keyboard shortcut handling.
- Camera interaction state.

This app is the imperative shell. It may perform browser effects, but it should pass explicit data into package-layer functions.

## Must Not Own

- Construction semantics or construction evaluation.
- Document parsing rules.
- Viewport projection math beyond passing scene data to components.
- Label layout or hit testing (these belong in `@euclid/rendering`).

## Allowed Imports

- `@euclid/document`.
- `@euclid/geometry`.
- `@euclid/rendering`.
- React and UI libraries.

## Key Files

- `src/main.tsx`: browser entrypoint.
- `src/App.tsx`: composition root. Wires packages together and renders JSX. Should not contain construction logic.
- `src/construction/useConstructionController.ts`: construction history, tool state, selection, and command wiring. Owns the construction program, evaluation memoization, undo/redo, tool modes, keyboard shortcuts, and all construction-mutating callbacks (add point, add line, add intersection, move point, delete).
- `src/WorkspaceView.tsx`: gesture interpreter. Translates pointer events into construction commands. Owns multi-touch state (pinch, pan, drag), SVG/Canvas renderer toggle, and coordinate projection from client space to scene space. Does not own construction state.
- `src/view/useCameraController.ts`: camera interaction state and shell adapters.
- `src/view/ViewControls.tsx`: camera controls (zoom, rotation, pan sliders).
- `src/objects/ObjectList.tsx`: construction list with selection.
- `src/objects/SelectionDetails.tsx`: selected construction details and delete action.
- `src/styles.css`: app styling including `touch-action: none` for gesture suppression.

## Architecture

```
App.tsx (composition root)
├── useConstructionController (construction state + commands)
├── useCameraController (camera state)
├── WorkspaceView (gesture interpretation + rendering)
│   ├── SVG mode: inline SVG with RenderItemView components
│   └── Canvas mode: Canvas 2D with drawSceneToCanvas
├── ViewControls (camera UI)
├── ObjectList (sidebar)
└── SelectionDetails (sidebar)
```

`App.tsx` should remain a thin composition root. If you need to add construction-level state or commands, add them to `useConstructionController`. If you need to add gesture handling, add it to `WorkspaceView`. If you need new evaluation or editing logic, add it to `@euclid/geometry`.

## Change Pattern

When changing UI, prefer composing existing layer APIs. If a UI change needs new meaning, add that meaning to the lower layer first.

## Instructions for LLM Agents

### 1. Architectural Guardrails (Enforced by Tests)

- **Imperative Shell**: This is the application shell. It is allowed to perform browser side-effects, use React hooks/state, Lucide icons, and standard CSS.
- **Strict Layering**: May import `@euclid/document`, `@euclid/geometry`, and `@euclid/rendering`.

### 2. State & Interaction Rules

- **React is an Interpreter**: Do not define geometry mathematical semantics or logic inside React components. Compositions must read from lower-level packages.
- **Construction Controller**: Keep all construction state (history, selection, tool mode) and construction commands (add, delete, move, undo/redo) inside `src/construction/useConstructionController.ts`. `App.tsx` should only wire the controller's outputs to JSX.
- **Gesture Interpreter**: Keep all pointer/touch gesture logic inside `WorkspaceView.tsx`. The gesture engine should translate low-level events into high-level commands (`onAddPoint`, `onSelect`, `onMovePoint`, etc.) and call the construction controller's callbacks.
- **Keyboard Listeners**: Keep global construction keyboard handlers centralized inside `src/construction/useConstructionController.ts`. Ensure input/textarea nodes are bypassed to avoid hijacking user type inputs.

### 3. Verification Command

Always run the validation suite before finishing:

```bash
npm run check
```
