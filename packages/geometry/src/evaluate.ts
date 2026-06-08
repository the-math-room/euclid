import type {
  Construction,
  ConstructionId,
  ConstructionExpression,
  ConstructionProgram,
  ConstructionMeaning,
  Evaluation,
  EvaluationDiagnostic,
} from "./model";
import { dependencyGraphFor, dependencyIds } from "./dependencies";
import { realizeConstructions } from "./realize";

export function evaluateConstruction(program: ConstructionProgram): Evaluation {
  const graph = dependencyGraphFor(program.constructions);
  const plan = evaluationPlanFor(program.constructions);
  const meanings = new Map<ConstructionId, ConstructionMeaning>();
  const diagnostics: EvaluationDiagnostic[] = [...plan.diagnostics];

  for (const construction of plan.ordered) {
    meanings.set(construction.id, meaningFor(construction));
  }
  const realization = realizeConstructions(plan.ordered);

  return {
    graph,
    meanings: Array.from(meanings.values()),
    primitives: realization.primitives,
    diagnostics: [...diagnostics, ...realization.diagnostics],
  };
}

type EvaluationPlan = Readonly<{
  ordered: readonly Construction[];
  diagnostics: readonly EvaluationDiagnostic[];
}>;

function meaningFor(construction: Construction): ConstructionMeaning {
  return {
    id: construction.id,
    label: construction.label,
    expression: expressionFor(construction),
  };
}

function expressionFor(construction: Construction): ConstructionExpression {
  switch (construction.kind) {
    case "free-point":
      return {
        kind: "free-point",
      };
    case "line-through":
      return {
        kind: "line-through",
        points: construction.points,
      };
    case "circle-through":
      return {
        kind: "circle-through",
        center: construction.center,
        pointOnCircle: construction.pointOnCircle,
      };
    case "circle-three-points":
      return {
        kind: "circle-three-points",
        points: construction.points,
      };
    case "line-line-intersection":
      return {
        kind: "line-line-intersection",
        lines: construction.lines,
      };
    case "line-circle-intersection":
      return {
        kind: "line-circle-intersection",
        line: construction.line,
        circle: construction.circle,
        intersectionIndex: construction.intersectionIndex,
      };
    case "circle-circle-intersection":
      return {
        kind: "circle-circle-intersection",
        firstCircle: construction.firstCircle,
        secondCircle: construction.secondCircle,
        intersectionIndex: construction.intersectionIndex,
      };
    case "parallel-line":
      return {
        kind: "parallel-line",
        line: construction.line,
        point: construction.point,
      };
    case "perpendicular-line":
      return {
        kind: "perpendicular-line",
        line: construction.line,
        point: construction.point,
      };
    case "midpoint":
      return {
        kind: "midpoint",
        points: construction.points,
      };
  }
}

function evaluationPlanFor(constructions: readonly Construction[]): EvaluationPlan {
  const diagnostics: EvaluationDiagnostic[] = [];
  const constructionsById = new Map<ConstructionId, Construction>();
  const duplicateIds = new Set<ConstructionId>();

  for (const construction of constructions) {
    if (constructionsById.has(construction.id)) {
      duplicateIds.add(construction.id);
      diagnostics.push({
        constructionId: construction.id,
        message: `Construction id ${construction.id} is defined more than once.`,
      });
    } else {
      constructionsById.set(construction.id, construction);
    }
  }

  const ordered: Construction[] = [];
  const visiting = new Set<ConstructionId>();
  const visited = new Set<ConstructionId>();
  const invalid = new Set<ConstructionId>(duplicateIds);

  for (const construction of constructionsById.values()) {
    visit(construction, {
      constructionsById,
      diagnostics,
      invalid,
      ordered,
      visited,
      visiting,
    });
  }

  return {
    ordered,
    diagnostics,
  };
}

type VisitState = {
  constructionsById: ReadonlyMap<ConstructionId, Construction>;
  diagnostics: EvaluationDiagnostic[];
  invalid: Set<ConstructionId>;
  ordered: Construction[];
  visited: Set<ConstructionId>;
  visiting: Set<ConstructionId>;
};

function visit(construction: Construction, state: VisitState): boolean {
  if (state.visited.has(construction.id)) {
    return !state.invalid.has(construction.id);
  }

  if (state.visiting.has(construction.id)) {
    state.invalid.add(construction.id);
    state.diagnostics.push({
      constructionId: construction.id,
      message: `Construction ${construction.label} has a cyclic dependency.`,
    });
    return false;
  }

  state.visiting.add(construction.id);

  const dependenciesValid = dependencyIds(construction).every((dependencyId) => {
    const dependency = state.constructionsById.get(dependencyId);

    if (!dependency) {
      state.invalid.add(construction.id);
      state.diagnostics.push({
        constructionId: construction.id,
        message: `Construction ${construction.label} depends on missing construction ${dependencyId}.`,
      });
      return false;
    }

    return visit(dependency, state);
  });

  state.visiting.delete(construction.id);
  state.visited.add(construction.id);

  if (!dependenciesValid || state.invalid.has(construction.id)) {
    state.invalid.add(construction.id);
    return false;
  }

  state.ordered.push(construction);
  return true;
}
