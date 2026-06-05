import type { Construction, ConstructionId, DependencyGraph } from "./model";

export function dependencyIds(construction: Construction): readonly ConstructionId[] {
  if (construction.kind === "free-point") {
    return [];
  }

  if (construction.kind === "line-through") {
    return construction.points;
  }

  return [construction.center, construction.pointOnCircle];
}

export function dependencyGraphFor(constructions: readonly Construction[]): DependencyGraph {
  const nodes = constructions.map((construction) => ({
    id: construction.id,
    label: construction.label,
    kind: construction.kind,
    dependencies: dependencyIds(construction),
  }));

  return {
    nodes,
    edges: nodes.flatMap((node) =>
      node.dependencies.map((dependency) => ({
        from: node.id,
        to: dependency,
      })),
    ),
  };
}
