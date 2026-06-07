import { describe, expect, it } from "vitest";
import type { ActivityPolicy } from "@euclid/activity";
import type { Construction } from "@euclid/geometry";
import { deletableSelectionClosure } from "./deleteSelection";

const constructions: readonly Construction[] = [
  { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
  { id: "B", kind: "free-point", label: "B", position: { x: 1, y: 0 } },
  { id: "P", kind: "free-point", label: "P", position: { x: 0, y: 1 } },
  { id: "line-ab", kind: "line-through", label: "AB", points: ["A", "B"] },
  { id: "line-ap", kind: "line-through", label: "AP", points: ["A", "P"] },
  { id: "midpoint-ap", kind: "midpoint", label: "M", points: ["A", "P"] },
];

const openPolicy: ActivityPolicy = {
  allowedTools: ["select"],
  lockedConstructions: [],
  allowDelete: true,
  pointDrag: "none",
  shapeDrag: "none",
};

describe("deletableSelectionClosure", () => {
  it("includes transitive dependents of directly selected deletable constructions", () => {
    const closure = deletableSelectionClosure({
      constructions,
      selectedIds: new Set(["P"]),
      policy: openPolicy,
    });

    expect(closure).toEqual(new Set(["P", "line-ap", "midpoint-ap"]));
  });

  it("ignores locked ids in a mixed selection when the deletable closure is still allowed", () => {
    const closure = deletableSelectionClosure({
      constructions,
      selectedIds: new Set(["A", "line-ap"]),
      policy: { ...openPolicy, lockedConstructions: ["A"] },
    });

    expect(closure).toEqual(new Set(["line-ap"]));
  });

  it("refuses deletion when a directly selected construction would delete a locked dependent", () => {
    const closure = deletableSelectionClosure({
      constructions,
      selectedIds: new Set(["P"]),
      policy: { ...openPolicy, lockedConstructions: ["midpoint-ap"] },
    });

    expect(closure).toEqual(new Set());
  });

  it("refuses deletion when global delete is disabled", () => {
    const closure = deletableSelectionClosure({
      constructions,
      selectedIds: new Set(["line-ab"]),
      policy: { ...openPolicy, allowDelete: false },
    });

    expect(closure).toEqual(new Set());
  });
});
