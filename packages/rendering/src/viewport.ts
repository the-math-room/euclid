import type { EvaluatedPrimitive, Point2 } from "@euclid/geometry";

export type ViewportSize = Readonly<{
  width: number;
  height: number;
}>;

export type ViewRotation = Readonly<{
  turns: number;
}>;

export type ViewTransform = Readonly<{
  size: ViewportSize;
  rotation: ViewRotation;
}>;

export type WorldFrame = Readonly<{
  size: ViewportSize;
  center: Point2;
  scale: number;
  rotation: ViewRotation;
}>;

export function worldFrameFor(
  primitives: readonly EvaluatedPrimitive[],
  transform: ViewTransform,
): WorldFrame {
  const points = primitives.flatMap(pointsInPrimitive);
  const bounds = boundsOf(points);
  const center = {
    x: (bounds.min.x + bounds.max.x) / 2,
    y: (bounds.min.y + bounds.max.y) / 2,
  };
  const width = Math.max(bounds.max.x - bounds.min.x, 1);
  const height = Math.max(bounds.max.y - bounds.min.y, 1);
  const scale = Math.min((transform.size.width * 0.72) / width, (transform.size.height * 0.72) / height);

  return {
    size: transform.size,
    center,
    scale,
    rotation: transform.rotation,
  };
}

export function projectPoint(frame: WorldFrame, point: Point2): Point2 {
  const rotated = rotatePoint(
    {
      x: point.x - frame.center.x,
      y: point.y - frame.center.y,
    },
    frame.rotation,
  );

  return {
    x: frame.size.width / 2 + rotated.x * frame.scale,
    y: frame.size.height / 2 - rotated.y * frame.scale,
  };
}

function rotatePoint(point: Point2, rotation: ViewRotation): Point2 {
  const radians = rotation.turns * Math.PI * 2;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
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
