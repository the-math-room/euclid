import { Circle, MousePointer2, Ruler, Waypoints, Undo2, Redo2, Trash2 } from "lucide-react";
import { seedDocument, createHistory, pushState, undo, redo, canUndo, canRedo } from "@euclid/document";
import {
  evaluateConstruction,
  addLineLineIntersection,
  addLineThroughPoints,
  deleteConstructions,
  generateNextPointLabel,
  moveFreePoint,
} from "@euclid/geometry";
import type { Construction, ConstructionId, ConstructionProgram, Point2 } from "@euclid/geometry";
import {
  defaultScreenViewFor,
  sceneForEvaluation,
  unprojectPoint,
  worldFrameFor,
  type IntersectionHit,
} from "@euclid/rendering";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
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
  const [history, setHistory] = useState(() => createHistory(document.program));
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<ConstructionId>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<ConstructionId | undefined>();
  const [activeTool, setActiveTool] = useState<"select" | "point" | "line" | "circle">("select");
  const [lineDraftPointId, setLineDraftPointId] = useState<ConstructionId | undefined>();
  const dragStartProgram = useRef<ConstructionProgram | undefined>(undefined);
  const camera = useCameraController(defaultView);

  const program = history.present;

  const currentEvaluated = useMemo(() => evaluateConstruction(program), [program]);

  const scene = useMemo(
    () =>
      sceneForEvaluation(currentEvaluated, {
        viewport: defaultView.viewport,
        camera: camera.camera,
      }),
    [currentEvaluated, camera.camera],
  );

  const realizedPointIds = useMemo(
    () =>
      new Set(
        currentEvaluated.primitives
          .filter((primitive) => primitive.kind === "point")
          .map((primitive) => primitive.id),
      ),
    [currentEvaluated.primitives],
  );

  const freePointIds = useMemo(
    () =>
      new Set(
        program.constructions
          .filter((construction) => construction.kind === "free-point")
          .map((construction) => construction.id),
      ),
    [program.constructions],
  );

  const updateProgram = useCallback((nextProgram: { constructions: readonly Construction[] }) => {
    setHistory((prev) => pushState(prev, nextProgram));
  }, []);

  const setTool = useCallback((tool: "select" | "point" | "line" | "circle") => {
    setActiveTool(tool);
    if (tool !== "line") {
      setLineDraftPointId(undefined);
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (!canUndo(history)) return;
    setHistory((prev) => undo(prev));
    setSelectedIds(new Set());
    setLastSelectedId(undefined);
  }, [history]);

  const handleRedo = useCallback(() => {
    if (!canRedo(history)) return;
    setHistory((prev) => redo(prev));
    setSelectedIds(new Set());
    setLastSelectedId(undefined);
  }, [history]);

  const handleSelect = (
    id: ConstructionId | undefined,
    modifiers?: { ctrlKey?: boolean; shiftKey?: boolean },
  ) => {
    if (id === undefined) {
      setSelectedIds(new Set());
      setLastSelectedId(undefined);
      setLineDraftPointId(undefined);
      return;
    }

    if (activeTool === "line") {
      if (!realizedPointIds.has(id)) {
        return;
      }

      if (!lineDraftPointId || lineDraftPointId === id) {
        setLineDraftPointId(id);
        setSelectedIds(new Set([id]));
        setLastSelectedId(id);
        return;
      }

      const points: readonly [ConstructionId, ConstructionId] = [lineDraftPointId, id];
      const nextProgram = addLineThroughPoints(program, points);
      const lineId = lineThroughId(nextProgram, points);

      updateProgram(nextProgram);
      setLineDraftPointId(undefined);
      setSelectedIds(lineId ? new Set([lineId]) : new Set(points));
      setLastSelectedId(lineId ?? id);
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

    updateProgram({
      constructions: [...program.constructions, newPoint],
    });

    setSelectedIds(new Set([newPoint.id]));
    setLastSelectedId(newPoint.id);
  };

  const handleAddIntersection = useCallback(
    (hit: IntersectionHit) => {
      const lines: readonly [ConstructionId, ConstructionId] = [hit.operands[0], hit.operands[1]];
      const nextProgram = addLineLineIntersection(program, lines);
      const intersectionId = lineLineIntersectionId(nextProgram, lines);

      updateProgram(nextProgram);
      if (intersectionId) {
        setSelectedIds(new Set([intersectionId]));
        setLastSelectedId(intersectionId);
      }
    },
    [program, updateProgram],
  );

  const screenToWorld = useCallback(
    (screenCoords: Point2): Point2 => {
      const frame = worldFrameFor({
        viewport: { size: sceneSize },
        camera: camera.camera,
      });
      return unprojectPoint(frame, screenCoords);
    },
    [camera.camera],
  );

  const handleBeginPointDrag = useCallback(
    (id: ConstructionId) => {
      if (!freePointIds.has(id)) {
        return;
      }

      dragStartProgram.current = history.present;
      setSelectedIds(new Set([id]));
      setLastSelectedId(id);
    },
    [freePointIds, history.present],
  );

  const canDragPoint = useCallback((id: ConstructionId) => freePointIds.has(id), [freePointIds]);

  const handleMovePoint = useCallback(
    (id: ConstructionId, screenCoords: Point2) => {
      const worldPosition = screenToWorld(screenCoords);
      setHistory((prev) => {
        const nextProgram = moveFreePoint(prev.present, id, worldPosition);
        if (nextProgram === prev.present) {
          return prev;
        }
        return {
          ...prev,
          present: nextProgram,
        };
      });
    },
    [screenToWorld],
  );

  const handleEndPointDrag = useCallback(() => {
    const originalProgram = dragStartProgram.current;
    dragStartProgram.current = undefined;

    if (!originalProgram) {
      return;
    }

    setHistory((prev) => {
      if (prev.present === originalProgram) {
        return prev;
      }

      return {
        past: [...prev.past, originalProgram],
        present: prev.present,
        future: [],
      };
    });
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    updateProgram({
      constructions: deleteConstructions(program.constructions, selectedIds),
    });
    setSelectedIds(new Set());
    setLastSelectedId(undefined);
  }, [selectedIds, program.constructions, updateProgram]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (
        (modifier && event.key.toLowerCase() === "y") ||
        (isMac && modifier && event.shiftKey && event.key.toLowerCase() === "z")
      ) {
        event.preventDefault();
        handleRedo();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        handleDeleteSelected();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleUndo, handleRedo, handleDeleteSelected]);

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
                className={`tool-button ${activeTool === "select" ? "active" : ""}`}
                title="Select"
                onClick={() => setTool("select")}
              >
                <MousePointer2 size={16} aria-hidden />
              </button>
              <button
                type="button"
                className={`tool-button ${activeTool === "point" ? "active" : ""}`}
                title="Point"
                onClick={() => setTool("point")}
              >
                <Waypoints size={16} aria-hidden />
              </button>
              <button
                type="button"
                className={`tool-button ${activeTool === "line" ? "active" : ""}`}
                title="Line"
                onClick={() => setTool("line")}
              >
                <Ruler size={16} aria-hidden />
              </button>
              <button
                type="button"
                className={`tool-button ${activeTool === "circle" ? "active" : ""}`}
                title="Circle"
                onClick={() => setTool("circle")}
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
                onClick={handleUndo}
                disabled={!canUndo(history)}
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
              >
                <Undo2 size={16} aria-hidden />
              </button>
              <button
                type="button"
                className="tool-button"
                onClick={handleRedo}
                disabled={!canRedo(history)}
                title="Redo (Ctrl+Y)"
                aria-label="Redo"
              >
                <Redo2 size={16} aria-hidden />
              </button>
              <button
                type="button"
                className="tool-button delete-button-toolbar"
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0}
                title="Delete Selected (Delete/Backspace)"
                aria-label="Delete selected objects"
              >
                <Trash2 size={16} aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <ViewControls camera={camera} />
        <ObjectList constructions={program.constructions} selectedIds={selectedIds} onSelect={handleSelect} />
        <SelectionDetails
          selectedIds={selectedIds}
          constructions={program.constructions}
          onDelete={handleDeleteSelected}
        />
      </aside>

      <WorkspaceView
        scene={scene}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onPanBy={camera.moveSceneBy}
        onZoom={camera.setZoom}
        currentZoom={camera.zoom}
        activeTool={activeTool}
        onAddPoint={handleAddPoint}
        onBeginPointDrag={handleBeginPointDrag}
        onMovePoint={handleMovePoint}
        onEndPointDrag={handleEndPointDrag}
        onAddIntersection={handleAddIntersection}
        canDragPoint={canDragPoint}
      />
    </main>
  );
}

function lineThroughId(
  program: ConstructionProgram,
  points: readonly [ConstructionId, ConstructionId],
): ConstructionId | undefined {
  const line = program.constructions.find(
    (construction) =>
      construction.kind === "line-through" &&
      ((construction.points[0] === points[0] && construction.points[1] === points[1]) ||
        (construction.points[0] === points[1] && construction.points[1] === points[0])),
  );

  return line?.id;
}

function lineLineIntersectionId(
  program: ConstructionProgram,
  lines: readonly [ConstructionId, ConstructionId],
): ConstructionId | undefined {
  const intersection = program.constructions.find(
    (construction) =>
      construction.kind === "line-line-intersection" &&
      ((construction.lines[0] === lines[0] && construction.lines[1] === lines[1]) ||
        (construction.lines[0] === lines[1] && construction.lines[1] === lines[0])),
  );

  return intersection?.id;
}
