import {
  canRedo as canRedoHistory,
  canUndo as canUndoHistory,
  createHistory,
  pushState,
  redo,
  undo,
} from "@euclid/document";
import {
  addLineLineIntersection,
  addLineThroughPoints,
  deleteConstructions,
  evaluateConstruction,
  generateNextPointLabel,
  moveFreePoint,
} from "@euclid/geometry";
import type { Construction, ConstructionId, ConstructionProgram, Point2 } from "@euclid/geometry";
import { unprojectPoint, worldFrameFor, type IntersectionHit, type ViewCamera } from "@euclid/rendering";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ActiveTool = "select" | "point" | "line" | "circle";

export type ConstructionController = Readonly<{
  program: ConstructionProgram;
  evaluated: ReturnType<typeof evaluateConstruction>;
  selectedIds: ReadonlySet<ConstructionId>;
  activeTool: ActiveTool;
  canUndo: boolean;
  canRedo: boolean;
  setTool: (tool: ActiveTool) => void;
  handleSelect: (
    id: ConstructionId | undefined,
    modifiers?: { ctrlKey?: boolean; shiftKey?: boolean },
  ) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  handleDeleteSelected: () => void;
  handleAddPoint: (screenCoords: Point2) => void;
  handleAddIntersection: (hit: IntersectionHit) => void;
  handleBeginPointDrag: (id: ConstructionId) => void;
  handleMovePoint: (id: ConstructionId, screenCoords: Point2) => void;
  handleEndPointDrag: () => void;
  canDragPoint: (id: ConstructionId) => boolean;
}>;

export function useConstructionController({
  initialProgram,
  camera,
  sceneSize,
}: {
  initialProgram: ConstructionProgram;
  camera: ViewCamera;
  sceneSize: { width: number; height: number };
}): ConstructionController {
  const [history, setHistory] = useState(() => createHistory(initialProgram));
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<ConstructionId>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<ConstructionId | undefined>();
  const [activeTool, setActiveTool] = useState<ActiveTool>("select");
  const [lineDraftPointId, setLineDraftPointId] = useState<ConstructionId | undefined>();
  const dragStartProgram = useRef<ConstructionProgram | undefined>(undefined);

  const program = history.present;

  const evaluated = useMemo(() => evaluateConstruction(program), [program]);

  const realizedPointIds = useMemo(
    () =>
      new Set(
        evaluated.primitives
          .filter((primitive) => primitive.kind === "point")
          .map((primitive) => primitive.id),
      ),
    [evaluated.primitives],
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

  const setTool = useCallback((tool: ActiveTool) => {
    setActiveTool(tool);
    if (tool !== "line") {
      setLineDraftPointId(undefined);
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (!canUndoHistory(history)) return;
    setHistory((prev) => undo(prev));
    clearSelection(setSelectedIds, setLastSelectedId);
  }, [history]);

  const handleRedo = useCallback(() => {
    if (!canRedoHistory(history)) return;
    setHistory((prev) => redo(prev));
    clearSelection(setSelectedIds, setLastSelectedId);
  }, [history]);

  const handleSelect = useCallback(
    (id: ConstructionId | undefined, modifiers?: { ctrlKey?: boolean; shiftKey?: boolean }) => {
      if (id === undefined) {
        clearSelection(setSelectedIds, setLastSelectedId);
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
        const lastIndex = constructions.findIndex((construction) => construction.id === lastSelectedId);
        const currentIndex = constructions.findIndex((construction) => construction.id === id);

        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          const rangeIds = constructions.slice(start, end + 1).map((construction) => construction.id);

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
    },
    [activeTool, lastSelectedId, lineDraftPointId, program, realizedPointIds, updateProgram],
  );

  const screenToWorld = useCallback(
    (screenCoords: Point2): Point2 => {
      const frame = worldFrameFor({
        viewport: { size: sceneSize },
        camera,
      });
      return unprojectPoint(frame, screenCoords);
    },
    [camera, sceneSize],
  );

  const handleAddPoint = useCallback(
    (screenCoords: Point2) => {
      const label = generateNextPointLabel(program.constructions);

      const newPoint: Construction = {
        id: label,
        kind: "free-point",
        label,
        position: screenToWorld(screenCoords),
      };

      updateProgram({
        constructions: [...program.constructions, newPoint],
      });

      setSelectedIds(new Set([newPoint.id]));
      setLastSelectedId(newPoint.id);
    },
    [program.constructions, screenToWorld, updateProgram],
  );

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
    clearSelection(setSelectedIds, setLastSelectedId);
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

  return {
    program,
    evaluated,
    selectedIds,
    activeTool,
    canUndo: canUndoHistory(history),
    canRedo: canRedoHistory(history),
    setTool,
    handleSelect,
    handleUndo,
    handleRedo,
    handleDeleteSelected,
    handleAddPoint,
    handleAddIntersection,
    handleBeginPointDrag,
    handleMovePoint,
    handleEndPointDrag,
    canDragPoint,
  };
}

function clearSelection(
  setSelectedIds: (ids: ReadonlySet<ConstructionId>) => void,
  setLastSelectedId: (id: ConstructionId | undefined) => void,
): void {
  setSelectedIds(new Set());
  setLastSelectedId(undefined);
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
