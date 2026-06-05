import { Circle, MousePointer2, RotateCcw, RotateCw, Ruler, Waypoints } from "lucide-react";
import { seedDocument } from "@euclid/document";
import { evaluateConstruction } from "@euclid/geometry";
import type { Construction, ConstructionId } from "@euclid/geometry";
import { sceneForEvaluation } from "@euclid/rendering";
import { useMemo, useState } from "react";
import { WorkspaceView } from "./WorkspaceView";

const document = seedDocument;
const evaluated = evaluateConstruction(document.program);
const sceneSize = { width: 920, height: 620 };

export function App() {
  const [selectedId, setSelectedId] = useState<ConstructionId | undefined>();
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const selectedConstruction = useMemo(
    () => document.program.constructions.find((construction) => construction.id === selectedId),
    [selectedId],
  );
  const scene = useMemo(
    () =>
      sceneForEvaluation(evaluated, {
        size: sceneSize,
        rotation: { turns: rotationDegrees / 360 },
      }),
    [rotationDegrees],
  );

  return (
    <main className="app-shell">
      <aside className="tool-panel" aria-label="Construction tools">
        <div className="brand">
          <Waypoints size={24} aria-hidden />
          <div>
            <h1>Euclid</h1>
            <p>Denotational construction studio</p>
          </div>
        </div>

        <nav className="tool-grid" aria-label="Tools">
          <button type="button" className="tool-button active" title="Select">
            <MousePointer2 size={19} aria-hidden />
          </button>
          <button type="button" className="tool-button" title="Point">
            <Waypoints size={19} aria-hidden />
          </button>
          <button type="button" className="tool-button" title="Line">
            <Ruler size={19} aria-hidden />
          </button>
          <button type="button" className="tool-button" title="Circle">
            <Circle size={19} aria-hidden />
          </button>
        </nav>

        <section className="view-panel" aria-label="View controls">
          <h2>View</h2>
          <div className="rotation-control">
            <button
              type="button"
              className="icon-button"
              title="Rotate counterclockwise"
              onClick={() => setRotationDegrees((degrees) => wrapDegrees(degrees - 15))}
            >
              <RotateCcw size={18} aria-hidden />
            </button>
            <label>
              <span>Rotation</span>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={rotationDegrees}
                onChange={(event) => setRotationDegrees(Number(event.currentTarget.value))}
              />
            </label>
            <button
              type="button"
              className="icon-button"
              title="Rotate clockwise"
              onClick={() => setRotationDegrees((degrees) => wrapDegrees(degrees + 15))}
            >
              <RotateCw size={18} aria-hidden />
            </button>
          </div>
          <output className="rotation-value">{rotationDegrees} deg</output>
        </section>

        <section className="inspector" aria-label="Construction objects">
          <h2>Objects</h2>
          <ol>
            {document.program.constructions.map((construction) => (
              <li key={construction.id}>
                <button
                  type="button"
                  className="object-button"
                  aria-pressed={construction.id === selectedId}
                  onClick={() => setSelectedId(construction.id)}
                >
                  <span>{construction.label}</span>
                  <code>{construction.kind}</code>
                </button>
              </li>
            ))}
          </ol>
        </section>

        <section className="details-panel" aria-label="Selected construction">
          <h2>Selection</h2>
          {selectedConstruction ? (
            <ConstructionDetails construction={selectedConstruction} />
          ) : (
            <p className="empty-selection">No object selected</p>
          )}
        </section>
      </aside>

      <WorkspaceView scene={scene} selectedId={selectedId} onSelect={setSelectedId} />
    </main>
  );
}

function wrapDegrees(degrees: number): number {
  if (degrees > 180) {
    return degrees - 360;
  }

  if (degrees < -180) {
    return degrees + 360;
  }

  return degrees;
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
