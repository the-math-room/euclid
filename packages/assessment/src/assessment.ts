import {
  evaluateConstruction,
  toWorldPoint,
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
  starterProgram?: ConstructionProgram;
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

export function arePrimitivesEquivalent(
  a: EvaluatedPrimitive,
  b: EvaluatedPrimitive,
  epsilon: number,
): boolean {
  if (a.kind !== b.kind) {
    return false;
  }
  if (a.kind === "point" && b.kind === "point") {
    return distance(a.position, b.position) <= epsilon;
  }
  if (a.kind === "line" && b.kind === "line") {
    return (
      distanceFromPointToLine(a.through[0], b.through) <= epsilon &&
      distanceFromPointToLine(a.through[1], b.through) <= epsilon
    );
  }
  if (a.kind === "circle" && b.kind === "circle") {
    if (distance(a.center, b.center) > epsilon) {
      return false;
    }
    const radiusA = distance(a.center, a.pointOnCircle);
    const radiusB = distance(b.center, b.pointOnCircle);
    return Math.abs(radiusA - radiusB) <= epsilon;
  }
  return false;
}

export function requiresGeometricEquivalent(
  targetConstructions: readonly Construction[],
  targetId: ConstructionId,
  tolerance: AssessmentTolerance = defaultTolerance,
): AssessmentPredicate {
  return (context) => {
    const starterProgram = context.starterProgram ?? context.program;
    const userConstructions = context.program.constructions;

    // Build the full target program by starting with user's starter configurations,
    // but using the active user positions for free points.
    const activeStarterConstructions = starterProgram.constructions.map((c) => {
      if (c.kind === "free-point") {
        const userC = userConstructions.find((uc) => uc.id === c.id);
        if (userC && userC.kind === "free-point") {
          return userC;
        }
      }
      return c;
    });

    const targetProgram: ConstructionProgram = {
      constructions: [...activeStarterConstructions, ...targetConstructions],
    };

    const targetEvaluation = evaluateConstruction(targetProgram);
    const targetPrimitive = primitiveById(targetEvaluation, targetId);

    if (!targetPrimitive) {
      return fail(
        `geometric-equivalent:${targetId}`,
        `Target primitive ${targetId} could not be realized at current positions.`,
      );
    }

    const userPrimitives = context.evaluation.primitives;
    const candidatePrimitive = userPrimitives.find((up) =>
      arePrimitivesEquivalent(up, targetPrimitive, tolerance.epsilon),
    );

    if (!candidatePrimitive) {
      return fail(`geometric-equivalent:${targetId}`, `No equivalent constructed object found.`);
    }

    // Perturbation verification (3 iterations)
    const numPerturbations = 3;
    for (let i = 0; i < numPerturbations; i++) {
      const perturbedStarterConstructions = activeStarterConstructions.map((c, idx) => {
        if (c.kind === "free-point") {
          const seedX = (idx + 1) * (i + 1) * 17.3;
          const seedY = (idx + 1) * (i + 1) * 31.7;
          const dx = (Math.sin(seedX) >= 0 ? 1 : -1) * (1.5 + Math.abs(Math.sin(seedX)) * 1.5);
          const dy = (Math.sin(seedY) >= 0 ? 1 : -1) * (1.5 + Math.abs(Math.sin(seedY)) * 1.5);
          return {
            ...c,
            position: toWorldPoint({
              x: c.position.x + dx,
              y: c.position.y + dy,
            }),
          };
        }
        return c;
      });

      const perturbedUserConstructions = userConstructions.map((uc) => {
        const perturbed = perturbedStarterConstructions.find((pc) => pc.id === uc.id);
        return perturbed ?? uc;
      });

      const perturbedUserProgram: ConstructionProgram = {
        constructions: perturbedUserConstructions,
      };

      const perturbedTargetProgram: ConstructionProgram = {
        constructions: [...perturbedStarterConstructions, ...targetConstructions],
      };

      const perturbedUserEval = evaluateConstruction(perturbedUserProgram);
      const perturbedTargetEval = evaluateConstruction(perturbedTargetProgram);

      const pUserPrim = primitiveById(perturbedUserEval, candidatePrimitive.id);
      const pTargetPrim = primitiveById(perturbedTargetEval, targetId);

      if (!pUserPrim || !pTargetPrim) {
        return fail(
          `geometric-equivalent:${targetId}`,
          `Verification failed: object was not realized after perturbation.`,
        );
      }

      if (!arePrimitivesEquivalent(pUserPrim, pTargetPrim, tolerance.epsilon)) {
        return fail(
          `geometric-equivalent:${targetId}`,
          `Verification failed: object is not mathematically equivalent under dragging.`,
        );
      }
    }

    return pass(
      `geometric-equivalent:${targetId}`,
      `Successfully constructed an object equivalent to the target.`,
      { candidateId: candidatePrimitive.id },
    );
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
  if (a.length !== b.length) {
    return false;
  }

  const remaining = [...b];
  for (const id of a) {
    const index = remaining.indexOf(id);
    if (index === -1) {
      return false;
    }
    remaining.splice(index, 1);
  }

  return true;
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
