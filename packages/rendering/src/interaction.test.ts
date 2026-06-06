import { describe, expect, it } from "vitest";
import type { RenderScene } from "./scene";
import { findIntersectionAtPosition, findItemAtPosition } from "./interaction";

const mockScene: RenderScene = {
  size: { width: 100, height: 100 },
  grid: [],
  items: [
    {
      id: "point-A",
      kind: "point",
      mark: { x: 50, y: 50 },
      label: { text: "A", anchor: { x: 60, y: 40 } },
    },
    {
      id: "line-B",
      kind: "line",
      from: { x: 10, y: 10 },
      to: { x: 90, y: 10 },
      supportLine: [
        { x: 10, y: 10 },
        { x: 90, y: 10 },
      ],
    },
    {
      id: "circle-C",
      kind: "circle",
      center: { x: 50, y: 50 },
      radius: 30,
    },
  ],
};

describe("interaction hit testing", () => {
  it("finds points close to query position", () => {
    // Exactly on the point
    expect(findItemAtPosition(mockScene, { x: 50, y: 50 })?.id).toBe("point-A");
    // Close to the point (within 8px default threshold)
    expect(findItemAtPosition(mockScene, { x: 53, y: 53 })?.id).toBe("point-A");
    // Too far from point
    expect(findItemAtPosition(mockScene, { x: 60, y: 60 })?.id).not.toBe("point-A");
  });

  it("finds lines close to query position", () => {
    // Exactly on the line segment
    expect(findItemAtPosition(mockScene, { x: 30, y: 10 })?.id).toBe("line-B");
    // Close to the line segment
    expect(findItemAtPosition(mockScene, { x: 30, y: 13 })?.id).toBe("line-B");
    // Outside threshold
    expect(findItemAtPosition(mockScene, { x: 10, y: 30 })?.id).toBeUndefined();
    // Off the end of the line segment
    expect(findItemAtPosition(mockScene, { x: 1, y: 10 })?.id).toBeUndefined();
  });

  it("finds circles close to perimeter", () => {
    // On the perimeter (radius 30, center 50,50 -> point at 50,80)
    expect(findItemAtPosition(mockScene, { x: 50, y: 80 })?.id).toBe("circle-C");
    // Close to perimeter
    expect(findItemAtPosition(mockScene, { x: 50, y: 83 })?.id).toBe("circle-C");
    // Too far from perimeter
    expect(findItemAtPosition(mockScene, { x: 50, y: 90 })?.id).toBeUndefined();
  });

  it("prioritizes points over lines/circles", () => {
    const sceneWithOverlap: RenderScene = {
      size: { width: 100, height: 100 },
      grid: [],
      items: [
        {
          id: "overlap-line",
          kind: "line",
          from: { x: 10, y: 10 },
          to: { x: 90, y: 10 },
          supportLine: [
            { x: 10, y: 10 },
            { x: 90, y: 10 },
          ],
        },
        {
          id: "overlap-point",
          kind: "point",
          mark: { x: 50, y: 10 },
          label: { text: "P", anchor: { x: 60, y: 0 } },
        },
      ],
    };

    // Position 50,11 is close to both the line and the point.
    // Distance to point is 1. Distance to line is 1.
    // Point should be prioritized and selected.
    expect(findItemAtPosition(sceneWithOverlap, { x: 50, y: 11 })?.id).toBe("overlap-point");
  });

  it("finds line-line intersection candidates close to query position", () => {
    const scene: RenderScene = {
      size: { width: 100, height: 100 },
      grid: [],
      items: [
        {
          id: "line-a",
          kind: "line",
          from: { x: 10, y: 10 },
          to: { x: 90, y: 90 },
          supportLine: [
            { x: 10, y: 10 },
            { x: 90, y: 90 },
          ],
        },
        {
          id: "line-b",
          kind: "line",
          from: { x: 10, y: 90 },
          to: { x: 90, y: 10 },
          supportLine: [
            { x: 10, y: 90 },
            { x: 90, y: 10 },
          ],
        },
      ],
    };

    expect(findIntersectionAtPosition(scene, { x: 52, y: 51 })).toEqual({
      kind: "line-line-intersection",
      lines: ["line-a", "line-b"],
      position: { x: 50, y: 50 },
    });
  });

  it("does not find intersection candidates for parallel lines", () => {
    const scene: RenderScene = {
      size: { width: 100, height: 100 },
      grid: [],
      items: [
        {
          id: "line-a",
          kind: "line",
          from: { x: 10, y: 10 },
          to: { x: 90, y: 10 },
          supportLine: [
            { x: 10, y: 10 },
            { x: 90, y: 10 },
          ],
        },
        {
          id: "line-b",
          kind: "line",
          from: { x: 10, y: 20 },
          to: { x: 90, y: 20 },
          supportLine: [
            { x: 10, y: 20 },
            { x: 90, y: 20 },
          ],
        },
      ],
    };

    expect(findIntersectionAtPosition(scene, { x: 50, y: 15 })).toBeUndefined();
  });

  it("finds line-circle intersection candidates close to query position", () => {
    const scene: RenderScene = {
      size: { width: 100, height: 100 },
      grid: [],
      items: [
        {
          id: "line-a",
          kind: "line",
          from: { x: 10, y: 50 },
          to: { x: 90, y: 50 },
          supportLine: [
            { x: 10, y: 50 },
            { x: 90, y: 50 },
          ],
        },
        {
          id: "circle-b",
          kind: "circle",
          center: { x: 50, y: 50 },
          radius: 10,
        },
      ],
    };

    // Intersections at { x: 40, y: 50 } and { x: 60, y: 50 }
    expect(findIntersectionAtPosition(scene, { x: 41, y: 51 })).toEqual({
      kind: "line-circle-intersection",
      line: "line-a",
      circle: "circle-b",
      position: { x: 40, y: 50 },
      intersectionIndex: 0,
    });

    expect(findIntersectionAtPosition(scene, { x: 59, y: 49 })).toEqual({
      kind: "line-circle-intersection",
      line: "line-a",
      circle: "circle-b",
      position: { x: 60, y: 50 },
      intersectionIndex: 1,
    });
  });

  it("finds circle-circle intersection candidates close to query position with canonical operands", () => {
    const scene: RenderScene = {
      size: { width: 100, height: 100 },
      grid: [],
      items: [
        {
          id: "circle-y",
          kind: "circle",
          center: { x: 45, y: 50 },
          radius: 10,
        },
        {
          id: "circle-x",
          kind: "circle",
          center: { x: 55, y: 50 },
          radius: 10,
        },
      ],
    };

    // Intersection points at x = 50, y = 50 +- sqrt(75) (approx 58.66 and 41.34)
    // circle-x and circle-y should be canonicalized by alphabetical ID sorting: circle-x first, circle-y second
    const hit = findIntersectionAtPosition(scene, { x: 51, y: 58 });
    expect(hit?.kind).toBe("circle-circle-intersection");
    expect(hit).toEqual(
      expect.objectContaining({
        firstCircle: "circle-x",
        secondCircle: "circle-y",
        intersectionIndex: 1,
      }),
    );
  });
});
