import { describe, expect, it } from "vitest";
import { evaluateConstruction, type ConstructionProgram } from "@euclid/geometry";
import { defaultScreenViewFor, sceneForEvaluation } from "./scene";
import { moveCameraInScreen, rotateCamera, zoomCamera, type ScreenView, type ViewportSize } from "./viewport";

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
    const scene = sceneForEvaluation(evaluation, screenViewFor(evaluation, { width: 920, height: 620 }));

    expect(scene.size).toEqual({ width: 920, height: 620 });
    expect(scene.grid.length).toBeGreaterThan(0);
    expect(scene.items.map((item) => item.kind)).toEqual([
      "circle",
      "circle",
      "line",
      "point",
      "point",
      "point",
    ]);
  });

  it("does not expose geometry primitives as the rendering representation", () => {
    const evaluation = evaluateConstruction(program);
    const scene = sceneForEvaluation(evaluation, screenViewFor(evaluation, { width: 920, height: 620 }));
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

  it("marks constructed point render items separately from free points", () => {
    const evaluation = evaluateConstruction({
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
        { id: "B", kind: "free-point", label: "B", position: { x: 2, y: 2 } },
        { id: "C", kind: "free-point", label: "C", position: { x: 0, y: 2 } },
        { id: "D", kind: "free-point", label: "D", position: { x: 2, y: 0 } },
        { id: "line-ab", kind: "line-through", label: "AB", points: ["A", "B"] },
        { id: "line-cd", kind: "line-through", label: "CD", points: ["C", "D"] },
        {
          id: "intersection",
          kind: "line-line-intersection",
          label: "E",
          lines: ["line-ab", "line-cd"],
        },
      ],
    });
    const scene = sceneForEvaluation(evaluation, screenViewFor(evaluation, { width: 100, height: 100 }));

    expect(pointIn(scene, "A").pointRole).toBe("free");
    expect(pointIn(scene, "intersection").pointRole).toBe("constructed");
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
    const view: ScreenView = {
      viewport: { size: { width: 100, height: 100 } },
      camera: {
        center: { x: 0, y: 0 },
        rotation: { turns: 0 },
        scale: 20,
        screenOffset: { x: 0, y: 0 },
      },
    };
    const unrotated = sceneForEvaluation(evaluation, view);
    const rotated = sceneForEvaluation(evaluation, {
      ...view,
      camera: rotateCamera(view.camera, { turns: 0.25 }),
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
    const view = screenViewFor(evaluation, { width: 100, height: 100 });
    const unrotated = sceneForEvaluation(evaluation, view);
    const rotated = sceneForEvaluation(evaluation, {
      ...view,
      camera: rotateCamera(view.camera, { turns: 0.125 }),
    });
    const screenCenter = { x: 50, y: 50 };

    expect(distance(pointIn(rotated, "A").mark, screenCenter)).toBeCloseTo(
      distance(pointIn(unrotated, "A").mark, screenCenter),
    );
  });

  it("pans the camera in screen space", () => {
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
    const view = screenViewFor(evaluation, { width: 100, height: 100 });
    const unpanned = sceneForEvaluation(evaluation, view);
    const panned = sceneForEvaluation(evaluation, {
      ...view,
      camera: moveCameraInScreen(view.camera, { x: 12, y: -8 }),
    });

    expect(pointIn(panned, "A").mark.x - pointIn(unpanned, "A").mark.x).toBe(-12);
    expect(pointIn(panned, "A").mark.y - pointIn(unpanned, "A").mark.y).toBe(8);
  });

  it("zooms around the panned screen center", () => {
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
    const view = screenViewFor(evaluation, { width: 100, height: 100 });
    const base = sceneForEvaluation(evaluation, view);
    const zoomed = sceneForEvaluation(evaluation, {
      ...view,
      camera: zoomCamera(view.camera, 2),
    });
    const screenCenter = { x: 50, y: 50 };

    expect(distance(pointIn(zoomed, "A").mark, screenCenter)).toBeCloseTo(
      distance(pointIn(base, "A").mark, screenCenter) * 2,
    );
  });

  it("clips infinite lines to the viewport when defining points are offscreen", () => {
    const evaluation = evaluateConstruction({
      constructions: [
        {
          id: "A",
          kind: "free-point",
          label: "A",
          position: { x: -100, y: 0 },
        },
        {
          id: "B",
          kind: "free-point",
          label: "B",
          position: { x: -99, y: 0 },
        },
        {
          id: "line-ab",
          kind: "line-through",
          label: "AB",
          points: ["A", "B"],
        },
      ],
    });
    const scene = sceneForEvaluation(evaluation, {
      viewport: { size: { width: 100, height: 100 } },
      camera: {
        center: { x: 0, y: 0 },
        rotation: { turns: 0 },
        scale: 10,
        screenOffset: { x: 0, y: 0 },
      },
    });
    const line = lineIn(scene, "line-ab");

    expect(line.from).toEqual({ x: -1000, y: 50 });
    expect(line.to).toEqual({ x: 1100, y: 50 });
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

type LineRenderItem = Extract<ReturnType<typeof sceneForEvaluation>["items"][number], { kind: "line" }>;

function lineIn(scene: ReturnType<typeof sceneForEvaluation>, id: string): LineRenderItem {
  const line = scene.items.find((item) => item.kind === "line" && item.id === id);

  if (!line || line.kind !== "line") {
    throw new Error("Expected line render item.");
  }

  return line;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function screenViewFor(
  evaluation: Parameters<typeof defaultScreenViewFor>[0],
  size: ViewportSize,
): ScreenView {
  return defaultScreenViewFor(evaluation, size);
}
