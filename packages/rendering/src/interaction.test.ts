import { describe, expect, it } from "vitest";
import { findIntersectionAtPosition, findItemAtPosition, findSnapTargets } from "./interaction";
import { circleItem, lineItem, pointItem, renderScene, scenePoint } from "./renderTestFixtures";

const p = scenePoint;

const mockScene = renderScene({
  size: { width: 100, height: 100 },
  items: [
    pointItem({
      id: "point-A",
      x: 50,
      y: 50,
      text: "A",
      labelAnchor: p(60, 40),
    }),
    lineItem({
      id: "line-B",
      from: p(10, 10),
      to: p(90, 10),
    }),
    circleItem({
      id: "circle-C",
      center: p(50, 50),
      radius: 30,
    }),
  ],
});

describe("interaction hit testing", () => {
  it("finds points close to query position", () => {
    // Exactly on the point
    expect(findItemAtPosition(mockScene, p(50, 50))?.id).toBe("point-A");
    // Close to the point (within 8px default threshold)
    expect(findItemAtPosition(mockScene, p(53, 53))?.id).toBe("point-A");
    // Too far from point
    expect(findItemAtPosition(mockScene, p(60, 60))?.id).not.toBe("point-A");
  });

  it("treats point labels as hits on their owning point", () => {
    const scene = renderScene({
      size: { width: 100, height: 100 },
      items: [
        pointItem({
          id: "point-A",
          x: 50,
          y: 50,
          text: "A",
          labelAnchor: p(70, 40),
          labelBounds: { x: 68, y: 24, width: 12, height: 18 },
        }),
      ],
    });

    expect(findItemAtPosition(scene, p(74, 32))?.id).toBe("point-A");
  });

  it("finds lines close to query position", () => {
    // Exactly on the line segment
    expect(findItemAtPosition(mockScene, p(30, 10))?.id).toBe("line-B");
    // Close to the line segment
    expect(findItemAtPosition(mockScene, p(30, 13))?.id).toBe("line-B");
    // Outside threshold
    expect(findItemAtPosition(mockScene, p(10, 30))?.id).toBeUndefined();
    // Off the end of the line segment
    expect(findItemAtPosition(mockScene, p(1, 10))?.id).toBeUndefined();
  });

  it("finds circles close to perimeter", () => {
    // On the perimeter (radius 30, center 50,50 -> point at 50,80)
    expect(findItemAtPosition(mockScene, p(50, 80))?.id).toBe("circle-C");
    // Close to perimeter
    expect(findItemAtPosition(mockScene, p(50, 83))?.id).toBe("circle-C");
    // Too far from perimeter
    expect(findItemAtPosition(mockScene, p(50, 90))?.id).toBeUndefined();
  });

  it("prioritizes points over lines/circles", () => {
    const sceneWithOverlap = renderScene({
      size: { width: 100, height: 100 },
      items: [
        lineItem({
          id: "overlap-line",
          from: p(10, 10),
          to: p(90, 10),
        }),
        pointItem({
          id: "overlap-point",
          x: 50,
          y: 10,
          text: "P",
          labelAnchor: p(60, 0),
        }),
      ],
    });

    // Position 50,11 is close to both the line and the point.
    // Distance to point is 1. Distance to line is 1.
    // Point should be prioritized and selected.
    expect(findItemAtPosition(sceneWithOverlap, p(50, 11))?.id).toBe("overlap-point");
  });

  it("finds line-line intersection candidates close to query position", () => {
    const scene = renderScene({
      size: { width: 100, height: 100 },
      items: [
        lineItem({
          id: "line-a",
          from: p(10, 10),
          to: p(90, 90),
        }),
        lineItem({
          id: "line-b",
          from: p(10, 90),
          to: p(90, 10),
        }),
      ],
    });

    expect(findIntersectionAtPosition(scene, p(52, 51))).toEqual({
      kind: "line-line-intersection",
      lines: ["line-a", "line-b"],
      position: { x: 50, y: 50 },
    });
  });

  it("does not find intersection candidates for parallel lines", () => {
    const scene = renderScene({
      size: { width: 100, height: 100 },
      items: [
        lineItem({
          id: "line-a",
          from: p(10, 10),
          to: p(90, 10),
        }),
        lineItem({
          id: "line-b",
          from: p(10, 20),
          to: p(90, 20),
        }),
      ],
    });

    expect(findIntersectionAtPosition(scene, p(50, 15))).toBeUndefined();
  });

  it("finds line-circle intersection candidates close to query position", () => {
    const scene = renderScene({
      size: { width: 100, height: 100 },
      items: [
        lineItem({
          id: "line-a",
          from: p(10, 50),
          to: p(90, 50),
        }),
        circleItem({
          id: "circle-b",
          center: p(50, 50),
          radius: 10,
        }),
      ],
    });

    // Intersections at { x: 40, y: 50 } and { x: 60, y: 50 }
    expect(findIntersectionAtPosition(scene, p(41, 51))).toEqual({
      kind: "line-circle-intersection",
      line: "line-a",
      circle: "circle-b",
      position: { x: 40, y: 50 },
      intersectionIndex: 0,
    });

    expect(findIntersectionAtPosition(scene, p(59, 49))).toEqual({
      kind: "line-circle-intersection",
      line: "line-a",
      circle: "circle-b",
      position: { x: 60, y: 50 },
      intersectionIndex: 1,
    });
  });

  it("finds circle-circle intersection candidates close to query position with canonical operands", () => {
    const scene = renderScene({
      size: { width: 100, height: 100 },
      items: [
        circleItem({
          id: "circle-y",
          center: p(45, 50),
          radius: 10,
        }),
        circleItem({
          id: "circle-x",
          center: p(55, 50),
          radius: 10,
        }),
      ],
    });

    // Intersection points at x = 50, y = 50 +- sqrt(75) (approx 58.66 and 41.34)
    // circle-x and circle-y should be canonicalized by alphabetical ID sorting: circle-x first, circle-y second
    const hit = findIntersectionAtPosition(scene, p(51, 58));
    expect(hit?.kind).toBe("circle-circle-intersection");
    expect(hit).toEqual(
      expect.objectContaining({
        firstCircle: "circle-x",
        secondCircle: "circle-y",
        intersectionIndex: 1,
      }),
    );
  });

  describe("findSnapTargets", () => {
    it("finds and sorts all snap targets by distance", () => {
      const targets = findSnapTargets(mockScene, p(51, 51), 10);
      const first = targets[0];
      expect(first.kind).toBe("point");
      if (first.kind === "point") {
        expect(first.item.id).toBe("point-A");
      }
      expect(targets.length).toBe(1);
    });

    it("finds intersections and items together", () => {
      const scene = renderScene({
        size: { width: 100, height: 100 },
        items: [
          lineItem({
            id: "line-a",
            from: p(10, 10),
            to: p(90, 90),
          }),
          lineItem({
            id: "line-b",
            from: p(10, 90),
            to: p(90, 10),
          }),
        ],
      });

      const targets = findSnapTargets(scene, p(52, 51), 8);
      expect(targets.map((t) => t.kind)).toContain("intersection");
      expect(targets.map((t) => t.kind)).toContain("line");
      const first = targets[0];
      expect(first.kind).toBe("line");
      if (first.kind === "line") {
        expect(first.item.id).toBe("line-a");
      }
    });
  });
});
