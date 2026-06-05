import type {
  Construction,
  ConstructionId,
  ConstructionProgram,
  EvaluatedPrimitive,
  Evaluation,
  EvaluationDiagnostic,
} from "./model";
import { dependencyGraphFor, dependencyIds } from "./dependencies";

export function evaluateConstruction(program: ConstructionProgram): Evaluation {
  const graph = dependencyGraphFor(program.constructions);
  const plan = evaluationPlanFor(program.constructions);
  const primitives = new Map<ConstructionId, EvaluatedPrimitive>();
  const diagnostics: EvaluationDiagnostic[] = [...plan.diagnostics];

  for (const construction of plan.ordered) {
    const primitive = evaluateOne(construction, primitives);

    if (primitive.kind === "diagnostic") {
      diagnostics.push({
        constructionId: construction.id,
        message: primitive.message,
      });
    } else {
      primitives.set(construction.id, primitive);
    }
  }

  return {
    graph,
    primitives: Array.from(primitives.values()),
    diagnostics,
  };
}

type EvaluationPlan = Readonly<{
  ordered: readonly Construction[];
  diagnostics: readonly EvaluationDiagnostic[];
}>;

type EvaluationStep =
  | EvaluatedPrimitive
  | Readonly<{
      kind: "diagnostic";
      message: string;
    }>;

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

function evaluateOne(
  construction: Construction,
  previous: ReadonlyMap<ConstructionId, EvaluatedPrimitive>,
): EvaluationStep {
  if (construction.kind === "free-point") {
    return {
      id: construction.id,
      kind: "point",
      label: construction.label,
      position: construction.position,
    };
  }

  if (construction.kind === "line-through") {
    const a = pointNamed(previous, construction.points[0]);
    const b = pointNamed(previous, construction.points[1]);

    if (!a || !b) {
      return {
        kind: "diagnostic",
        message: `Line ${construction.label} needs two point dependencies.`,
      };
    }

    return {
      id: construction.id,
      kind: "line",
      label: construction.label,
      through: [a.position, b.position],
    };
  }

  const center = pointNamed(previous, construction.center);
  const pointOnCircle = pointNamed(previous, construction.pointOnCircle);

  if (!center || !pointOnCircle) {
    return {
      kind: "diagnostic",
      message: `Circle ${construction.label} needs point dependencies for its center and circumference.`,
    };
  }

  return {
    id: construction.id,
    kind: "circle",
    label: construction.label,
    center: center.position,
    pointOnCircle: pointOnCircle.position,
  };
}

function pointNamed(previous: ReadonlyMap<ConstructionId, EvaluatedPrimitive>, id: ConstructionId) {
  const primitive = previous.get(id);
  return primitive?.kind === "point" ? primitive : undefined;
}
