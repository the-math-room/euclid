import type { ConstructionProgram } from "@euclid/geometry";

export type DocumentHistory = Readonly<{
  past: readonly ConstructionProgram[];
  present: ConstructionProgram;
  future: readonly ConstructionProgram[];
}>;

export function createHistory(initialProgram: ConstructionProgram): DocumentHistory {
  return {
    past: [],
    present: initialProgram,
    future: [],
  };
}

export function pushState(history: DocumentHistory, nextProgram: ConstructionProgram): DocumentHistory {
  // If the next state is identical to the present state, do not record a transition
  if (history.present === nextProgram) {
    return history;
  }
  return {
    past: [...history.past, history.present],
    present: nextProgram,
    future: [],
  };
}

export function undo(history: DocumentHistory): DocumentHistory {
  if (history.past.length === 0) {
    return history;
  }
  const previous = history.past[history.past.length - 1];
  const newPast = history.past.slice(0, -1);
  return {
    past: newPast,
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redo(history: DocumentHistory): DocumentHistory {
  if (history.future.length === 0) {
    return history;
  }
  const next = history.future[0];
  const newFuture = history.future.slice(1);
  return {
    past: [...history.past, history.present],
    present: next,
    future: newFuture,
  };
}

export function canUndo(history: DocumentHistory): boolean {
  return history.past.length > 0;
}

export function canRedo(history: DocumentHistory): boolean {
  return history.future.length > 0;
}
