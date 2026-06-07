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

  const keys = Object.keys(goalExpr) as (keyof ConstructionExpression)[];
  for (const key of keys) {
    if (key === "kind") continue;

    const goalVal = (goalExpr as Record<string, unknown>)[key];
    const userVal = (userExpr as Record<string, unknown>)[key];

    if (Array.isArray(goalVal)) {
      if (!Array.isArray(userVal) || goalVal.length !== userVal.length) {
        return false;
      }
      if (goalVal.length > 0 && typeof goalVal[0] === "string") {
        const mappedGoalSet = new Set(goalVal.map((v: string) => mapping.get(v) ?? v));
        const userSet = new Set(userVal);
        if (mappedGoalSet.size !== userSet.size) {
          return false;
        }
        for (const item of userSet) {
          if (!mappedGoalSet.has(item)) {
            return false;
          }
        }
      } else {
        for (let i = 0; i < goalVal.length; i++) {
          if (!matchExpression(userVal[i], goalVal[i], mapping)) {
            return false;
          }
        }
      }
    } else if (typeof goalVal === "string") {
      if (
        (key === "firstCircle" || key === "secondCircle") &&
        "firstCircle" in goalExpr &&
        "secondCircle" in goalExpr
      ) {
        const gExprObj = goalExpr as Record<string, unknown>;
        const uExprObj = userExpr as Record<string, unknown>;
        const gc0 = mapping.get(String(gExprObj.firstCircle)) ?? String(gExprObj.firstCircle);
        const gc1 = mapping.get(String(gExprObj.secondCircle)) ?? String(gExprObj.secondCircle);
        const uc0 = String(uExprObj.firstCircle);
        const uc1 = String(uExprObj.secondCircle);
        if (!((uc0 === gc0 && uc1 === gc1) || (uc0 === gc1 && uc1 === gc0))) {
          return false;
        }
      } else {
        const mappedVal = mapping.get(goalVal) ?? goalVal;
        if (userVal !== mappedVal) {
          return false;
        }
      }
    } else if (userVal !== goalVal) {
      return false;
    }
  }

  return true;
}

export function mapGoalIds(goal: AssessmentGoal, mapping: Map<string, string>): AssessmentGoal {
  if (goal.kind === "all" || goal.kind === "any") {
    return {
      ...goal,
      goals: goal.goals.map((g: AssessmentGoal) => mapGoalIds(g, mapping)),
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
  const mapped = { ...expr } as Record<string, unknown>;
  const exprObj = expr as Record<string, unknown>;
  for (const key of Object.keys(expr)) {
    if (key === "kind") continue;
    const val = exprObj[key];
    if (Array.isArray(val)) {
      if (val.length > 0 && typeof val[0] === "string") {
        mapped[key] = val.map((v: string) => mapping.get(v) ?? v);
      } else {
        mapped[key] = val.map((v: unknown) =>
          v && typeof v === "object" ? mapExpressionIds(v as ConstructionExpression, mapping) : v,
        );
      }
    } else if (typeof val === "string") {
      mapped[key] = mapping.get(val) ?? val;
    } else if (val && typeof val === "object") {
      mapped[key] = mapExpressionIds(val as ConstructionExpression, mapping);
    }
  }
  return mapped as unknown as ConstructionExpression;
}
