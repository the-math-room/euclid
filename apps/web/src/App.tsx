import { Circle, MousePointer2, Ruler, Waypoints } from "lucide-react";
import { seedDocument } from "@euclid/document";
import { evaluateConstruction } from "@euclid/geometry";
import type { Construction, ConstructionId, Point2 } from "@euclid/geometry";
import { defaultScreenViewFor, sceneForEvaluation, unprojectPoint, worldFrameFor } from "@euclid/rendering";
import { useMemo, useState } from "react";
import { ObjectList } from "./objects/ObjectList";
import { SelectionDetails } from "./objects/SelectionDetails";
import { useCameraController } from "./view/useCameraController";
import { ViewControls } from "./view/ViewControls";
import { WorkspaceView } from "./WorkspaceView";

const document = seedDocument;
const evaluated = evaluateConstruction(document.program);
const sceneSize = { width: 920, height: 620 };
const defaultView = defaultScreenViewFor(evaluated, sceneSize);

function generateNextPointLabel(constructions: readonly Construction[]): string {
  const existingLabels = new Set(constructions.map((c) => c.label));
  for (let i = 0; i < 26; i++) {
    const label = String.fromCharCode(65 + i); // 'A' through 'Z'
    if (!existingLabels.has(label)) {
      return label;
    }
  }
  let suffix = 1;
  while (true) {
    for (let i = 0; i < 26; i++) {
      const label = String.fromCharCode(65 + i) + suffix;
      if (!existingLabels.has(label)) {
        return label;
      }
    }
    suffix++;
  }
}

export function App() {
  const [program, setProgram] = useState(document.program);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<ConstructionId>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<ConstructionId | undefined>();
  const [activeTool, setActiveTool] = useState<"select" | "point" | "line" | "circle">("select");
  const camera = useCameraController(defaultView);

  const currentEvaluated = useMemo(() => evaluateConstruction(program), [program]);

  const scene = useMemo(
    () =>
      sceneForEvaluation(currentEvaluated, {
        viewport: defaultView.viewport,
        camera: camera.camera,
      }),
    [currentEvaluated, camera.camera],
  );

  const handleSelect = (
    id: ConstructionId | undefined,
    modifiers?: { ctrlKey?: boolean; shiftKey?: boolean },
  ) => {
    if (id === undefined) {
      setSelectedIds(new Set());
      setLastSelectedId(undefined);
      return;
    }

    const { ctrlKey, shiftKey } = modifiers || {};

    if (shiftKey && lastSelectedId !== undefined) {
      const constructions = program.constructions;
      const lastIndex = constructions.findIndex((c) => c.id === lastSelectedId);
      const currentIndex = constructions.findIndex((c) => c.id === id);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = constructions.slice(start, end + 1).map((c) => c.id);

        setSelectedIds(new Set(rangeIds));
        return;
      }
    }

    if (ctrlKey || shiftKey) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      setLastSelectedId(id);
    } else {
      setSelectedIds(new Set([id]));
      setLastSelectedId(id);
    }
  };

  const handleAddPoint = (screenCoords: Point2) => {
    const frame = worldFrameFor({
      viewport: { size: sceneSize },
      camera: camera.camera,
    });
    const worldPosition = unprojectPoint(frame, screenCoords);
    const label = generateNextPointLabel(program.constructions);

    const newPoint: Construction = {
      id: label,
      kind: "free-point",
      label,
      position: worldPosition,
    };

    setProgram((prev) => ({
      constructions: [...prev.constructions, newPoint],
    }));

    setSelectedIds(new Set([newPoint.id]));
    setLastSelectedId(newPoint.id);
  };

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
          <button
            type="button"
            className={`tool-button ${activeTool === "select" ? "active" : ""}`}
            title="Select"
            onClick={() => setActiveTool("select")}
          >
            <MousePointer2 size={19} aria-hidden />
          </button>
          <button
            type="button"
            className={`tool-button ${activeTool === "point" ? "active" : ""}`}
            title="Point"
            onClick={() => setActiveTool("point")}
          >
            <Waypoints size={19} aria-hidden />
          </button>
          <button
            type="button"
            className={`tool-button ${activeTool === "line" ? "active" : ""}`}
            title="Line"
            onClick={() => setActiveTool("line")}
          >
            <Ruler size={19} aria-hidden />
          </button>
          <button
            type="button"
            className={`tool-button ${activeTool === "circle" ? "active" : ""}`}
            title="Circle"
            onClick={() => setActiveTool("circle")}
          >
            <Circle size={19} aria-hidden />
          </button>
        </nav>

        <ViewControls camera={camera} />
        <ObjectList constructions={program.constructions} selectedIds={selectedIds} onSelect={handleSelect} />
        <SelectionDetails selectedIds={selectedIds} constructions={program.constructions} />
      </aside>

      <WorkspaceView
        scene={scene}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onPanBy={camera.moveSceneBy}
        activeTool={activeTool}
        onAddPoint={handleAddPoint}
      />
    </main>
  );
}
