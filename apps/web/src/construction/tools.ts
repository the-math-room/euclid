import type { ActivityTool } from "@euclid/activity";
import { thirdPartyMacroToolDescriptors } from "./thirdPartyToolRegistry";
export type {
  ConstructionGestureTarget,
  ConstructionToolDescriptor,
  ConstructionToolGesturePolicy,
  ToolIconName,
} from "./toolTypes";
import type { ConstructionToolDescriptor, ConstructionToolGesturePolicy } from "./toolTypes";

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

const builtInConstructionToolDescriptors: readonly ConstructionToolDescriptor[] = [
  selectToolDescriptor,
  pointToolDescriptor,
  lineToolDescriptor,
  circleToolDescriptor,
  parallelToolDescriptor,
  perpendicularToolDescriptor,
  midpointToolDescriptor,
] as const;

export const constructionToolDescriptors: readonly ConstructionToolDescriptor[] = [
  ...builtInConstructionToolDescriptors,
  ...thirdPartyMacroToolDescriptors,
];

export const activeTools = constructionToolDescriptors.map((tool) => tool.id);

export type ActiveTool = ActivityTool;

export const defaultConstructionToolGesturePolicy: ConstructionToolGesturePolicy = {
  pointerUpPriority: ["point", "line", "intersection", "empty-point"],
};

export const constructionToolGesturePolicies: Readonly<Record<string, ConstructionToolGesturePolicy>> =
  Object.fromEntries(
    constructionToolDescriptors.flatMap((tool) =>
      tool.gesturePolicy === undefined ? [] : [[tool.id, tool.gesturePolicy]],
    ),
  );

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
