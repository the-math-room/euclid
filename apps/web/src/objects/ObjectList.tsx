import type { Construction, ConstructionId } from "@euclid/geometry";

export function ObjectList({
  constructions,
  selectedIds,
  onSelect,
}: {
  constructions: readonly Construction[];
  selectedIds: ReadonlySet<ConstructionId>;
  onSelect: (id: ConstructionId, modifiers?: { ctrlKey?: boolean; shiftKey?: boolean }) => void;
}) {
  return (
    <section className="inspector" aria-label="Construction objects">
      <h2>Objects</h2>
      <ol>
        {constructions.map((construction) => (
          <li key={construction.id}>
            <button
              type="button"
              className="object-button"
              aria-pressed={selectedIds.has(construction.id)}
              onClick={(event) =>
                onSelect(construction.id, {
                  ctrlKey: event.ctrlKey,
                  shiftKey: event.shiftKey,
                })
              }
            >
              <span>{construction.label}</span>
              <code>{construction.kind}</code>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
