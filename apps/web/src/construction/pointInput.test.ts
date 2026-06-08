import { describe, expect, it } from "vitest";
import { resolvePointInput } from "./pointInput";
import { toScenePoint, toWorldPoint, type ConstructionProgram } from "@euclid/geometry";

describe("point input resolution", () => {
  it("resolves an existing point without changing the program", () => {
    const program: ConstructionProgram = {
      constructions: [{ id: "A", kind: "free-point", label: "A", position: worldPoint(0, 0) }],
    };

    expect(resolvePointInput(program, { kind: "existing-point", id: "A" })).toEqual({
      program,
      id: "A",
      changed: false,
    });
  });

  it("creates the next labeled free point", () => {
    const program: ConstructionProgram = {
      constructions: [{ id: "A", kind: "free-point", label: "A", position: worldPoint(0, 0) }],
    };

    const result = resolvePointInput(program, { kind: "free-point", position: worldPoint(1, 2) });

    expect(result.id).toBe("B");
    expect(result.changed).toBe(true);
    expect(result.program.constructions).toEqual([
      { id: "A", kind: "free-point", label: "A", position: worldPoint(0, 0) },
      { id: "B", kind: "free-point", label: "B", position: worldPoint(1, 2) },
    ]);
  });

  it("creates an intersection point through the shared edit path", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: worldPoint(0, 0) },
        { id: "B", kind: "free-point", label: "B", position: worldPoint(2, 0) },
        { id: "C", kind: "free-point", label: "C", position: worldPoint(1, -1) },
        { id: "D", kind: "free-point", label: "D", position: worldPoint(1, 1) },
        { id: "line-1", kind: "line-through", label: "line-1", points: ["A", "B"] },
        { id: "line-2", kind: "line-through", label: "line-2", points: ["C", "D"] },
      ],
    };

    const result = resolvePointInput(program, {
      kind: "intersection",
      hit: { kind: "line-line-intersection", lines: ["line-1", "line-2"], position: scenePoint(1, 0) },
    });

    expect(result.id).toBe("intersection-line-1-line-2");
    expect(result.changed).toBe(true);
    expect(result.program.constructions.at(-1)).toEqual({
      id: "intersection-line-1-line-2",
      kind: "line-line-intersection",
      lines: ["line-1", "line-2"],
      label: "E",
    });
  });
});

function worldPoint(x: number, y: number) {
  return toWorldPoint({ x, y });
}

function scenePoint(x: number, y: number) {
  return toScenePoint({ x, y });
}
