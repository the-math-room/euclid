import { Circle, MousePointer2, Ruler, Waypoints, Undo2, Redo2, Trash2 } from "lucide-react";
import { seedDocument } from "@euclid/document";
import { evaluateConstruction } from "@euclid/geometry";
import { defaultScreenViewFor, sceneForEvaluation } from "@euclid/rendering";
import { useMemo } from "react";
import { useConstructionController } from "./construction/useConstructionController";
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
  const camera = useCameraController(defaultView);
  const construction = useConstructionController({
    initialProgram: document.program,
    camera: camera.camera,
    sceneSize,
  });

  const scene = useMemo(
    () =>
      sceneForEvaluation(construction.evaluated, {
        viewport: defaultView.viewport,
        camera: camera.camera,
      }),
    [construction.evaluated, camera.camera],
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

        <div className="toolbar">
          <div className="toolbar-section">
            <h2 className="toolbar-label">Modes</h2>
            <nav className="toolbar-buttons" aria-label="Drawing Modes">
              <button
                type="button"
                className={`tool-button ${construction.activeTool === "select" ? "active" : ""}`}
                title="Select"
                onClick={() => construction.setTool("select")}
              >
                <MousePointer2 size={16} aria-hidden />
              </button>
              <button
                type="button"
                className={`tool-button ${construction.activeTool === "point" ? "active" : ""}`}
                title="Point"
                onClick={() => construction.setTool("point")}
              >
                <Waypoints size={16} aria-hidden />
              </button>
              <button
                type="button"
                className={`tool-button ${construction.activeTool === "line" ? "active" : ""}`}
                title="Line"
                onClick={() => construction.setTool("line")}
              >
                <Ruler size={16} aria-hidden />
              </button>
              <button
                type="button"
                className={`tool-button ${construction.activeTool === "circle" ? "active" : ""}`}
                title="Circle"
                onClick={() => construction.setTool("circle")}
              >
                <Circle size={16} aria-hidden />
              </button>
            </nav>
          </div>

          <div className="toolbar-section">
            <h2 className="toolbar-label">Edit</h2>
            <div className="toolbar-buttons" aria-label="Edit Actions">
              <button
                type="button"
                className="tool-button"
                onClick={construction.handleUndo}
                disabled={!construction.canUndo}
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
              >
                <Undo2 size={16} aria-hidden />
              </button>
              <button
                type="button"
                className="tool-button"
                onClick={construction.handleRedo}
                disabled={!construction.canRedo}
                title="Redo (Ctrl+Y)"
                aria-label="Redo"
              >
                <Redo2 size={16} aria-hidden />
              </button>
              <button
                type="button"
                className="tool-button delete-button-toolbar"
                onClick={construction.handleDeleteSelected}
                disabled={construction.selectedIds.size === 0}
                title="Delete Selected (Delete/Backspace)"
                aria-label="Delete selected objects"
              >
                <Trash2 size={16} aria-hidden />
              </button>
              <button
                type="button"
                className="tool-button build-circle-button"
                onClick={construction.handleBuildCircle}
                disabled={!construction.canBuildCircle}
                title="Build Circle (Select 2 or 3 points)"
                aria-label="Build Circle"
              >
                <Circle size={16} aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <ViewControls camera={camera} />
        <ObjectList
          constructions={construction.program.constructions}
          selectedIds={construction.selectedIds}
          onSelect={construction.handleSelect}
        />
        <SelectionDetails
          selectedIds={construction.selectedIds}
          constructions={construction.program.constructions}
          onDelete={construction.handleDeleteSelected}
        />
      </aside>

      <WorkspaceView
        scene={scene}
        selectedIds={construction.selectedIds}
        onSelect={construction.handleSelect}
        onPanBy={camera.moveSceneBy}
        onZoom={camera.setZoom}
        currentZoom={camera.zoom}
        activeTool={construction.activeTool}
        onAddPoint={construction.handleAddPoint}
        onBeginPointDrag={construction.handleBeginPointDrag}
        onMovePoint={construction.handleMovePoint}
        onEndPointDrag={construction.handleEndPointDrag}
        onAddIntersection={construction.handleAddIntersection}
        canDragPoint={construction.canDragPoint}
      />
    </main>
  );
}
