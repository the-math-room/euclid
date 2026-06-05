export const THEME = {
  colors: {
    background: "#fbfaf6",
    grid: "#e2ddd3",
    textFill: "#172026",
    textStroke: "#fbfaf6",
    pointFill: "#172026",
    pointStroke: "#e3c057",
    pointActiveFill: "#e3c057",
    pointActiveStroke: "#172026",
    line: "#246a73",
    lineActive: "#e3c057",
    circle: "#ba4a3a",
    circleActive: "#e3c057",
  },
  typography: {
    fontSize: 18,
    fontWeight: 700,
    fontFamily: "Inter, sans-serif",
    textStrokeWidth: 5,
  },
} as const;

export const SVG_THEME_STYLES = `
  svg.workspace-svg { background-color: ${THEME.colors.background}; }
  svg.workspace-svg .grid line { stroke: ${THEME.colors.grid}; stroke-width: 1; pointer-events: none; }
  svg.workspace-svg .primitive { cursor: pointer; outline: none; }
  svg.workspace-svg .primitive.line { stroke: ${THEME.colors.line}; stroke-width: 2.5; fill: none; pointer-events: stroke; }
  svg.workspace-svg .primitive.circle { fill: none; stroke: ${THEME.colors.circle}; stroke-width: 2.5; pointer-events: stroke; }
  svg.workspace-svg .primitive.point circle { fill: ${THEME.colors.pointFill}; stroke: ${THEME.colors.pointStroke}; stroke-width: 2.5; }
  svg.workspace-svg .primitive.point text { fill: ${THEME.colors.textFill}; font-size: ${THEME.typography.fontSize}px; font-weight: ${THEME.typography.fontWeight}; font-family: ${THEME.typography.fontFamily}; paint-order: stroke; stroke: ${THEME.colors.textStroke}; stroke-width: ${THEME.typography.textStrokeWidth}px; pointer-events: none; }
  svg.workspace-svg .primitive.selected.line, svg.workspace-svg .primitive.line:focus-visible { stroke: ${THEME.colors.lineActive}; stroke-width: 4; }
  svg.workspace-svg .primitive.selected.circle, svg.workspace-svg .primitive.circle:focus-visible { stroke: ${THEME.colors.circleActive}; stroke-width: 4; }
  svg.workspace-svg .primitive.selected.point circle, svg.workspace-svg .primitive.point:focus-visible circle { fill: ${THEME.colors.pointActiveFill}; stroke: ${THEME.colors.pointActiveStroke}; stroke-width: 3; }
`;
