import { Trash2 } from "lucide-react";
import type { Construction, ConstructionId, PointMobility, ShapeRole } from "@euclid/geometry";

export function SelectionDetails({
  selectedIds,
  constructions,
  onDelete,
  canDelete,
  onSetShapeRole,
  onSetFreePointMobility,
}: {
  selectedIds: ReadonlySet<ConstructionId>;
  constructions: readonly Construction[];
  onDelete: () => void;
  canDelete: boolean;
  onSetShapeRole: (id: ConstructionId, shapeRole: ShapeRole) => void;
  onSetFreePointMobility: (id: ConstructionId, mobility: PointMobility) => void;
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
            disabled={!canDelete}
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
        <ConstructionDetails
          construction={selectedConstructions[0]}
          onSetShapeRole={onSetShapeRole}
          onSetFreePointMobility={onSetFreePointMobility}
        />
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

function ConstructionDetails({
  construction,
  onSetShapeRole,
  onSetFreePointMobility,
}: {
  construction: Construction;
  onSetShapeRole: (id: ConstructionId, shapeRole: ShapeRole) => void;
  onSetFreePointMobility: (id: ConstructionId, mobility: PointMobility) => void;
}) {
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
      {construction.kind === "free-point" && (
        <div>
          <dt>Mobility</dt>
          <dd>
            <select
              className="shape-role-select"
              value={construction.mobility ?? "free"}
              onChange={(event) =>
                onSetFreePointMobility(construction.id, event.target.value as PointMobility)
              }
            >
              <option value="free">Free</option>
              <option value="fixed">Fixed</option>
            </select>
          </dd>
        </div>
      )}
      <div>
        <dt>ID</dt>
        <dd>{construction.id}</dd>
      </div>
      {isShapeConstruction(construction) && (
        <div>
          <dt>Role</dt>
          <dd>
            <select
              className="shape-role-select"
              value={construction.shapeRole ?? "primary"}
              onChange={(event) => onSetShapeRole(construction.id, event.target.value as ShapeRole)}
            >
              <option value="primary">Primary</option>
              <option value="auxiliary">Auxiliary</option>
            </select>
          </dd>
        </div>
      )}
      <ConstructionSpecificDetails construction={construction} />
    </dl>
  );
}

function isShapeConstruction(
  construction: Construction,
): construction is Extract<
  Construction,
  { kind: "line-through" | "circle-through" | "circle-three-points" | "parallel-line" | "perpendicular-line" }
> {
  switch (construction.kind) {
    case "line-through":
    case "circle-through":
    case "circle-three-points":
    case "parallel-line":
    case "perpendicular-line":
      return true;
    case "free-point":
    case "line-line-intersection":
    case "line-circle-intersection":
    case "circle-circle-intersection":
    case "midpoint":
      return false;
  }
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
