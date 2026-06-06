import { describe, expect, it } from "vitest";
import {
  lineLineIntersection,
  samePoint,
  lineCircleIntersections,
  circleCircleIntersections,
} from "./approx";

describe("approximate geometry helpers", () => {
  it("detects exact floating point equality for points", () => {
    expect(samePoint({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
    expect(samePoint({ x: 1, y: 2 }, { x: 2, y: 1 })).toBe(false);
  });

  it("finds a line-line intersection", () => {
    expect(
      lineLineIntersection(
        [
          { x: 0, y: 0 },
          { x: 2, y: 2 },
        ],
        [
          { x: 0, y: 2 },
          { x: 2, y: 0 },
        ],
      ),
    ).toEqual({ x: 1, y: 1 });
  });

  it("returns undefined for parallel lines", () => {
    expect(
      lineLineIntersection(
        [
          { x: 0, y: 0 },
          { x: 2, y: 0 },
        ],
        [
          { x: 0, y: 1 },
          { x: 2, y: 1 },
        ],
      ),
    ).toBeUndefined();
  });

  it("finds line-circle intersections", () => {
    const line = [
      { x: -2, y: 0 },
      { x: 2, y: 0 },
    ] as const;
    const center = { x: 0, y: 0 };
    const radius = 1;
    const pts = lineCircleIntersections(line, center, radius);
    expect(pts).toHaveLength(2);
    expect(pts[0].x).toBeCloseTo(-1);
    expect(pts[0].y).toBeCloseTo(0);
    expect(pts[1].x).toBeCloseTo(1);
    expect(pts[1].y).toBeCloseTo(0);
  });

  it("finds circle-circle intersections", () => {
    const c1 = { x: -0.5, y: 0 };
    const r1 = 1;
    const c2 = { x: 0.5, y: 0 };
    const r2 = 1;
    const pts = circleCircleIntersections(c1, r1, c2, r2);
    expect(pts).toHaveLength(2);
    // Intersection of x^2 + y^2 = 1 (shifted) should be at x = 0, y = +-sqrt(0.75)
    expect(pts[0].x).toBeCloseTo(0);
    expect(pts[0].y).toBeCloseTo(-Math.sqrt(0.75));
    expect(pts[1].x).toBeCloseTo(0);
    expect(pts[1].y).toBeCloseTo(Math.sqrt(0.75));
  });
});
