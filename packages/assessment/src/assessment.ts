import {
  dependencyIds,
  type Construction,
  type ConstructionExpression,
  type ConstructionId,
  type ConstructionProgram,
  type EvaluatedPrimitive,
  type Evaluation,
  type Point2,
} from "@euclid/geometry";

export type AssessmentContext = Readonly<{
  program: ConstructionProgram;
  evaluation: Evaluation;
}>;

export type AssessmentResult = Readonly<{
  passed: boolean;
  code: string;
  message: string;
  evidence?: unknown;
}>;

export type AssessmentPredicate = (context: AssessmentContext) => AssessmentResult;

export type AssessmentTolerance = Readonly<{
  epsilon: number;
}>;

const defaultTolerance: AssessmentTolerance = {
  epsilon: 1e-6,
};

export function assessAll(
  predicates: readonly AssessmentPredicate[],
  code: string = "all",
): AssessmentPredicate {
  return (context) => {
    const results = predicates.map((predicate) => predicate(context));
    const failed = results.filter((result) => !result.passed);

    if (failed.length === 0) {
      return pass(code, "All assessment predicates passed.", { results });
    }

    return fail(code, `${failed.length} assessment predicate(s) failed.`, { results });
  };
}

export function assessAny(
  predicates: readonly AssessmentPredicate[],
  code: string = "any",
): AssessmentPredicate {
  return (context) => {
    const results = predicates.map((predicate) => predicate(context));

    if (results.some((result) => result.passed)) {
      return pass(code, "At least one assessment predicate passed.", { results });
    }

    return fail(code, "No assessment predicates passed.", { results });
  };
}

export function requiresConstructionKind(kind: Construction["kind"]): AssessmentPredicate {
  return (context) => {
    const ids = constructionIdsOfKind(context.program, kind);

    if (ids.length > 0) {
      return pass(`construction-kind:${kind}`, `Program contains ${kind}.`, { kind, ids });
    }

    return fail(`construction-kind:${kind}`, `Program does not contain ${kind}.`, { kind, ids });
  };
}

export function requiresDependency(
  targetId: ConstructionId,
  sourceId: ConstructionId,
  options: Readonly<{ transitive?: boolean }> = {},
): AssessmentPredicate {
  return (context) => {
    const transitive = options.transitive ?? true;
    const predicate = transitive ? dependsOn : directlyDependsOn;
    const passed = predicate(context.program, targetId, sourceId);
    const relationship = transitive ? "depends on" : "directly depends on";
    const code = transitive ? "dependency:transitive" : "dependency:direct";

    if (passed) {
      return pass(code, `${targetId} ${relationship} ${sourceId}.`, { targetId, sourceId, transitive });
    }

    return fail(code, `${targetId} does not ${relationship} ${sourceId}.`, {
      targetId,
      sourceId,
      transitive,
    });
  };
}

export function requiresMeaning(id: ConstructionId, expression: ConstructionExpression): AssessmentPredicate {
  return (context) => {
    const passed = hasConstructionMeaning(context.evaluation, id, expression);

    if (passed) {
      return pass("meaning", `${id} has the expected construction meaning.`, { id, expression });
    }

    return fail("meaning", `${id} does not have the expected construction meaning.`, {
      id,
      expression,
    });
  };
}

export function requiresPointOnLine(
  pointId: ConstructionId,
  lineId: ConstructionId,
  tolerance: AssessmentTolerance = defaultTolerance,
): AssessmentPredicate {
  return (context) => {
    const passed = isPointOnLine(context.evaluation, pointId, lineId, tolerance);

    if (passed) {
      return pass("incidence:point-line", `${pointId} lies on ${lineId}.`, {
        pointId,
        lineId,
        tolerance,
      });
    }

    return fail("incidence:point-line", `${pointId} does not lie on ${lineId}.`, {
      pointId,
      lineId,
      tolerance,
    });
  };
}

export function requiresPointOnCircle(
  pointId: ConstructionId,
  circleId: ConstructionId,
  tolerance: AssessmentTolerance = defaultTolerance,
): AssessmentPredicate {
  return (context) => {
    const passed = isPointOnCircle(context.evaluation, pointId, circleId, tolerance);

    if (passed) {
      return pass("incidence:point-circle", `${pointId} lies on ${circleId}.`, {
        pointId,
        circleId,
        tolerance,
      });
    }

    return fail("incidence:point-circle", `${pointId} does not lie on ${circleId}.`, {
      pointId,
      circleId,
      tolerance,
    });
  };
}

export function constructionIdsOfKind(
  program: ConstructionProgram,
  kind: Construction["kind"],
): readonly ConstructionId[] {
  return program.constructions
    .filter((construction) => construction.kind === kind)
    .map((construction) => construction.id);
}

export function hasConstructionKind(program: ConstructionProgram, kind: Construction["kind"]): boolean {
  return constructionIdsOfKind(program, kind).length > 0;
}

export function directlyDependsOn(
  program: ConstructionProgram,
  targetId: ConstructionId,
  sourceId: ConstructionId,
): boolean {
  const target = constructionById(program, targetId);
  return target ? dependencyIds(target).includes(sourceId) : false;
}

export function dependsOn(
  program: ConstructionProgram,
  targetId: ConstructionId,
  sourceId: ConstructionId,
): boolean {
  const visited = new Set<ConstructionId>();

  function visit(currentId: ConstructionId): boolean {
    if (visited.has(currentId)) {
      return false;
    }
    visited.add(currentId);

    const current = constructionById(program, currentId);
    if (!current) {
      return false;
    }

    return dependencyIds(current).some((dependencyId) => dependencyId === sourceId || visit(dependencyId));
  }

  return visit(targetId);
}

export function hasConstructionMeaning(
  evaluation: Evaluation,
  id: ConstructionId,
  expression: ConstructionExpression,
): boolean {
  const meaning = evaluation.meanings.find((candidate) => candidate.id === id);
  return meaning ? sameExpression(meaning.expression, expression) : false;
}

export function isPointOnLine(
  evaluation: Evaluation,
  pointId: ConstructionId,
  lineId: ConstructionId,
  tolerance: AssessmentTolerance = defaultTolerance,
): boolean {
  const point = primitiveById(evaluation, pointId);
  const line = primitiveById(evaluation, lineId);

  if (point?.kind !== "point" || line?.kind !== "line") {
    return false;
  }

  return distanceFromPointToLine(point.position, line.through) <= tolerance.epsilon;
}

export function isPointOnCircle(
  evaluation: Evaluation,
  pointId: ConstructionId,
  circleId: ConstructionId,
  tolerance: AssessmentTolerance = defaultTolerance,
): boolean {
  const point = primitiveById(evaluation, pointId);
  const circle = primitiveById(evaluation, circleId);

  if (point?.kind !== "point" || circle?.kind !== "circle") {
    return false;
  }

  const radius = distance(circle.center, circle.pointOnCircle);
  const pointRadius = distance(circle.center, point.position);
  return Math.abs(pointRadius - radius) <= tolerance.epsilon;
}

function constructionById(program: ConstructionProgram, id: ConstructionId): Construction | undefined {
  return program.constructions.find((construction) => construction.id === id);
}

function primitiveById(evaluation: Evaluation, id: ConstructionId): EvaluatedPrimitive | undefined {
  return evaluation.primitives.find((primitive) => primitive.id === id);
}

function distanceFromPointToLine(point: Point2, line: readonly [Point2, Point2]): number {
  const [a, b] = line;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const numerator = Math.abs(dy * point.x - dx * point.y + b.x * a.y - b.y * a.x);
  const denominator = Math.hypot(dx, dy);

  return denominator === 0 ? Number.POSITIVE_INFINITY : numerator / denominator;
}

function distance(a: Point2, b: Point2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function sameExpression(a: ConstructionExpression, b: ConstructionExpression): boolean {
  if (a.kind !== b.kind) {
    return false;
  }

  if (a.kind === "free-point" && b.kind === "free-point") {
    return true;
  }

  if (a.kind === "line-through" && b.kind === "line-through") {
    return sameIds(a.points, b.points);
  }

  if (a.kind === "circle-through" && b.kind === "circle-through") {
    return a.center === b.center && a.pointOnCircle === b.pointOnCircle;
  }

  if (a.kind === "circle-three-points" && b.kind === "circle-three-points") {
    return sameIds(a.points, b.points);
  }

  if (a.kind === "line-line-intersection" && b.kind === "line-line-intersection") {
    return sameIds(a.lines, b.lines);
  }

  if (a.kind === "line-circle-intersection" && b.kind === "line-circle-intersection") {
    return a.line === b.line && a.circle === b.circle && a.intersectionIndex === b.intersectionIndex;
  }

  if (a.kind === "circle-circle-intersection" && b.kind === "circle-circle-intersection") {
    return (
      a.firstCircle === b.firstCircle &&
      a.secondCircle === b.secondCircle &&
      a.intersectionIndex === b.intersectionIndex
    );
  }

  if (a.kind === "parallel-line" && b.kind === "parallel-line") {
    return a.line === b.line && a.point === b.point;
  }

  if (a.kind === "perpendicular-line" && b.kind === "perpendicular-line") {
    return a.line === b.line && a.point === b.point;
  }

  if (a.kind === "midpoint" && b.kind === "midpoint") {
    return (
      (a.points[0] === b.points[0] && a.points[1] === b.points[1]) ||
      (a.points[0] === b.points[1] && a.points[1] === b.points[0])
    );
  }

  return false;
}

function sameIds(a: readonly ConstructionId[], b: readonly ConstructionId[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function pass(code: string, message: string, evidence?: unknown): AssessmentResult {
  return {
    passed: true,
    code,
    message,
    evidence,
  };
}

function fail(code: string, message: string, evidence?: unknown): AssessmentResult {
  return {
    passed: false,
    code,
    message,
    evidence,
  };
}
