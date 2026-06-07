import { transitiveDependentsOf } from "@euclid/geometry";
import type { Construction, ConstructionId } from "@euclid/geometry";
import { canDeleteConstruction } from "@euclid/activity";
import type { ActivityPolicy } from "@euclid/activity";

export function deletableSelectionClosure({
  constructions,
  selectedIds,
  policy,
}: {
  constructions: readonly Construction[];
  selectedIds: ReadonlySet<ConstructionId>;
  policy: ActivityPolicy;
}): ReadonlySet<ConstructionId> {
  const directlyDeletable = new Set(
    Array.from(selectedIds).filter((id) => canDeleteConstruction(policy, id)),
  );

  if (directlyDeletable.size === 0) {
    return new Set();
  }

  const deletionClosure = new Set([
    ...directlyDeletable,
    ...transitiveDependentsOf(constructions, directlyDeletable),
  ]);

  for (const id of deletionClosure) {
    if (!canDeleteConstruction(policy, id)) {
      return new Set();
    }
  }

  return deletionClosure;
}
