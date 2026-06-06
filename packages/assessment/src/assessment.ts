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

export type AssessmentTolerance = Readonly<{
  epsilon: number;
}>;

const defaultTolerance: AssessmentTolerance = {
  epsilon: 1e-6,
};

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

  return false;
}

function sameIds(a: readonly ConstructionId[], b: readonly ConstructionId[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}
