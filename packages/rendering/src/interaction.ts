import {
  lineLineIntersection,
  lineCircleIntersections,
  circleCircleIntersections,
  type ConstructionId,
  type Point2,
  type ScenePoint,
  toScenePoint,
} from "@euclid/geometry";
import type { RenderItem, RenderScene } from "./scene";

export type IntersectionHit =
  | Readonly<{
      kind: "line-line-intersection";
      lines: readonly [ConstructionId, ConstructionId];
      position: ScenePoint;
    }>
  | Readonly<{
      kind: "line-circle-intersection";
      line: ConstructionId;
      circle: ConstructionId;
      position: ScenePoint;
      intersectionIndex: 0 | 1;
    }>
  | Readonly<{
      kind: "circle-circle-intersection";
      firstCircle: ConstructionId;
      secondCircle: ConstructionId;
      position: ScenePoint;
      intersectionIndex: 0 | 1;
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

export type SnapTarget =
  | Readonly<{
      kind: "point";
      item: RenderItem & { kind: "point" };
      position: ScenePoint;
      distance: number;
    }>
  | Readonly<{
      kind: "intersection";
      hit: IntersectionHit;
      position: ScenePoint;
      distance: number;
    }>
  | Readonly<{
      kind: "line";
      item: RenderItem & { kind: "line" };
      distance: number;
    }>
  | Readonly<{
      kind: "circle";
      item: RenderItem & { kind: "circle" };
      distance: number;
    }>;

export function findSnapTargets(
  scene: RenderScene,
  position: ScenePoint,
  threshold: number = 8,
): readonly SnapTarget[] {
  const targets: SnapTarget[] = [];

  // 1. Find point targets
  for (const item of scene.items) {
    if (item.kind === "point") {
      const dist = distanceToPointItem(position, item);
      if (dist <= threshold) {
        targets.push({
          kind: "point",
          item,
          position: item.mark,
          distance: dist,
        });
      }
    }
  }

  // 2. Find intersection targets
  const curves = scene.items.filter((item) => item.kind === "line" || item.kind === "circle");
  for (let i = 0; i < curves.length; i++) {
    for (let j = i + 1; j < curves.length; j++) {
      const first = curves[i];
      const second = curves[j];

      const pts = getIntersections(first, second);
      for (const pt of pts) {
        const dist = distance(position, pt.position);
        if (dist <= threshold) {
          targets.push({
            kind: "intersection",
            hit: intersectionHitFor(first, second, pt),
            position: pt.position,
            distance: dist,
          });
        }
      }
    }
  }

  // 3. Find line and circle targets
  for (const item of scene.items) {
    if (item.kind === "line") {
      const dist = distanceToSegment(position, item.from, item.to);
      if (dist <= threshold) {
        targets.push({
          kind: "line",
          item,
          distance: dist,
        });
      }
    } else if (item.kind === "circle") {
      const distToCenter = distance(position, item.center);
      const dist = Math.abs(distToCenter - item.radius);
      if (dist <= threshold) {
        targets.push({
          kind: "circle",
          item,
          distance: dist,
        });
      }
    }
  }

  // Sort targets by distance ascending
  targets.sort((a, b) => a.distance - b.distance);
  return targets;
}

/**
 * Finds the render item at the given screen position within a threshold.
 * Prioritizes points over other shapes (lines, circles) to make selecting points easier
 * when they lie on lines/circles.
 */
export function findItemAtPosition(
  scene: RenderScene,
  position: ScenePoint,
  threshold: number = 8,
): RenderItem | undefined {
  const targets = findSnapTargets(scene, position, threshold);
  const pointTarget = targets.find((t): t is SnapTarget & { kind: "point" } => t.kind === "point");
  if (pointTarget) {
    return pointTarget.item;
  }
  const shapeTarget = targets.find(
    (t): t is SnapTarget & { kind: "line" | "circle" } => t.kind === "line" || t.kind === "circle",
  );
  if (shapeTarget) {
    return shapeTarget.item;
  }
  return undefined;
}

function distanceToPointItem(position: ScenePoint, item: RenderItem & { kind: "point" }): number {
  if (isInsideExpandedLabelBounds(position, item, 2)) {
    return 0;
  }

  return distance(position, item.mark);
}

function isInsideExpandedLabelBounds(
  position: ScenePoint,
  item: RenderItem & { kind: "point" },
  padding: number,
): boolean {
  const bounds = item.label.bounds;
  if (!bounds) {
    return false;
  }

  return (
    position.x >= bounds.x - padding &&
    position.x <= bounds.x + bounds.width + padding &&
    position.y >= bounds.y - padding &&
    position.y <= bounds.y + bounds.height + padding
  );
}

function getIntersections(
  first: RenderItem,
  second: RenderItem,
): readonly { position: ScenePoint; index?: 0 | 1 }[] {
  if (first.kind === "line" && second.kind === "line") {
    const pt = lineLineIntersection([first.from, first.to], [second.from, second.to]);
    return pt ? [{ position: toScenePoint(pt) }] : [];
  }
  if (first.kind === "line" && second.kind === "circle") {
    return lineCircleIntersections(first.supportLine, second.center, second.radius).map((pt, idx) => ({
      position: toScenePoint(pt),
      index: idx as 0 | 1,
    }));
  }
  if (first.kind === "circle" && second.kind === "line") {
    return lineCircleIntersections(second.supportLine, first.center, first.radius).map((pt, idx) => ({
      position: toScenePoint(pt),
      index: idx as 0 | 1,
    }));
  }
  if (first.kind === "circle" && second.kind === "circle") {
    const [c1, c2] = first.id < second.id ? [first, second] : [second, first];
    return circleCircleIntersections(c1.center, c1.radius, c2.center, c2.radius).map((pt, idx) => ({
      position: toScenePoint(pt),
      // Invert the index because screen space coordinates have a flipped Y-axis relative to world space
      index: (idx === 0 ? 1 : 0) as 0 | 1,
    }));
  }
  return [];
}

export function findIntersectionAtPosition(
  scene: RenderScene,
  position: ScenePoint,
  threshold: number = 8,
): IntersectionHit | undefined {
  const targets = findSnapTargets(scene, position, threshold);
  const intersectionTarget = targets.find(
    (t): t is SnapTarget & { kind: "intersection" } => t.kind === "intersection",
  );
  return intersectionTarget ? intersectionTarget.hit : undefined;
}

function intersectionHitFor(
  first: RenderItem,
  second: RenderItem,
  intersection: { position: ScenePoint; index?: 0 | 1 },
): IntersectionHit {
  if (first.kind === "line" && second.kind === "line") {
    return {
      kind: "line-line-intersection",
      lines: [first.id, second.id],
      position: intersection.position,
    };
  }

  if (first.kind === "line" && second.kind === "circle") {
    return {
      kind: "line-circle-intersection",
      line: first.id,
      circle: second.id,
      position: intersection.position,
      intersectionIndex: intersection.index ?? 0,
    };
  }

  if (first.kind === "circle" && second.kind === "line") {
    return {
      kind: "line-circle-intersection",
      line: second.id,
      circle: first.id,
      position: intersection.position,
      intersectionIndex: intersection.index ?? 0,
    };
  }

  if (first.kind === "circle" && second.kind === "circle") {
    const [firstCircle, secondCircle] = first.id < second.id ? [first.id, second.id] : [second.id, first.id];
    return {
      kind: "circle-circle-intersection",
      firstCircle,
      secondCircle,
      position: intersection.position,
      intersectionIndex: intersection.index ?? 0,
    };
  }

  throw new Error("Unsupported intersection operands.");
}
