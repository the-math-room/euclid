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
  deleteConstructions,
  evaluateConstruction,
  moveFreePoint,
  translateShape,
} from "@euclid/geometry";
import type { ConstructionId, ConstructionProgram, ScenePoint, WorldPoint } from "@euclid/geometry";
import { unprojectPoint, worldFrameFor, type IntersectionHit, type ViewCamera } from "@euclid/rendering";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { firstRegisteredTool } from "./tools";
import type { ActiveTool } from "./tools";
import { resolvePointInput, type PointInput, type ResolvedPointInput } from "./pointInput";
import { deletableSelectionClosure } from "./deleteSelection";
import {
  clearDraftUnlessTool,
  draftPreviewFor,
  emptyToolDraft,
  toolSessionRegistry,
  type DraftPreview,
  type ToolDraft,
} from "./toolSession";
import type { ActivityPolicy } from "@euclid/activity";
import { canUseTool, canDragConstruction } from "@euclid/activity";

export type ConstructionController = Readonly<{
  program: ConstructionProgram;
  evaluated: ReturnType<typeof evaluateConstruction>;
  selectedIds: ReadonlySet<ConstructionId>;
  activeTool: ActiveTool;
  canUndo: boolean;
  canRedo: boolean;
  canDeleteSelected: boolean;
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
    return firstRegisteredTool(policy.allowedTools);
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

  const realizedCircleIds = useMemo(
    () =>
      new Set(
        evaluated.primitives
          .filter((primitive) => primitive.kind === "circle")
          .map((primitive) => primitive.id),
      ),
    [evaluated.primitives],
  );

  const updateProgram = useCallback((nextProgram: ConstructionProgram) => {
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

  const handlePointInput = useCallback(
    (input: PointInput, options?: { restartOnSameAnchor?: boolean }) => {
      const resolved = resolvePointInput(program, input);
      if (!resolved.id) {
        return;
      }

      const session = toolSessionRegistry[activeTool];
      if (session && session.onPointInput) {
        const context = {
          program: resolved.program,
          realizedPointIds,
          realizedLineIds,
          realizedCircleIds,
        };
        const result = session.onPointInput(context, toolDraft, resolved.id, options);
        if (result) {
          updateProgram(result.program);
          setToolDraft(result.nextDraft);
          setSelectedIds(result.selectedIds);
          setLastSelectedId(result.lastSelectedId);
        }
      }
    },
    [activeTool, program, toolDraft, realizedPointIds, realizedLineIds, realizedCircleIds, updateProgram],
  );

  const handleSelect = useCallback(
    (id: ConstructionId | undefined, modifiers?: { ctrlKey?: boolean; shiftKey?: boolean }) => {
      if (id === undefined) {
        clearSelection(setSelectedIds, setLastSelectedId);
        setToolDraft(emptyToolDraft);
        return;
      }

      const session = toolSessionRegistry[activeTool];
      if (session) {
        const context = {
          program,
          realizedPointIds,
          realizedLineIds,
          realizedCircleIds,
        };

        if (session.onSelectShape) {
          const result = session.onSelectShape(context, toolDraft, id);
          if (result) {
            updateProgram(result.program);
            setToolDraft(result.nextDraft);
            setSelectedIds(result.selectedIds);
            setLastSelectedId(result.lastSelectedId);
            return;
          }
        }

        if (realizedPointIds.has(id)) {
          handlePointInput({ kind: "existing-point", id }, { restartOnSameAnchor: true });
          return;
        }

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
      realizedCircleIds,
      handlePointInput,
      updateProgram,
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
      const pointInput: PointInput = { kind: "free-point", position: screenToWorld(sceneCoords) };
      const session = toolSessionRegistry[activeTool];
      if (session && activeTool !== "select") {
        handlePointInput(pointInput);
        return;
      }

      const resolved = resolvePointInput(program, pointInput);
      if (!resolved.id) {
        return;
      }
      updateProgramIfChanged(resolved, updateProgram);
      setSelectedIds(new Set([resolved.id]));
      setLastSelectedId(resolved.id);
    },
    [activeTool, program, screenToWorld, updateProgram, handlePointInput],
  );

  const handleAddIntersection = useCallback(
    (hit: IntersectionHit) => {
      const pointInput: PointInput = { kind: "intersection", hit };
      const session = toolSessionRegistry[activeTool];
      if (session && activeTool !== "select") {
        handlePointInput(pointInput);
        return;
      }

      const resolved = resolvePointInput(program, pointInput);
      if (!resolved.id) {
        return;
      }
      updateProgramIfChanged(resolved, updateProgram);
      setSelectedIds(new Set([resolved.id]));
      setLastSelectedId(resolved.id);
    },
    [activeTool, program, updateProgram, handlePointInput],
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

  const deleteSelectionIds = useMemo(
    () =>
      deletableSelectionClosure({
        constructions: program.constructions,
        selectedIds,
        policy,
      }),
    [program.constructions, selectedIds, policy],
  );

  const canDeleteSelected = deleteSelectionIds.size > 0;

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    if (deleteSelectionIds.size === 0) return;
    updateProgram({
      constructions: deleteConstructions(program.constructions, deleteSelectionIds),
    });
    clearSelection(setSelectedIds, setLastSelectedId);
  }, [selectedIds.size, deleteSelectionIds, program.constructions, updateProgram]);

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
    canDeleteSelected,
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
