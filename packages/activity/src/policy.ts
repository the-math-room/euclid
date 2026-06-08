import type { Construction, ConstructionId } from "@euclid/geometry";

export const activityTools = [
  "select",
  "point",
  "line",
  "circle",
  "parallel",
  "perpendicular",
  "midpoint",
] as const;

export type BuiltInActivityTool = (typeof activityTools)[number];
export type ActivityTool = string;

export type DragPolicy = "none" | "free-points" | "all";

export type ActivityPolicy = Readonly<{
  allowedTools: readonly ActivityTool[];
  lockedConstructions: readonly ConstructionId[];
  allowDelete: boolean;
  pointDrag: DragPolicy;
  shapeDrag: DragPolicy;
}>;

export const openActivityPolicy: ActivityPolicy = {
  allowedTools: activityTools,
  lockedConstructions: [],
  allowDelete: true,
  pointDrag: "free-points",
  shapeDrag: "all",
};

export const readOnlyActivityPolicy: ActivityPolicy = {
  allowedTools: ["select"],
  lockedConstructions: [],
  allowDelete: false,
  pointDrag: "none",
  shapeDrag: "none",
};

export function canUseTool(policy: ActivityPolicy, tool: string): boolean {
  return policy.allowedTools.includes(tool);
}

export function allowedToolsInOrder(
  policy: ActivityPolicy,
  tools: readonly string[] = activityTools,
): readonly ActivityTool[] {
  return tools.filter((tool) => canUseTool(policy, tool));
}

export function isBuiltInActivityTool(value: unknown): value is BuiltInActivityTool {
  return typeof value === "string" && activityTools.includes(value as BuiltInActivityTool);
}

export function isActivityTool(value: unknown): value is ActivityTool {
  return typeof value === "string" && value.trim().length > 0;
}

export function isConstructionLocked(policy: ActivityPolicy, id: ConstructionId): boolean {
  return policy.lockedConstructions.includes(id);
}

export function canDeleteConstruction(policy: ActivityPolicy, id: ConstructionId): boolean {
  return policy.allowDelete && !isConstructionLocked(policy, id);
}

export function canDragConstruction(policy: ActivityPolicy, construction: Construction): boolean {
  if (isConstructionLocked(policy, construction.id)) {
    return false;
  }

  if (construction.kind === "free-point") {
    if ((construction.mobility ?? "free") === "fixed") {
      return false;
    }

    return policy.pointDrag === "free-points" || policy.pointDrag === "all";
  }

  return policy.shapeDrag === "all";
}
