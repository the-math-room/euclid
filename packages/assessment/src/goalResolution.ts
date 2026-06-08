import type { ConstructionExpression, ConstructionProgram, Evaluation } from "@euclid/geometry";
import type { AssessmentGoal } from "./goals";

function extractMeaningGoals(goals: readonly AssessmentGoal[]): (AssessmentGoal & { kind: "meaning" })[] {
  const result: (AssessmentGoal & { kind: "meaning" })[] = [];
  function visit(goal: AssessmentGoal) {
    if (goal.kind === "meaning") {
      result.push(goal);
    } else if (goal.kind === "all" || goal.kind === "any") {
      for (const child of goal.goals) {
        visit(child);
      }
    }
  }
  for (const goal of goals) {
    visit(goal);
  }
  return result;
}

export function resolveGoalMapping(
  evaluation: Evaluation,
  goals: readonly AssessmentGoal[],
  starterProgram: ConstructionProgram,
): Map<string, string> {
  const mapping = new Map<string, string>();

  for (const construction of starterProgram.constructions) {
    mapping.set(construction.id, construction.id);
  }

  const allMeaningGoals = extractMeaningGoals(goals);

  let changed = true;
  while (changed) {
    changed = false;
    for (const goal of allMeaningGoals) {
      if (mapping.has(goal.id)) {
        continue;
      }
      const matchedId = findMatchingUserConstruction(evaluation, goal.expression, mapping);
      if (matchedId) {
        mapping.set(goal.id, matchedId);
        changed = true;
      }
    }
  }

  return mapping;
}

function findMatchingUserConstruction(
  evaluation: Evaluation,
  expression: ConstructionExpression,
  mapping: Map<string, string>,
): string | undefined {
  for (const meaning of evaluation.meanings) {
    if (matchExpression(meaning.expression, expression, mapping)) {
      return meaning.id;
    }
  }
  return undefined;
}

function matchExpression(
  userExpr: ConstructionExpression,
  goalExpr: ConstructionExpression,
  mapping: Map<string, string>,
): boolean {
  if (userExpr.kind !== goalExpr.kind) {
    return false;
  }

  return matchSameKindExpression(userExpr, goalExpr, mapping);
}

function matchSameKindExpression(
  userExpr: ConstructionExpression,
  goalExpr: ConstructionExpression,
  mapping: Map<string, string>,
): boolean {
  switch (goalExpr.kind) {
    case "free-point":
      return userExpr.kind === "free-point";
    case "line-through":
      return userExpr.kind === "line-through" && sameMappedIdSet(goalExpr.points, userExpr.points, mapping);
    case "circle-through":
      return (
        userExpr.kind === "circle-through" &&
        sameMappedId(goalExpr.center, userExpr.center, mapping) &&
        sameMappedId(goalExpr.pointOnCircle, userExpr.pointOnCircle, mapping)
      );
    case "circle-three-points":
      return (
        userExpr.kind === "circle-three-points" && sameMappedIdSet(goalExpr.points, userExpr.points, mapping)
      );
    case "line-line-intersection":
      return (
        userExpr.kind === "line-line-intersection" && sameMappedIdSet(goalExpr.lines, userExpr.lines, mapping)
      );
    case "line-circle-intersection":
      return (
        userExpr.kind === "line-circle-intersection" &&
        sameMappedId(goalExpr.line, userExpr.line, mapping) &&
        sameMappedId(goalExpr.circle, userExpr.circle, mapping) &&
        goalExpr.intersectionIndex === userExpr.intersectionIndex
      );
    case "circle-circle-intersection":
      return (
        userExpr.kind === "circle-circle-intersection" &&
        sameMappedIdSet(
          [goalExpr.firstCircle, goalExpr.secondCircle],
          [userExpr.firstCircle, userExpr.secondCircle],
          mapping,
        ) &&
        goalExpr.intersectionIndex === userExpr.intersectionIndex
      );
    case "parallel-line":
      return (
        userExpr.kind === "parallel-line" &&
        sameMappedId(goalExpr.line, userExpr.line, mapping) &&
        sameMappedId(goalExpr.point, userExpr.point, mapping)
      );
    case "perpendicular-line":
      return (
        userExpr.kind === "perpendicular-line" &&
        sameMappedId(goalExpr.line, userExpr.line, mapping) &&
        sameMappedId(goalExpr.point, userExpr.point, mapping)
      );
    case "midpoint":
      return userExpr.kind === "midpoint" && sameMappedIdSet(goalExpr.points, userExpr.points, mapping);
  }
}

export function mapGoalIds(goal: AssessmentGoal, mapping: Map<string, string>): AssessmentGoal {
  if (goal.kind === "all") {
    return {
      ...goal,
      goals: goal.goals.map((child) => mapGoalIds(child, mapping)),
    };
  }
  if (goal.kind === "any") {
    return {
      ...goal,
      goals: goal.goals.map((child) => mapGoalIds(child, mapping)),
    };
  }
  if (goal.kind === "meaning") {
    return {
      ...goal,
      id: mapping.get(goal.id) ?? goal.id,
      expression: mapExpressionIds(goal.expression, mapping),
    };
  }
  if (goal.kind === "point-on-line") {
    return {
      ...goal,
      pointId: mapping.get(goal.pointId) ?? goal.pointId,
      lineId: mapping.get(goal.lineId) ?? goal.lineId,
    };
  }
  if (goal.kind === "point-on-circle") {
    return {
      ...goal,
      pointId: mapping.get(goal.pointId) ?? goal.pointId,
      circleId: mapping.get(goal.circleId) ?? goal.circleId,
    };
  }
  if (goal.kind === "dependency") {
    return {
      ...goal,
      targetId: mapping.get(goal.targetId) ?? goal.targetId,
      sourceId: mapping.get(goal.sourceId) ?? goal.sourceId,
    };
  }
  return goal;
}

function mapExpressionIds(
  expr: ConstructionExpression,
  mapping: Map<string, string>,
): ConstructionExpression {
  if (expr.kind === "free-point") {
    return expr;
  }

  if (expr.kind === "line-through") {
    return {
      kind: "line-through",
      points: mapIdTuple(expr.points, mapping),
    };
  }

  if (expr.kind === "circle-through") {
    return {
      kind: "circle-through",
      center: mapId(expr.center, mapping),
      pointOnCircle: mapId(expr.pointOnCircle, mapping),
    };
  }

  if (expr.kind === "circle-three-points") {
    return {
      kind: "circle-three-points",
      points: mapIdTriple(expr.points, mapping),
    };
  }

  if (expr.kind === "line-line-intersection") {
    return {
      kind: "line-line-intersection",
      lines: mapIdTuple(expr.lines, mapping),
    };
  }

  if (expr.kind === "line-circle-intersection") {
    return {
      kind: "line-circle-intersection",
      line: mapId(expr.line, mapping),
      circle: mapId(expr.circle, mapping),
      intersectionIndex: expr.intersectionIndex,
    };
  }

  if (expr.kind === "circle-circle-intersection") {
    return {
      kind: "circle-circle-intersection",
      firstCircle: mapId(expr.firstCircle, mapping),
      secondCircle: mapId(expr.secondCircle, mapping),
      intersectionIndex: expr.intersectionIndex,
    };
  }

  if (expr.kind === "parallel-line") {
    return {
      kind: "parallel-line",
      line: mapId(expr.line, mapping),
      point: mapId(expr.point, mapping),
    };
  }

  if (expr.kind === "perpendicular-line") {
    return {
      kind: "perpendicular-line",
      line: mapId(expr.line, mapping),
      point: mapId(expr.point, mapping),
    };
  }

  if (expr.kind === "midpoint") {
    return {
      kind: "midpoint",
      points: mapIdTuple(expr.points, mapping),
    };
  }

  const _exhaustiveCheck: never = expr;
  return _exhaustiveCheck;
}

function sameMappedId(goalId: string, userId: string, mapping: Map<string, string>): boolean {
  return mapId(goalId, mapping) === userId;
}

function sameMappedIdSet(
  goalIds: readonly string[],
  userIds: readonly string[],
  mapping: Map<string, string>,
): boolean {
  if (goalIds.length !== userIds.length) {
    return false;
  }

  const mappedGoalIds = new Set(goalIds.map((id) => mapId(id, mapping)));
  const userIdSet = new Set(userIds);
  return mappedGoalIds.size === userIdSet.size && [...mappedGoalIds].every((id) => userIdSet.has(id));
}

function mapId(id: string, mapping: Map<string, string>): string {
  return mapping.get(id) ?? id;
}

function mapIdTuple(ids: readonly [string, string], mapping: Map<string, string>): readonly [string, string] {
  return [mapId(ids[0], mapping), mapId(ids[1], mapping)];
}

function mapIdTriple(
  ids: readonly [string, string, string],
  mapping: Map<string, string>,
): readonly [string, string, string] {
  return [mapId(ids[0], mapping), mapId(ids[1], mapping), mapId(ids[2], mapping)];
}
