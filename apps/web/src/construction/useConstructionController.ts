import {
  canRedo as canRedoHistory,
  canUndo as canUndoHistory,
  createHistory,
  pushState,
  redo,
  undo,
} from "@euclid/document";
import {
  addCircleThreePoints,
  addCircleThroughPoints,
  addLineLineIntersection,
  addLineCircleIntersection,
  addCircleCircleIntersection,
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
  handleBuildCircle: () => void;
  canBuildCircle: boolean;
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
  const [circleDraftPointId, setCircleDraftPointId] = useState<ConstructionId | undefined>();
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
    if (tool !== "circle") {
      setCircleDraftPointId(undefined);
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
        setCircleDraftPointId(undefined);
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

      if (activeTool === "circle") {
        if (!realizedPointIds.has(id)) {
          return;
        }

        if (!circleDraftPointId || circleDraftPointId === id) {
          setCircleDraftPointId(id);
          setSelectedIds(new Set([id]));
          setLastSelectedId(id);
          return;
        }

        const center = circleDraftPointId;
        const nextProgram = addCircleThroughPoints(program, center, id);
        const circleId = circleThroughId(nextProgram, center, id);

        updateProgram(nextProgram);
        setCircleDraftPointId(undefined);
        setSelectedIds(circleId ? new Set([circleId]) : new Set([center, id]));
        setLastSelectedId(circleId ?? id);
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
    [
      activeTool,
      lastSelectedId,
      lineDraftPointId,
      circleDraftPointId,
      program,
      realizedPointIds,
      updateProgram,
    ],
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

      if (activeTool === "line") {
        if (!lineDraftPointId) {
          updateProgram({
            constructions: [...program.constructions, newPoint],
          });
          setLineDraftPointId(newPoint.id);
          setSelectedIds(new Set([newPoint.id]));
          setLastSelectedId(newPoint.id);
        } else {
          const points: readonly [ConstructionId, ConstructionId] = [lineDraftPointId, newPoint.id];
          const programWithPoint = {
            constructions: [...program.constructions, newPoint],
          };
          const nextProgram = addLineThroughPoints(programWithPoint, points);
          const lineId = lineThroughId(nextProgram, points);

          updateProgram(nextProgram);
          setLineDraftPointId(undefined);
          setSelectedIds(lineId ? new Set([lineId]) : new Set(points));
          setLastSelectedId(lineId ?? newPoint.id);
        }
        return;
      }

      if (activeTool === "circle") {
        if (!circleDraftPointId) {
          updateProgram({
            constructions: [...program.constructions, newPoint],
          });
          setCircleDraftPointId(newPoint.id);
          setSelectedIds(new Set([newPoint.id]));
          setLastSelectedId(newPoint.id);
        } else {
          const center = circleDraftPointId;
          const programWithPoint = {
            constructions: [...program.constructions, newPoint],
          };
          const nextProgram = addCircleThroughPoints(programWithPoint, center, newPoint.id);
          const circleId = circleThroughId(nextProgram, center, newPoint.id);

          updateProgram(nextProgram);
          setCircleDraftPointId(undefined);
          setSelectedIds(circleId ? new Set([circleId]) : new Set([center, newPoint.id]));
          setLastSelectedId(circleId ?? newPoint.id);
        }
        return;
      }

      updateProgram({
        constructions: [...program.constructions, newPoint],
      });

      setSelectedIds(new Set([newPoint.id]));
      setLastSelectedId(newPoint.id);
    },
    [activeTool, lineDraftPointId, circleDraftPointId, program, screenToWorld, updateProgram],
  );

  const handleAddIntersection = useCallback(
    (hit: IntersectionHit) => {
      const prim1 = evaluated.primitives.find((p) => p.id === hit.operands[0]);
      const prim2 = evaluated.primitives.find((p) => p.id === hit.operands[1]);

      if (!prim1 || !prim2) {
        return;
      }

      let nextProgram: ConstructionProgram;
      let intersectionId: ConstructionId | undefined;

      if (prim1.kind === "line" && prim2.kind === "line") {
        const lines: readonly [ConstructionId, ConstructionId] = [prim1.id, prim2.id];
        nextProgram = addLineLineIntersection(program, lines);
        intersectionId = lineLineIntersectionId(nextProgram, lines);
      } else if (
        (prim1.kind === "line" && prim2.kind === "circle") ||
        (prim1.kind === "circle" && prim2.kind === "line")
      ) {
        const lineId = prim1.kind === "line" ? prim1.id : prim2.id;
        const circleId = prim1.kind === "circle" ? prim1.id : prim2.id;
        const idx = hit.intersectionIndex ?? 0;
        nextProgram = addLineCircleIntersection(program, lineId, circleId, idx);
        intersectionId = lineCircleIntersectionId(nextProgram, lineId, circleId, idx);
      } else if (prim1.kind === "circle" && prim2.kind === "circle") {
        const idx = hit.intersectionIndex ?? 0;
        nextProgram = addCircleCircleIntersection(program, prim1.id, prim2.id, idx);
        intersectionId = circleCircleIntersectionId(nextProgram, prim1.id, prim2.id, idx);
      } else {
        return;
      }

      if (!intersectionId) {
        return;
      }

      if (activeTool === "line") {
        if (!lineDraftPointId) {
          updateProgram(nextProgram);
          setLineDraftPointId(intersectionId);
          setSelectedIds(new Set([intersectionId]));
          setLastSelectedId(intersectionId);
        } else {
          const points: readonly [ConstructionId, ConstructionId] = [lineDraftPointId, intersectionId];
          const nextProgramWithLine = addLineThroughPoints(nextProgram, points);
          const lineId = lineThroughId(nextProgramWithLine, points);

          updateProgram(nextProgramWithLine);
          setLineDraftPointId(undefined);
          setSelectedIds(lineId ? new Set([lineId]) : new Set(points));
          setLastSelectedId(lineId ?? intersectionId);
        }
        return;
      }

      if (activeTool === "circle") {
        if (!circleDraftPointId) {
          updateProgram(nextProgram);
          setCircleDraftPointId(intersectionId);
          setSelectedIds(new Set([intersectionId]));
          setLastSelectedId(intersectionId);
        } else {
          const center = circleDraftPointId;
          const nextProgramWithCircle = addCircleThroughPoints(nextProgram, center, intersectionId);
          const circleId = circleThroughId(nextProgramWithCircle, center, intersectionId);

          updateProgram(nextProgramWithCircle);
          setCircleDraftPointId(undefined);
          setSelectedIds(circleId ? new Set([circleId]) : new Set([center, intersectionId]));
          setLastSelectedId(circleId ?? intersectionId);
        }
        return;
      }

      updateProgram(nextProgram);
      setSelectedIds(new Set([intersectionId]));
      setLastSelectedId(intersectionId);
    },
    [activeTool, lineDraftPointId, circleDraftPointId, program, evaluated.primitives, updateProgram],
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

  const selectedPointsCount = useMemo(() => {
    return Array.from(selectedIds).filter((id) => realizedPointIds.has(id)).length;
  }, [selectedIds, realizedPointIds]);

  const canBuildCircle = selectedPointsCount === 2 || selectedPointsCount === 3;

  const handleBuildCircle = useCallback(() => {
    const selectedPoints = Array.from(selectedIds).filter((id) => realizedPointIds.has(id));
    if (selectedPoints.length === 2) {
      const [center, pointOnCircle] = selectedPoints;
      const nextProgram = addCircleThroughPoints(program, center, pointOnCircle);
      const circleId = circleThroughId(nextProgram, center, pointOnCircle);
      updateProgram(nextProgram);
      setSelectedIds(circleId ? new Set([circleId]) : new Set([center, pointOnCircle]));
      setLastSelectedId(circleId ?? pointOnCircle);
    } else if (selectedPoints.length === 3) {
      const points = selectedPoints as [ConstructionId, ConstructionId, ConstructionId];
      const nextProgram = addCircleThreePoints(program, points);
      const circleId = circleThreePointsId(nextProgram, points);
      updateProgram(nextProgram);
      setSelectedIds(circleId ? new Set([circleId]) : new Set(points));
      setLastSelectedId(circleId ?? points[2]);
    }
  }, [selectedIds, realizedPointIds, program, updateProgram]);

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
    handleBuildCircle,
    canBuildCircle,
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

function circleThroughId(
  program: ConstructionProgram,
  center: ConstructionId,
  pointOnCircle: ConstructionId,
): ConstructionId | undefined {
  const circle = program.constructions.find(
    (construction) =>
      construction.kind === "circle-through" &&
      construction.center === center &&
      construction.pointOnCircle === pointOnCircle,
  );

  return circle?.id;
}

function circleThreePointsId(
  program: ConstructionProgram,
  points: readonly [ConstructionId, ConstructionId, ConstructionId],
): ConstructionId | undefined {
  const setPoints = new Set(points);
  const circle = program.constructions.find(
    (construction) =>
      construction.kind === "circle-three-points" && construction.points.every((p) => setPoints.has(p)),
  );

  return circle?.id;
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

function lineCircleIntersectionId(
  program: ConstructionProgram,
  line: ConstructionId,
  circle: ConstructionId,
  intersectionIndex: 0 | 1,
): ConstructionId | undefined {
  const intersection = program.constructions.find(
    (construction) =>
      construction.kind === "line-circle-intersection" &&
      construction.line === line &&
      construction.circle === circle &&
      construction.intersectionIndex === intersectionIndex,
  );

  return intersection?.id;
}

function circleCircleIntersectionId(
  program: ConstructionProgram,
  firstCircle: ConstructionId,
  secondCircle: ConstructionId,
  intersectionIndex: 0 | 1,
): ConstructionId | undefined {
  const [c1, c2] = [firstCircle, secondCircle].sort();
  const intersection = program.constructions.find(
    (construction) =>
      construction.kind === "circle-circle-intersection" &&
      construction.firstCircle === c1 &&
      construction.secondCircle === c2 &&
      construction.intersectionIndex === intersectionIndex,
  );

  return intersection?.id;
}
