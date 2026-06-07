import type { Construction, ConstructionId } from "@euclid/geometry";

export type ActivityTool = "select" | "point" | "line" | "circle" | "parallel";

export type DragPolicy = "none" | "free-points" | "all";

export type ActivityPolicy = Readonly<{
  allowedTools: readonly ActivityTool[];
  lockedConstructions: readonly ConstructionId[];
  allowDelete: boolean;
  pointDrag: DragPolicy;
  shapeDrag: DragPolicy;
}>;

export const openActivityPolicy: ActivityPolicy = {
  allowedTools: ["select", "point", "line", "circle", "parallel"],
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

export function canUseTool(policy: ActivityPolicy, tool: ActivityTool): boolean {
  return policy.allowedTools.includes(tool);
}

export function allowedToolsInOrder(
  policy: ActivityPolicy,
  tools: readonly ActivityTool[] = ["select", "point", "line", "circle", "parallel"],
): readonly ActivityTool[] {
  return tools.filter((tool) => canUseTool(policy, tool));
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
    return policy.pointDrag === "free-points" || policy.pointDrag === "all";
  }

  return policy.shapeDrag === "all";
}
