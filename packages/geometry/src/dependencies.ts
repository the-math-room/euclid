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

export function transitiveDependentsOf(
  constructions: readonly Construction[],
  ids: ReadonlySet<ConstructionId>,
): ReadonlySet<ConstructionId> {
  const dependents = new Set<ConstructionId>();
  const toInspect = Array.from(ids);

  while (toInspect.length > 0) {
    const currentId = toInspect.pop();
    if (currentId === undefined) {
      continue;
    }
    for (const construction of constructions) {
      if (dependents.has(construction.id) || ids.has(construction.id)) {
        continue;
      }
      const deps = dependencyIds(construction);
      if (deps.includes(currentId)) {
        dependents.add(construction.id);
        toInspect.push(construction.id);
      }
    }
  }

  return dependents;
}

export function deleteConstructions(
  constructions: readonly Construction[],
  idsToDelete: ReadonlySet<ConstructionId>,
): readonly Construction[] {
  const dependents = transitiveDependentsOf(constructions, idsToDelete);
  return constructions.filter((c) => !idsToDelete.has(c.id) && !dependents.has(c.id));
}
