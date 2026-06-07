import type { AssessmentGoal } from "./goals";
import { toWorldPoint, type Construction, type ConstructionExpression } from "@euclid/geometry";

export type AssessmentGoalParseResult =
  | Readonly<{
      ok: true;
      goal: AssessmentGoal;
    }>
  | Readonly<{
      ok: false;
      diagnostics: readonly string[];
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

  return decodeAssessmentGoal(parsed, "goal");
}

function decodeAssessmentGoal(value: unknown, path: string): AssessmentGoalParseResult {
  if (!isRecord(value)) {
    return invalid(`${path} must be a JSON object.`);
  }

  if (typeof value.kind !== "string") {
    return invalid(`${path}.kind must be a string.`);
  }

  if (value.description !== undefined && typeof value.description !== "string") {
    return invalid(`${path}.description must be a string when present.`);
  }

  const descriptionObj = value.description === undefined ? {} : { description: value.description };

  if (value.kind === "all" || value.kind === "any") {
    if (value.id !== undefined && typeof value.id !== "string") {
      return invalid(`${path}.id must be a string when present.`);
    }

    if (!Array.isArray(value.goals)) {
      return invalid(`${path}.goals must be an array.`);
    }

    const goals: AssessmentGoal[] = [];
    for (const [index, child] of value.goals.entries()) {
      const decoded = decodeAssessmentGoal(child, `${path}.goals[${index}]`);
      if (!decoded.ok) {
        return decoded;
      }
      goals.push(decoded.goal);
    }

    return {
      ok: true,
      goal: {
        kind: value.kind,
        ...(value.id === undefined ? {} : { id: value.id }),
        ...descriptionObj,
        goals,
      },
    };
  }

  if (value.kind === "construction-kind") {
    if (!isConstructionKind(value.constructionKind)) {
      return invalid(`${path}.constructionKind must be a construction kind.`);
    }

    return {
      ok: true,
      goal: {
        kind: "construction-kind",
        constructionKind: value.constructionKind,
        ...descriptionObj,
      },
    };
  }

  if (value.kind === "dependency") {
    if (typeof value.targetId !== "string") {
      return invalid(`${path}.targetId must be a string.`);
    }
    if (typeof value.sourceId !== "string") {
      return invalid(`${path}.sourceId must be a string.`);
    }
    if (value.transitive !== undefined && typeof value.transitive !== "boolean") {
      return invalid(`${path}.transitive must be a boolean when present.`);
    }

    return {
      ok: true,
      goal: {
        kind: "dependency",
        targetId: value.targetId,
        sourceId: value.sourceId,
        ...(value.transitive === undefined ? {} : { transitive: value.transitive }),
        ...descriptionObj,
      },
    };
  }

  if (value.kind === "meaning") {
    if (typeof value.id !== "string") {
      return invalid(`${path}.id must be a string.`);
    }

    const expression = decodeConstructionExpression(value.expression, `${path}.expression`);
    if (!expression.ok) {
      return invalid(expression.diagnostic);
    }

    return {
      ok: true,
      goal: {
        kind: "meaning",
        id: value.id,
        expression: expression.expression,
        ...descriptionObj,
      },
    };
  }

  if (value.kind === "point-on-line") {
    if (typeof value.pointId !== "string") {
      return invalid(`${path}.pointId must be a string.`);
    }
    if (typeof value.lineId !== "string") {
      return invalid(`${path}.lineId must be a string.`);
    }
    const tolerance = decodeTolerance(value.tolerance, `${path}.tolerance`);
    if (!tolerance.ok) {
      return invalid(tolerance.diagnostic);
    }

    return {
      ok: true,
      goal: {
        kind: "point-on-line",
        pointId: value.pointId,
        lineId: value.lineId,
        ...(tolerance.tolerance === undefined ? {} : { tolerance: tolerance.tolerance }),
        ...descriptionObj,
      },
    };
  }

  if (value.kind === "point-on-circle") {
    if (typeof value.pointId !== "string") {
      return invalid(`${path}.pointId must be a string.`);
    }
    if (typeof value.circleId !== "string") {
      return invalid(`${path}.circleId must be a string.`);
    }
    const tolerance = decodeTolerance(value.tolerance, `${path}.tolerance`);
    if (!tolerance.ok) {
      return invalid(tolerance.diagnostic);
    }

    return {
      ok: true,
      goal: {
        kind: "point-on-circle",
        pointId: value.pointId,
        circleId: value.circleId,
        ...(tolerance.tolerance === undefined ? {} : { tolerance: tolerance.tolerance }),
        ...descriptionObj,
      },
    };
  }

  if (value.kind === "geometric-equivalent") {
    if (!Array.isArray(value.targetConstructions)) {
      return invalid(`${path}.targetConstructions must be an array.`);
    }
    if (typeof value.targetId !== "string") {
      return invalid(`${path}.targetId must be a string.`);
    }
    const tolerance = decodeTolerance(value.tolerance, `${path}.tolerance`);
    if (!tolerance.ok) {
      return invalid(tolerance.diagnostic);
    }

    const targetConstructions: Construction[] = [];
    for (const [index, child] of value.targetConstructions.entries()) {
      const decoded = decodeConstruction(child, `${path}.targetConstructions[${index}]`);
      if (!decoded.ok) {
        return invalid(decoded.diagnostic);
      }
      targetConstructions.push(decoded.construction);
    }

    return {
      ok: true,
      goal: {
        kind: "geometric-equivalent",
        targetConstructions,
        targetId: value.targetId,
        ...(tolerance.tolerance === undefined ? {} : { tolerance: tolerance.tolerance }),
        ...descriptionObj,
      },
    };
  }

  return invalid(`${path}.kind is not a supported assessment goal kind.`);
}

type ConstructionDecodeResult =
  | Readonly<{
      ok: true;
      construction: Construction;
    }>
  | Readonly<{
      ok: false;
      diagnostic: string;
    }>;

function decodeConstruction(value: unknown, path: string): ConstructionDecodeResult {
  if (!isRecord(value)) {
    return constructionInvalid(`${path} must be a JSON object.`);
  }
  if (typeof value.id !== "string") {
    return constructionInvalid(`${path}.id must be a string.`);
  }
  if (typeof value.label !== "string") {
    return constructionInvalid(`${path}.label must be a string.`);
  }
  if (typeof value.kind !== "string") {
    return constructionInvalid(`${path}.kind must be a string.`);
  }

  const exprDecode = decodeConstructionExpression(value, path);
  if (!exprDecode.ok) {
    return constructionInvalid(exprDecode.diagnostic);
  }

  if (value.kind === "free-point") {
    if (
      !isRecord(value.position) ||
      typeof value.position.x !== "number" ||
      typeof value.position.y !== "number"
    ) {
      return constructionInvalid(`${path}.position must be a Point2 object.`);
    }
    return {
      ok: true,
      construction: {
        id: value.id,
        kind: "free-point",
        label: value.label,
        position: toWorldPoint({
          x: value.position.x,
          y: value.position.y,
        }),
      },
    };
  }

  return {
    ok: true,
    construction: {
      id: value.id,
      label: value.label,
      ...exprDecode.expression,
    } as unknown as Construction,
  };
}

function constructionInvalid(diagnostic: string): ConstructionDecodeResult {
  return {
    ok: false,
    diagnostic,
  };
}

type ExpressionDecodeResult =
  | Readonly<{
      ok: true;
      expression: ConstructionExpression;
    }>
  | Readonly<{
      ok: false;
      diagnostic: string;
    }>;

function decodeConstructionExpression(value: unknown, path: string): ExpressionDecodeResult {
  if (!isRecord(value)) {
    return expressionInvalid(`${path} must be a JSON object.`);
  }

  if (typeof value.kind !== "string") {
    return expressionInvalid(`${path}.kind must be a string.`);
  }

  if (value.kind === "free-point") {
    return {
      ok: true,
      expression: {
        kind: "free-point",
      },
    };
  }

  if (value.kind === "line-through") {
    const points = decodeIdPair(value.points, `${path}.points`);
    return points.ok
      ? {
          ok: true,
          expression: {
            kind: "line-through",
            points: points.ids,
          },
        }
      : expressionInvalid(points.diagnostic);
  }

  if (value.kind === "circle-through") {
    if (typeof value.center !== "string") {
      return expressionInvalid(`${path}.center must be a string.`);
    }
    if (typeof value.pointOnCircle !== "string") {
      return expressionInvalid(`${path}.pointOnCircle must be a string.`);
    }

    return {
      ok: true,
      expression: {
        kind: "circle-through",
        center: value.center,
        pointOnCircle: value.pointOnCircle,
      },
    };
  }

  if (value.kind === "circle-three-points") {
    const points = decodeIdTriple(value.points, `${path}.points`);
    return points.ok
      ? {
          ok: true,
          expression: {
            kind: "circle-three-points",
            points: points.ids,
          },
        }
      : expressionInvalid(points.diagnostic);
  }

  if (value.kind === "line-line-intersection") {
    const lines = decodeIdPair(value.lines, `${path}.lines`);
    return lines.ok
      ? {
          ok: true,
          expression: {
            kind: "line-line-intersection",
            lines: lines.ids,
          },
        }
      : expressionInvalid(lines.diagnostic);
  }

  if (value.kind === "line-circle-intersection") {
    if (typeof value.line !== "string") {
      return expressionInvalid(`${path}.line must be a string.`);
    }
    if (typeof value.circle !== "string") {
      return expressionInvalid(`${path}.circle must be a string.`);
    }
    const intersectionIndex = decodeIntersectionIndex(value.intersectionIndex, `${path}.intersectionIndex`);
    if (!intersectionIndex.ok) {
      return expressionInvalid(intersectionIndex.diagnostic);
    }

    return {
      ok: true,
      expression: {
        kind: "line-circle-intersection",
        line: value.line,
        circle: value.circle,
        intersectionIndex: intersectionIndex.value,
      },
    };
  }

  if (value.kind === "circle-circle-intersection") {
    if (typeof value.firstCircle !== "string") {
      return expressionInvalid(`${path}.firstCircle must be a string.`);
    }
    if (typeof value.secondCircle !== "string") {
      return expressionInvalid(`${path}.secondCircle must be a string.`);
    }
    const intersectionIndex = decodeIntersectionIndex(value.intersectionIndex, `${path}.intersectionIndex`);
    if (!intersectionIndex.ok) {
      return expressionInvalid(intersectionIndex.diagnostic);
    }

    return {
      ok: true,
      expression: {
        kind: "circle-circle-intersection",
        firstCircle: value.firstCircle,
        secondCircle: value.secondCircle,
        intersectionIndex: intersectionIndex.value,
      },
    };
  }

  if (value.kind === "parallel-line") {
    if (typeof value.line !== "string") {
      return expressionInvalid(`${path}.line must be a string.`);
    }
    if (typeof value.point !== "string") {
      return expressionInvalid(`${path}.point must be a string.`);
    }

    return {
      ok: true,
      expression: {
        kind: "parallel-line",
        line: value.line,
        point: value.point,
      },
    };
  }

  if (value.kind === "perpendicular-line") {
    if (typeof value.line !== "string") {
      return expressionInvalid(`${path}.line must be a string.`);
    }
    if (typeof value.point !== "string") {
      return expressionInvalid(`${path}.point must be a string.`);
    }

    return {
      ok: true,
      expression: {
        kind: "perpendicular-line",
        line: value.line,
        point: value.point,
      },
    };
  }

  if (value.kind === "midpoint") {
    const points = decodeIdPair(value.points, `${path}.points`);
    return points.ok
      ? {
          ok: true,
          expression: {
            kind: "midpoint",
            points: points.ids,
          },
        }
      : expressionInvalid(points.diagnostic);
  }

  return expressionInvalid(`${path}.kind is not a supported construction expression kind.`);
}

type IdPairDecodeResult =
  | Readonly<{
      ok: true;
      ids: readonly [string, string];
    }>
  | Readonly<{
      ok: false;
      diagnostic: string;
    }>;

function decodeIdPair(value: unknown, path: string): IdPairDecodeResult {
  if (!Array.isArray(value) || value.length !== 2 || !value.every((item) => typeof item === "string")) {
    return {
      ok: false,
      diagnostic: `${path} must be an array of 2 strings.`,
    };
  }

  return {
    ok: true,
    ids: [value[0], value[1]],
  };
}

type IdTripleDecodeResult =
  | Readonly<{
      ok: true;
      ids: readonly [string, string, string];
    }>
  | Readonly<{
      ok: false;
      diagnostic: string;
    }>;

function decodeIdTriple(value: unknown, path: string): IdTripleDecodeResult {
  if (!Array.isArray(value) || value.length !== 3 || !value.every((item) => typeof item === "string")) {
    return {
      ok: false,
      diagnostic: `${path} must be an array of 3 strings.`,
    };
  }

  return {
    ok: true,
    ids: [value[0], value[1], value[2]],
  };
}

type ToleranceDecodeResult =
  | Readonly<{
      ok: true;
      tolerance: { epsilon: number } | undefined;
    }>
  | Readonly<{
      ok: false;
      diagnostic: string;
    }>;

function decodeTolerance(value: unknown, path: string): ToleranceDecodeResult {
  if (value === undefined) {
    return {
      ok: true,
      tolerance: undefined,
    };
  }

  if (!isRecord(value)) {
    return {
      ok: false,
      diagnostic: `${path} must be a JSON object when present.`,
    };
  }

  if (typeof value.epsilon !== "number" || !Number.isFinite(value.epsilon) || value.epsilon < 0) {
    return {
      ok: false,
      diagnostic: `${path}.epsilon must be a non-negative finite number.`,
    };
  }

  return {
    ok: true,
    tolerance: {
      epsilon: value.epsilon,
    },
  };
}

type IntersectionIndexDecodeResult =
  | Readonly<{
      ok: true;
      value: 0 | 1;
    }>
  | Readonly<{
      ok: false;
      diagnostic: string;
    }>;

function decodeIntersectionIndex(value: unknown, path: string): IntersectionIndexDecodeResult {
  if (value === 0 || value === 1) {
    return {
      ok: true,
      value,
    };
  }

  return {
    ok: false,
    diagnostic: `${path} must be 0 or 1.`,
  };
}

function isConstructionKind(value: unknown): value is Construction["kind"] {
  return (
    value === "free-point" ||
    value === "line-through" ||
    value === "circle-through" ||
    value === "circle-three-points" ||
    value === "line-line-intersection" ||
    value === "line-circle-intersection" ||
    value === "circle-circle-intersection" ||
    value === "parallel-line" ||
    value === "perpendicular-line" ||
    value === "midpoint"
  );
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

function expressionInvalid(diagnostic: string): ExpressionDecodeResult {
  return {
    ok: false,
    diagnostic,
  };
}
