import { dependencyIds } from "./dependencies";
import type {
  Construction,
  ConstructionId,
  ConstructionMeaning,
  ConstructionProgram,
  EvaluatedPrimitive,
  Evaluation,
  EvaluationDiagnostic,
} from "./model";

export type ConstructionReference = Readonly<{
  id: ConstructionId;
  label: string;
  kind: Construction["kind"];
}>;

export type ConstructionExplanation = Readonly<{
  id: ConstructionId;
  label: string;
  kind: Construction["kind"];
  parents: readonly ConstructionReference[];
  dependents: readonly ConstructionReference[];
  meaning: ConstructionMeaning | undefined;
  primitive: EvaluatedPrimitive | undefined;
  realized: boolean;
  diagnostics: readonly EvaluationDiagnostic[];
  explanation: string;
}>;

export function explainConstruction(
  program: ConstructionProgram,
  evaluation: Evaluation,
  id: ConstructionId,
): ConstructionExplanation | undefined {
  const construction = program.constructions.find((candidate) => candidate.id === id);
  if (!construction) {
    return undefined;
  }

  const constructionsById = constructionsByIdFor(program.constructions);
  const parents = dependencyIds(construction).flatMap((parentId) => {
    const parent = constructionsById.get(parentId);
    return parent ? [referenceFor(parent)] : [];
  });
  const dependents = program.constructions
    .filter((candidate) => dependencyIds(candidate).includes(id))
    .map(referenceFor);
  const meaning = evaluation.meanings.find((candidate) => candidate.id === id);
  const primitive = evaluation.primitives.find((candidate) => candidate.id === id);
  const diagnostics = evaluation.diagnostics.filter((candidate) => candidate.constructionId === id);

  return {
    id: construction.id,
    label: construction.label,
    kind: construction.kind,
    parents,
    dependents,
    meaning,
    primitive,
    realized: primitive !== undefined,
    diagnostics,
    explanation: explanationFor(construction),
  };
}

export function traceDependencies(
  program: ConstructionProgram,
  id: ConstructionId,
): readonly ConstructionReference[] {
  const constructionsById = constructionsByIdFor(program.constructions);
  const visited = new Set<ConstructionId>();
  const trace: ConstructionReference[] = [];

  function visit(currentId: ConstructionId): void {
    const construction = constructionsById.get(currentId);
    if (!construction) {
      return;
    }

    for (const dependencyId of dependencyIds(construction)) {
      if (visited.has(dependencyId)) {
        continue;
      }
      visited.add(dependencyId);
      const dependency = constructionsById.get(dependencyId);
      if (dependency) {
        trace.push(referenceFor(dependency));
        visit(dependencyId);
      }
    }
  }

  visit(id);
  return trace;
}

export function traceDependents(
  program: ConstructionProgram,
  id: ConstructionId,
): readonly ConstructionReference[] {
  const constructionsById = constructionsByIdFor(program.constructions);
  const visited = new Set<ConstructionId>();
  const trace: ConstructionReference[] = [];

  function visit(currentId: ConstructionId): void {
    for (const construction of program.constructions) {
      if (visited.has(construction.id) || !dependencyIds(construction).includes(currentId)) {
        continue;
      }
      visited.add(construction.id);
      trace.push(referenceFor(construction));
      visit(construction.id);
    }
  }

  if (!constructionsById.has(id)) {
    return [];
  }

  visit(id);
  return trace;
}

function constructionsByIdFor(
  constructions: readonly Construction[],
): ReadonlyMap<ConstructionId, Construction> {
  return new Map(constructions.map((construction) => [construction.id, construction]));
}

function referenceFor(construction: Construction): ConstructionReference {
  return {
    id: construction.id,
    label: construction.label,
    kind: construction.kind,
  };
}

function explanationFor(construction: Construction): string {
  if (construction.kind === "free-point") {
    return `${construction.label} is a free point.`;
  }

  if (construction.kind === "line-through") {
    return `${construction.label} is the line through ${construction.points[0]} and ${construction.points[1]}.`;
  }

  if (construction.kind === "circle-through") {
    return `${construction.label} is the circle centered at ${construction.center} through ${construction.pointOnCircle}.`;
  }

  if (construction.kind === "circle-three-points") {
    return `${construction.label} is the circle through ${construction.points[0]}, ${construction.points[1]}, and ${construction.points[2]}.`;
  }

  if (construction.kind === "line-line-intersection") {
    return `${construction.label} is the intersection of lines ${construction.lines[0]} and ${construction.lines[1]}.`;
  }

  if (construction.kind === "line-circle-intersection") {
    return `${construction.label} is intersection ${construction.intersectionIndex} of line ${construction.line} and circle ${construction.circle}.`;
  }

  if (construction.kind === "circle-circle-intersection") {
    return `${construction.label} is intersection ${construction.intersectionIndex} of circles ${construction.firstCircle} and ${construction.secondCircle}.`;
  }

  const _exhaustiveCheck: never = construction;
  return _exhaustiveCheck;
}
