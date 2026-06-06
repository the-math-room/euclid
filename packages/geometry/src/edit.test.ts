import { describe, expect, it } from "vitest";
import { evaluateConstruction } from "./evaluate";
import { moveFreePoint } from "./edit";
import type { ConstructionProgram } from "./model";

describe("construction edits", () => {
  it("moves free points and lets dependent constructions re-evaluate", () => {
    const initial: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
        { id: "B", kind: "free-point", label: "B", position: { x: 1, y: 0 } },
        { id: "line-ab", kind: "line-through", label: "AB", points: ["A", "B"] },
      ],
    };

    const degenerate = moveFreePoint(initial, "B", { x: 0, y: 0 });
    const restored = moveFreePoint(degenerate, "B", { x: 2, y: 0 });

    expect(evaluateConstruction(degenerate).primitives.map((primitive) => primitive.id)).toEqual(["A", "B"]);
    expect(evaluateConstruction(restored).primitives.map((primitive) => primitive.id)).toEqual([
      "A",
      "B",
      "line-ab",
    ]);
  });

  it("returns the same program when the target is not a free point", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
        { id: "B", kind: "free-point", label: "B", position: { x: 1, y: 0 } },
        { id: "line-ab", kind: "line-through", label: "AB", points: ["A", "B"] },
      ],
    };

    expect(moveFreePoint(program, "line-ab", { x: 2, y: 0 })).toBe(program);
  });
});
