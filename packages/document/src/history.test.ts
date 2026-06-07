import { describe, expect, it } from "vitest";
import { toWorldPoint, type ConstructionProgram } from "@euclid/geometry";
import { createHistory, pushState, undo, redo, canUndo, canRedo } from "./history";

const program1: ConstructionProgram = { constructions: [] };
const program2: ConstructionProgram = {
  constructions: [{ id: "A", kind: "free-point", label: "A", position: toWorldPoint({ x: 0, y: 0 }) }],
};
const program3: ConstructionProgram = {
  constructions: [
    { id: "A", kind: "free-point", label: "A", position: toWorldPoint({ x: 0, y: 0 }) },
    { id: "B", kind: "free-point", label: "B", position: toWorldPoint({ x: 1, y: 1 }) },
  ],
};

describe("DocumentHistory", () => {
  it("initializes correctly", () => {
    const history = createHistory(program1);
    expect(history.present).toBe(program1);
    expect(history.past).toEqual([]);
    expect(history.future).toEqual([]);
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
  });

  it("pushes a new state", () => {
    let history = createHistory(program1);
    history = pushState(history, program2);

    expect(history.present).toBe(program2);
    expect(history.past).toEqual([program1]);
    expect(history.future).toEqual([]);
    expect(canUndo(history)).toBe(true);
    expect(canRedo(history)).toBe(false);
  });

  it("ignores duplicate consecutive states", () => {
    let history = createHistory(program1);
    history = pushState(history, program1);

    expect(history.present).toBe(program1);
    expect(history.past).toEqual([]);
  });

  it("undos a pushed state", () => {
    let history = createHistory(program1);
    history = pushState(history, program2);
    history = undo(history);

    expect(history.present).toBe(program1);
    expect(history.past).toEqual([]);
    expect(history.future).toEqual([program2]);
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(true);
  });

  it("redos an undone state", () => {
    let history = createHistory(program1);
    history = pushState(history, program2);
    history = undo(history);
    history = redo(history);

    expect(history.present).toBe(program2);
    expect(history.past).toEqual([program1]);
    expect(history.future).toEqual([]);
    expect(canUndo(history)).toBe(true);
    expect(canRedo(history)).toBe(false);
  });

  it("clears future states when a new state is pushed", () => {
    let history = createHistory(program1);
    history = pushState(history, program2);
    history = undo(history);
    history = pushState(history, program3);

    expect(history.present).toBe(program3);
    expect(history.past).toEqual([program1]);
    expect(history.future).toEqual([]);
  });

  it("does not undo if past is empty", () => {
    let history = createHistory(program1);
    history = undo(history);

    expect(history.present).toBe(program1);
    expect(history.past).toEqual([]);
    expect(history.future).toEqual([]);
  });

  it("does not redo if future is empty", () => {
    let history = createHistory(program1);
    history = redo(history);

    expect(history.present).toBe(program1);
    expect(history.past).toEqual([]);
    expect(history.future).toEqual([]);
  });
});
