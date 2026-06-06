import type { Evaluation, Point2 } from "@euclid/geometry";
import { layoutPointLabels, type LabelCandidateName, type Rect } from "./labelLayout";
import { fitCameraFor, projectPoint, type ScreenView, type ViewportSize, worldFrameFor } from "./viewport";

export type RenderScene = Readonly<{
  size: ViewportSize;
  grid: readonly RenderGridLine[];
  items: readonly RenderItem[];
}>;

export type RenderGridLine = Readonly<{
  id: string;
  from: Point2;
  to: Point2;
}>;

export type RenderItem =
  | Readonly<{
      id: string;
      kind: "point";
      pointRole?: "free" | "constructed";
      mark: Point2;
      label: RenderLabel;
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

export type RenderLabel = Readonly<{
  text: string;
  anchor: Point2;
  bounds?: Rect;
  candidate?: LabelCandidateName;
  score?: number;
}>;

export function defaultScreenViewFor(evaluation: Evaluation, size: ViewportSize): ScreenView {
  const viewport = { size };

  return {
    viewport,
    camera: fitCameraFor(evaluation.primitives, viewport),
  };
}

export function sceneForEvaluation(evaluation: Evaluation, view: ScreenView): RenderScene {
  const frame = worldFrameFor(view);

  const circles: RenderItem[] = [];
  const lines: RenderItem[] = [];
  const pointTargets: {
    id: string;
    pointRole: "free" | "constructed";
    text: string;
    mark: Point2;
  }[] = [];
  const freePointIds = new Set(
    evaluation.meanings
      .filter((meaning) => meaning.expression.kind === "free-point")
      .map((meaning) => meaning.id),
  );

  for (const primitive of evaluation.primitives) {
    if (primitive.kind === "point") {
      pointTargets.push({
        id: primitive.id,
        pointRole: freePointIds.has(primitive.id) ? "free" : "constructed",
        text: primitive.label,
        mark: projectPoint(frame, primitive.position),
      });
    } else if (primitive.kind === "line") {
      const a = projectPoint(frame, primitive.through[0]);
      const b = projectPoint(frame, primitive.through[1]);
      const [from, to] = extendLineToViewport(a, b, view.viewport.size);
      lines.push({
        id: primitive.id,
        kind: "line",
        from,
        to,
      });
    } else if (primitive.kind === "circle") {
      const center = projectPoint(frame, primitive.center);
      const edge = projectPoint(frame, primitive.pointOnCircle);
      circles.push({
        id: primitive.id,
        kind: "circle",
        center,
        radius: distance(center, edge),
      });
    }
  }

  const pointObstacles: RenderItem[] = pointTargets.map((target) => ({
    id: target.id,
    kind: "point",
    pointRole: target.pointRole,
    mark: target.mark,
    label: fallbackLabelFor(target.text, target.mark),
  }));
  const labelPlacements = layoutPointLabels(
    pointTargets,
    [...circles, ...lines, ...pointObstacles],
    view.viewport.size,
  );
  const points: RenderItem[] = pointTargets.map((target) => ({
    id: target.id,
    kind: "point",
    pointRole: target.pointRole,
    mark: target.mark,
    label: labelPlacements.get(target.id) ?? fallbackLabelFor(target.text, target.mark),
  }));

  return {
    size: view.viewport.size,
    grid: gridLinesForFrame(frame),
    items: [...circles, ...lines, ...points],
  };
}

function fallbackLabelFor(text: string, mark: Point2): RenderLabel {
  return {
    text,
    anchor: {
      x: mark.x + 10,
      y: mark.y - 10,
    },
    bounds: {
      x: mark.x + 10,
      y: mark.y - 28,
      width: 1,
      height: 18,
    },
    candidate: "ne",
    score: 0,
  };
}

function gridLinesForFrame(frame: ReturnType<typeof worldFrameFor>): readonly RenderGridLine[] {
  const worldSpan = Math.hypot(frame.viewport.size.width, frame.viewport.size.height) / frame.scale;
  const step = 1;
  const minX = Math.floor((frame.center.x - worldSpan) / step) * step;
  const maxX = Math.ceil((frame.center.x + worldSpan) / step) * step;
  const minY = Math.floor((frame.center.y - worldSpan) / step) * step;
  const maxY = Math.ceil((frame.center.y + worldSpan) / step) * step;
  const verticals = rangeInclusive(minX, maxX, step).map((x) => ({
    id: `x-${x}`,
    from: projectPoint(frame, { x, y: minY }),
    to: projectPoint(frame, { x, y: maxY }),
  }));
  const horizontals = rangeInclusive(minY, maxY, step).map((y) => ({
    id: `y-${y}`,
    from: projectPoint(frame, { x: minX, y }),
    to: projectPoint(frame, { x: maxX, y }),
  }));

  return [...verticals, ...horizontals];
}

function rangeInclusive(min: number, max: number, step: number): readonly number[] {
  const count = Math.floor((max - min) / step) + 1;
  return Array.from({ length: count }, (_, index) => min + index * step);
}

function extendLineToViewport(a: Point2, b: Point2, size: ViewportSize): readonly [Point2, Point2] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const intersections: Point2[] = [];

  // Extend lines significantly beyond the viewport to prevent them from cutting off
  // on wider/taller screens, dynamic window sizing, or rotated/zoomed coordinates.
  const margin = Math.max(size.width, size.height) * 10;
  const minX = -margin;
  const maxX = size.width + margin;
  const minY = -margin;
  const maxY = size.height + margin;

  if (dx !== 0) {
    addIntersection(intersections, { x: minX, y: a.y + ((minX - a.x) / dx) * dy }, minX, maxX, minY, maxY);
    addIntersection(intersections, { x: maxX, y: a.y + ((maxX - a.x) / dx) * dy }, minX, maxX, minY, maxY);
  }

  if (dy !== 0) {
    addIntersection(intersections, { x: a.x + ((minY - a.y) / dy) * dx, y: minY }, minX, maxX, minY, maxY);
    addIntersection(intersections, { x: a.x + ((maxY - a.y) / dy) * dx, y: maxY }, minX, maxX, minY, maxY);
  }

  if (intersections.length >= 2) {
    return [intersections[0], intersections[1]];
  }

  return [a, b];
}

function addIntersection(
  points: Point2[],
  point: Point2,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
): void {
  const epsilon = 1e-9;
  if (
    point.x < minX - epsilon ||
    point.x > maxX + epsilon ||
    point.y < minY - epsilon ||
    point.y > maxY + epsilon
  ) {
    return;
  }

  const clamped = {
    x: clamp(point.x, minX, maxX),
    y: clamp(point.y, minY, maxY),
  };

  if (points.some((existing) => distance(existing, clamped) < epsilon)) {
    return;
  }

  points.push(clamped);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function distance(a: Point2, b: Point2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
