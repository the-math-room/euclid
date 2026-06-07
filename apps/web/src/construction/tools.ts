export const activeTools = [
  "select",
  "point",
  "line",
  "circle",
  "parallel",
  "perpendicular",
  "midpoint",
] as const;

export type ActiveTool = (typeof activeTools)[number];

export type ConstructionGestureTarget = "intersection" | "point" | "line" | "empty-point";

export type ConstructionToolGesturePolicy = Readonly<{
  pointerUpPriority: readonly ConstructionGestureTarget[];
}>;

export const defaultConstructionToolGesturePolicy: ConstructionToolGesturePolicy = {
  pointerUpPriority: ["point", "line", "intersection", "empty-point"],
};

export const constructionToolGesturePolicies = {
  point: {
    pointerUpPriority: ["intersection", "point", "empty-point"],
  },
  line: {
    pointerUpPriority: ["point", "intersection", "empty-point"],
  },
  circle: {
    pointerUpPriority: ["point", "intersection", "empty-point"],
  },
  parallel: {
    pointerUpPriority: ["point", "line", "intersection", "empty-point"],
  },
  perpendicular: {
    pointerUpPriority: ["point", "line", "intersection", "empty-point"],
  },
  midpoint: {
    pointerUpPriority: ["point", "intersection", "empty-point"],
  },
} satisfies Record<Exclude<ActiveTool, "select">, ConstructionToolGesturePolicy>;

export function gesturePolicyForTool(tool: string): ConstructionToolGesturePolicy | undefined {
  if (tool === "select") {
    return undefined;
  }

  return (
    constructionToolGesturePolicies[tool as keyof typeof constructionToolGesturePolicies] ??
    defaultConstructionToolGesturePolicy
  );
}
