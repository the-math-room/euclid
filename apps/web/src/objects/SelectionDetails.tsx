import type { Construction, ConstructionId } from "@euclid/geometry";

export function SelectionDetails({
  selectedIds,
  constructions,
}: {
  selectedIds: ReadonlySet<ConstructionId>;
  constructions: readonly Construction[];
}) {
  const selectedConstructions = constructions.filter((c) => selectedIds.has(c.id));

  return (
    <section className="details-panel" aria-label="Selected construction">
      <h2>Selection</h2>
      {selectedConstructions.length === 0 ? (
        <p className="empty-selection">No object selected</p>
      ) : selectedConstructions.length === 1 ? (
        <ConstructionDetails construction={selectedConstructions[0]} />
      ) : (
        <div className="multi-selection-summary">
          <p className="multi-selection-count">
            <strong>{selectedConstructions.length}</strong> objects selected
          </p>
          <ul className="multi-selection-list">
            {selectedConstructions.map((c) => (
              <li key={c.id}>
                <span>{c.label}</span>
                <code>{c.kind}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ConstructionDetails({ construction }: { construction: Construction }) {
  return (
    <dl className="details-list">
      <div>
        <dt>Label</dt>
        <dd>{construction.label}</dd>
      </div>
      <div>
        <dt>Kind</dt>
        <dd>{construction.kind}</dd>
      </div>
      <div>
        <dt>ID</dt>
        <dd>{construction.id}</dd>
      </div>
      <ConstructionSpecificDetails construction={construction} />
    </dl>
  );
}

function ConstructionSpecificDetails({ construction }: { construction: Construction }) {
  if (construction.kind === "free-point") {
    return (
      <div>
        <dt>Position</dt>
        <dd>
          {construction.position.x}, {construction.position.y}
        </dd>
      </div>
    );
  }

  if (construction.kind === "line-through") {
    return (
      <div>
        <dt>Through</dt>
        <dd>{construction.points.join(", ")}</dd>
      </div>
    );
  }

  return (
    <div>
      <dt>Circle</dt>
      <dd>
        center {construction.center}, through {construction.pointOnCircle}
      </dd>
    </div>
  );
}
