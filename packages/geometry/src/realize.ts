import type { Construction, ConstructionId, EvaluatedPrimitive, EvaluationDiagnostic, Point2 } from "./model";

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
  if (construction.kind === "free-point") {
    return {
      id: construction.id,
      kind: "point",
      label: construction.label,
      position: construction.position,
    };
  }

  if (construction.kind === "line-through") {
    const a = pointNamed(previous, construction.points[0]);
    const b = pointNamed(previous, construction.points[1]);

    if (!a || !b) {
      return {
        kind: "diagnostic",
        message: `Line ${construction.label} needs two point dependencies.`,
      };
    }

    if (samePoint(a.position, b.position)) {
      return {
        kind: "diagnostic",
        message: `Line ${construction.label} needs two distinct point dependencies.`,
      };
    }

    return {
      id: construction.id,
      kind: "line",
      label: construction.label,
      through: [a.position, b.position],
    };
  }

  if (construction.kind === "circle-through") {
    const center = pointNamed(previous, construction.center);
    const pointOnCircle = pointNamed(previous, construction.pointOnCircle);

    if (!center || !pointOnCircle) {
      return {
        kind: "diagnostic",
        message: `Circle ${construction.label} needs point dependencies for its center and circumference.`,
      };
    }

    if (samePoint(center.position, pointOnCircle.position)) {
      return {
        kind: "diagnostic",
        message: `Circle ${construction.label} needs distinct center and circumference points.`,
      };
    }

    return {
      id: construction.id,
      kind: "circle",
      label: construction.label,
      center: center.position,
      pointOnCircle: pointOnCircle.position,
    };
  }

  const firstLine = lineNamed(previous, construction.lines[0]);
  const secondLine = lineNamed(previous, construction.lines[1]);

  if (!firstLine || !secondLine) {
    return {
      kind: "diagnostic",
      message: `Intersection ${construction.label} needs two line dependencies.`,
    };
  }

  const position = lineLineIntersection(firstLine.through, secondLine.through);

  if (!position) {
    return {
      kind: "diagnostic",
      message: `Intersection ${construction.label} needs non-parallel line dependencies.`,
    };
  }

  return {
    id: construction.id,
    kind: "point",
    label: construction.label,
    position,
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

function lineLineIntersection(
  first: readonly [Point2, Point2],
  second: readonly [Point2, Point2],
): Point2 | undefined {
  const [a, b] = first;
  const [c, d] = second;
  const ab = {
    x: b.x - a.x,
    y: b.y - a.y,
  };
  const cd = {
    x: d.x - c.x,
    y: d.y - c.y,
  };
  const denominator = cross(ab, cd);

  if (denominator === 0) {
    return undefined;
  }

  const ac = {
    x: c.x - a.x,
    y: c.y - a.y,
  };
  const t = cross(ac, cd) / denominator;

  return {
    x: a.x + t * ab.x,
    y: a.y + t * ab.y,
  };
}

function cross(a: Point2, b: Point2): number {
  return a.x * b.y - a.y * b.x;
}

function samePoint(a: Point2, b: Point2): boolean {
  return a.x === b.x && a.y === b.y;
}
