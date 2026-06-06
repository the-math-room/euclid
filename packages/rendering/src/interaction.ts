import type { Point2 } from "@euclid/geometry";
import type { RenderItem, RenderScene } from "./scene";

export type IntersectionHit = Readonly<{
  kind: "intersection";
  operands: readonly [string, string];
  position: Point2;
}>;

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

export function findIntersectionAtPosition(
  scene: RenderScene,
  position: Point2,
  threshold: number = 8,
): IntersectionHit | undefined {
  const lines = scene.items.filter((item) => item.kind === "line");
  let closest: IntersectionHit | undefined;
  let closestDistance = Infinity;

  for (let firstIndex = 0; firstIndex < lines.length; firstIndex++) {
    for (let secondIndex = firstIndex + 1; secondIndex < lines.length; secondIndex++) {
      const first = lines[firstIndex];
      const second = lines[secondIndex];
      const intersection = lineLineIntersection([first.from, first.to], [second.from, second.to]);

      if (!intersection) {
        continue;
      }

      const hitDistance = distance(position, intersection);
      if (hitDistance <= threshold && hitDistance < closestDistance) {
        closestDistance = hitDistance;
        closest = {
          kind: "intersection",
          operands: [first.id, second.id],
          position: intersection,
        };
      }
    }
  }

  return closest;
}

function lineLineIntersection(
  first: readonly [Point2, Point2],
  second: readonly [Point2, Point2],
): Point2 | undefined {
  const [a, b] = first;
  const [c, d] = second;
  const ab = {
    x: b.x - a.x,
    y: b.y - a.y,
  };
  const cd = {
    x: d.x - c.x,
    y: d.y - c.y,
  };
  const denominator = cross(ab, cd);

  if (denominator === 0) {
    return undefined;
  }

  const ac = {
    x: c.x - a.x,
    y: c.y - a.y,
  };
  const t = cross(ac, cd) / denominator;

  return {
    x: a.x + t * ab.x,
    y: a.y + t * ab.y,
  };
}

function cross(a: Point2, b: Point2): number {
  return a.x * b.y - a.y * b.x;
}
