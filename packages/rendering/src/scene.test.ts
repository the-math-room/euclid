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
    const scene = sceneForEvaluation(evaluation, {
      size: { width: 920, height: 620 },
      rotation: { turns: 0 },
    });

    expect(scene.size).toEqual({ width: 920, height: 620 });
    expect(scene.grid.length).toBeGreaterThan(0);
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
    const scene = sceneForEvaluation(evaluation, {
      size: { width: 920, height: 620 },
      rotation: { turns: 0 },
    });
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

  it("rotates marks while keeping labels screen-facing", () => {
    const evaluation = evaluateConstruction({
      constructions: [
        {
          id: "A",
          kind: "free-point",
          label: "A",
          position: { x: 1, y: 0 },
        },
        {
          id: "B",
          kind: "free-point",
          label: "B",
          position: { x: 0, y: 0 },
        },
      ],
    });
    const unrotated = sceneForEvaluation(evaluation, {
      size: { width: 100, height: 100 },
      rotation: { turns: 0 },
    });
    const rotated = sceneForEvaluation(evaluation, {
      size: { width: 100, height: 100 },
      rotation: { turns: 0.25 },
    });
    const unrotatedPoint = pointIn(unrotated, "A");
    const rotatedPoint = pointIn(rotated, "A");

    expect(rotatedPoint.mark.x).not.toBeCloseTo(unrotatedPoint.mark.x);
    expect(rotatedPoint.mark.y).not.toBeCloseTo(unrotatedPoint.mark.y);
    expect(rotatedPoint.label.anchor.x - rotatedPoint.mark.x).toBe(10);
    expect(rotatedPoint.label.anchor.y - rotatedPoint.mark.y).toBe(-10);
  });

  it("preserves screen magnification while rotating", () => {
    const evaluation = evaluateConstruction({
      constructions: [
        {
          id: "A",
          kind: "free-point",
          label: "A",
          position: { x: 1, y: 0 },
        },
        {
          id: "B",
          kind: "free-point",
          label: "B",
          position: { x: 0, y: 0 },
        },
      ],
    });
    const unrotated = sceneForEvaluation(evaluation, {
      size: { width: 100, height: 100 },
      rotation: { turns: 0 },
    });
    const rotated = sceneForEvaluation(evaluation, {
      size: { width: 100, height: 100 },
      rotation: { turns: 0.125 },
    });
    const screenCenter = { x: 50, y: 50 };

    expect(distance(pointIn(rotated, "A").mark, screenCenter)).toBeCloseTo(
      distance(pointIn(unrotated, "A").mark, screenCenter),
    );
  });
});

type PointRenderItem = Extract<ReturnType<typeof sceneForEvaluation>["items"][number], { kind: "point" }>;

function pointIn(scene: ReturnType<typeof sceneForEvaluation>, id: string): PointRenderItem {
  const point = scene.items.find((item) => item.kind === "point" && item.id === id);

  if (!point || point.kind !== "point") {
    throw new Error("Expected point render item.");
  }

  return point;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
