import type { Point2 } from "@euclid/geometry";
import type { RenderItem, RenderScene } from "./scene";

export function distance(a: Point2, b: Point2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function distanceToSegment(p: Point2, a: Point2, b: Point2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return distance(p, a);
  }

  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const projection = {
    x: a.x + t * dx,
    y: a.y + t * dy,
  };
  return distance(p, projection);
}

/**
 * Finds the render item at the given screen position within a threshold.
 * Prioritizes points over other shapes (lines, circles) to make selecting points easier
 * when they lie on lines/circles.
 */
export function findItemAtPosition(
  scene: RenderScene,
  position: Point2,
  threshold: number = 8,
): RenderItem | undefined {
  // First, check for points within the threshold
  let closestPoint: RenderItem | undefined = undefined;
  let minPointDist = Infinity;

  for (const item of scene.items) {
    if (item.kind === "point") {
      const dist = distance(position, item.mark);
      if (dist <= threshold && dist < minPointDist) {
        minPointDist = dist;
        closestPoint = item;
      }
    }
  }

  if (closestPoint) {
    return closestPoint;
  }

  // Next, check for lines and circles
  let closestShape: RenderItem | undefined = undefined;
  let minShapeDist = Infinity;

  for (const item of scene.items) {
    if (item.kind === "point") {
      continue;
    }

    let dist = Infinity;
    if (item.kind === "line") {
      dist = distanceToSegment(position, item.from, item.to);
    } else if (item.kind === "circle") {
      const distToCenter = distance(position, item.center);
      dist = Math.abs(distToCenter - item.radius);
    }

    if (dist <= threshold && dist < minShapeDist) {
      minShapeDist = dist;
      closestShape = item;
    }
  }

  return closestShape;
}
