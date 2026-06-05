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
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<ConstructionId>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<ConstructionId | undefined>();
  const camera = useCameraController(defaultView);

  const scene = useMemo(
    () =>
      sceneForEvaluation(evaluated, {
        viewport: defaultView.viewport,
        camera: camera.camera,
      }),
    [camera.camera],
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
      const constructions = document.program.constructions;
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
          selectedIds={selectedIds}
          onSelect={handleSelect}
        />
        <SelectionDetails selectedIds={selectedIds} constructions={document.program.constructions} />
      </aside>

      <WorkspaceView
        scene={scene}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onPanBy={camera.moveSceneBy}
      />
    </main>
  );
}
