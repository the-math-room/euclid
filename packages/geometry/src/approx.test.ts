import { describe, expect, it } from "vitest";
import { lineLineIntersection, samePoint } from "./approx";

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
});
