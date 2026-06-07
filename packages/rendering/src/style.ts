import type { RenderItem } from "./scene";
import { THEME } from "./theme";

export type ResolvedItemStyle =
  | Readonly<{
      kind: "point";
      fill: string;
      stroke: string;
      lineWidth: number;
      radius: number;
      font: string;
      textStroke: string;
      textStrokeWidth: number;
      textFill: string;
    }>
  | Readonly<{
      kind: "shape"; // line or circle
      stroke: string;
      lineWidth: number;
    }>;

export type StyleOptions = Readonly<{
  selectedId?: string;
  selectedIds?: ReadonlySet<string>;
  hoveredId?: string;
  sizeScale?: number;
}>;

export function resolveItemStyle(item: RenderItem, options: StyleOptions = {}): ResolvedItemStyle {
  const { selectedId, selectedIds, hoveredId, sizeScale = 1.0 } = options;

  const isSelected = selectedIds ? selectedIds.has(item.id) : item.id === selectedId;
  const isHovered = item.id === hoveredId;
  const isActive = isSelected || isHovered;

  if (item.kind === "point") {
    let fill: string = THEME.colors.pointFill;
    let stroke: string = THEME.colors.pointStroke;
    let lineWidth = 2.5 * sizeScale;

    if (isActive) {
      fill = THEME.colors.pointActiveFill;
      stroke = THEME.colors.pointActiveStroke;
      lineWidth = 3 * sizeScale;
    } else if (item.pointRole === "constructed") {
      fill = THEME.colors.constructedPointFill;
      stroke = THEME.colors.constructedPointStroke;
      lineWidth = 3 * sizeScale;
    }

    const radius = 5 * sizeScale;
    const fontSize = THEME.typography.fontSize * sizeScale;
    const font = `${THEME.typography.fontWeight} ${fontSize}px ${THEME.typography.fontFamily}`;
    const textStroke = THEME.colors.textStroke;
    const textStrokeWidth = THEME.typography.textStrokeWidth * sizeScale;
    const textFill = THEME.colors.textFill;

    return {
      kind: "point",
      fill,
      stroke,
      lineWidth,
      radius,
      font,
      textStroke,
      textStrokeWidth,
      textFill,
    };
  }

  if (item.kind === "line") {
    const stroke = isActive ? THEME.colors.lineActive : THEME.colors.line;
    const lineWidth = isActive ? 4 : 2.5;
    return {
      kind: "shape",
      stroke,
      lineWidth,
    };
  }

  if (item.kind === "circle") {
    const stroke = isActive ? THEME.colors.circleActive : THEME.colors.circle;
    const lineWidth = isActive ? 4 : 2.5;
    return {
      kind: "shape",
      stroke,
      lineWidth,
    };
  }

  throw new Error(`Unsupported item kind: ${(item as { kind: string }).kind}`);
}
