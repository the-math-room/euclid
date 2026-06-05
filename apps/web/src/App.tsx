import {
  Circle,
  Home,
  MousePointer2,
  MoveDown,
  MoveLeft,
  MoveRight,
  MoveUp,
  RotateCcw,
  RotateCw,
  Ruler,
  Waypoints,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { seedDocument } from "@euclid/document";
import { evaluateConstruction } from "@euclid/geometry";
import type { Construction, ConstructionId, Point2 } from "@euclid/geometry";
import {
  defaultScreenViewFor,
  panCamera,
  rotateCamera,
  sceneForEvaluation,
  zoomCamera,
  type ViewCamera,
} from "@euclid/rendering";
import { useMemo, useState } from "react";
import { WorkspaceView } from "./WorkspaceView";

const document = seedDocument;
const evaluated = evaluateConstruction(document.program);
const sceneSize = { width: 920, height: 620 };
const defaultView = defaultScreenViewFor(evaluated, sceneSize);

export function App() {
  const [selectedId, setSelectedId] = useState<ConstructionId | undefined>();
  const [camera, setCamera] = useState<ViewCamera>(defaultView.camera);
  const selectedConstruction = useMemo(
    () => document.program.constructions.find((construction) => construction.id === selectedId),
    [selectedId],
  );
  const rotationDegrees = Math.round(camera.rotation.turns * 360);
  const zoom = camera.scale / defaultView.camera.scale;
  const scene = useMemo(
    () =>
      sceneForEvaluation(evaluated, {
        viewport: defaultView.viewport,
        camera,
      }),
    [camera],
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
          <div className="view-actions">
            <button
              type="button"
              className="icon-button"
              title="Reset view"
              onClick={() => setCamera(defaultView.camera)}
            >
              <Home size={18} aria-hidden />
            </button>
          </div>
          <div className="rotation-control">
            <button
              type="button"
              className="icon-button"
              title="Rotate counterclockwise"
              onClick={() => setCamera((currentCamera) => rotateCamera(currentCamera, { turns: -15 / 360 }))}
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
                onChange={(event) =>
                  setCamera((currentCamera) => ({
                    ...currentCamera,
                    rotation: { turns: Number(event.currentTarget.value) / 360 },
                  }))
                }
              />
            </label>
            <button
              type="button"
              className="icon-button"
              title="Rotate clockwise"
              onClick={() => setCamera((currentCamera) => rotateCamera(currentCamera, { turns: 15 / 360 }))}
            >
              <RotateCw size={18} aria-hidden />
            </button>
          </div>
          <output className="rotation-value">{rotationDegrees} deg</output>
          <div className="zoom-control">
            <button
              type="button"
              className="icon-button"
              title="Zoom out"
              onClick={() =>
                setCamera((currentCamera) => scaleCameraToZoom(currentCamera, clampZoom(zoom / 1.15)))
              }
            >
              <ZoomOut size={18} aria-hidden />
            </button>
            <label>
              <span>Zoom</span>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(event) =>
                  setCamera((currentCamera) =>
                    scaleCameraToZoom(currentCamera, Number(event.currentTarget.value)),
                  )
                }
              />
            </label>
            <button
              type="button"
              className="icon-button"
              title="Zoom in"
              onClick={() =>
                setCamera((currentCamera) => scaleCameraToZoom(currentCamera, clampZoom(zoom * 1.15)))
              }
            >
              <ZoomIn size={18} aria-hidden />
            </button>
          </div>
          <output className="rotation-value">{zoom.toFixed(2)}x</output>
          <div className="pan-control" aria-label="Pan controls">
            <button
              type="button"
              className="icon-button"
              title="Pan up"
              onClick={() => setCamera((currentCamera) => panCamera(currentCamera, { x: 0, y: -24 }))}
            >
              <MoveUp size={18} aria-hidden />
            </button>
            <button
              type="button"
              className="icon-button"
              title="Pan left"
              onClick={() => setCamera((currentCamera) => panCamera(currentCamera, { x: -24, y: 0 }))}
            >
              <MoveLeft size={18} aria-hidden />
            </button>
            <button
              type="button"
              className="icon-button"
              title="Pan right"
              onClick={() => setCamera((currentCamera) => panCamera(currentCamera, { x: 24, y: 0 }))}
            >
              <MoveRight size={18} aria-hidden />
            </button>
            <button
              type="button"
              className="icon-button"
              title="Pan down"
              onClick={() => setCamera((currentCamera) => panCamera(currentCamera, { x: 0, y: 24 }))}
            >
              <MoveDown size={18} aria-hidden />
            </button>
          </div>
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

      <WorkspaceView
        scene={scene}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onPanBy={(sceneDelta) =>
          setCamera((currentCamera) => panCamera(currentCamera, negatePoint(sceneDelta)))
        }
      />
    </main>
  );
}

function clampZoom(zoom: number): number {
  return Math.min(Math.max(zoom, 0.5), 3);
}

function scaleCameraToZoom(camera: ViewCamera, zoom: number): ViewCamera {
  const currentZoom = camera.scale / defaultView.camera.scale;
  return zoomCamera(camera, clampZoom(zoom) / currentZoom);
}

function negatePoint(point: Point2): Point2 {
  return {
    x: -point.x,
    y: -point.y,
  };
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
