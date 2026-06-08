import { toWorldPoint, type Construction } from "@euclid/geometry";
import { z } from "zod";

export type ConstructionDecodeResult =
  | Readonly<{ ok: true; construction: Construction }>
  | Readonly<{ ok: false; diagnostic: string }>;

const constructionKinds = [
  "free-point",
  "line-through",
  "circle-through",
  "circle-three-points",
  "line-line-intersection",
  "line-circle-intersection",
  "circle-circle-intersection",
  "parallel-line",
  "perpendicular-line",
  "midpoint",
] as const satisfies readonly Construction["kind"][];

const idPairSchema = z.tuple([z.string(), z.string()]);
const idTripleSchema = z.tuple([z.string(), z.string(), z.string()]);
const intersectionIndexSchema = z.union([z.literal(0), z.literal(1)]);
const point2Schema = z.object({
  x: z.number(),
  y: z.number(),
});

const freePointSchema = z.object({
  id: z.string(),
  kind: z.literal("free-point"),
  label: z.string(),
  position: point2Schema,
});

const lineThroughSchema = z.object({
  id: z.string(),
  kind: z.literal("line-through"),
  label: z.string(),
  points: idPairSchema,
});

const circleThroughSchema = z.object({
  id: z.string(),
  kind: z.literal("circle-through"),
  label: z.string(),
  center: z.string(),
  pointOnCircle: z.string(),
});

const circleThreePointsSchema = z.object({
  id: z.string(),
  kind: z.literal("circle-three-points"),
  label: z.string(),
  points: idTripleSchema,
});

const lineLineIntersectionSchema = z.object({
  id: z.string(),
  kind: z.literal("line-line-intersection"),
  label: z.string(),
  lines: idPairSchema,
});

const lineCircleIntersectionSchema = z.object({
  id: z.string(),
  kind: z.literal("line-circle-intersection"),
  label: z.string(),
  line: z.string(),
  circle: z.string(),
  intersectionIndex: intersectionIndexSchema,
});

const circleCircleIntersectionSchema = z.object({
  id: z.string(),
  kind: z.literal("circle-circle-intersection"),
  label: z.string(),
  firstCircle: z.string(),
  secondCircle: z.string(),
  intersectionIndex: intersectionIndexSchema,
});

const parallelLineSchema = z.object({
  id: z.string(),
  kind: z.literal("parallel-line"),
  label: z.string(),
  line: z.string(),
  point: z.string(),
});

const perpendicularLineSchema = z.object({
  id: z.string(),
  kind: z.literal("perpendicular-line"),
  label: z.string(),
  line: z.string(),
  point: z.string(),
});

const midpointSchema = z.object({
  id: z.string(),
  kind: z.literal("midpoint"),
  label: z.string(),
  points: idPairSchema,
});

const constructionSchema = z.discriminatedUnion("kind", [
  freePointSchema,
  lineThroughSchema,
  circleThroughSchema,
  circleThreePointsSchema,
  lineLineIntersectionSchema,
  lineCircleIntersectionSchema,
  circleCircleIntersectionSchema,
  parallelLineSchema,
  perpendicularLineSchema,
  midpointSchema,
]);

type RawConstruction = z.infer<typeof constructionSchema>;

type ConstructionMapper = (construction: RawConstruction) => Construction;

const constructionMappers: Readonly<Record<Construction["kind"], ConstructionMapper>> = {
  "free-point": mapFreePoint,
  "line-through": mapLineThrough,
  "circle-through": mapCircleThrough,
  "circle-three-points": mapCircleThreePoints,
  "line-line-intersection": mapLineLineIntersection,
  "line-circle-intersection": mapLineCircleIntersection,
  "circle-circle-intersection": mapCircleCircleIntersection,
  "parallel-line": mapParallelLine,
  "perpendicular-line": mapPerpendicularLine,
  midpoint: mapMidpoint,
};

export function decodeConstruction(value: unknown, path: string): ConstructionDecodeResult {
  const parsed = constructionSchema.safeParse(value);
  if (!parsed.success) {
    return constructionInvalid(diagnosticForConstructionError(parsed.error, value, path));
  }

  return {
    ok: true,
    construction: constructionMappers[parsed.data.kind](parsed.data),
  };
}

function mapFreePoint(construction: RawConstruction): Construction {
  if (construction.kind !== "free-point") {
    return mapUnexpectedConstruction(construction);
  }

  return {
    id: construction.id,
    kind: "free-point",
    label: construction.label,
    position: toWorldPoint(construction.position),
  };
}

function mapLineThrough(construction: RawConstruction): Construction {
  if (construction.kind !== "line-through") {
    return mapUnexpectedConstruction(construction);
  }

  return {
    id: construction.id,
    kind: "line-through",
    label: construction.label,
    points: construction.points,
  };
}

function mapCircleThrough(construction: RawConstruction): Construction {
  if (construction.kind !== "circle-through") {
    return mapUnexpectedConstruction(construction);
  }

  return {
    id: construction.id,
    kind: "circle-through",
    label: construction.label,
    center: construction.center,
    pointOnCircle: construction.pointOnCircle,
  };
}

function mapCircleThreePoints(construction: RawConstruction): Construction {
  if (construction.kind !== "circle-three-points") {
    return mapUnexpectedConstruction(construction);
  }

  return {
    id: construction.id,
    kind: "circle-three-points",
    label: construction.label,
    points: construction.points,
  };
}

function mapLineLineIntersection(construction: RawConstruction): Construction {
  if (construction.kind !== "line-line-intersection") {
    return mapUnexpectedConstruction(construction);
  }

  return {
    id: construction.id,
    kind: "line-line-intersection",
    label: construction.label,
    lines: construction.lines,
  };
}

function mapLineCircleIntersection(construction: RawConstruction): Construction {
  if (construction.kind !== "line-circle-intersection") {
    return mapUnexpectedConstruction(construction);
  }

  return {
    id: construction.id,
    kind: "line-circle-intersection",
    label: construction.label,
    line: construction.line,
    circle: construction.circle,
    intersectionIndex: construction.intersectionIndex,
  };
}

function mapCircleCircleIntersection(construction: RawConstruction): Construction {
  if (construction.kind !== "circle-circle-intersection") {
    return mapUnexpectedConstruction(construction);
  }

  return {
    id: construction.id,
    kind: "circle-circle-intersection",
    label: construction.label,
    firstCircle: construction.firstCircle,
    secondCircle: construction.secondCircle,
    intersectionIndex: construction.intersectionIndex,
  };
}

function mapParallelLine(construction: RawConstruction): Construction {
  if (construction.kind !== "parallel-line") {
    return mapUnexpectedConstruction(construction);
  }

  return {
    id: construction.id,
    kind: "parallel-line",
    label: construction.label,
    line: construction.line,
    point: construction.point,
  };
}

function mapPerpendicularLine(construction: RawConstruction): Construction {
  if (construction.kind !== "perpendicular-line") {
    return mapUnexpectedConstruction(construction);
  }

  return {
    id: construction.id,
    kind: "perpendicular-line",
    label: construction.label,
    line: construction.line,
    point: construction.point,
  };
}

function mapMidpoint(construction: RawConstruction): Construction {
  if (construction.kind !== "midpoint") {
    return mapUnexpectedConstruction(construction);
  }

  return {
    id: construction.id,
    kind: "midpoint",
    label: construction.label,
    points: construction.points,
  };
}

function mapUnexpectedConstruction(construction: RawConstruction): never {
  throw new Error(`Unexpected construction kind ${construction.kind}.`);
}

function diagnosticForConstructionError(error: z.ZodError, value: unknown, path: string): string {
  const issue = error.issues[0];
  if (!issue) {
    return `${path} must be a JSON object.`;
  }

  if (issue.path.length === 0) {
    return `${path} must be a JSON object.`;
  }

  const field = issue.path[0];

  if (field === "kind") {
    return `${path}.kind is not a supported construction kind.`;
  }

  if (field === "position") {
    return `${path}.position must be a Point2 object.`;
  }

  if (field === "points") {
    return `${path}.points must be an array of ${pointsTupleLength(value)} strings.`;
  }

  if (field === "lines") {
    return `${path}.lines must be an array of 2 strings.`;
  }

  if (field === "intersectionIndex") {
    return `${path}.intersectionIndex must be 0 or 1.`;
  }

  if (typeof field === "string") {
    return `${path}.${field} must be a string.`;
  }

  return `${path} must be a JSON object.`;
}

function pointsTupleLength(value: unknown): 2 | 3 {
  return constructionKindOf(value) === "circle-three-points" ? 3 : 2;
}

function constructionKindOf(value: unknown): Construction["kind"] | undefined {
  if (!isRecord(value) || !isConstructionKind(value.kind)) {
    return undefined;
  }

  return value.kind;
}

function constructionInvalid(diagnostic: string): ConstructionDecodeResult {
  return {
    ok: false,
    diagnostic,
  };
}

function isConstructionKind(value: unknown): value is Construction["kind"] {
  return constructionKinds.includes(value as Construction["kind"]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
