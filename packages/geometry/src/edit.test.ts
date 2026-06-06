import { describe, expect, it } from "vitest";
import { evaluateConstruction } from "./evaluate";
import { addLineLineIntersection, addLineThroughPoints, moveFreePoint } from "./edit";
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

  it("adds a line through two points with a stable dependency-based id", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
        { id: "B", kind: "free-point", label: "B", position: { x: 1, y: 0 } },
      ],
    };

    const updated = addLineThroughPoints(program, ["A", "B"]);

    expect(updated.constructions.at(-1)).toEqual({
      id: "line-a-b",
      kind: "line-through",
      label: "AB",
      points: ["A", "B"],
    });
    expect(evaluateConstruction(updated).primitives.map((primitive) => primitive.id)).toEqual([
      "A",
      "B",
      "line-a-b",
    ]);
  });

  it("does not add duplicate or self-dependent lines", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
        { id: "B", kind: "free-point", label: "B", position: { x: 1, y: 0 } },
      ],
    };
    const withLine = addLineThroughPoints(program, ["A", "B"]);

    expect(addLineThroughPoints(withLine, ["B", "A"])).toBe(withLine);
    expect(addLineThroughPoints(withLine, ["A", "A"])).toBe(withLine);
  });

  it("adds a line-line intersection with an identity independent of realization", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
        { id: "B", kind: "free-point", label: "B", position: { x: 1, y: 0 } },
        { id: "C", kind: "free-point", label: "C", position: { x: 0, y: 1 } },
        { id: "D", kind: "free-point", label: "D", position: { x: 1, y: 1 } },
        { id: "line-a-b", kind: "line-through", label: "AB", points: ["A", "B"] },
        { id: "line-c-d", kind: "line-through", label: "CD", points: ["C", "D"] },
      ],
    };

    const updated = addLineLineIntersection(program, ["line-a-b", "line-c-d"]);
    const evaluation = evaluateConstruction(updated);

    expect(updated.constructions.at(-1)).toEqual({
      id: "intersection-line-a-b-line-c-d",
      kind: "line-line-intersection",
      label: "E",
      lines: ["line-a-b", "line-c-d"],
    });
    expect(evaluation.meanings.map((meaning) => meaning.id)).toContain("intersection-line-a-b-line-c-d");
    expect(evaluation.primitives.map((primitive) => primitive.id)).not.toContain(
      "intersection-line-a-b-line-c-d",
    );
  });
});
