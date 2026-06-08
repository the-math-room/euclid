const colors = {
  background: "#fbfaf6",
  grid: "#e2ddd3",
  textFill: "#172026",
  textStroke: "#fbfaf6",
  pointFill: "#172026",
  pointStroke: "#e3c057",
  constructedPointFill: "#fbfaf6",
  constructedPointStroke: "#246a73",
  pointActiveFill: "#e3c057",
  pointActiveStroke: "#172026",
  line: "#246a73",
  lineActive: "#e3c057",
  circle: "#ba4a3a",
  circleActive: "#e3c057",
  measurementLabel: "#6f4b14",
  measurementLabelStroke: "#fbfaf6",
  measurementMismatch: "#b42318",
  measurementUnresolved: "#6b7280",
} as const;

export const THEME = {
  colors,
  preview: {
    draftLine: {
      stroke: colors.line,
      lineWidth: 2.5,
      opacity: 0.55,
    },
    draftCircle: {
      stroke: colors.circle,
      lineWidth: 2.5,
      opacity: 0.55,
    },
    freePoint: {
      fill: colors.pointFill,
      stroke: colors.pointStroke,
      radius: 5,
      lineWidth: 2.5,
      opacity: 0.5,
    },
    snappedPoint: {
      fill: colors.circle,
      stroke: colors.pointStroke,
      radius: 5,
      lineWidth: 2.5,
      opacity: 0.8,
    },
  },
  shapeRoles: {
    auxiliary: {
      opacity: 0.38,
      lineDash: [9, 7],
    },
  },
  typography: {
    fontSize: 18,
    fontWeight: 700,
    fontFamily: "Inter, sans-serif",
    textStrokeWidth: 5,
  },
} as const;

export const SVG_THEME_STYLES = `
  svg.workspace-svg { background-color: ${THEME.colors.background}; user-select: none; -webkit-user-select: none; }
  svg.workspace-svg .grid line { stroke: ${THEME.colors.grid}; stroke-width: 1; pointer-events: none; }
  svg.workspace-svg .primitive { cursor: pointer; outline: none; }
  svg.workspace-svg .primitive.line { stroke: ${THEME.colors.line}; stroke-width: 2.5; fill: none; pointer-events: stroke; }
  svg.workspace-svg .primitive.circle { fill: none; stroke: ${THEME.colors.circle}; stroke-width: 2.5; pointer-events: stroke; }
  svg.workspace-svg .primitive.auxiliary { opacity: ${THEME.shapeRoles.auxiliary.opacity}; stroke-dasharray: ${THEME.shapeRoles.auxiliary.lineDash.join(" ")}; }
  svg.workspace-svg .primitive.auxiliary.selected, svg.workspace-svg .primitive.auxiliary:focus-visible { opacity: 1; }
  svg.workspace-svg .primitive.point circle { fill: ${THEME.colors.pointFill}; stroke: ${THEME.colors.pointStroke}; stroke-width: calc(2.5px * var(--size-scale, 1)); }
  svg.workspace-svg .primitive.point.constructed circle { fill: ${THEME.colors.constructedPointFill}; stroke: ${THEME.colors.constructedPointStroke}; stroke-width: calc(3px * var(--size-scale, 1)); }
  svg.workspace-svg .primitive.point text { fill: ${THEME.colors.textFill}; font-size: calc(${THEME.typography.fontSize}px * var(--size-scale, 1)); font-weight: ${THEME.typography.fontWeight}; font-family: ${THEME.typography.fontFamily}; paint-order: stroke; stroke: ${THEME.colors.textStroke}; stroke-width: calc(${THEME.typography.textStrokeWidth}px * var(--size-scale, 1)); pointer-events: none; }
  svg.workspace-svg .measurement-label { pointer-events: none; }
  svg.workspace-svg .measurement-label text { fill: ${THEME.colors.measurementLabel}; font-size: calc(15px * var(--size-scale, 1)); font-weight: 760; font-family: ${THEME.typography.fontFamily}; paint-order: stroke; stroke: ${THEME.colors.measurementLabelStroke}; stroke-width: calc(4px * var(--size-scale, 1)); }
  svg.workspace-svg .measurement-label.mismatch text, svg.workspace-svg .measurement-label.invalid text { fill: ${THEME.colors.measurementMismatch}; }
  svg.workspace-svg .measurement-label.unresolved text { fill: ${THEME.colors.measurementUnresolved}; }
  svg.workspace-svg .primitive.selected.line, svg.workspace-svg .primitive.line:focus-visible { stroke: ${THEME.colors.lineActive}; stroke-width: 4; }
  svg.workspace-svg .primitive.selected.circle, svg.workspace-svg .primitive.circle:focus-visible { stroke: ${THEME.colors.circleActive}; stroke-width: 4; }
  svg.workspace-svg .primitive.selected.point circle, svg.workspace-svg .primitive.point:focus-visible circle { fill: ${THEME.colors.pointActiveFill}; stroke: ${THEME.colors.pointActiveStroke}; stroke-width: calc(3px * var(--size-scale, 1)); }
`;
