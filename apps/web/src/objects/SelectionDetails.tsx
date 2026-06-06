import { Trash2 } from "lucide-react";
import type { Construction, ConstructionId } from "@euclid/geometry";

export function SelectionDetails({
  selectedIds,
  constructions,
  onDelete,
}: {
  selectedIds: ReadonlySet<ConstructionId>;
  constructions: readonly Construction[];
  onDelete: () => void;
}) {
  const selectedConstructions = constructions.filter((c) => selectedIds.has(c.id));

  return (
    <section className="details-panel" aria-label="Selected construction">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <h2 style={{ margin: 0 }}>Selection</h2>
        {selectedConstructions.length > 0 && (
          <button
            type="button"
            className="delete-button"
            onClick={onDelete}
            title="Delete selection (Delete / Backspace)"
            aria-label="Delete selection"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
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

  if (construction.kind === "circle-through") {
    return (
      <div>
        <dt>Circle</dt>
        <dd>
          center {construction.center}, through {construction.pointOnCircle}
        </dd>
      </div>
    );
  }

  if (construction.kind === "circle-three-points") {
    return (
      <div>
        <dt>Through</dt>
        <dd>{construction.points.join(", ")}</dd>
      </div>
    );
  }

  if (construction.kind === "line-line-intersection") {
    return (
      <div>
        <dt>Intersection</dt>
        <dd>{construction.lines.join(", ")}</dd>
      </div>
    );
  }

  return null;
}
