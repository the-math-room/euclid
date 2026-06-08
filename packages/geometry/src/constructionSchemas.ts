import { z } from "zod";
import { toWorldPoint, type Construction } from "./model";

export const constructionKinds = [
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

export const idPairSchema = z.tuple([z.string(), z.string()]);
export const idTripleSchema = z.tuple([z.string(), z.string(), z.string()]);
export const intersectionIndexSchema = z.union([z.literal(0), z.literal(1)]);
export const point2Schema = z.object({
  x: z.number(),
  y: z.number(),
});
export const shapeRoleSchema = z.union([z.literal("primary"), z.literal("auxiliary")]);

export const freePointExpressionSchema = z.object({
  kind: z.literal("free-point"),
});

export const lineThroughExpressionSchema = z.object({
  kind: z.literal("line-through"),
  points: idPairSchema,
});

export const circleThroughExpressionSchema = z.object({
  kind: z.literal("circle-through"),
  center: z.string(),
  pointOnCircle: z.string(),
});

export const circleThreePointsExpressionSchema = z.object({
  kind: z.literal("circle-three-points"),
  points: idTripleSchema,
});

export const lineLineIntersectionExpressionSchema = z.object({
  kind: z.literal("line-line-intersection"),
  lines: idPairSchema,
});

export const lineCircleIntersectionExpressionSchema = z.object({
  kind: z.literal("line-circle-intersection"),
  line: z.string(),
  circle: z.string(),
  intersectionIndex: intersectionIndexSchema,
});

export const circleCircleIntersectionExpressionSchema = z.object({
  kind: z.literal("circle-circle-intersection"),
  firstCircle: z.string(),
  secondCircle: z.string(),
  intersectionIndex: intersectionIndexSchema,
});

export const parallelLineExpressionSchema = z.object({
  kind: z.literal("parallel-line"),
  line: z.string(),
  point: z.string(),
});

export const perpendicularLineExpressionSchema = z.object({
  kind: z.literal("perpendicular-line"),
  line: z.string(),
  point: z.string(),
});

export const midpointExpressionSchema = z.object({
  kind: z.literal("midpoint"),
  points: idPairSchema,
});

export const constructionExpressionSchema = z.discriminatedUnion("kind", [
  freePointExpressionSchema,
  lineThroughExpressionSchema,
  circleThroughExpressionSchema,
  circleThreePointsExpressionSchema,
  lineLineIntersectionExpressionSchema,
  lineCircleIntersectionExpressionSchema,
  circleCircleIntersectionExpressionSchema,
  parallelLineExpressionSchema,
  perpendicularLineExpressionSchema,
  midpointExpressionSchema,
]);

export const freePointConstructionSchema = freePointExpressionSchema.extend({
  id: z.string(),
  label: z.string(),
  position: point2Schema,
});

export const constructionSchema = z.discriminatedUnion("kind", [
  freePointConstructionSchema,
  lineThroughExpressionSchema.extend({
    id: z.string(),
    label: z.string(),
    shapeRole: shapeRoleSchema.optional(),
  }),
  circleThroughExpressionSchema.extend({
    id: z.string(),
    label: z.string(),
    shapeRole: shapeRoleSchema.optional(),
  }),
  circleThreePointsExpressionSchema.extend({
    id: z.string(),
    label: z.string(),
    shapeRole: shapeRoleSchema.optional(),
  }),
  lineLineIntersectionExpressionSchema.extend({ id: z.string(), label: z.string() }),
  lineCircleIntersectionExpressionSchema.extend({ id: z.string(), label: z.string() }),
  circleCircleIntersectionExpressionSchema.extend({ id: z.string(), label: z.string() }),
  parallelLineExpressionSchema.extend({
    id: z.string(),
    label: z.string(),
    shapeRole: shapeRoleSchema.optional(),
  }),
  perpendicularLineExpressionSchema.extend({
    id: z.string(),
    label: z.string(),
    shapeRole: shapeRoleSchema.optional(),
  }),
  midpointExpressionSchema.extend({ id: z.string(), label: z.string() }),
]);

export type RawConstructionExpression = z.infer<typeof constructionExpressionSchema>;
export type RawConstruction = z.infer<typeof constructionSchema>;

export function rawConstructionToConstruction(construction: RawConstruction): Construction {
  switch (construction.kind) {
    case "free-point":
      return {
        id: construction.id,
        kind: "free-point",
        label: construction.label,
        position: toWorldPoint(construction.position),
      };
    case "line-through":
    case "circle-through":
    case "circle-three-points":
    case "line-line-intersection":
    case "line-circle-intersection":
    case "circle-circle-intersection":
    case "parallel-line":
    case "perpendicular-line":
    case "midpoint":
      return construction;
  }
}
