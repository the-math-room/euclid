import type { Evaluation, Point2 } from "../geometry/model";
import { projectPoint, type ViewportSize, worldFrameFor } from "./viewport";

export type RenderScene = Readonly<{
  size: ViewportSize;
  items: readonly RenderItem[];
}>;

export type RenderItem =
  | Readonly<{
      id: string;
      kind: "point";
      label: string;
      position: Point2;
    }>
  | Readonly<{
      id: string;
      kind: "line";
      from: Point2;
      to: Point2;
    }>
  | Readonly<{
      id: string;
      kind: "circle";
      center: Point2;
      radius: number;
    }>;

export function sceneForEvaluation(evaluation: Evaluation, size: ViewportSize): RenderScene {
  const frame = worldFrameFor(evaluation.primitives, size);

  return {
    size,
    items: evaluation.primitives.map((primitive) => {
      if (primitive.kind === "point") {
        return {
          id: primitive.id,
          kind: "point",
          label: primitive.label,
          position: projectPoint(frame, primitive.position),
        };
      }

      if (primitive.kind === "line") {
        const a = projectPoint(frame, primitive.through[0]);
        const b = projectPoint(frame, primitive.through[1]);
        const [from, to] = extendLineToViewport(a, b, size);

        return {
          id: primitive.id,
          kind: "line",
          from,
          to,
        };
      }

      const center = projectPoint(frame, primitive.center);
      const edge = projectPoint(frame, primitive.pointOnCircle);

      return {
        id: primitive.id,
        kind: "circle",
        center,
        radius: distance(center, edge),
      };
    }),
  };
}

function extendLineToViewport(a: Point2, b: Point2, size: ViewportSize): readonly [Point2, Point2] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const span = Math.hypot(size.width, size.height);

  return [
    { x: a.x - ux * span, y: a.y - uy * span },
    { x: a.x + ux * span, y: a.y + uy * span },
  ];
}

function distance(a: Point2, b: Point2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
