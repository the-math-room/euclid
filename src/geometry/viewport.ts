import type { EvaluatedPrimitive, Point2 } from "./model";

export type ViewportSize = Readonly<{
  width: number;
  height: number;
}>;

export type WorldFrame = Readonly<{
  size: ViewportSize;
  center: Point2;
  scale: number;
}>;

export function worldFrameFor(primitives: readonly EvaluatedPrimitive[], size: ViewportSize): WorldFrame {
  const points = primitives.flatMap(pointsInPrimitive);
  const bounds = boundsOf(points);
  const width = Math.max(bounds.max.x - bounds.min.x, 1);
  const height = Math.max(bounds.max.y - bounds.min.y, 1);
  const scale = Math.min((size.width * 0.72) / width, (size.height * 0.72) / height);

  return {
    size,
    center: {
      x: (bounds.min.x + bounds.max.x) / 2,
      y: (bounds.min.y + bounds.max.y) / 2,
    },
    scale,
  };
}

export function projectPoint(frame: WorldFrame, point: Point2): Point2 {
  return {
    x: frame.size.width / 2 + (point.x - frame.center.x) * frame.scale,
    y: frame.size.height / 2 - (point.y - frame.center.y) * frame.scale,
  };
}

function pointsInPrimitive(primitive: EvaluatedPrimitive): readonly Point2[] {
  if (primitive.kind === "point") {
    return [primitive.position];
  }

  if (primitive.kind === "line") {
    return primitive.through;
  }

  return [primitive.center, primitive.pointOnCircle];
}

function boundsOf(points: readonly Point2[]) {
  if (points.length === 0) {
    return {
      min: { x: -1, y: -1 },
      max: { x: 1, y: 1 },
    };
  }

  return points.reduce(
    (bounds, point) => ({
      min: {
        x: Math.min(bounds.min.x, point.x),
        y: Math.min(bounds.min.y, point.y),
      },
      max: {
        x: Math.max(bounds.max.x, point.x),
        y: Math.max(bounds.max.y, point.y),
      },
    }),
    {
      min: points[0],
      max: points[0],
    },
  );
}
