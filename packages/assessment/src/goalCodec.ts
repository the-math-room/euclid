import { toWorldPoint, type Construction } from "@euclid/geometry";
import { z } from "zod";
import type { AssessmentGoal } from "./goals";

export type AssessmentGoalParseResult =
  | Readonly<{
      ok: true;
      goal: AssessmentGoal;
    }>
  | Readonly<{
      ok: false;
      diagnostics: readonly string[];
    }>;

type RawConstructionExpression = z.infer<typeof constructionExpressionSchema>;
type RawConstruction = z.infer<typeof constructionSchema>;
type RawAssessmentGoal = z.infer<typeof assessmentGoalSchema>;

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
const toleranceSchema = z
  .object({
    epsilon: z.number().finite().nonnegative(),
  })
  .optional();

const point2Schema = z.object({
  x: z.number(),
  y: z.number(),
});

const freePointExpressionSchema = z.object({
  kind: z.literal("free-point"),
});

const lineThroughExpressionSchema = z.object({
  kind: z.literal("line-through"),
  points: idPairSchema,
});

const circleThroughExpressionSchema = z.object({
  kind: z.literal("circle-through"),
  center: z.string(),
  pointOnCircle: z.string(),
});

const circleThreePointsExpressionSchema = z.object({
  kind: z.literal("circle-three-points"),
  points: idTripleSchema,
});

const lineLineIntersectionExpressionSchema = z.object({
  kind: z.literal("line-line-intersection"),
  lines: idPairSchema,
});

const lineCircleIntersectionExpressionSchema = z.object({
  kind: z.literal("line-circle-intersection"),
  line: z.string(),
  circle: z.string(),
  intersectionIndex: intersectionIndexSchema,
});

const circleCircleIntersectionExpressionSchema = z.object({
  kind: z.literal("circle-circle-intersection"),
  firstCircle: z.string(),
  secondCircle: z.string(),
  intersectionIndex: intersectionIndexSchema,
});

const parallelLineExpressionSchema = z.object({
  kind: z.literal("parallel-line"),
  line: z.string(),
  point: z.string(),
});

const perpendicularLineExpressionSchema = z.object({
  kind: z.literal("perpendicular-line"),
  line: z.string(),
  point: z.string(),
});

const midpointExpressionSchema = z.object({
  kind: z.literal("midpoint"),
  points: idPairSchema,
});

const constructionExpressionSchema = z.discriminatedUnion("kind", [
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

const freePointConstructionSchema = freePointExpressionSchema.extend({
  id: z.string(),
  label: z.string(),
  position: point2Schema,
});

const constructionSchema = z.discriminatedUnion("kind", [
  freePointConstructionSchema,
  lineThroughExpressionSchema.extend({ id: z.string(), label: z.string() }),
  circleThroughExpressionSchema.extend({ id: z.string(), label: z.string() }),
  circleThreePointsExpressionSchema.extend({ id: z.string(), label: z.string() }),
  lineLineIntersectionExpressionSchema.extend({ id: z.string(), label: z.string() }),
  lineCircleIntersectionExpressionSchema.extend({ id: z.string(), label: z.string() }),
  circleCircleIntersectionExpressionSchema.extend({ id: z.string(), label: z.string() }),
  parallelLineExpressionSchema.extend({ id: z.string(), label: z.string() }),
  perpendicularLineExpressionSchema.extend({ id: z.string(), label: z.string() }),
  midpointExpressionSchema.extend({ id: z.string(), label: z.string() }),
]);

const descriptionSchema = {
  description: z.string().optional(),
} as const;

const assessmentGoalSchema: z.ZodType<RawAssessmentGoalInput> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("all"),
      id: z.string().optional(),
      goals: z.array(assessmentGoalSchema),
      ...descriptionSchema,
    }),
    z.object({
      kind: z.literal("any"),
      id: z.string().optional(),
      goals: z.array(assessmentGoalSchema),
      ...descriptionSchema,
    }),
    z.object({
      kind: z.literal("construction-kind"),
      constructionKind: z.enum(constructionKinds),
      ...descriptionSchema,
    }),
    z.object({
      kind: z.literal("dependency"),
      targetId: z.string(),
      sourceId: z.string(),
      transitive: z.boolean().optional(),
      ...descriptionSchema,
    }),
    z.object({
      kind: z.literal("meaning"),
      id: z.string(),
      expression: constructionExpressionSchema,
      ...descriptionSchema,
    }),
    z.object({
      kind: z.literal("point-on-line"),
      pointId: z.string(),
      lineId: z.string(),
      tolerance: toleranceSchema,
      ...descriptionSchema,
    }),
    z.object({
      kind: z.literal("point-on-circle"),
      pointId: z.string(),
      circleId: z.string(),
      tolerance: toleranceSchema,
      ...descriptionSchema,
    }),
    z.object({
      kind: z.literal("geometric-equivalent"),
      targetConstructions: z.array(constructionSchema),
      targetId: z.string(),
      tolerance: toleranceSchema,
      ...descriptionSchema,
    }),
  ]),
);

type RawAssessmentGoalInput =
  | Readonly<{
      kind: "all";
      id?: string;
      description?: string;
      goals: readonly RawAssessmentGoalInput[];
    }>
  | Readonly<{
      kind: "any";
      id?: string;
      description?: string;
      goals: readonly RawAssessmentGoalInput[];
    }>
  | Readonly<{
      kind: "construction-kind";
      description?: string;
      constructionKind: Construction["kind"];
    }>
  | Readonly<{
      kind: "dependency";
      description?: string;
      targetId: string;
      sourceId: string;
      transitive?: boolean;
    }>
  | Readonly<{
      kind: "meaning";
      description?: string;
      id: string;
      expression: RawConstructionExpression;
    }>
  | Readonly<{
      kind: "point-on-line";
      description?: string;
      pointId: string;
      lineId: string;
      tolerance?: { epsilon: number };
    }>
  | Readonly<{
      kind: "point-on-circle";
      description?: string;
      pointId: string;
      circleId: string;
      tolerance?: { epsilon: number };
    }>
  | Readonly<{
      kind: "geometric-equivalent";
      description?: string;
      targetConstructions: readonly RawConstruction[];
      targetId: string;
      tolerance?: { epsilon: number };
    }>;

export function serializeAssessmentGoal(goal: AssessmentGoal): string {
  return JSON.stringify(goal, null, 2);
}

export function parseAssessmentGoal(text: string): AssessmentGoalParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return invalid("Assessment goal is not valid JSON.");
  }

  const decoded = decodeAssessmentGoal(parsed);
  return decoded.ok ? { ok: true, goal: decoded.goal } : invalid(decoded.diagnostic);
}

type GoalDecodeResult =
  | Readonly<{ ok: true; goal: AssessmentGoal }>
  | Readonly<{ ok: false; diagnostic: string }>;

function decodeAssessmentGoal(value: unknown): GoalDecodeResult {
  const parsed = assessmentGoalSchema.safeParse(value);
  if (!parsed.success) {
    return goalInvalid(diagnosticForGoalError(parsed.error, value, "goal"));
  }

  return {
    ok: true,
    goal: mapAssessmentGoal(parsed.data),
  };
}

function mapAssessmentGoal(goal: RawAssessmentGoal): AssessmentGoal {
  if (goal.kind === "all") {
    return {
      kind: "all",
      ...(goal.id === undefined ? {} : { id: goal.id }),
      ...descriptionOf(goal),
      goals: goal.goals.map(mapAssessmentGoal),
    };
  }

  if (goal.kind === "any") {
    return {
      kind: "any",
      ...(goal.id === undefined ? {} : { id: goal.id }),
      ...descriptionOf(goal),
      goals: goal.goals.map(mapAssessmentGoal),
    };
  }

  if (goal.kind === "geometric-equivalent") {
    return {
      kind: "geometric-equivalent",
      ...descriptionOf(goal),
      targetConstructions: goal.targetConstructions.map(mapConstruction),
      targetId: goal.targetId,
      ...(goal.tolerance === undefined ? {} : { tolerance: goal.tolerance }),
    };
  }

  return goal;
}

function mapConstruction(construction: RawConstruction): Construction {
  if (construction.kind === "free-point") {
    return {
      id: construction.id,
      kind: "free-point",
      label: construction.label,
      position: toWorldPoint(construction.position),
    };
  }

  return {
    ...construction,
  };
}

function descriptionOf(goal: { description?: string }): { description?: string } {
  return goal.description === undefined ? {} : { description: goal.description };
}

function diagnosticForGoalError(error: z.ZodError, value: unknown, path: string): string {
  const issue = error.issues[0];
  if (!issue) {
    return `${path} must be a JSON object.`;
  }

  const issuePath = pathForIssue(path, issue.path);
  const field = issue.path.at(-1);

  if (issue.path.length === 0) {
    return `${path} must be a JSON object.`;
  }

  if (field === "kind") {
    return `${issuePath} is not a supported assessment goal kind.`;
  }

  if (field === "constructionKind") {
    return `${issuePath} must be a construction kind.`;
  }

  if (field === "goals") {
    return `${issuePath} must be an array.`;
  }

  if (field === "expression") {
    return `${issuePath} must be a JSON object.`;
  }

  if (field === "targetConstructions") {
    return `${issuePath} must be an array.`;
  }

  if (field === "tolerance") {
    return `${issuePath} must be a JSON object when present.`;
  }

  if (field === "epsilon") {
    return `${issuePath} must be a non-negative finite number.`;
  }

  if (field === "points") {
    return `${issuePath} must be an array of ${pointsTupleLength(value, issue.path)} strings.`;
  }

  if (field === "lines") {
    return `${issuePath} must be an array of 2 strings.`;
  }

  if (field === "intersectionIndex") {
    return `${issuePath} must be 0 or 1.`;
  }

  if (field === "position") {
    return `${issuePath} must be a Point2 object.`;
  }

  if (field === "description") {
    return `${issuePath} must be a string when present.`;
  }

  if (field === "id" && parentGoalKind(value, issue.path) === "all") {
    return `${issuePath} must be a string when present.`;
  }

  if (field === "id" && parentGoalKind(value, issue.path) === "any") {
    return `${issuePath} must be a string when present.`;
  }

  if (field === "transitive") {
    return `${issuePath} must be a boolean when present.`;
  }

  if (typeof field === "string") {
    return `${issuePath} must be a string.`;
  }

  return `${path} must be a JSON object.`;
}

function pathForIssue(root: string, issuePath: readonly PropertyKey[]): string {
  return issuePath.reduce<string>((current, segment) => {
    return typeof segment === "number" ? `${current}[${segment}]` : `${current}.${String(segment)}`;
  }, root);
}

function pointsTupleLength(root: unknown, path: readonly PropertyKey[]): 2 | 3 {
  const parent = valueAtPath(root, path.slice(0, -1));
  return isRecord(parent) && parent.kind === "circle-three-points" ? 3 : 2;
}

function parentGoalKind(root: unknown, path: readonly PropertyKey[]): string | undefined {
  const parent = valueAtPath(root, path.slice(0, -1));
  return isRecord(parent) && typeof parent.kind === "string" ? parent.kind : undefined;
}

function valueAtPath(root: unknown, path: readonly PropertyKey[]): unknown {
  let value = root;
  for (const segment of path) {
    if (typeof segment === "number" && Array.isArray(value)) {
      value = value[segment];
      continue;
    }

    if (typeof segment === "string" && isRecord(value)) {
      value = value[segment];
      continue;
    }

    return undefined;
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(message: string): AssessmentGoalParseResult {
  return {
    ok: false,
    diagnostics: [message],
  };
}

function goalInvalid(diagnostic: string): GoalDecodeResult {
  return {
    ok: false,
    diagnostic,
  };
}
