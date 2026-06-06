import type { RenderScene } from "./scene";
import { THEME } from "./theme";

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
  // Properties
  strokeStyle: string | CanvasGradient | CanvasPattern;
  fillStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
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
}>;

/**
 * Draws a RenderScene onto a canvas context (browser or headless).
 */
export function drawSceneToCanvas(
  ctx: CanvasRenderingContext2DLike,
  scene: RenderScene,
  options: CanvasRendererOptions = {},
): void {
  const { selectedId, selectedIds, hoveredId, drawBackground = true } = options;

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
    const isSelected = selectedIds ? selectedIds.has(item.id) : item.id === selectedId;
    const isHovered = item.id === hoveredId;

    if (item.kind === "line") {
      ctx.strokeStyle = isSelected || isHovered ? THEME.colors.lineActive : THEME.colors.line;
      ctx.lineWidth = isSelected || isHovered ? 4 : 2.5;
      ctx.beginPath();
      ctx.moveTo(item.from.x, item.from.y);
      ctx.lineTo(item.to.x, item.to.y);
      ctx.stroke();
    } else if (item.kind === "circle") {
      ctx.strokeStyle = isSelected || isHovered ? THEME.colors.circleActive : THEME.colors.circle;
      ctx.lineWidth = isSelected || isHovered ? 4 : 2.5;
      ctx.beginPath();
      ctx.arc(item.center.x, item.center.y, item.radius, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (item.kind === "point") {
      // Point circle
      ctx.beginPath();
      ctx.arc(item.mark.x, item.mark.y, 5, 0, 2 * Math.PI);
      if (isSelected || isHovered) {
        ctx.fillStyle = THEME.colors.pointActiveFill;
        ctx.strokeStyle = THEME.colors.pointActiveStroke;
        ctx.lineWidth = 3;
      } else if (item.pointRole === "constructed") {
        ctx.fillStyle = THEME.colors.constructedPointFill;
        ctx.strokeStyle = THEME.colors.constructedPointStroke;
        ctx.lineWidth = 3;
      } else {
        ctx.fillStyle = THEME.colors.pointFill;
        ctx.strokeStyle = THEME.colors.pointStroke;
        ctx.lineWidth = 2.5;
      }
      ctx.fill();
      ctx.stroke();

      // Point label text with white background halo
      ctx.font = `${THEME.typography.fontWeight} ${THEME.typography.fontSize}px ${THEME.typography.fontFamily}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic"; // match standard SVG baseline for identical alignment
      ctx.lineJoin = "round";

      // Text stroke (halo)
      ctx.strokeStyle = THEME.colors.textStroke;
      ctx.lineWidth = THEME.typography.textStrokeWidth;
      ctx.strokeText(item.label.text, item.label.anchor.x, item.label.anchor.y);

      // Text fill
      ctx.fillStyle = THEME.colors.textFill;
      ctx.fillText(item.label.text, item.label.anchor.x, item.label.anchor.y);
    }
  }

  ctx.restore();
}
