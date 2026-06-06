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

export function dot(a: Point2, b: Point2): number {
  return a.x * b.x + a.y * b.y;
}

function subtract(a: Point2, b: Point2): Point2 {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  };
}

export function lineCircleIntersections(line: ApproxLine, center: Point2, radius: number): readonly Point2[] {
  const [a, b] = line;
  const v = subtract(b, a);
  const w = subtract(a, center);

  const A = dot(v, v);
  const B = 2 * dot(v, w);
  const C = dot(w, w) - radius * radius;

  const discriminant = B * B - 4 * A * C;
  if (discriminant < 0) {
    return [];
  }

  const sqrtD = Math.sqrt(discriminant);
  const t0 = (-B - sqrtD) / (2 * A);
  const t1 = (-B + sqrtD) / (2 * A);

  const p0 = { x: a.x + t0 * v.x, y: a.y + t0 * v.y };
  const p1 = { x: a.x + t1 * v.x, y: a.y + t1 * v.y };

  return [p0, p1];
}

export function circleCircleIntersections(c1: Point2, r1: number, c2: Point2, r2: number): readonly Point2[] {
  const d = Math.hypot(c2.x - c1.x, c2.y - c1.y);

  if (d === 0 || d > r1 + r2 || d < Math.abs(r1 - r2)) {
    return [];
  }

  const x = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const ySq = r1 * r1 - x * x;
  if (ySq < 0) {
    return [];
  }

  const y = Math.sqrt(ySq);

  const ux = (c2.x - c1.x) / d;
  const uy = (c2.y - c1.y) / d;

  const vx = -uy;
  const vy = ux;

  const p0 = {
    x: c1.x + x * ux - y * vx,
    y: c1.y + x * uy - y * vy,
  };

  const p1 = {
    x: c1.x + x * ux + y * vx,
    y: c1.y + x * uy + y * vy,
  };

  return [p0, p1];
}
