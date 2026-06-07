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
  addParallelLine,
  addPerpendicularLine,
  addMidpoint,
  deleteConstructions,
  evaluateConstruction,
  generateNextPointLabel,
  moveFreePoint,
  translateShape,
} from "@euclid/geometry";
import type {
  AddConstructionResult,
  Construction,
  ConstructionId,
  ConstructionProgram,
  ScenePoint,
  WorldPoint,
} from "@euclid/geometry";
import { unprojectPoint, worldFrameFor, type IntersectionHit, type ViewCamera } from "@euclid/rendering";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ActiveTool } from "./tools";
import { resolvePointInput, type PointInput, type ResolvedPointInput } from "./pointInput";
import {
  clearDraftUnlessTool,
  draftPreviewFor,
  emptyToolDraft,
  type DraftPreview,
  type ToolDraft,
} from "./toolSession";
import type { ActivityPolicy } from "@euclid/activity";
import { canUseTool, canDeleteConstruction, canDragConstruction } from "@euclid/activity";

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
  handleAddPoint: (sceneCoords: ScenePoint) => void;
  handleAddIntersection: (hit: IntersectionHit) => void;
  handleBeginPointDrag: (id: ConstructionId) => void;
  handleMovePoint: (id: ConstructionId, sceneCoords: ScenePoint) => void;
  handleEndPointDrag: () => void;
  handleBeginShapeDrag: (id: ConstructionId) => void;
  handleMoveShape: (id: ConstructionId, startSceneCoords: ScenePoint, currentSceneCoords: ScenePoint) => void;
  canDragPoint: (id: ConstructionId) => boolean;
  handleBuildCircle: () => void;
  canBuildCircle: boolean;
  draftPreview?: DraftPreview;
}>;

export function useConstructionController({
  initialProgram,
  camera,
  sceneSize,
  policy,
  onProgramChange,
}: {
  initialProgram: ConstructionProgram;
  camera: ViewCamera;
  sceneSize: { width: number; height: number };
  policy: ActivityPolicy;
  onProgramChange?: (program: ConstructionProgram) => void;
}): ConstructionController {
  const [history, setHistory] = useState(() => createHistory(initialProgram));
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<ConstructionId>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<ConstructionId | undefined>();
  const [activeTool, setActiveTool] = useState<ActiveTool>(() => {
    const firstAllowed = policy.allowedTools.includes("select")
      ? ("select" as ActiveTool)
      : ((policy.allowedTools[0] as ActiveTool) ?? "select");
    return firstAllowed;
  });
  const [toolDraft, setToolDraft] = useState<ToolDraft>(emptyToolDraft);
  const dragStartProgram = useRef<ConstructionProgram | undefined>(undefined);

  const program = history.present;

  useEffect(() => {
    onProgramChange?.(program);
  }, [program, onProgramChange]);

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

  const realizedLineIds = useMemo(
    () =>
      new Set(
        evaluated.primitives
          .filter((primitive) => primitive.kind === "line")
          .map((primitive) => primitive.id),
      ),
    [evaluated.primitives],
  );

  const updateProgram = useCallback((nextProgram: { constructions: readonly Construction[] }) => {
    setHistory((prev) => pushState(prev, nextProgram));
  }, []);

  const setTool = useCallback(
    (tool: ActiveTool) => {
      if (!canUseTool(policy, tool)) {
        return;
      }
      setActiveTool(tool);
      setToolDraft((draft) => clearDraftUnlessTool(draft, tool));
    },
    [policy],
  );

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

  const handleLinePointInput = useCallback(
    (input: PointInput, options?: { restartOnSameAnchor?: boolean }) => {
      const resolved = resolvePointInput(program, input);
      if (!resolved.id) {
        return;
      }

      if (
        toolDraft.kind !== "line" ||
        (options?.restartOnSameAnchor === true && toolDraft.anchorId === resolved.id)
      ) {
        updateProgramIfChanged(resolved, updateProgram);
        setToolDraft({ kind: "line", anchorId: resolved.id });
        setSelectedIds(new Set([resolved.id]));
        setLastSelectedId(resolved.id);
        return;
      }

      const points: readonly [ConstructionId, ConstructionId] = [toolDraft.anchorId, resolved.id];
      const result = addLineThroughPoints(resolved.program, points);

      updateProgram(result.program);
      setToolDraft(emptyToolDraft);
      setSelectedIds(result.id ? new Set([result.id]) : new Set(points));
      setLastSelectedId(result.id ?? resolved.id);
    },
    [program, toolDraft, updateProgram],
  );

  const handleCirclePointInput = useCallback(
    (input: PointInput, options?: { restartOnSameAnchor?: boolean }) => {
      const resolved = resolvePointInput(program, input);
      if (!resolved.id) {
        return;
      }

      if (
        toolDraft.kind !== "circle" ||
        (options?.restartOnSameAnchor === true && toolDraft.anchorId === resolved.id)
      ) {
        updateProgramIfChanged(resolved, updateProgram);
        setToolDraft({ kind: "circle", anchorId: resolved.id });
        setSelectedIds(new Set([resolved.id]));
        setLastSelectedId(resolved.id);
        return;
      }

      const center = toolDraft.anchorId;
      const result = addCircleThroughPoints(resolved.program, center, resolved.id);

      updateProgram(result.program);
      setToolDraft(emptyToolDraft);
      setSelectedIds(result.id ? new Set([result.id]) : new Set([center, resolved.id]));
      setLastSelectedId(result.id ?? resolved.id);
    },
    [program, toolDraft, updateProgram],
  );

  const handleSelect = useCallback(
    (id: ConstructionId | undefined, modifiers?: { ctrlKey?: boolean; shiftKey?: boolean }) => {
      if (id === undefined) {
        clearSelection(setSelectedIds, setLastSelectedId);
        setToolDraft(emptyToolDraft);
        return;
      }

      if (activeTool === "parallel") {
        if (toolDraft.kind !== "parallel") {
          if (!realizedLineIds.has(id)) {
            return;
          }
          setToolDraft({ kind: "parallel", lineId: id });
          setSelectedIds(new Set([id]));
          setLastSelectedId(id);
          return;
        }

        if (!realizedPointIds.has(id)) {
          return;
        }

        const result = addParallelLine(program, toolDraft.lineId, id);
        updateProgram(result.program);
        setToolDraft(emptyToolDraft);
        setSelectedIds(result.id ? new Set([result.id]) : new Set([id]));
        setLastSelectedId(result.id ?? id);
        return;
      }

      if (activeTool === "perpendicular") {
        if (toolDraft.kind !== "perpendicular") {
          if (!realizedLineIds.has(id)) {
            return;
          }
          setToolDraft({ kind: "perpendicular", lineId: id });
          setSelectedIds(new Set([id]));
          setLastSelectedId(id);
          return;
        }

        if (!realizedPointIds.has(id)) {
          return;
        }

        const result = addPerpendicularLine(program, toolDraft.lineId, id);
        updateProgram(result.program);
        setToolDraft(emptyToolDraft);
        setSelectedIds(result.id ? new Set([result.id]) : new Set([id]));
        setLastSelectedId(result.id ?? id);
        return;
      }

      if (activeTool === "midpoint") {
        if (toolDraft.kind !== "midpoint" || toolDraft.anchorId === id) {
          if (!realizedPointIds.has(id)) {
            return;
          }
          setToolDraft({ kind: "midpoint", anchorId: id });
          setSelectedIds(new Set([id]));
          setLastSelectedId(id);
          return;
        }

        if (!realizedPointIds.has(id)) {
          return;
        }

        const result = addMidpoint(program, [toolDraft.anchorId, id]);
        updateProgram(result.program);
        setToolDraft(emptyToolDraft);
        setSelectedIds(result.id ? new Set([result.id]) : new Set([toolDraft.anchorId, id]));
        setLastSelectedId(result.id ?? id);
        return;
      }

      if (activeTool === "line") {
        if (!realizedPointIds.has(id)) {
          return;
        }

        handleLinePointInput({ kind: "existing-point", id }, { restartOnSameAnchor: true });
        return;
      }

      if (activeTool === "circle") {
        if (!realizedPointIds.has(id)) {
          return;
        }

        handleCirclePointInput({ kind: "existing-point", id }, { restartOnSameAnchor: true });
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
      toolDraft,
      program,
      realizedPointIds,
      realizedLineIds,
      updateProgram,
      handleLinePointInput,
      handleCirclePointInput,
    ],
  );

  const screenToWorld = useCallback(
    (sceneCoords: ScenePoint): WorldPoint => {
      const frame = worldFrameFor({
        viewport: { size: sceneSize },
        camera,
      });
      return unprojectPoint(frame, sceneCoords);
    },
    [camera, sceneSize],
  );

  const handleAddPoint = useCallback(
    (sceneCoords: ScenePoint) => {
      if (activeTool === "line") {
        handleLinePointInput({ kind: "free-point", position: screenToWorld(sceneCoords) });
        return;
      }

      if (activeTool === "circle") {
        handleCirclePointInput({ kind: "free-point", position: screenToWorld(sceneCoords) });
        return;
      }

      const label = generateNextPointLabel(program.constructions);

      const newPoint: Construction = {
        id: label,
        kind: "free-point",
        label,
        position: screenToWorld(sceneCoords),
      };

      if (activeTool === "parallel") {
        if (toolDraft.kind !== "parallel") {
          return;
        }

        const programWithPoint = {
          constructions: [...program.constructions, newPoint],
        };
        const result = addParallelLine(programWithPoint, toolDraft.lineId, newPoint.id);

        updateProgram(result.program);
        setToolDraft(emptyToolDraft);
        setSelectedIds(result.id ? new Set([result.id]) : new Set([newPoint.id]));
        setLastSelectedId(result.id ?? newPoint.id);
        return;
      }

      if (activeTool === "perpendicular") {
        if (toolDraft.kind !== "perpendicular") {
          return;
        }

        const programWithPoint = {
          constructions: [...program.constructions, newPoint],
        };
        const result = addPerpendicularLine(programWithPoint, toolDraft.lineId, newPoint.id);

        updateProgram(result.program);
        setToolDraft(emptyToolDraft);
        setSelectedIds(result.id ? new Set([result.id]) : new Set([newPoint.id]));
        setLastSelectedId(result.id ?? newPoint.id);
        return;
      }

      if (activeTool === "midpoint") {
        if (toolDraft.kind !== "midpoint") {
          updateProgram({
            constructions: [...program.constructions, newPoint],
          });
          setToolDraft({ kind: "midpoint", anchorId: newPoint.id });
          setSelectedIds(new Set([newPoint.id]));
          setLastSelectedId(newPoint.id);
        } else {
          const firstPoint = toolDraft.anchorId;
          const programWithPoint = {
            constructions: [...program.constructions, newPoint],
          };
          const result = addMidpoint(programWithPoint, [firstPoint, newPoint.id]);

          updateProgram(result.program);
          setToolDraft(emptyToolDraft);
          setSelectedIds(result.id ? new Set([result.id]) : new Set([firstPoint, newPoint.id]));
          setLastSelectedId(result.id ?? newPoint.id);
        }
        return;
      }

      updateProgram({
        constructions: [...program.constructions, newPoint],
      });

      setSelectedIds(new Set([newPoint.id]));
      setLastSelectedId(newPoint.id);
    },
    [
      activeTool,
      toolDraft,
      program,
      screenToWorld,
      updateProgram,
      handleLinePointInput,
      handleCirclePointInput,
    ],
  );

  const handleAddIntersection = useCallback(
    (hit: IntersectionHit) => {
      if (activeTool === "line") {
        handleLinePointInput({ kind: "intersection", hit });
        return;
      }

      if (activeTool === "circle") {
        handleCirclePointInput({ kind: "intersection", hit });
        return;
      }

      let result: AddConstructionResult;

      if (hit.kind === "line-line-intersection") {
        result = addLineLineIntersection(program, hit.lines);
      } else if (hit.kind === "line-circle-intersection") {
        result = addLineCircleIntersection(program, hit.line, hit.circle, hit.intersectionIndex);
      } else if (hit.kind === "circle-circle-intersection") {
        result = addCircleCircleIntersection(
          program,
          hit.firstCircle,
          hit.secondCircle,
          hit.intersectionIndex,
        );
      } else {
        const _exhaustiveCheck: never = hit;
        return _exhaustiveCheck;
      }

      if (!result.id) {
        return;
      }

      if (activeTool === "parallel") {
        if (toolDraft.kind !== "parallel") {
          return;
        }

        const parallelResult = addParallelLine(result.program, toolDraft.lineId, result.id);
        updateProgram(parallelResult.program);
        setToolDraft(emptyToolDraft);
        setSelectedIds(parallelResult.id ? new Set([parallelResult.id]) : new Set([result.id]));
        setLastSelectedId(parallelResult.id ?? result.id);
        return;
      }

      if (activeTool === "perpendicular") {
        if (toolDraft.kind !== "perpendicular") {
          return;
        }

        const perpResult = addPerpendicularLine(result.program, toolDraft.lineId, result.id);
        updateProgram(perpResult.program);
        setToolDraft(emptyToolDraft);
        setSelectedIds(perpResult.id ? new Set([perpResult.id]) : new Set([result.id]));
        setLastSelectedId(perpResult.id ?? result.id);
        return;
      }

      if (activeTool === "midpoint") {
        if (toolDraft.kind !== "midpoint") {
          updateProgram(result.program);
          setToolDraft({ kind: "midpoint", anchorId: result.id });
          setSelectedIds(new Set([result.id]));
          setLastSelectedId(result.id);
        } else {
          const firstPoint = toolDraft.anchorId;
          const midResult = addMidpoint(result.program, [firstPoint, result.id]);
          updateProgram(midResult.program);
          setToolDraft(emptyToolDraft);
          setSelectedIds(midResult.id ? new Set([midResult.id]) : new Set([firstPoint, result.id]));
          setLastSelectedId(midResult.id ?? result.id);
        }
        return;
      }

      updateProgram(result.program);
      setSelectedIds(new Set([result.id]));
      setLastSelectedId(result.id);
    },
    [activeTool, toolDraft, program, updateProgram, handleLinePointInput, handleCirclePointInput],
  );

  const canDragPoint = useCallback(
    (id: ConstructionId) => {
      const construction = program.constructions.find((c) => c.id === id);
      if (!construction) return false;
      return canDragConstruction(policy, construction);
    },
    [program.constructions, policy],
  );

  const handleBeginPointDrag = useCallback(
    (id: ConstructionId) => {
      if (!canDragPoint(id)) {
        return;
      }

      dragStartProgram.current = history.present;
      setSelectedIds(new Set([id]));
      setLastSelectedId(id);
    },
    [canDragPoint, history.present],
  );

  const handleMovePoint = useCallback(
    (id: ConstructionId, sceneCoords: ScenePoint) => {
      const worldPosition = screenToWorld(sceneCoords);
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

  const handleBeginShapeDrag = useCallback(
    (id: ConstructionId) => {
      const construction = program.constructions.find((c) => c.id === id);
      if (!construction || !canDragConstruction(policy, construction)) {
        return;
      }
      dragStartProgram.current = history.present;
      setSelectedIds(new Set([id]));
      setLastSelectedId(id);
    },
    [program.constructions, policy, history.present],
  );

  const handleMoveShape = useCallback(
    (id: ConstructionId, startSceneCoords: ScenePoint, currentSceneCoords: ScenePoint) => {
      const original = dragStartProgram.current;
      if (!original) return;

      const start = screenToWorld(startSceneCoords);
      const current = screenToWorld(currentSceneCoords);
      const dx = current.x - start.x;
      const dy = current.y - start.y;

      const nextProgram = translateShape(original, id, { x: dx, y: dy });

      setHistory((prev) => ({
        ...prev,
        present: nextProgram,
      }));
    },
    [screenToWorld],
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const deletableIds = new Set(Array.from(selectedIds).filter((id) => canDeleteConstruction(policy, id)));
    if (deletableIds.size === 0) return;
    updateProgram({
      constructions: deleteConstructions(program.constructions, deletableIds),
    });
    clearSelection(setSelectedIds, setLastSelectedId);
  }, [selectedIds, program.constructions, updateProgram, policy]);

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
      const result = addCircleThroughPoints(program, center, pointOnCircle);
      updateProgram(result.program);
      setSelectedIds(result.id ? new Set([result.id]) : new Set([center, pointOnCircle]));
      setLastSelectedId(result.id ?? pointOnCircle);
    } else if (selectedPoints.length === 3) {
      const points = selectedPoints as [ConstructionId, ConstructionId, ConstructionId];
      const result = addCircleThreePoints(program, points);
      updateProgram(result.program);
      setSelectedIds(result.id ? new Set([result.id]) : new Set(points));
      setLastSelectedId(result.id ?? points[2]);
    }
  }, [selectedIds, realizedPointIds, program, updateProgram]);

  const draftPreview = useMemo(() => draftPreviewFor(toolDraft), [toolDraft]);

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
    handleBeginShapeDrag,
    handleMoveShape,
    canDragPoint,
    handleBuildCircle,
    canBuildCircle,
    draftPreview,
  };
}

function clearSelection(
  setSelectedIds: (ids: ReadonlySet<ConstructionId>) => void,
  setLastSelectedId: (id: ConstructionId | undefined) => void,
): void {
  setSelectedIds(new Set());
  setLastSelectedId(undefined);
}

function updateProgramIfChanged(
  resolved: ResolvedPointInput,
  updateProgram: (nextProgram: ConstructionProgram) => void,
): void {
  if (resolved.changed) {
    updateProgram(resolved.program);
  }
}
