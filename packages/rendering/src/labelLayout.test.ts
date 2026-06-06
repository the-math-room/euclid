import { describe, expect, it } from "vitest";
import type { RenderItem } from "./scene";
import { layoutPointLabels } from "./labelLayout";

describe("label layout", () => {
  it("uses the preferred northeast candidate when it is clear", () => {
    const labels = layoutPointLabels([{ id: "A", text: "A", mark: { x: 50, y: 50 } }], []);
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
    const labels = layoutPointLabels(
      [
        { id: "A", text: "A", mark: { x: 50, y: 50 } },
        { id: "B", text: "B", mark: { x: 50, y: 50 } },
      ],
      [],
    );

    expect(labels.get("A")?.candidate).not.toBe(labels.get("B")?.candidate);
  });

  it("penalizes labels that cross rendered line obstacles", () => {
    const line: RenderItem = {
      id: "line",
      kind: "line",
      from: { x: 0, y: 31 },
      to: { x: 100, y: 31 },
      supportLine: [
        { x: 0, y: 31 },
        { x: 100, y: 31 },
      ],
    };
    const labels = layoutPointLabels([{ id: "A", text: "A", mark: { x: 50, y: 50 } }], [line]);

    expect(labels.get("A")?.candidate).toBe("e");
  });

  it("keeps labels visually associated with their home point in a point clump", () => {
    const labels = layoutPointLabels(
      [
        { id: "A", text: "A", mark: { x: 50, y: 50 } },
        { id: "B", text: "B", mark: { x: 68, y: 31 } },
      ],
      [
        {
          id: "A",
          kind: "point",
          mark: { x: 50, y: 50 },
          label: { text: "A", anchor: { x: 0, y: 0 } },
        },
        {
          id: "B",
          kind: "point",
          mark: { x: 68, y: 31 },
          label: { text: "B", anchor: { x: 0, y: 0 } },
        },
      ],
    );

    expect(labels.get("A")?.candidate).not.toBe("ne");
  });
});
