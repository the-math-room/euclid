import {
  lineLineIntersection,
  lineCircleIntersections,
  circleCircleIntersections,
  type Point2,
} from "@euclid/geometry";
import type { RenderItem, RenderScene } from "./scene";

export type IntersectionHit = Readonly<{
  kind: "intersection";
  operands: readonly [string, string];
  position: Point2;
  intersectionIndex?: 0 | 1;
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

function getIntersections(
  first: RenderItem,
  second: RenderItem,
): readonly { position: Point2; index?: 0 | 1 }[] {
  if (first.kind === "line" && second.kind === "line") {
    const pt = lineLineIntersection([first.from, first.to], [second.from, second.to]);
    return pt ? [{ position: pt }] : [];
  }
  if (first.kind === "line" && second.kind === "circle") {
    return lineCircleIntersections(
      first.hitTestLine ?? [first.from, first.to],
      second.center,
      second.radius,
    ).map((pt, idx) => ({
      position: pt,
      index: idx as 0 | 1,
    }));
  }
  if (first.kind === "circle" && second.kind === "line") {
    return lineCircleIntersections(
      second.hitTestLine ?? [second.from, second.to],
      first.center,
      first.radius,
    ).map((pt, idx) => ({
      position: pt,
      index: idx as 0 | 1,
    }));
  }
  if (first.kind === "circle" && second.kind === "circle") {
    const [c1, c2] = first.id < second.id ? [first, second] : [second, first];
    return circleCircleIntersections(c1.center, c1.radius, c2.center, c2.radius).map((pt, idx) => ({
      position: pt,
      // Invert the index because screen space coordinates have a flipped Y-axis relative to world space
      index: (idx === 0 ? 1 : 0) as 0 | 1,
    }));
  }
  return [];
}

export function findIntersectionAtPosition(
  scene: RenderScene,
  position: Point2,
  threshold: number = 8,
): IntersectionHit | undefined {
  const curves = scene.items.filter((item) => item.kind === "line" || item.kind === "circle");
  let closest: IntersectionHit | undefined;
  let closestDistance = Infinity;

  for (let i = 0; i < curves.length; i++) {
    for (let j = i + 1; j < curves.length; j++) {
      const first = curves[i];
      const second = curves[j];

      const pts = getIntersections(first, second);
      for (const pt of pts) {
        const hitDistance = distance(position, pt.position);
        if (hitDistance <= threshold && hitDistance < closestDistance) {
          closestDistance = hitDistance;

          // Standardize operands order:
          // - For line-circle, the line is always first, circle second.
          // - For circle-circle, they are sorted alphabetically by ID.
          // - For line-line, they are in the order found.
          let operands: readonly [string, string];
          if (first.kind === "circle" && second.kind === "line") {
            operands = [second.id, first.id];
          } else if (first.kind === "circle" && second.kind === "circle") {
            operands = first.id < second.id ? [first.id, second.id] : [second.id, first.id];
          } else {
            operands = [first.id, second.id];
          }

          closest = {
            kind: "intersection",
            operands,
            position: pt.position,
            ...(pt.index !== undefined ? { intersectionIndex: pt.index } : {}),
          };
        }
      }
    }
  }

  return closest;
}
