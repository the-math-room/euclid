import type { ActivityTool } from "@euclid/activity";

export type ToolIconName =
  | "select"
  | "point"
  | "line"
  | "circle"
  | "parallel"
  | "perpendicular"
  | "midpoint"
  | "macro";

export type ConstructionGestureTarget = "intersection" | "point" | "line" | "empty-point";

export type ConstructionToolGesturePolicy = Readonly<{
  pointerUpPriority: readonly ConstructionGestureTarget[];
}>;

export type ConstructionToolDescriptor = Readonly<{
  id: ActivityTool;
  label: string;
  icon: ToolIconName;
  gesturePolicy?: ConstructionToolGesturePolicy;
}>;
