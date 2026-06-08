import { toScenePoint, type ScenePoint } from "@euclid/geometry";
import type { RenderGridLine, RenderItem, RenderLabel, RenderScene } from "./scene";

type PointItem = Extract<RenderItem, { kind: "point" }>;
type LineItem = Extract<RenderItem, { kind: "line" }>;
type CircleItem = Extract<RenderItem, { kind: "circle" }>;

export function scenePoint(x: number, y: number): ScenePoint {
  return toScenePoint({ x, y });
}

export function renderScene({
  size = { width: 100, height: 100 },
  grid = [],
  items = [],
}: Partial<RenderScene> = {}): RenderScene {
  return {
    size,
    grid,
    items,
  };
}

export function gridLine(id: string, from: ScenePoint, to: ScenePoint): RenderGridLine {
  return {
    id,
    from,
    to,
  };
}

export function pointItem({
  id,
  x,
  y,
  text = id,
  labelAnchor = scenePoint(x + 10, y - 10),
  labelBounds,
  pointRole,
}: Readonly<{
  id: string;
  x: number;
  y: number;
  text?: string;
  labelAnchor?: ScenePoint;
  labelBounds?: RenderLabel["bounds"];
  pointRole?: PointItem["pointRole"];
}>): PointItem {
  return {
    id,
    kind: "point",
    ...(pointRole === undefined ? {} : { pointRole }),
    mark: scenePoint(x, y),
    label: {
      text,
      anchor: labelAnchor,
      ...(labelBounds === undefined ? {} : { bounds: labelBounds }),
    },
  };
}

export function lineItem({
  id,
  from,
  to,
  supportLine = [from, to],
}: Readonly<{
  id: string;
  from: ScenePoint;
  to: ScenePoint;
  supportLine?: readonly [ScenePoint, ScenePoint];
}>): LineItem {
  return {
    id,
    kind: "line",
    from,
    to,
    supportLine,
  };
}

export function circleItem({
  id,
  center,
  radius,
}: Readonly<{
  id: string;
  center: ScenePoint;
  radius: number;
}>): CircleItem {
  return {
    id,
    kind: "circle",
    center,
    radius,
  };
}
