import type { Construction, ConstructionId } from "@euclid/geometry";

export function ObjectList({
  constructions,
  selectedId,
  onSelect,
}: {
  constructions: readonly Construction[];
  selectedId: ConstructionId | undefined;
  onSelect: (id: ConstructionId) => void;
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
              aria-pressed={construction.id === selectedId}
              onClick={() => onSelect(construction.id)}
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
