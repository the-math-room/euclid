import { describe, expect, it } from "vitest";
import {
  activeTools,
  constructionToolGesturePolicies,
  defaultConstructionToolGesturePolicy,
  firstRegisteredTool,
  gesturePolicyForTool,
} from "./tools";
import { thirdPartyMacroToolIds } from "./thirdPartyToolRegistry";

describe("construction tool gesture policies", () => {
  it("declares pointer-up behavior for every construction tool", () => {
    const constructionTools = activeTools.filter((tool) => tool !== "select");

    expect(Object.keys(constructionToolGesturePolicies).sort()).toEqual([...constructionTools].sort());
  });

  it("discovers third-party macro tools from the tools directory", () => {
    expect(thirdPartyMacroToolIds.length).toBeGreaterThan(0);
    for (const toolId of thirdPartyMacroToolIds) {
      expect(activeTools).toContain(toolId);
    }
  });

  it("keeps fallback point creation last in every construction policy", () => {
    for (const policy of Object.values(constructionToolGesturePolicies)) {
      expect(policy.pointerUpPriority.at(-1)).toBe("empty-point");
    }
  });

  it("provides a conservative default for unregistered construction tools", () => {
    expect(gesturePolicyForTool("custom-angle-bisector")).toBe(defaultConstructionToolGesturePolicy);
    expect(defaultConstructionToolGesturePolicy.pointerUpPriority).toEqual([
      "point",
      "line",
      "intersection",
      "empty-point",
    ]);
  });

  it("does not treat select as a construction tool", () => {
    expect(gesturePolicyForTool("select")).toBeUndefined();
  });

  it("chooses the first registered tool from a host policy", () => {
    expect(firstRegisteredTool(["custom-angle-bisector", "line"])).toBe("line");
    expect(firstRegisteredTool(["custom-angle-bisector"])).toBe("select");
  });
});
