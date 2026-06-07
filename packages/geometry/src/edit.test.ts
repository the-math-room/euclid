import { describe, expect, it } from "vitest";
import { evaluateConstruction } from "./evaluate";
import {
  addCircleThreePoints,
  addCircleThroughPoints,
  addLineLineIntersection,
  addLineCircleIntersection,
  addCircleCircleIntersection,
  addLineThroughPoints,
  addParallelLine,
  moveFreePoint,
  translateShape,
} from "./edit";
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

    const result = addLineThroughPoints(program, ["A", "B"]);
    const updated = result.program;

    expect(result).toMatchObject({ id: "line-a-b", changed: true });
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
    const withLine = addLineThroughPoints(program, ["A", "B"]).program;

    expect(addLineThroughPoints(withLine, ["B", "A"])).toEqual({
      program: withLine,
      id: "line-a-b",
      changed: false,
    });
    expect(addLineThroughPoints(withLine, ["A", "A"])).toEqual({
      program: withLine,
      id: undefined,
      changed: false,
    });
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

    const result = addLineLineIntersection(program, ["line-a-b", "line-c-d"]);
    const updated = result.program;
    const evaluation = evaluateConstruction(updated);

    expect(result).toMatchObject({ id: "intersection-line-a-b-line-c-d", changed: true });
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

  it("adds a circle from center and boundary point", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
        { id: "B", kind: "free-point", label: "B", position: { x: 1, y: 0 } },
      ],
    };

    const result = addCircleThroughPoints(program, "A", "B");
    const updated = result.program;

    expect(result).toMatchObject({ id: "circle-a-b", changed: true });
    expect(updated.constructions.at(-1)).toEqual({
      id: "circle-a-b",
      kind: "circle-through",
      label: "Circle(A, B)",
      center: "A",
      pointOnCircle: "B",
    });

    // Idempotent duplicate check
    expect(addCircleThroughPoints(updated, "A", "B")).toEqual({
      program: updated,
      id: "circle-a-b",
      changed: false,
    });
    expect(addCircleThroughPoints(updated, "A", "A")).toEqual({
      program: updated,
      id: undefined,
      changed: false,
    }); // same points
  });

  it("adds a 3-point circumscribed circle", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
        { id: "B", kind: "free-point", label: "B", position: { x: 2, y: 0 } },
        { id: "C", kind: "free-point", label: "C", position: { x: 0, y: 2 } },
      ],
    };

    const result = addCircleThreePoints(program, ["A", "B", "C"]);
    const updated = result.program;

    expect(result).toMatchObject({ id: "circle-a-b-c", changed: true });
    expect(updated.constructions.at(-1)).toEqual({
      id: "circle-a-b-c",
      kind: "circle-three-points",
      label: "Circle(ABC)",
      points: ["A", "B", "C"],
    });

    // Idempotent duplicate check with different order
    expect(addCircleThreePoints(updated, ["C", "B", "A"])).toEqual({
      program: updated,
      id: "circle-a-b-c",
      changed: false,
    });
    expect(addCircleThreePoints(updated, ["A", "B", "A"])).toEqual({
      program: updated,
      id: undefined,
      changed: false,
    }); // coincident points
  });

  it("adds line-circle intersections", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
        { id: "B", kind: "free-point", label: "B", position: { x: 1, y: 0 } },
        { id: "circle", kind: "circle-through", label: "circle", center: "A", pointOnCircle: "B" },
        { id: "line", kind: "line-through", label: "line", points: ["A", "B"] },
      ],
    };

    const result = addLineCircleIntersection(program, "line", "circle", 0);
    const updated = result.program;
    expect(result).toMatchObject({ id: "intersection-line-circle-0", changed: true });
    expect(updated.constructions.at(-1)).toEqual({
      id: "intersection-line-circle-0",
      kind: "line-circle-intersection",
      label: "C",
      line: "line",
      circle: "circle",
      intersectionIndex: 0,
    });

    expect(addLineCircleIntersection(updated, "line", "circle", 0)).toEqual({
      program: updated,
      id: "intersection-line-circle-0",
      changed: false,
    });
  });

  it("adds circle-circle intersections with canonical ordering", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
        { id: "B", kind: "free-point", label: "B", position: { x: 1, y: 0 } },
        { id: "circle-y", kind: "circle-through", label: "cY", center: "A", pointOnCircle: "B" },
        { id: "circle-x", kind: "circle-through", label: "cX", center: "B", pointOnCircle: "A" },
      ],
    };

    // circle-x and circle-y should be canonicalized by alphabetical ID sorting: circle-x first, circle-y second
    const result = addCircleCircleIntersection(program, "circle-y", "circle-x", 1);
    const updated = result.program;
    expect(result).toMatchObject({ id: "intersection-circle-x-circle-y-1", changed: true });
    expect(updated.constructions.at(-1)).toEqual({
      id: "intersection-circle-x-circle-y-1",
      kind: "circle-circle-intersection",
      label: "C",
      firstCircle: "circle-x",
      secondCircle: "circle-y",
      intersectionIndex: 1,
    });

    expect(addCircleCircleIntersection(updated, "circle-x", "circle-y", 1)).toEqual({
      program: updated,
      id: "intersection-circle-x-circle-y-1",
      changed: false,
    });
    expect(addCircleCircleIntersection(updated, "circle-y", "circle-x", 1)).toEqual({
      program: updated,
      id: "intersection-circle-x-circle-y-1",
      changed: false,
    });
  });

  it("translates defining free points of a line when translating the line", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: { x: 1, y: 2 } },
        { id: "B", kind: "free-point", label: "B", position: { x: 3, y: 4 } },
        { id: "line-ab", kind: "line-through", label: "AB", points: ["A", "B"] },
      ],
    };

    const translated = translateShape(program, "line-ab", { x: 10, y: -20 });

    expect(translated.constructions).toContainEqual({
      id: "A",
      kind: "free-point",
      label: "A",
      position: { x: 11, y: -18 },
    });
    expect(translated.constructions).toContainEqual({
      id: "B",
      kind: "free-point",
      label: "B",
      position: { x: 13, y: -16 },
    });
  });

  it("translates only free points when translating a circle", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
        // B is not a free point, it is an intersection or similar (kind: line-line-intersection)
        { id: "B", kind: "line-line-intersection", label: "B", lines: ["l1", "l2"] },
        { id: "circle", kind: "circle-through", label: "Circle", center: "A", pointOnCircle: "B" },
      ],
    };

    const translated = translateShape(program, "circle", { x: 5, y: 5 });

    // A is translated because it's a free-point
    expect(translated.constructions.find((c) => c.id === "A")).toEqual({
      id: "A",
      kind: "free-point",
      label: "A",
      position: { x: 5, y: 5 },
    });

    // B is not translated because it's not a free-point
    expect(translated.constructions.find((c) => c.id === "B")).toEqual({
      id: "B",
      kind: "line-line-intersection",
      label: "B",
      lines: ["l1", "l2"],
    });
  });

  it("adds a parallel line and translates its defining point", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
        { id: "B", kind: "free-point", label: "B", position: { x: 2, y: 0 } },
        { id: "line-ab", kind: "line-through", label: "AB", points: ["A", "B"] },
        { id: "C", kind: "free-point", label: "C", position: { x: 0, y: 1 } },
      ],
    };

    const result = addParallelLine(program, "line-ab", "C");
    const updated = result.program;

    expect(result).toMatchObject({ id: "parallel-line-ab-c", changed: true });
    expect(updated.constructions.at(-1)).toEqual({
      id: "parallel-line-ab-c",
      kind: "parallel-line",
      label: "Parallel(line-ab, C)",
      line: "line-ab",
      point: "C",
    });

    const translated = translateShape(updated, "parallel-line-ab-c", { x: 5, y: 5 });
    expect(translated.constructions.find((c) => c.id === "C")).toEqual({
      id: "C",
      kind: "free-point",
      label: "C",
      position: { x: 5, y: 6 },
    });
  });
});
