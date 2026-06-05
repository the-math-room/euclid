import { Circle, MousePointer2, Ruler, Waypoints } from "lucide-react";
import { seedDocument } from "@euclid/document";
import { evaluateConstruction } from "@euclid/geometry";
import type { ConstructionId } from "@euclid/geometry";
import { defaultScreenViewFor, sceneForEvaluation } from "@euclid/rendering";
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

export function App() {
  const [selectedId, setSelectedId] = useState<ConstructionId | undefined>();
  const camera = useCameraController(defaultView);
  const selectedConstruction = useMemo(
    () => document.program.constructions.find((construction) => construction.id === selectedId),
    [selectedId],
  );
  const scene = useMemo(
    () =>
      sceneForEvaluation(evaluated, {
        viewport: defaultView.viewport,
        camera: camera.camera,
      }),
    [camera.camera],
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

        <ViewControls camera={camera} />
        <ObjectList
          constructions={document.program.constructions}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <SelectionDetails construction={selectedConstruction} />
      </aside>

      <WorkspaceView
        scene={scene}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onPanBy={camera.moveSceneBy}
      />
    </main>
  );
}
