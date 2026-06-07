import { describe, expect, it } from "vitest";
import { evaluateConstruction } from "./evaluate";
import { toWorldPoint, type ConstructionProgram } from "./model";

describe("evaluateConstruction", () => {
  it("evaluates constructions in dependency order rather than source order", () => {
    const program: ConstructionProgram = {
      constructions: [
        {
          id: "line-ab",
          kind: "line-through",
          label: "AB",
          points: ["A", "B"],
        },
        {
          id: "A",
          kind: "free-point",
          label: "A",
          position: toWorldPoint({ x: 0, y: 0 }),
        },
        {
          id: "B",
          kind: "free-point",
          label: "B",
          position: toWorldPoint({ x: 1, y: 0 }),
        },
      ],
    };

    const evaluation = evaluateConstruction(program);

    expect(evaluation.diagnostics).toEqual([]);
    expect(evaluation.graph.edges).toEqual([
      { from: "line-ab", to: "A" },
      { from: "line-ab", to: "B" },
    ]);
    expect(evaluation.meanings.map((meaning) => meaning.id)).toEqual(["A", "B", "line-ab"]);
    expect(evaluation.primitives.map((primitive) => primitive.id)).toEqual(["A", "B", "line-ab"]);
  });

  it("reports missing dependencies without evaluating the dependent construction", () => {
    const program: ConstructionProgram = {
      constructions: [
        {
          id: "line-ab",
          kind: "line-through",
          label: "AB",
          points: ["A", "B"],
        },
        {
          id: "A",
          kind: "free-point",
          label: "A",
          position: toWorldPoint({ x: 0, y: 0 }),
        },
      ],
    };

    const evaluation = evaluateConstruction(program);

    expect(evaluation.primitives.map((primitive) => primitive.id)).toEqual(["A"]);
    expect(evaluation.meanings.map((meaning) => meaning.id)).toEqual(["A"]);
    expect(evaluation.diagnostics).toEqual([
      {
        constructionId: "line-ab",
        message: "Construction AB depends on missing construction B.",
      },
    ]);
  });

  it("reports duplicate construction ids", () => {
    const program: ConstructionProgram = {
      constructions: [
        {
          id: "A",
          kind: "free-point",
          label: "A",
          position: toWorldPoint({ x: 0, y: 0 }),
        },
        {
          id: "A",
          kind: "free-point",
          label: "A prime",
          position: toWorldPoint({ x: 1, y: 0 }),
        },
      ],
    };

    const evaluation = evaluateConstruction(program);

    expect(evaluation.primitives).toEqual([]);
    expect(evaluation.diagnostics).toEqual([
      {
        constructionId: "A",
        message: "Construction id A is defined more than once.",
      },
    ]);
  });

  it("reports cyclic dependencies", () => {
    const program: ConstructionProgram = {
      constructions: [
        {
          id: "line-aa",
          kind: "line-through",
          label: "AA",
          points: ["line-aa", "line-aa"],
        },
      ],
    };

    const evaluation = evaluateConstruction(program);

    expect(evaluation.primitives).toEqual([]);
    expect(evaluation.diagnostics).toEqual([
      {
        constructionId: "line-aa",
        message: "Construction AA has a cyclic dependency.",
      },
    ]);
  });

  it("does not evaluate a line whose point dependencies coincide", () => {
    const program: ConstructionProgram = {
      constructions: [
        {
          id: "A",
          kind: "free-point",
          label: "A",
          position: toWorldPoint({ x: 0, y: 0 }),
        },
        {
          id: "B",
          kind: "free-point",
          label: "B",
          position: toWorldPoint({ x: 0, y: 0 }),
        },
        {
          id: "line-ab",
          kind: "line-through",
          label: "AB",
          points: ["A", "B"],
        },
      ],
    };

    const evaluation = evaluateConstruction(program);

    expect(evaluation.primitives.map((primitive) => primitive.id)).toEqual(["A", "B"]);
    expect(evaluation.meanings.map((meaning) => meaning.id)).toEqual(["A", "B", "line-ab"]);
    expect(evaluation.diagnostics).toEqual([
      {
        constructionId: "line-ab",
        message: "Line AB needs two distinct point dependencies.",
      },
    ]);
  });

  it("does not evaluate a circle whose center and circumference points coincide", () => {
    const program: ConstructionProgram = {
      constructions: [
        {
          id: "A",
          kind: "free-point",
          label: "A",
          position: toWorldPoint({ x: 0, y: 0 }),
        },
        {
          id: "B",
          kind: "free-point",
          label: "B",
          position: toWorldPoint({ x: 0, y: 0 }),
        },
        {
          id: "circle-ab",
          kind: "circle-through",
          label: "circle(A, B)",
          center: "A",
          pointOnCircle: "B",
        },
      ],
    };

    const evaluation = evaluateConstruction(program);

    expect(evaluation.primitives.map((primitive) => primitive.id)).toEqual(["A", "B"]);
    expect(evaluation.meanings.map((meaning) => meaning.id)).toEqual(["A", "B", "circle-ab"]);
    expect(evaluation.diagnostics).toEqual([
      {
        constructionId: "circle-ab",
        message: "Circle circle(A, B) needs distinct center and circumference points.",
      },
    ]);
  });

  it("realizes a line-line intersection as a constructed point", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: toWorldPoint({ x: 0, y: 0 }) },
        { id: "B", kind: "free-point", label: "B", position: toWorldPoint({ x: 2, y: 2 }) },
        { id: "C", kind: "free-point", label: "C", position: toWorldPoint({ x: 0, y: 2 }) },
        { id: "D", kind: "free-point", label: "D", position: toWorldPoint({ x: 2, y: 0 }) },
        { id: "line-ab", kind: "line-through", label: "AB", points: ["A", "B"] },
        { id: "line-cd", kind: "line-through", label: "CD", points: ["C", "D"] },
        {
          id: "intersection",
          kind: "line-line-intersection",
          label: "X",
          lines: ["line-ab", "line-cd"],
        },
      ],
    };

    const evaluation = evaluateConstruction(program);
    const intersection = evaluation.primitives.find((primitive) => primitive.id === "intersection");

    expect(evaluation.meanings.find((meaning) => meaning.id === "intersection")).toEqual({
      id: "intersection",
      label: "X",
      expression: {
        kind: "line-line-intersection",
        lines: ["line-ab", "line-cd"],
      },
    });
    expect(intersection).toEqual({
      id: "intersection",
      kind: "point",
      label: "X",
      position: toWorldPoint({ x: 1, y: 1 }),
    });
  });

  it("keeps line-line intersection meaning when parallel lines have no realization", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: toWorldPoint({ x: 0, y: 0 }) },
        { id: "B", kind: "free-point", label: "B", position: toWorldPoint({ x: 2, y: 0 }) },
        { id: "C", kind: "free-point", label: "C", position: toWorldPoint({ x: 0, y: 1 }) },
        { id: "D", kind: "free-point", label: "D", position: toWorldPoint({ x: 2, y: 1 }) },
        { id: "line-ab", kind: "line-through", label: "AB", points: ["A", "B"] },
        { id: "line-cd", kind: "line-through", label: "CD", points: ["C", "D"] },
        {
          id: "intersection",
          kind: "line-line-intersection",
          label: "X",
          lines: ["line-ab", "line-cd"],
        },
      ],
    };

    const evaluation = evaluateConstruction(program);

    expect(evaluation.meanings.map((meaning) => meaning.id)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "line-ab",
      "line-cd",
      "intersection",
    ]);
    expect(evaluation.primitives.map((primitive) => primitive.id)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "line-ab",
      "line-cd",
    ]);
    expect(evaluation.diagnostics).toContainEqual({
      constructionId: "intersection",
      message: "Intersection X needs non-parallel line dependencies.",
    });
  });

  it("evaluates and realizes a 3-point circumscribed circle", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: toWorldPoint({ x: 0, y: 0 }) },
        { id: "B", kind: "free-point", label: "B", position: toWorldPoint({ x: 2, y: 0 }) },
        { id: "C", kind: "free-point", label: "C", position: toWorldPoint({ x: 0, y: 2 }) },
        {
          id: "circle-abc",
          kind: "circle-three-points",
          label: "Circle(ABC)",
          points: ["A", "B", "C"],
        },
      ],
    };

    const evaluation = evaluateConstruction(program);
    const circle = evaluation.primitives.find((p) => p.id === "circle-abc");

    expect(evaluation.diagnostics).toEqual([]);
    expect(circle).toEqual({
      id: "circle-abc",
      kind: "circle",
      label: "Circle(ABC)",
      center: { x: 1, y: 1 },
      pointOnCircle: { x: 0, y: 0 },
    });
  });

  it("does not evaluate a 3-point circle if points are collinear", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: toWorldPoint({ x: 0, y: 0 }) },
        { id: "B", kind: "free-point", label: "B", position: toWorldPoint({ x: 1, y: 1 }) },
        { id: "C", kind: "free-point", label: "C", position: toWorldPoint({ x: 2, y: 2 }) },
        {
          id: "circle-abc",
          kind: "circle-three-points",
          label: "Circle(ABC)",
          points: ["A", "B", "C"],
        },
      ],
    };

    const evaluation = evaluateConstruction(program);

    expect(evaluation.primitives.map((p) => p.id)).toEqual(["A", "B", "C"]);
    expect(evaluation.diagnostics).toEqual([
      {
        constructionId: "circle-abc",
        message: "Circle Circle(ABC) cannot be circumscribed through collinear points.",
      },
    ]);
  });

  it("realizes line-circle intersections", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: toWorldPoint({ x: 0, y: 0 }) },
        { id: "B", kind: "free-point", label: "B", position: toWorldPoint({ x: 0, y: 1 }) },
        { id: "circle", kind: "circle-through", label: "circle", center: "A", pointOnCircle: "B" },
        { id: "C", kind: "free-point", label: "C", position: toWorldPoint({ x: -2, y: 0 }) },
        { id: "D", kind: "free-point", label: "D", position: toWorldPoint({ x: 2, y: 0 }) },
        { id: "line", kind: "line-through", label: "line", points: ["C", "D"] },
        {
          id: "intersect-0",
          kind: "line-circle-intersection",
          label: "X0",
          line: "line",
          circle: "circle",
          intersectionIndex: 0,
        },
        {
          id: "intersect-1",
          kind: "line-circle-intersection",
          label: "X1",
          line: "line",
          circle: "circle",
          intersectionIndex: 1,
        },
      ],
    };

    const evaluation = evaluateConstruction(program);
    expect(evaluation.diagnostics).toEqual([]);

    const x0 = evaluation.primitives.find((p) => p.id === "intersect-0");
    const x1 = evaluation.primitives.find((p) => p.id === "intersect-1");

    expect(x0?.kind).toBe("point");
    if (x0 && x0.kind === "point") {
      expect(x0.position.x).toBeCloseTo(-1);
      expect(x0.position.y).toBeCloseTo(0);
    }

    expect(x1?.kind).toBe("point");
    if (x1 && x1.kind === "point") {
      expect(x1.position.x).toBeCloseTo(1);
      expect(x1.position.y).toBeCloseTo(0);
    }
  });

  it("realizes circle-circle intersections", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: toWorldPoint({ x: -0.5, y: 0 }) },
        { id: "B", kind: "free-point", label: "B", position: toWorldPoint({ x: 0.5, y: 0 }) },
        { id: "circle1", kind: "circle-through", label: "c1", center: "A", pointOnCircle: "B" },
        { id: "circle2", kind: "circle-through", label: "c2", center: "B", pointOnCircle: "A" },
        {
          id: "intersect-0",
          kind: "circle-circle-intersection",
          label: "X0",
          firstCircle: "circle1",
          secondCircle: "circle2",
          intersectionIndex: 0,
        },
        {
          id: "intersect-1",
          kind: "circle-circle-intersection",
          label: "X1",
          firstCircle: "circle1",
          secondCircle: "circle2",
          intersectionIndex: 1,
        },
      ],
    };

    const evaluation = evaluateConstruction(program);
    expect(evaluation.diagnostics).toEqual([]);

    const x0 = evaluation.primitives.find((p) => p.id === "intersect-0");
    const x1 = evaluation.primitives.find((p) => p.id === "intersect-1");

    expect(x0?.kind).toBe("point");
    if (x0 && x0.kind === "point") {
      expect(x0.position.x).toBeCloseTo(0);
      expect(x0.position.y).toBeCloseTo(-Math.sqrt(0.75));
    }

    expect(x1?.kind).toBe("point");
    if (x1 && x1.kind === "point") {
      expect(x1.position.x).toBeCloseTo(0);
      expect(x1.position.y).toBeCloseTo(Math.sqrt(0.75));
    }
  });

  it("realizes parallel lines", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: toWorldPoint({ x: 0, y: 0 }) },
        { id: "B", kind: "free-point", label: "B", position: toWorldPoint({ x: 2, y: 0 }) },
        { id: "line-ab", kind: "line-through", label: "AB", points: ["A", "B"] },
        { id: "C", kind: "free-point", label: "C", position: toWorldPoint({ x: 0, y: 1 }) },
        {
          id: "parallel-line",
          kind: "parallel-line",
          label: "Parallel",
          line: "line-ab",
          point: "C",
        },
      ],
    };

    const evaluation = evaluateConstruction(program);
    expect(evaluation.diagnostics).toEqual([]);

    const parallel = evaluation.primitives.find((p) => p.id === "parallel-line");
    expect(parallel?.kind).toBe("line");
    if (parallel && parallel.kind === "line") {
      // The parallel line must go through C (0, 1) and C + (B - A) which is (2, 1)
      expect(parallel.through[0]).toEqual({ x: 0, y: 1 });
      expect(parallel.through[1]).toEqual({ x: 2, y: 1 });
    }
  });

  it("realizes perpendicular lines", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: toWorldPoint({ x: 0, y: 0 }) },
        { id: "B", kind: "free-point", label: "B", position: toWorldPoint({ x: 2, y: 0 }) },
        { id: "line-ab", kind: "line-through", label: "AB", points: ["A", "B"] },
        { id: "C", kind: "free-point", label: "C", position: toWorldPoint({ x: 1, y: 1 }) },
        {
          id: "perpendicular-line",
          kind: "perpendicular-line",
          label: "Perpendicular",
          line: "line-ab",
          point: "C",
        },
      ],
    };

    const evaluation = evaluateConstruction(program);
    expect(evaluation.diagnostics).toEqual([]);

    const perp = evaluation.primitives.find((p) => p.id === "perpendicular-line");
    expect(perp?.kind).toBe("line");
    if (perp && perp.kind === "line") {
      // Perpendicular line through C (1, 1). AB is along x-axis, so perp is along y-axis.
      // (dx, dy) = (2, 0)
      // perpendicular direction: (-dy, dx) = (0, 2)
      // perp goes through (1, 1) and (1, 3)
      expect(perp.through[0]).toEqual({ x: 1, y: 1 });
      expect(perp.through[1]).toEqual({ x: 1, y: 3 });
    }
  });

  it("realizes midpoints", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: toWorldPoint({ x: 0, y: 0 }) },
        { id: "B", kind: "free-point", label: "B", position: toWorldPoint({ x: 2, y: 4 }) },
        {
          id: "midpoint",
          kind: "midpoint",
          label: "Midpoint",
          points: ["A", "B"],
        },
      ],
    };

    const evaluation = evaluateConstruction(program);
    expect(evaluation.diagnostics).toEqual([]);

    const midpoint = evaluation.primitives.find((p) => p.id === "midpoint");
    expect(midpoint?.kind).toBe("point");
    if (midpoint && midpoint.kind === "point") {
      expect(midpoint.position).toEqual({ x: 1, y: 2 });
    }
  });
});
