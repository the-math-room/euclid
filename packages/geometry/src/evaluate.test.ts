import { describe, expect, it } from "vitest";
import { evaluateConstruction } from "./evaluate";
import type { ConstructionProgram } from "./model";

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
          position: { x: 0, y: 0 },
        },
        {
          id: "B",
          kind: "free-point",
          label: "B",
          position: { x: 1, y: 0 },
        },
      ],
    };

    const evaluation = evaluateConstruction(program);

    expect(evaluation.diagnostics).toEqual([]);
    expect(evaluation.graph.edges).toEqual([
      { from: "line-ab", to: "A" },
      { from: "line-ab", to: "B" },
    ]);
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
          position: { x: 0, y: 0 },
        },
      ],
    };

    const evaluation = evaluateConstruction(program);

    expect(evaluation.primitives.map((primitive) => primitive.id)).toEqual(["A"]);
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
          position: { x: 0, y: 0 },
        },
        {
          id: "A",
          kind: "free-point",
          label: "A prime",
          position: { x: 1, y: 0 },
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
          position: { x: 0, y: 0 },
        },
        {
          id: "B",
          kind: "free-point",
          label: "B",
          position: { x: 0, y: 0 },
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
          position: { x: 0, y: 0 },
        },
        {
          id: "B",
          kind: "free-point",
          label: "B",
          position: { x: 0, y: 0 },
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
    expect(evaluation.diagnostics).toEqual([
      {
        constructionId: "circle-ab",
        message: "Circle circle(A, B) needs distinct center and circumference points.",
      },
    ]);
  });
});
