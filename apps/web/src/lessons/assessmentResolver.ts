import type { ConstructionExpression, Evaluation, ConstructionProgram } from "@euclid/geometry";
import type { AssessmentGoal } from "@euclid/assessment";

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

  // Initialize mapping with all starting constructions
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

  if (userExpr.kind === "free-point" && goalExpr.kind === "free-point") {
    return true;
  }

  if (userExpr.kind === "line-through" && goalExpr.kind === "line-through") {
    const p0 = mapping.get(goalExpr.points[0]);
    const p1 = mapping.get(goalExpr.points[1]);
    if (!p0 || !p1) return false;
    return (
      (userExpr.points[0] === p0 && userExpr.points[1] === p1) ||
      (userExpr.points[0] === p1 && userExpr.points[1] === p0)
    );
  }

  if (userExpr.kind === "circle-through" && goalExpr.kind === "circle-through") {
    const center = mapping.get(goalExpr.center);
    const point = mapping.get(goalExpr.pointOnCircle);
    if (!center || !point) return false;
    return userExpr.center === center && userExpr.pointOnCircle === point;
  }

  if (userExpr.kind === "circle-three-points" && goalExpr.kind === "circle-three-points") {
    const p0 = mapping.get(goalExpr.points[0]);
    const p1 = mapping.get(goalExpr.points[1]);
    const p2 = mapping.get(goalExpr.points[2]);
    if (!p0 || !p1 || !p2) return false;
    const userSet = new Set(userExpr.points);
    return userSet.has(p0) && userSet.has(p1) && userSet.has(p2);
  }

  if (userExpr.kind === "line-line-intersection" && goalExpr.kind === "line-line-intersection") {
    const l0 = mapping.get(goalExpr.lines[0]);
    const l1 = mapping.get(goalExpr.lines[1]);
    if (!l0 || !l1) return false;
    return (
      (userExpr.lines[0] === l0 && userExpr.lines[1] === l1) ||
      (userExpr.lines[0] === l1 && userExpr.lines[1] === l0)
    );
  }

  if (userExpr.kind === "line-circle-intersection" && goalExpr.kind === "line-circle-intersection") {
    const line = mapping.get(goalExpr.line);
    const circle = mapping.get(goalExpr.circle);
    if (!line || !circle) return false;
    return (
      userExpr.line === line &&
      userExpr.circle === circle &&
      userExpr.intersectionIndex === goalExpr.intersectionIndex
    );
  }

  if (userExpr.kind === "circle-circle-intersection" && goalExpr.kind === "circle-circle-intersection") {
    const c0 = mapping.get(goalExpr.firstCircle);
    const c1 = mapping.get(goalExpr.secondCircle);
    if (!c0 || !c1) return false;
    return (
      ((userExpr.firstCircle === c0 && userExpr.secondCircle === c1) ||
        (userExpr.firstCircle === c1 && userExpr.secondCircle === c0)) &&
      userExpr.intersectionIndex === goalExpr.intersectionIndex
    );
  }

  return false;
}

export function mapGoalIds(goal: AssessmentGoal, mapping: Map<string, string>): AssessmentGoal {
  if (goal.kind === "all" || goal.kind === "any") {
    return {
      ...goal,
      goals: goal.goals.map((g) => mapGoalIds(g, mapping)),
    } as AssessmentGoal;
  }
  if (goal.kind === "meaning") {
    return {
      ...goal,
      id: mapping.get(goal.id) ?? goal.id,
      expression: mapExpressionIds(goal.expression, mapping),
    } as AssessmentGoal;
  }
  if (goal.kind === "point-on-line") {
    return {
      ...goal,
      pointId: mapping.get(goal.pointId) ?? goal.pointId,
      lineId: mapping.get(goal.lineId) ?? goal.lineId,
    } as AssessmentGoal;
  }
  if (goal.kind === "point-on-circle") {
    return {
      ...goal,
      pointId: mapping.get(goal.pointId) ?? goal.pointId,
      circleId: mapping.get(goal.circleId) ?? goal.circleId,
    } as AssessmentGoal;
  }
  if (goal.kind === "dependency") {
    return {
      ...goal,
      targetId: mapping.get(goal.targetId) ?? goal.targetId,
      sourceId: mapping.get(goal.sourceId) ?? goal.sourceId,
    } as AssessmentGoal;
  }
  return goal;
}

function mapExpressionIds(
  expr: ConstructionExpression,
  mapping: Map<string, string>,
): ConstructionExpression {
  if (expr.kind === "line-through") {
    return {
      ...expr,
      points: [mapping.get(expr.points[0]) ?? expr.points[0], mapping.get(expr.points[1]) ?? expr.points[1]],
    };
  }
  if (expr.kind === "circle-through") {
    return {
      ...expr,
      center: mapping.get(expr.center) ?? expr.center,
      pointOnCircle: mapping.get(expr.pointOnCircle) ?? expr.pointOnCircle,
    };
  }
  if (expr.kind === "circle-three-points") {
    return {
      ...expr,
      points: [
        mapping.get(expr.points[0]) ?? expr.points[0],
        mapping.get(expr.points[1]) ?? expr.points[1],
        mapping.get(expr.points[2]) ?? expr.points[2],
      ],
    };
  }
  if (expr.kind === "line-line-intersection") {
    return {
      ...expr,
      lines: [mapping.get(expr.lines[0]) ?? expr.lines[0], mapping.get(expr.lines[1]) ?? expr.lines[1]],
    };
  }
  if (expr.kind === "line-circle-intersection") {
    return {
      ...expr,
      line: mapping.get(expr.line) ?? expr.line,
      circle: mapping.get(expr.circle) ?? expr.circle,
    };
  }
  if (expr.kind === "circle-circle-intersection") {
    return {
      ...expr,
      firstCircle: mapping.get(expr.firstCircle) ?? expr.firstCircle,
      secondCircle: mapping.get(expr.secondCircle) ?? expr.secondCircle,
    };
  }
  return expr;
}
