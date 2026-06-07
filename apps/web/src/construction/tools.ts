import type { BuiltInActivityTool } from "@euclid/activity";

export type ToolIconName = "select" | "point" | "line" | "circle" | "parallel" | "perpendicular" | "midpoint";

export type ConstructionGestureTarget = "intersection" | "point" | "line" | "empty-point";

export type ConstructionToolGesturePolicy = Readonly<{
  pointerUpPriority: readonly ConstructionGestureTarget[];
}>;

export type ConstructionToolDescriptor = Readonly<{
  id: BuiltInActivityTool;
  label: string;
  icon: ToolIconName;
  gesturePolicy?: ConstructionToolGesturePolicy;
}>;

const selectToolDescriptor = {
  id: "select",
  label: "Select",
  icon: "select",
} satisfies ConstructionToolDescriptor;

const pointToolDescriptor = {
  id: "point",
  label: "Point",
  icon: "point",
  gesturePolicy: {
    pointerUpPriority: ["intersection", "point", "empty-point"],
  },
} satisfies ConstructionToolDescriptor;

const lineToolDescriptor = {
  id: "line",
  label: "Line",
  icon: "line",
  gesturePolicy: {
    pointerUpPriority: ["point", "intersection", "empty-point"],
  },
} satisfies ConstructionToolDescriptor;

const circleToolDescriptor = {
  id: "circle",
  label: "Circle",
  icon: "circle",
  gesturePolicy: {
    pointerUpPriority: ["point", "intersection", "empty-point"],
  },
} satisfies ConstructionToolDescriptor;

const parallelToolDescriptor = {
  id: "parallel",
  label: "Parallel Line",
  icon: "parallel",
  gesturePolicy: {
    pointerUpPriority: ["point", "line", "intersection", "empty-point"],
  },
} satisfies ConstructionToolDescriptor;

const perpendicularToolDescriptor = {
  id: "perpendicular",
  label: "Perpendicular Line",
  icon: "perpendicular",
  gesturePolicy: {
    pointerUpPriority: ["point", "line", "intersection", "empty-point"],
  },
} satisfies ConstructionToolDescriptor;

const midpointToolDescriptor = {
  id: "midpoint",
  label: "Midpoint",
  icon: "midpoint",
  gesturePolicy: {
    pointerUpPriority: ["point", "intersection", "empty-point"],
  },
} satisfies ConstructionToolDescriptor;

export const constructionToolDescriptors: readonly ConstructionToolDescriptor[] = [
  selectToolDescriptor,
  pointToolDescriptor,
  lineToolDescriptor,
  circleToolDescriptor,
  parallelToolDescriptor,
  perpendicularToolDescriptor,
  midpointToolDescriptor,
] as const;

export const activeTools = constructionToolDescriptors.map((tool) => tool.id);

export type ActiveTool = BuiltInActivityTool;

export const defaultConstructionToolGesturePolicy: ConstructionToolGesturePolicy = {
  pointerUpPriority: ["point", "line", "intersection", "empty-point"],
};

export const constructionToolGesturePolicies = Object.fromEntries(
  constructionToolDescriptors.flatMap((tool) =>
    tool.gesturePolicy === undefined ? [] : [[tool.id, tool.gesturePolicy]],
  ),
) as Record<Exclude<ActiveTool, "select">, ConstructionToolGesturePolicy>;

export function isRegisteredActiveTool(tool: string): tool is ActiveTool {
  return constructionToolDescriptors.some((descriptor) => descriptor.id === tool);
}

export function firstRegisteredTool(tools: readonly string[]): ActiveTool {
  return tools.find(isRegisteredActiveTool) ?? "select";
}

export function gesturePolicyForTool(tool: string): ConstructionToolGesturePolicy | undefined {
  if (tool === "select") {
    return undefined;
  }

  return (
    constructionToolGesturePolicies[tool as keyof typeof constructionToolGesturePolicies] ??
    defaultConstructionToolGesturePolicy
  );
}
