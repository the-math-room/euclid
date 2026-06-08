import { describe, expect, it } from "vitest";
import { layoutPointLabels } from "./labelLayout";
import { lineItem, pointItem, scenePoint } from "./renderTestFixtures";

type PointLabelTarget = Parameters<typeof layoutPointLabels>[0][number];

function labelTarget(id: string, x: number, y: number): PointLabelTarget {
  return {
    id,
    text: id,
    mark: scenePoint(x, y),
  };
}

describe("label layout", () => {
  it("uses the preferred northeast candidate when it is clear", () => {
    const labels = layoutPointLabels([labelTarget("A", 50, 50)], []);
    const label = labels.get("A");

    expect(label).toEqual(
      expect.objectContaining({
        text: "A",
        anchor: { x: 60, y: 40 },
        candidate: "ne",
      }),
    );
  });

  it("moves labels away from each other without privileging source order", () => {
    const labels = layoutPointLabels([labelTarget("A", 50, 50), labelTarget("B", 50, 50)], []);

    expect(labels.get("A")?.candidate).not.toBe(labels.get("B")?.candidate);
  });
  it("penalizes labels that cross rendered line obstacles", () => {
    const line = lineItem({
      id: "line",
      from: scenePoint(0, 31),
      to: scenePoint(100, 31),
    });
    const labels = layoutPointLabels([labelTarget("A", 50, 50)], [line]);

    expect(labels.get("A")?.candidate).toBe("e");
  });

  it("keeps labels visually associated with their home point in a point clump", () => {
    const labels = layoutPointLabels(
      [labelTarget("A", 50, 50), labelTarget("B", 68, 31)],
      [
        pointItem({
          id: "A",
          x: 50,
          y: 50,
          text: "A",
          labelAnchor: scenePoint(0, 0),
        }),
        pointItem({
          id: "B",
          x: 68,
          y: 31,
          text: "B",
          labelAnchor: scenePoint(0, 0),
        }),
      ],
    );

    expect(labels.get("A")?.candidate).not.toBe("ne");
  });
});
