import { THEME, type RenderScene } from "@euclid/rendering";
import type { ConstructionId, ScenePoint } from "@euclid/geometry";

export type DraftPreview =
  | Readonly<{
      kind: "line" | "circle";
      anchorId: ConstructionId;
    }>
  | Readonly<{
      kind: "parallel";
      lineId: ConstructionId;
    }>;

export type PreviewPoint = Readonly<{
  x: number;
  y: number;
  isSnapped: boolean;
}>;

type StrokePreviewStyle = Readonly<{
  stroke: string;
  lineWidth: number;
  opacity: number;
}>;

type PointPreviewStyle = Readonly<{
  fill: string;
  stroke: string;
  radius: number;
  lineWidth: number;
  opacity: number;
}>;

export type WorkspacePreview =
  | Readonly<{
      kind: "line";
      from: ScenePoint;
      to: ScenePoint;
      style: StrokePreviewStyle;
    }>
  | Readonly<{
      kind: "circle";
      center: ScenePoint;
      radius: number;
      style: StrokePreviewStyle;
    }>
  | Readonly<{
      kind: "point";
      center: ScenePoint;
      style: PointPreviewStyle;
    }>;

export type WorkspacePreviewCanvasContext = {
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean,
  ): void;
  stroke(): void;
  fill(): void;
  save(): void;
  restore(): void;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  fillStyle: string | CanvasGradient | CanvasPattern;
  globalAlpha: number;
  lineWidth: number;
};

export function previewsForWorkspace({
  scene,
  pointerCoords,
  draftPreview,
  previewPoint,
  sizeScale,
}: Readonly<{
  scene: RenderScene;
  pointerCoords: ScenePoint | undefined;
  draftPreview: DraftPreview | undefined;
  previewPoint: PreviewPoint | undefined;
  sizeScale: number;
}>): readonly WorkspacePreview[] {
  const previews: WorkspacePreview[] = [];

  if (pointerCoords && draftPreview) {
    if (draftPreview.kind === "parallel") {
      const lineItem = scene.items.find((item) => item.id === draftPreview.lineId && item.kind === "line");
      if (lineItem?.kind === "line") {
        const [a, b] = lineItem.supportLine;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        if (len > 1e-9) {
          const ux = dx / len;
          const uy = dy / len;
          const halfLength = 5000;
          const from = {
            x: pointerCoords.x - ux * halfLength,
            y: pointerCoords.y - uy * halfLength,
          } as ScenePoint;
          const to = {
            x: pointerCoords.x + ux * halfLength,
            y: pointerCoords.y + uy * halfLength,
          } as ScenePoint;
          previews.push({
            kind: "line",
            from,
            to,
            style: THEME.preview.draftLine,
          });
        }
      }
    } else {
      const anchorItem = scene.items.find(
        (item) => item.id === draftPreview.anchorId && item.kind === "point",
      );

      if (anchorItem?.kind === "point") {
        if (draftPreview.kind === "line") {
          previews.push({
            kind: "line",
            from: anchorItem.mark,
            to: pointerCoords,
            style: THEME.preview.draftLine,
          });
        } else {
          const dx = pointerCoords.x - anchorItem.mark.x;
          const dy = pointerCoords.y - anchorItem.mark.y;

          previews.push({
            kind: "circle",
            center: anchorItem.mark,
            radius: Math.hypot(dx, dy),
            style: THEME.preview.draftCircle,
          });
        }
      }
    }
  }

  if (previewPoint) {
    const style = previewPoint.isSnapped ? THEME.preview.snappedPoint : THEME.preview.freePoint;

    previews.push({
      kind: "point",
      center: { x: previewPoint.x, y: previewPoint.y } as ScenePoint,
      style: {
        ...style,
        radius: style.radius * sizeScale,
        lineWidth: style.lineWidth * sizeScale,
      },
    });
  }

  return previews;
}

export function drawWorkspacePreviewsToCanvas(
  ctx: WorkspacePreviewCanvasContext,
  previews: readonly WorkspacePreview[],
): void {
  for (const preview of previews) {
    ctx.save();
    ctx.globalAlpha = preview.style.opacity;

    if (preview.kind === "line") {
      ctx.beginPath();
      ctx.moveTo(preview.from.x, preview.from.y);
      ctx.lineTo(preview.to.x, preview.to.y);
      ctx.strokeStyle = preview.style.stroke;
      ctx.lineWidth = preview.style.lineWidth;
      ctx.stroke();
    } else if (preview.kind === "circle") {
      ctx.beginPath();
      ctx.arc(preview.center.x, preview.center.y, preview.radius, 0, 2 * Math.PI);
      ctx.strokeStyle = preview.style.stroke;
      ctx.lineWidth = preview.style.lineWidth;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(preview.center.x, preview.center.y, preview.style.radius, 0, 2 * Math.PI);
      ctx.fillStyle = preview.style.fill;
      ctx.strokeStyle = preview.style.stroke;
      ctx.lineWidth = preview.style.lineWidth;
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}
