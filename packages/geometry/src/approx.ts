import type { Point2 } from "./model";

export type ApproxLine = readonly [Point2, Point2];

export function samePoint(a: Point2, b: Point2): boolean {
  return a.x === b.x && a.y === b.y;
}

export function lineLineIntersection(first: ApproxLine, second: ApproxLine): Point2 | undefined {
  const [a, b] = first;
  const [c, d] = second;
  const ab = subtract(b, a);
  const cd = subtract(d, c);
  const denominator = cross(ab, cd);

  if (denominator === 0) {
    return undefined;
  }

  const ac = subtract(c, a);
  const t = cross(ac, cd) / denominator;

  return {
    x: a.x + t * ab.x,
    y: a.y + t * ab.y,
  };
}

export function cross(a: Point2, b: Point2): number {
  return a.x * b.y - a.y * b.x;
}

function subtract(a: Point2, b: Point2): Point2 {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  };
}
