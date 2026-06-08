import type { RenderScene } from "./scene";
import { THEME } from "./theme";
import { resolveItemStyle } from "./style";

export type CanvasRenderingContext2DLike = {
  clearRect(x: number, y: number, w: number, h: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
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
  strokeText(text: string, x: number, y: number): void;
  fillText(text: string, x: number, y: number): void;
  save(): void;
  restore(): void;
  setLineDash?(segments: readonly number[]): void;
  // Properties
  strokeStyle: string | CanvasGradient | CanvasPattern;
  fillStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  globalAlpha?: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  lineJoin: CanvasLineJoin;
};

export type CanvasRendererOptions = Readonly<{
  selectedId?: string;
  selectedIds?: ReadonlySet<string>;
  hoveredId?: string;
  drawBackground?: boolean;
  sizeScale?: number;
}>;

/**
 * Draws a RenderScene onto a canvas context (browser or headless).
 */
export function drawSceneToCanvas(
  ctx: CanvasRenderingContext2DLike,
  scene: RenderScene,
  options: CanvasRendererOptions = {},
): void {
  const { selectedId, selectedIds, hoveredId, drawBackground = true, sizeScale = 1.0 } = options;

  ctx.save();

  // 1. Draw background
  if (drawBackground) {
    ctx.fillStyle = THEME.colors.background;
    ctx.fillRect(0, 0, scene.size.width, scene.size.height);
  } else {
    ctx.clearRect(0, 0, scene.size.width, scene.size.height);
  }

  // 2. Draw grid
  ctx.strokeStyle = THEME.colors.grid;
  ctx.lineWidth = 1;
  for (const line of scene.grid) {
    ctx.beginPath();
    ctx.moveTo(line.from.x, line.from.y);
    ctx.lineTo(line.to.x, line.to.y);
    ctx.stroke();
  }

  // 3. Draw items in pre-sorted order (circles -> lines -> points)
  for (const item of scene.items) {
    if (item.kind === "measurement-label") {
      ctx.font = `760 ${15 * sizeScale}px ${THEME.typography.fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.strokeStyle = THEME.colors.measurementLabelStroke;
      ctx.lineWidth = 4 * sizeScale;
      ctx.strokeText(item.text, item.anchor.x, item.anchor.y);
      ctx.fillStyle = measurementLabelFill(item.status);
      ctx.fillText(item.text, item.anchor.x, item.anchor.y);
      continue;
    }

    const style = resolveItemStyle(item, { selectedId, selectedIds, hoveredId, sizeScale });

    if (style.kind === "shape") {
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = style.lineWidth;
      const previousAlpha = ctx.globalAlpha;
      if (previousAlpha !== undefined) {
        ctx.globalAlpha = style.opacity;
      }
      ctx.setLineDash?.(style.lineDash);

      ctx.beginPath();
      if (item.kind === "line") {
        ctx.moveTo(item.from.x, item.from.y);
        ctx.lineTo(item.to.x, item.to.y);
      } else if (item.kind === "circle") {
        ctx.arc(item.center.x, item.center.y, item.radius, 0, 2 * Math.PI);
      }
      ctx.stroke();
      ctx.setLineDash?.([]);
      if (previousAlpha !== undefined) {
        ctx.globalAlpha = previousAlpha;
      }
    } else if (style.kind === "point" && item.kind === "point") {
      // Point circle
      ctx.beginPath();
      ctx.arc(item.mark.x, item.mark.y, style.radius, 0, 2 * Math.PI);
      ctx.fillStyle = style.fill;
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = style.lineWidth;
      ctx.fill();
      ctx.stroke();

      // Point label text with white background halo
      ctx.font = style.font;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic"; // match standard SVG baseline for identical alignment
      ctx.lineJoin = "round";

      // Text stroke (halo)
      ctx.strokeStyle = style.textStroke;
      ctx.lineWidth = style.textStrokeWidth;
      ctx.strokeText(item.label.text, item.label.anchor.x, item.label.anchor.y);

      // Text fill
      ctx.fillStyle = style.textFill;
      ctx.fillText(item.label.text, item.label.anchor.x, item.label.anchor.y);
    }
  }

  ctx.restore();
}

function measurementLabelFill(status: "satisfied" | "unresolved" | "invalid" | "mismatch"): string {
  if (status === "mismatch" || status === "invalid") {
    return THEME.colors.measurementMismatch;
  }
  if (status === "unresolved") {
    return THEME.colors.measurementUnresolved;
  }
  return THEME.colors.measurementLabel;
}
