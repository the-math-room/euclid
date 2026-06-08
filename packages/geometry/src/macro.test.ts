import { describe, expect, it } from "vitest";
import { applyConstructionMacro, type ConstructionMacroDefinition } from "./macro";
import { evaluateConstruction } from "./evaluate";
import { toWorldPoint, type ConstructionProgram } from "./model";

const sampleMacro = {
  id: "third-party/sample-macro",
  label: "Sample Macro",
  inputs: [
    { name: "a", kind: "point" },
    { name: "b", kind: "point", distinctFrom: "a" },
    { name: "side", kind: "side-of-line", from: { input: "a" }, to: { input: "b" } },
  ],
  steps: [
    {
      bind: "circleA",
      kind: "circle-through",
      idTemplate: "sample-{a}-{b}-circle-a",
      labelTemplate: "Circle({a}, {b})",
      center: { input: "a" },
      pointOnCircle: { input: "b" },
      shapeRole: "auxiliary",
    },
    {
      bind: "circleB",
      kind: "circle-through",
      idTemplate: "sample-{a}-{b}-circle-b",
      labelTemplate: "Circle({b}, {a})",
      center: { input: "b" },
      pointOnCircle: { input: "a" },
      shapeRole: "auxiliary",
    },
    {
      bind: "apex",
      kind: "circle-circle-intersection",
      idTemplate: "sample-{a}-{b}-apex",
      labelTemplate: "{nextPointLabel}",
      firstCircle: { step: "circleA" },
      secondCircle: { step: "circleB" },
      intersectionIndex: {
        kind: "side-of-line",
        from: { input: "a" },
        to: { input: "b" },
        point: { input: "side" },
      },
    },
    {
      bind: "base",
      kind: "line-through",
      idTemplate: "sample-{a}-{b}-base",
      labelTemplate: "{a}{b}",
      points: [{ input: "a" }, { input: "b" }],
    },
    {
      bind: "sideA",
      kind: "line-through",
      idTemplate: "sample-{a}-{b}-side-a",
      labelTemplate: "{a}{apex}",
      points: [{ input: "a" }, { step: "apex" }],
    },
    {
      bind: "sideB",
      kind: "line-through",
      idTemplate: "sample-{a}-{b}-side-b",
      labelTemplate: "{b}{apex}",
      points: [{ input: "b" }, { step: "apex" }],
    },
  ],
  selectedSteps: ["base", "sideA", "sideB"],
} satisfies ConstructionMacroDefinition;

describe("construction macros", () => {
  const program: ConstructionProgram = {
    constructions: [
      { id: "A", kind: "free-point", label: "A", position: toWorldPoint({ x: 0, y: 0 }) },
      { id: "B", kind: "free-point", label: "B", position: toWorldPoint({ x: 1, y: 0 }) },
    ],
  };

  it("expands data into primitive constructions with helper circles", () => {
    const result = applyConstructionMacro(program, sampleMacro, {
      pointInputs: { a: "A", b: "B" },
      sideInputs: { side: toWorldPoint({ x: 0.5, y: 1 }) },
    });

    expect(result.changed).toBe(true);
    expect(result.program.constructions.slice(2)).toEqual([
      {
        id: "sample-a-b-circle-a",
        kind: "circle-through",
        label: "Circle(A, B)",
        center: "A",
        pointOnCircle: "B",
        shapeRole: "auxiliary",
      },
      {
        id: "sample-a-b-circle-b",
        kind: "circle-through",
        label: "Circle(B, A)",
        center: "B",
        pointOnCircle: "A",
        shapeRole: "auxiliary",
      },
      {
        id: "sample-a-b-apex",
        kind: "circle-circle-intersection",
        label: "C",
        firstCircle: "sample-a-b-circle-a",
        secondCircle: "sample-a-b-circle-b",
        intersectionIndex: 1,
      },
      {
        id: "sample-a-b-base",
        kind: "line-through",
        label: "AB",
        points: ["A", "B"],
      },
      {
        id: "sample-a-b-side-a",
        kind: "line-through",
        label: "AC",
        points: ["A", "sample-a-b-apex"],
      },
      {
        id: "sample-a-b-side-b",
        kind: "line-through",
        label: "BC",
        points: ["B", "sample-a-b-apex"],
      },
    ]);
    expect(result.selectedIds).toEqual(["sample-a-b-base", "sample-a-b-side-a", "sample-a-b-side-b"]);

    const apex = evaluateConstruction(result.program).primitives.find(
      (primitive) => primitive.id === "sample-a-b-apex",
    );
    expect(apex?.kind).toBe("point");
    if (apex?.kind === "point") {
      expect(apex.position.x).toBeCloseTo(0.5);
      expect(apex.position.y).toBeCloseTo(Math.sqrt(3) / 2);
    }
  });

  it("chooses the opposite intersection for the opposite side click", () => {
    const result = applyConstructionMacro(program, sampleMacro, {
      pointInputs: { a: "A", b: "B" },
      sideInputs: { side: toWorldPoint({ x: 0.5, y: -1 }) },
    });

    const apex = evaluateConstruction(result.program).primitives.find(
      (primitive) => primitive.id === "sample-a-b-apex",
    );
    expect(apex?.kind).toBe("point");
    if (apex?.kind === "point") {
      expect(apex.position.x).toBeCloseTo(0.5);
      expect(apex.position.y).toBeCloseTo(-Math.sqrt(3) / 2);
    }
  });

  it("returns unchanged when required inputs are missing or invalid", () => {
    expect(
      applyConstructionMacro(program, sampleMacro, {
        pointInputs: { a: "A", b: "A" },
        sideInputs: { side: toWorldPoint({ x: 0.5, y: 1 }) },
      }),
    ).toEqual({
      program,
      changed: false,
      stepIds: [],
      selectedIds: [],
    });
  });
});
