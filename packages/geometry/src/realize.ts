import type { Construction, ConstructionId, EvaluatedPrimitive, EvaluationDiagnostic } from "./model";
import { toWorldPoint } from "./model";
import {
  lineLineIntersection,
  samePoint,
  lineCircleIntersections,
  circleCircleIntersections,
} from "./approx";
import { REALIZATION_EPSILON } from "./tolerance";

export type Realization = Readonly<{
  primitives: readonly EvaluatedPrimitive[];
  diagnostics: readonly EvaluationDiagnostic[];
}>;

type RealizationStep =
  | EvaluatedPrimitive
  | Readonly<{
      kind: "diagnostic";
      message: string;
    }>;

type ConstructionOf<K extends Construction["kind"]> = Extract<Construction, { kind: K }>;

export function realizeConstructions(constructions: readonly Construction[]): Realization {
  const primitives = new Map<ConstructionId, EvaluatedPrimitive>();
  const diagnostics: EvaluationDiagnostic[] = [];

  for (const construction of constructions) {
    const primitive = realizeOne(construction, primitives);

    if (primitive.kind === "diagnostic") {
      diagnostics.push({
        constructionId: construction.id,
        message: primitive.message,
      });
    } else {
      primitives.set(construction.id, primitive);
    }
  }

  return {
    primitives: Array.from(primitives.values()),
    diagnostics,
  };
}

function realizeOne(
  construction: Construction,
  previous: ReadonlyMap<ConstructionId, EvaluatedPrimitive>,
): RealizationStep {
  switch (construction.kind) {
    case "free-point":
      return realizeFreePoint(construction);
    case "line-through":
      return realizeLineThrough(construction, previous);
    case "circle-through":
      return realizeCircleThrough(construction, previous);
    case "circle-three-points":
      return realizeCircleThreePoints(construction, previous);
    case "line-line-intersection":
      return realizeLineLineIntersection(construction, previous);
    case "line-circle-intersection":
      return realizeLineCircleIntersection(construction, previous);
    case "circle-circle-intersection":
      return realizeCircleCircleIntersection(construction, previous);
    case "parallel-line":
      return realizeParallelLine(construction, previous);
    case "perpendicular-line":
      return realizePerpendicularLine(construction, previous);
    case "midpoint":
      return realizeMidpoint(construction, previous);
  }
}

function realizeFreePoint(construction: ConstructionOf<"free-point">): RealizationStep {
  return {
    id: construction.id,
    kind: "point",
    label: construction.label,
    position: construction.position,
  };
}

function realizeLineThrough(
  construction: ConstructionOf<"line-through">,
  previous: ReadonlyMap<ConstructionId, EvaluatedPrimitive>,
): RealizationStep {
  const a = pointNamed(previous, construction.points[0]);
  const b = pointNamed(previous, construction.points[1]);

  if (!a || !b) {
    return diagnostic(`Line ${construction.label} needs two point dependencies.`);
  }

  if (samePoint(a.position, b.position)) {
    return diagnostic(`Line ${construction.label} needs two distinct point dependencies.`);
  }

  return {
    id: construction.id,
    kind: "line",
    label: construction.label,
    shapeRole: construction.shapeRole ?? "primary",
    through: [a.position, b.position],
  };
}

function realizeCircleThrough(
  construction: ConstructionOf<"circle-through">,
  previous: ReadonlyMap<ConstructionId, EvaluatedPrimitive>,
): RealizationStep {
  const center = pointNamed(previous, construction.center);
  const pointOnCircle = pointNamed(previous, construction.pointOnCircle);

  if (!center || !pointOnCircle) {
    return diagnostic(
      `Circle ${construction.label} needs point dependencies for its center and circumference.`,
    );
  }

  if (samePoint(center.position, pointOnCircle.position)) {
    return diagnostic(`Circle ${construction.label} needs distinct center and circumference points.`);
  }

  return {
    id: construction.id,
    kind: "circle",
    label: construction.label,
    shapeRole: construction.shapeRole ?? "primary",
    center: center.position,
    pointOnCircle: pointOnCircle.position,
  };
}

function realizeCircleThreePoints(
  construction: ConstructionOf<"circle-three-points">,
  previous: ReadonlyMap<ConstructionId, EvaluatedPrimitive>,
): RealizationStep {
  const a = pointNamed(previous, construction.points[0]);
  const b = pointNamed(previous, construction.points[1]);
  const c = pointNamed(previous, construction.points[2]);

  if (!a || !b || !c) {
    return diagnostic(`Circle ${construction.label} needs three point dependencies.`);
  }

  const ap = a.position;
  const bp = b.position;
  const cp = c.position;

  if (samePoint(ap, bp) || samePoint(bp, cp) || samePoint(cp, ap)) {
    return diagnostic(`Circle ${construction.label} needs three distinct points.`);
  }

  const d = 2 * (ap.x * (bp.y - cp.y) + bp.x * (cp.y - ap.y) + cp.x * (ap.y - bp.y));

  if (Math.abs(d) < REALIZATION_EPSILON) {
    return diagnostic(`Circle ${construction.label} cannot be circumscribed through collinear points.`);
  }

  const aSq = ap.x * ap.x + ap.y * ap.y;
  const bSq = bp.x * bp.x + bp.y * bp.y;
  const cSq = cp.x * cp.x + cp.y * cp.y;

  const center = toWorldPoint({
    x: (aSq * (bp.y - cp.y) + bSq * (cp.y - ap.y) + cSq * (ap.y - bp.y)) / d,
    y: (aSq * (cp.x - bp.x) + bSq * (ap.x - cp.x) + cSq * (bp.x - ap.x)) / d,
  });

  return {
    id: construction.id,
    kind: "circle",
    label: construction.label,
    shapeRole: construction.shapeRole ?? "primary",
    center,
    pointOnCircle: ap,
  };
}

function realizeLineLineIntersection(
  construction: ConstructionOf<"line-line-intersection">,
  previous: ReadonlyMap<ConstructionId, EvaluatedPrimitive>,
): RealizationStep {
  const firstLine = lineNamed(previous, construction.lines[0]);
  const secondLine = lineNamed(previous, construction.lines[1]);

  if (!firstLine || !secondLine) {
    return diagnostic(`Intersection ${construction.label} needs two line dependencies.`);
  }

  const position = lineLineIntersection(firstLine.through, secondLine.through);

  if (!position) {
    return diagnostic(`Intersection ${construction.label} needs non-parallel line dependencies.`);
  }

  return {
    id: construction.id,
    kind: "point",
    label: construction.label,
    position: toWorldPoint(position),
  };
}

function realizeLineCircleIntersection(
  construction: ConstructionOf<"line-circle-intersection">,
  previous: ReadonlyMap<ConstructionId, EvaluatedPrimitive>,
): RealizationStep {
  const line = lineNamed(previous, construction.line);
  const circle = circleNamed(previous, construction.circle);

  if (!line || !circle) {
    return diagnostic(`Intersection ${construction.label} needs line and circle dependencies.`);
  }

  const radius = Math.hypot(
    circle.center.x - circle.pointOnCircle.x,
    circle.center.y - circle.pointOnCircle.y,
  );
  const intersections = lineCircleIntersections(line.through, circle.center, radius);

  return pointIntersection(construction, intersections);
}

function realizeCircleCircleIntersection(
  construction: ConstructionOf<"circle-circle-intersection">,
  previous: ReadonlyMap<ConstructionId, EvaluatedPrimitive>,
): RealizationStep {
  const firstCircle = circleNamed(previous, construction.firstCircle);
  const secondCircle = circleNamed(previous, construction.secondCircle);

  if (!firstCircle || !secondCircle) {
    return diagnostic(`Intersection ${construction.label} needs two circle dependencies.`);
  }

  const r1 = Math.hypot(
    firstCircle.center.x - firstCircle.pointOnCircle.x,
    firstCircle.center.y - firstCircle.pointOnCircle.y,
  );
  const r2 = Math.hypot(
    secondCircle.center.x - secondCircle.pointOnCircle.x,
    secondCircle.center.y - secondCircle.pointOnCircle.y,
  );
  const intersections = circleCircleIntersections(firstCircle.center, r1, secondCircle.center, r2);

  return pointIntersection(construction, intersections);
}

function realizeParallelLine(
  construction: ConstructionOf<"parallel-line">,
  previous: ReadonlyMap<ConstructionId, EvaluatedPrimitive>,
): RealizationStep {
  const line = lineNamed(previous, construction.line);
  const point = pointNamed(previous, construction.point);

  if (!line || !point) {
    return diagnostic(`Parallel line ${construction.label} needs line and point dependencies.`);
  }

  const [a, b] = line.through;
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  const p2 = toWorldPoint({
    x: point.position.x + dx,
    y: point.position.y + dy,
  });

  return {
    id: construction.id,
    kind: "line",
    label: construction.label,
    shapeRole: construction.shapeRole ?? "primary",
    through: [point.position, p2],
  };
}

function realizePerpendicularLine(
  construction: ConstructionOf<"perpendicular-line">,
  previous: ReadonlyMap<ConstructionId, EvaluatedPrimitive>,
): RealizationStep {
  const line = lineNamed(previous, construction.line);
  const point = pointNamed(previous, construction.point);

  if (!line || !point) {
    return diagnostic(`Perpendicular line ${construction.label} needs line and point dependencies.`);
  }

  const [a, b] = line.through;
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  const p2 = toWorldPoint({
    x: point.position.x - dy,
    y: point.position.y + dx,
  });

  return {
    id: construction.id,
    kind: "line",
    label: construction.label,
    shapeRole: construction.shapeRole ?? "primary",
    through: [point.position, p2],
  };
}

function realizeMidpoint(
  construction: ConstructionOf<"midpoint">,
  previous: ReadonlyMap<ConstructionId, EvaluatedPrimitive>,
): RealizationStep {
  const a = pointNamed(previous, construction.points[0]);
  const b = pointNamed(previous, construction.points[1]);

  if (!a || !b) {
    return diagnostic(`Midpoint ${construction.label} needs two point dependencies.`);
  }

  const position = toWorldPoint({
    x: (a.position.x + b.position.x) / 2,
    y: (a.position.y + b.position.y) / 2,
  });

  return {
    id: construction.id,
    kind: "point",
    label: construction.label,
    position,
  };
}

function pointIntersection(
  construction: ConstructionOf<"line-circle-intersection" | "circle-circle-intersection">,
  intersections: readonly { x: number; y: number }[],
): RealizationStep {
  if (intersections.length === 0) {
    return diagnostic(`Intersection ${construction.label} has no intersection points.`);
  }

  const position = intersections[construction.intersectionIndex];
  if (!position) {
    return diagnostic(`Intersection ${construction.label} index out of bounds.`);
  }

  return {
    id: construction.id,
    kind: "point",
    label: construction.label,
    position: toWorldPoint(position),
  };
}

function diagnostic(message: string): RealizationStep {
  return {
    kind: "diagnostic",
    message,
  };
}

function pointNamed(previous: ReadonlyMap<ConstructionId, EvaluatedPrimitive>, id: ConstructionId) {
  const primitive = previous.get(id);
  return primitive?.kind === "point" ? primitive : undefined;
}

function lineNamed(previous: ReadonlyMap<ConstructionId, EvaluatedPrimitive>, id: ConstructionId) {
  const primitive = previous.get(id);
  return primitive?.kind === "line" ? primitive : undefined;
}

function circleNamed(previous: ReadonlyMap<ConstructionId, EvaluatedPrimitive>, id: ConstructionId) {
  const primitive = previous.get(id);
  return primitive?.kind === "circle" ? primitive : undefined;
}
