import { describe, expect, it } from "vitest";
import {
  activityTools,
  allowedToolsInOrder,
  canDeleteConstruction,
  canDragConstruction,
  canUseTool,
  isBuiltInActivityTool,
  isActivityTool,
  isConstructionLocked,
  openActivityPolicy,
  readOnlyActivityPolicy,
  type ActivityPolicy,
} from "./policy";

describe("activity policy", () => {
  const policy: ActivityPolicy = {
    allowedTools: ["select", "point", "line"],
    lockedConstructions: ["A", "line-ab"],
    allowDelete: true,
    pointDrag: "free-points",
    shapeDrag: "none",
  };

  it("filters allowed tools in host-provided order", () => {
    expect(canUseTool(policy, "circle")).toBe(false);
    expect(canUseTool(policy, "line")).toBe(true);
    expect(allowedToolsInOrder(policy, ["circle", "line", "point", "select"])).toEqual([
      "line",
      "point",
      "select",
    ]);
  });

  it("prevents deletion of locked constructions", () => {
    expect(isConstructionLocked(policy, "A")).toBe(true);
    expect(canDeleteConstruction(policy, "A")).toBe(false);
    expect(canDeleteConstruction(policy, "B")).toBe(true);
    expect(canDeleteConstruction({ ...policy, allowDelete: false }, "B")).toBe(false);
  });

  it("allows free point dragging according to point drag policy", () => {
    expect(
      canDragConstruction(policy, {
        id: "B",
        kind: "free-point",
        label: "B",
        position: { x: 0, y: 0 },
      }),
    ).toBe(true);
    expect(
      canDragConstruction(policy, {
        id: "A",
        kind: "free-point",
        label: "A",
        position: { x: 0, y: 0 },
      }),
    ).toBe(false);
    expect(
      canDragConstruction(
        { ...policy, pointDrag: "none" },
        {
          id: "B",
          kind: "free-point",
          label: "B",
          position: { x: 0, y: 0 },
        },
      ),
    ).toBe(false);
  });

  it("allows shape dragging according to shape drag policy", () => {
    const line = {
      id: "line-bc",
      kind: "line-through" as const,
      label: "BC",
      points: ["B", "C"] as const,
    };

    expect(canDragConstruction(policy, line)).toBe(false);
    expect(canDragConstruction({ ...policy, shapeDrag: "all" }, line)).toBe(true);
    expect(canDragConstruction({ ...policy, shapeDrag: "all" }, { ...line, id: "line-ab" })).toBe(false);
  });

  it("provides open and read-only reference policies", () => {
    expect(openActivityPolicy.allowedTools).toEqual(activityTools);
    expect(canUseTool(openActivityPolicy, "circle")).toBe(true);
    expect(canDeleteConstruction(openActivityPolicy, "A")).toBe(true);
    expect(canUseTool(readOnlyActivityPolicy, "point")).toBe(false);
    expect(canDeleteConstruction(readOnlyActivityPolicy, "A")).toBe(false);
  });

  it("validates activity tools from the shared source of truth", () => {
    expect(activityTools.every((tool) => isBuiltInActivityTool(tool))).toBe(true);
    expect(activityTools.every((tool) => isActivityTool(tool))).toBe(true);
    expect(isBuiltInActivityTool("measure")).toBe(false);
    expect(isActivityTool("measure")).toBe(true);
    expect(isActivityTool("")).toBe(false);
  });
});
