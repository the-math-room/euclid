import { describe, expect, it } from "vitest";
import { evaluateConstruction, type ConstructionProgram } from "@euclid/geometry";
import { sceneForEvaluation } from "./scene";

const program: ConstructionProgram = {
  constructions: [
    {
      id: "A",
      kind: "free-point",
      label: "A",
      position: { x: -2.4, y: -0.6 },
    },
    {
      id: "B",
      kind: "free-point",
      label: "B",
      position: { x: 2.1, y: -0.2 },
    },
    {
      id: "C",
      kind: "free-point",
      label: "C",
      position: { x: -0.4, y: 2.2 },
    },
    {
      id: "line-ab",
      kind: "line-through",
      label: "AB",
      points: ["A", "B"],
    },
    {
      id: "circle-a-b",
      kind: "circle-through",
      label: "circle(A, B)",
      center: "A",
      pointOnCircle: "B",
    },
    {
      id: "circle-b-c",
      kind: "circle-through",
      label: "circle(B, C)",
      center: "B",
      pointOnCircle: "C",
    },
  ],
};

describe("sceneForEvaluation", () => {
  it("turns evaluated geometry into renderable scene data", () => {
    const evaluation = evaluateConstruction(program);
    const scene = sceneForEvaluation(evaluation, { width: 920, height: 620 });

    expect(scene.size).toEqual({ width: 920, height: 620 });
    expect(scene.items.map((item) => item.kind)).toEqual([
      "point",
      "point",
      "point",
      "line",
      "circle",
      "circle",
    ]);
  });

  it("does not expose geometry primitives as the rendering representation", () => {
    const evaluation = evaluateConstruction(program);
    const scene = sceneForEvaluation(evaluation, { width: 920, height: 620 });
    const line = scene.items.find((item) => item.kind === "line");

    expect(line).toEqual(
      expect.objectContaining({
        kind: "line",
        from: expect.any(Object),
        to: expect.any(Object),
      }),
    );
    expect(line).not.toHaveProperty("through");
  });
});
