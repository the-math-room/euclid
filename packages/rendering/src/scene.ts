import {
  formatMeasurementExpression,
  type Evaluation,
  type MeasurementEvaluation,
  type Point2,
  type ScenePoint,
  type ShapeRole,
  toScenePoint,
  toWorldPoint,
} from "@euclid/geometry";
import { layoutPointLabels, type LabelCandidateName, type Rect } from "./labelLayout";
import { THEME } from "./theme";
import { SCENE_GEOMETRY_EPSILON } from "./tolerance";
import { fitCameraFor, projectPoint, type ScreenView, type ViewportSize, worldFrameFor } from "./viewport";

export type RenderScene = Readonly<{
  size: ViewportSize;
  grid: readonly RenderGridLine[];
  items: readonly RenderItem[];
}>;

export type RenderGridLine = Readonly<{
  id: string;
  from: ScenePoint;
  to: ScenePoint;
}>;

export type RenderItem =
  | Readonly<{
      id: string;
      kind: "point";
      pointRole?: "free" | "constructed";
      mark: ScenePoint;
      label: RenderLabel;
    }>
  | Readonly<{
      id: string;
      kind: "line";
      shapeRole?: ShapeRole;
      from: ScenePoint;
      to: ScenePoint;
      supportLine: readonly [ScenePoint, ScenePoint];
    }>
  | Readonly<{
      id: string;
      kind: "circle";
      shapeRole?: ShapeRole;
      center: ScenePoint;
      radius: number;
    }>
  | Readonly<{
      id: string;
      kind: "measurement-label";
      text: string;
      anchor: ScenePoint;
      status: "satisfied" | "unresolved" | "invalid" | "mismatch";
    }>;

export type RenderLabel = Readonly<{
  text: string;
  anchor: ScenePoint;
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

export function sceneForEvaluation(
  evaluation: Evaluation,
  view: ScreenView,
  options?: {
    fontSize?: number;
    isTransitioning?: boolean;
    measurementEvaluation?: MeasurementEvaluation;
  },
): RenderScene {
  const frame = worldFrameFor(view);
  const fontSize = options?.fontSize ?? THEME.typography.fontSize;

  const circles: RenderItem[] = [];
  const lines: RenderItem[] = [];
  const measurementLabels: RenderItem[] = [];
  const pointTargets: {
    id: string;
    pointRole: "free" | "constructed";
    text: string;
    mark: ScenePoint;
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
        shapeRole: primitive.shapeRole,
        from,
        to,
        supportLine: [a, b],
      });
    } else if (primitive.kind === "circle") {
      const center = projectPoint(frame, primitive.center);
      const edge = projectPoint(frame, primitive.pointOnCircle);
      circles.push({
        id: primitive.id,
        kind: "circle",
        shapeRole: primitive.shapeRole,
        center,
        radius: distance(center, edge),
      });
    }
  }

  for (const segment of options?.measurementEvaluation?.segments ?? []) {
    const from = projectPoint(frame, segment.from);
    const to = projectPoint(frame, segment.to);
    measurementLabels.push({
      id: segment.assertion.id,
      kind: "measurement-label",
      text: formatMeasurementExpression(segment.assertion.length),
      anchor: segmentLabelAnchor(from, to, fontSize),
      status: segment.status,
    });
  }

  const pointObstacles: RenderItem[] = pointTargets.map((target) => ({
    id: target.id,
    kind: "point",
    pointRole: target.pointRole,
    mark: target.mark,
    label: fallbackLabelFor(target.text, target.mark, fontSize),
  }));
  const labelPlacements = layoutPointLabels(
    pointTargets,
    [...circles, ...lines, ...pointObstacles],
    fontSize,
    options?.isTransitioning ?? false,
  );
  const points: RenderItem[] = pointTargets.map((target) => ({
    id: target.id,
    kind: "point",
    pointRole: target.pointRole,
    mark: target.mark,
    label: labelPlacements.get(target.id) ?? fallbackLabelFor(target.text, target.mark, fontSize),
  }));

  return {
    size: view.viewport.size,
    grid: gridLinesForFrame(frame),
    items: [...circles, ...lines, ...measurementLabels, ...points],
  };
}

function segmentLabelAnchor(from: ScenePoint, to: ScenePoint, fontSize: number): ScenePoint {
  const midpoint = {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2,
  };
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length <= SCENE_GEOMETRY_EPSILON) {
    return toScenePoint({
      x: midpoint.x,
      y: midpoint.y - fontSize,
    });
  }

  const offset = fontSize * 0.85;
  return toScenePoint({
    x: midpoint.x + (-dy / length) * offset,
    y: midpoint.y + (dx / length) * offset,
  });
}

function fallbackLabelFor(text: string, mark: ScenePoint, fontSize: number): RenderLabel {
  const scale = fontSize / THEME.typography.fontSize;
  return {
    text,
    anchor: toScenePoint({
      x: mark.x + 10 * scale,
      y: mark.y - 10 * scale,
    }),
    bounds: {
      x: mark.x + 10 * scale,
      y: mark.y - 28 * scale,
      width: 1,
      height: 18 * scale,
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
    from: projectPoint(frame, toWorldPoint({ x, y: minY })),
    to: projectPoint(frame, toWorldPoint({ x, y: maxY })),
  }));
  const horizontals = rangeInclusive(minY, maxY, step).map((y) => ({
    id: `y-${y}`,
    from: projectPoint(frame, toWorldPoint({ x: minX, y })),
    to: projectPoint(frame, toWorldPoint({ x: maxX, y })),
  }));

  return [...verticals, ...horizontals];
}

function rangeInclusive(min: number, max: number, step: number): readonly number[] {
  const count = Math.floor((max - min) / step) + 1;
  return Array.from({ length: count }, (_, index) => min + index * step);
}

function extendLineToViewport(
  a: ScenePoint,
  b: ScenePoint,
  size: ViewportSize,
): readonly [ScenePoint, ScenePoint] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const intersections: ScenePoint[] = [];

  // Extend lines significantly beyond the viewport to prevent them from cutting off
  // on wider/taller screens, dynamic window sizing, or rotated/zoomed coordinates.
  const margin = Math.max(size.width, size.height) * 10;
  const minX = -margin;
  const maxX = size.width + margin;
  const minY = -margin;
  const maxY = size.height + margin;

  if (dx !== 0) {
    addIntersection(
      intersections,
      toScenePoint({ x: minX, y: a.y + ((minX - a.x) / dx) * dy }),
      minX,
      maxX,
      minY,
      maxY,
    );
    addIntersection(
      intersections,
      toScenePoint({ x: maxX, y: a.y + ((maxX - a.x) / dx) * dy }),
      minX,
      maxX,
      minY,
      maxY,
    );
  }

  if (dy !== 0) {
    addIntersection(
      intersections,
      toScenePoint({ x: a.x + ((minY - a.y) / dy) * dx, y: minY }),
      minX,
      maxX,
      minY,
      maxY,
    );
    addIntersection(
      intersections,
      toScenePoint({ x: a.x + ((maxY - a.y) / dy) * dx, y: maxY }),
      minX,
      maxX,
      minY,
      maxY,
    );
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
  if (
    point.x < minX - SCENE_GEOMETRY_EPSILON ||
    point.x > maxX + SCENE_GEOMETRY_EPSILON ||
    point.y < minY - SCENE_GEOMETRY_EPSILON ||
    point.y > maxY + SCENE_GEOMETRY_EPSILON
  ) {
    return;
  }

  const clamped = {
    x: clamp(point.x, minX, maxX),
    y: clamp(point.y, minY, maxY),
  };

  if (points.some((existing) => distance(existing, clamped) < SCENE_GEOMETRY_EPSILON)) {
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
