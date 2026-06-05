import type { Evaluation, Point2 } from "@euclid/geometry";
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

  return {
    size: view.viewport.size,
    grid: gridLinesForFrame(frame),
    items: evaluation.primitives.map((primitive) => {
      if (primitive.kind === "point") {
        const mark = projectPoint(frame, primitive.position);

        return {
          id: primitive.id,
          kind: "point",
          mark,
          label: {
            text: primitive.label,
            anchor: {
              x: mark.x + 10,
              y: mark.y - 10,
            },
          },
        };
      }

      if (primitive.kind === "line") {
        const a = projectPoint(frame, primitive.through[0]);
        const b = projectPoint(frame, primitive.through[1]);
        const [from, to] = extendLineToViewport(a, b, view.viewport.size);

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
