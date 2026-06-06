import type { Construction, ConstructionId, EvaluatedPrimitive, EvaluationDiagnostic } from "./model";
import { lineLineIntersection, samePoint } from "./approx";

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

  if (construction.kind === "circle-three-points") {
    const a = pointNamed(previous, construction.points[0]);
    const b = pointNamed(previous, construction.points[1]);
    const c = pointNamed(previous, construction.points[2]);

    if (!a || !b || !c) {
      return {
        kind: "diagnostic",
        message: `Circle ${construction.label} needs three point dependencies.`,
      };
    }

    const ap = a.position;
    const bp = b.position;
    const cp = c.position;

    if (samePoint(ap, bp) || samePoint(bp, cp) || samePoint(cp, ap)) {
      return {
        kind: "diagnostic",
        message: `Circle ${construction.label} needs three distinct points.`,
      };
    }

    const d = 2 * (ap.x * (bp.y - cp.y) + bp.x * (cp.y - ap.y) + cp.x * (ap.y - bp.y));

    if (Math.abs(d) < 1e-9) {
      return {
        kind: "diagnostic",
        message: `Circle ${construction.label} cannot be circumscribed through collinear points.`,
      };
    }

    const aSq = ap.x * ap.x + ap.y * ap.y;
    const bSq = bp.x * bp.x + bp.y * bp.y;
    const cSq = cp.x * cp.x + cp.y * cp.y;

    const center = {
      x: (aSq * (bp.y - cp.y) + bSq * (cp.y - ap.y) + cSq * (ap.y - bp.y)) / d,
      y: (aSq * (cp.x - bp.x) + bSq * (ap.x - cp.x) + cSq * (bp.x - ap.x)) / d,
    };

    return {
      id: construction.id,
      kind: "circle",
      label: construction.label,
      center,
      pointOnCircle: ap,
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
