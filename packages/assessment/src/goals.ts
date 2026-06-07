import {
  assessAll,
  assessAny,
  requiresConstructionKind,
  requiresDependency,
  requiresGeometricEquivalent,
  requiresMeaning,
  requiresPointOnCircle,
  requiresPointOnLine,
  type AssessmentContext,
  type AssessmentPredicate,
  type AssessmentResult,
  type AssessmentTolerance,
} from "./assessment";
import type { Construction, ConstructionExpression, ConstructionId } from "@euclid/geometry";

export type AssessmentGoal =
  | Readonly<{
      kind: "all";
      id?: string;
      description?: string;
      goals: readonly AssessmentGoal[];
    }>
  | Readonly<{
      kind: "any";
      id?: string;
      description?: string;
      goals: readonly AssessmentGoal[];
    }>
  | Readonly<{
      kind: "construction-kind";
      description?: string;
      constructionKind: Construction["kind"];
    }>
  | Readonly<{
      kind: "dependency";
      description?: string;
      targetId: ConstructionId;
      sourceId: ConstructionId;
      transitive?: boolean;
    }>
  | Readonly<{
      kind: "meaning";
      description?: string;
      id: ConstructionId;
      expression: ConstructionExpression;
    }>
  | Readonly<{
      kind: "point-on-line";
      description?: string;
      pointId: ConstructionId;
      lineId: ConstructionId;
      tolerance?: AssessmentTolerance;
    }>
  | Readonly<{
      kind: "point-on-circle";
      description?: string;
      pointId: ConstructionId;
      circleId: ConstructionId;
      tolerance?: AssessmentTolerance;
    }>
  | Readonly<{
      kind: "geometric-equivalent";
      description?: string;
      targetConstructions: readonly Construction[];
      targetId: ConstructionId;
      tolerance?: AssessmentTolerance;
    }>;

export function predicateForGoal(goal: AssessmentGoal): AssessmentPredicate {
  if (goal.kind === "all") {
    return assessAll(
      goal.goals.map((child) => predicateForGoal(child)),
      goal.id ?? "goal:all",
    );
  }

  if (goal.kind === "any") {
    return assessAny(
      goal.goals.map((child) => predicateForGoal(child)),
      goal.id ?? "goal:any",
    );
  }

  if (goal.kind === "construction-kind") {
    return requiresConstructionKind(goal.constructionKind);
  }

  if (goal.kind === "dependency") {
    return requiresDependency(goal.targetId, goal.sourceId, { transitive: goal.transitive });
  }

  if (goal.kind === "meaning") {
    return requiresMeaning(goal.id, goal.expression);
  }

  if (goal.kind === "point-on-line") {
    return requiresPointOnLine(goal.pointId, goal.lineId, goal.tolerance);
  }

  if (goal.kind === "point-on-circle") {
    return requiresPointOnCircle(goal.pointId, goal.circleId, goal.tolerance);
  }

  if (goal.kind === "geometric-equivalent") {
    return requiresGeometricEquivalent(goal.targetConstructions, goal.targetId, goal.tolerance);
  }

  const _exhaustiveCheck: never = goal;
  return _exhaustiveCheck;
}

export function evaluateGoal(context: AssessmentContext, goal: AssessmentGoal): AssessmentResult {
  return predicateForGoal(goal)(context);
}
