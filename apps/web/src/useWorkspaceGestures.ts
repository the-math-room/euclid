import {
  findIntersectionAtPosition,
  findItemAtPosition,
  type IntersectionHit,
  type RenderItem,
  type RenderScene,
} from "@euclid/rendering";
import type { ConstructionId, Point2, ScenePoint } from "@euclid/geometry";
import { useEffect, useRef, type PointerEvent } from "react";
import {
  gesturePolicyForTool,
  type ActiveTool,
  type ConstructionGestureTarget,
  type ConstructionToolGesturePolicy,
} from "./construction/tools";
import { clientToSceneCoords, getCanvasProjection } from "./workspaceCoordinates";

type ActivePointer = Readonly<{
  id: number;
  x: number;
  y: number;
}>;

type GestureState = {
  pointers: Map<number, ActivePointer>;
  lastPos: Map<number, Point2>;
  dragStartX: number;
  dragStartY: number;
  hasMoved: boolean;
  pinchStartDistance: number;
  pinchStartZoom: number;
  pinchLastMidpoint: Point2;
  activePointDrag?: {
    pointerId: number;
    id: ConstructionId;
  };
  activeShapeDrag?: {
    pointerId: number;
    id: ConstructionId;
    startSceneCoords: ScenePoint;
  };
  pointerDownItem?: RenderItem;
};

export type WorkspacePointerProps = Readonly<{
  onPointerDown: (event: PointerEvent<Element>) => void;
  onPointerMove: (event: PointerEvent<Element>) => void;
  onPointerUp: (event: PointerEvent<Element>) => void;
  onPointerCancel: (event: PointerEvent<Element>) => void;
  onLostPointerCapture: (event: PointerEvent<Element>) => void;
  onPointerLeave: () => void;
}>;

export function useWorkspaceGestures({
  scene,
  activeTool,
  currentZoom,
  onSelect,
  onPanBy,
  onZoom,
  onAddPoint,
  onBeginPointDrag,
  onMovePoint,
  onEndPointDrag,
  onBeginShapeDrag,
  onMoveShape,
  onAddIntersection,
  canDragPoint,
  onPointerMoveCoords,
  onPointerDownStateChange,
}: {
  scene: RenderScene;
  activeTool: ActiveTool;
  currentZoom: number;
  onSelect: (id: ConstructionId | undefined, modifiers?: { ctrlKey?: boolean; shiftKey?: boolean }) => void;
  onPanBy: (delta: Point2) => void;
  onZoom: (zoom: number) => void;
  onAddPoint: (sceneCoords: ScenePoint) => void;
  onBeginPointDrag: (id: ConstructionId) => void;
  onMovePoint: (id: ConstructionId, sceneCoords: ScenePoint) => void;
  onEndPointDrag: () => void;
  onBeginShapeDrag: (id: ConstructionId) => void;
  onMoveShape: (id: ConstructionId, startSceneCoords: ScenePoint, currentSceneCoords: ScenePoint) => void;
  onAddIntersection: (hit: IntersectionHit) => void;
  canDragPoint: (id: ConstructionId) => boolean;
  onPointerMoveCoords?: (sceneCoords: ScenePoint | undefined) => void;
  onPointerDownStateChange?: (isDown: boolean) => void;
}): WorkspacePointerProps {
  const gestureRef = useRef<GestureState>({
    pointers: new Map(),
    lastPos: new Map(),
    dragStartX: 0,
    dragStartY: 0,
    hasMoved: false,
    pinchStartDistance: 0,
    pinchStartZoom: 1,
    pinchLastMidpoint: { x: 0, y: 0 },
    activePointDrag: undefined,
    activeShapeDrag: undefined,
    pointerDownItem: undefined,
  });

  const currentZoomRef = useRef(currentZoom);
  useEffect(() => {
    currentZoomRef.current = currentZoom;
  }, [currentZoom]);

  const onPointerDown = (event: PointerEvent<Element>) => {
    (event.currentTarget as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture?.(
      event.pointerId,
    );

    const g = gestureRef.current;
    const p: ActivePointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    g.pointers.set(event.pointerId, p);
    g.lastPos.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (g.pointers.size === 1) {
      g.dragStartX = event.clientX;
      g.dragStartY = event.clientY;
      g.hasMoved = false;
      onPointerDownStateChange?.(true);

      const rect = event.currentTarget.getBoundingClientRect();
      const sceneCoords = clientToSceneCoords(
        event.clientX,
        event.clientY,
        rect,
        scene.size.width,
        scene.size.height,
      );
      onPointerMoveCoords?.(sceneCoords);
      const threshold = getHitThreshold(event.pointerType);
      const item = findItemAtPosition(scene, sceneCoords, threshold);
      g.pointerDownItem = item;

      if (activeTool === "select" && !event.ctrlKey && !event.shiftKey) {
        if (item?.kind === "point" && canDragPoint(item.id)) {
          g.activePointDrag = {
            pointerId: event.pointerId,
            id: item.id,
          };
          onBeginPointDrag(item.id);
        } else if (item?.kind === "line" || item?.kind === "circle") {
          g.activeShapeDrag = {
            pointerId: event.pointerId,
            id: item.id,
            startSceneCoords: sceneCoords,
          };
          onBeginShapeDrag(item.id);
        }
      }
    } else if (g.pointers.size === 2) {
      const [a, b] = Array.from(g.pointers.values()) as [ActivePointer, ActivePointer];
      g.pinchStartDistance = pointerDistance(a, b);
      g.pinchStartZoom = currentZoomRef.current;
      g.pinchLastMidpoint = pointerMidpoint(a, b);
      g.hasMoved = true;
      if (g.activePointDrag || g.activeShapeDrag) {
        onEndPointDrag();
      }
      g.activePointDrag = undefined;
      g.activeShapeDrag = undefined;
    }
  };

  const releasePointerCapture = (event: PointerEvent<Element>) => {
    const target = event.currentTarget as Element & {
      hasPointerCapture?: (id: number) => boolean;
      releasePointerCapture?: (id: number) => void;
    };
    if (target.hasPointerCapture?.(event.pointerId)) {
      target.releasePointerCapture?.(event.pointerId);
    }
  };

  const clearPointerGesture = (pointerId: number) => {
    const g = gestureRef.current;
    if (g.activePointDrag?.pointerId === pointerId || g.activeShapeDrag?.pointerId === pointerId) {
      onEndPointDrag();
      g.activePointDrag = undefined;
      g.activeShapeDrag = undefined;
    }
    g.pointers.delete(pointerId);
    g.lastPos.delete(pointerId);
    if (g.pointers.size === 0) {
      g.hasMoved = false;
      g.pointerDownItem = undefined;
      onPointerDownStateChange?.(false);
    }
  };

  const onPointerMove = (event: PointerEvent<Element>) => {
    const g = gestureRef.current;
    const rect = event.currentTarget.getBoundingClientRect();
    const sceneCoords = clientToSceneCoords(
      event.clientX,
      event.clientY,
      rect,
      scene.size.width,
      scene.size.height,
    );
    onPointerMoveCoords?.(sceneCoords);

    if (!g.pointers.has(event.pointerId)) {
      return;
    }

    const prev = g.lastPos.get(event.pointerId);
    g.pointers.set(event.pointerId, { id: event.pointerId, x: event.clientX, y: event.clientY });
    g.lastPos.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const { scale } = getCanvasProjection(rect.width, rect.height, scene.size.width, scene.size.height);
    const panScale = scale > 0 ? scale : 1;

    if (g.activePointDrag?.pointerId === event.pointerId && g.pointers.size === 1) {
      const totalDist = Math.hypot(event.clientX - g.dragStartX, event.clientY - g.dragStartY);
      if (totalDist > 4) g.hasMoved = true;

      if (g.hasMoved) {
        onMovePoint(g.activePointDrag.id, sceneCoords);
      }
    } else if (g.activeShapeDrag?.pointerId === event.pointerId && g.pointers.size === 1) {
      const totalDist = Math.hypot(event.clientX - g.dragStartX, event.clientY - g.dragStartY);
      if (totalDist > 4) g.hasMoved = true;

      if (g.hasMoved) {
        onMoveShape(g.activeShapeDrag.id, g.activeShapeDrag.startSceneCoords, sceneCoords);
      }
    } else if (g.pointers.size >= 2) {
      const [a, b] = Array.from(g.pointers.values()) as [ActivePointer, ActivePointer];
      const currentDist = pointerDistance(a, b);
      const midpoint = pointerMidpoint(a, b);

      const panDelta: Point2 = {
        x: (midpoint.x - g.pinchLastMidpoint.x) / panScale,
        y: (midpoint.y - g.pinchLastMidpoint.y) / panScale,
      };
      if (panDelta.x !== 0 || panDelta.y !== 0) onPanBy(panDelta);

      if (g.pinchStartDistance > 0) {
        onZoom(g.pinchStartZoom * (currentDist / g.pinchStartDistance));
      }

      g.pinchLastMidpoint = midpoint;
    } else if (prev) {
      const dx = event.clientX - prev.x;
      const dy = event.clientY - prev.y;
      const totalDist = Math.hypot(event.clientX - g.dragStartX, event.clientY - g.dragStartY);
      if (totalDist > 4) g.hasMoved = true;
      if (g.hasMoved && (dx !== 0 || dy !== 0)) {
        if (activeTool === "select") {
          onPanBy({ x: dx / panScale, y: dy / panScale });
        }
      }
    }
  };

  const onPointerUp = (event: PointerEvent<Element>) => {
    const g = gestureRef.current;
    const wasOnlyPointer = g.pointers.size === 1;
    const wasTap = !g.hasMoved;
    const isCreationMode = activeTool !== "select";

    g.pointers.delete(event.pointerId);
    g.lastPos.delete(event.pointerId);

    if (g.pointers.size === 0) {
      onPointerDownStateChange?.(false);
    }

    if (wasOnlyPointer && (wasTap || isCreationMode)) {
      const rect = event.currentTarget.getBoundingClientRect();
      const sceneCoords = clientToSceneCoords(
        event.clientX,
        event.clientY,
        rect,
        scene.size.width,
        scene.size.height,
      );

      const threshold = getHitThreshold(event.pointerType);
      const isTouch = event.pointerType === "touch" || event.pointerType === "pen";

      const modifiers = { ctrlKey: event.ctrlKey || isTouch, shiftKey: event.shiftKey };

      const gesturePolicy = gesturePolicyForTool(activeTool);

      if (gesturePolicy) {
        handleConstructionPointerUp({
          policy: gesturePolicy,
          scene,
          sceneCoords,
          threshold,
          pointerDownItem: g.pointerDownItem,
          onSelect: (id) => onSelect(id, modifiers),
          onAddPoint,
          onAddIntersection,
        });
      } else {
        const item = findItemAtPosition(scene, sceneCoords, threshold);
        if (item) {
          onSelect(item.id, modifiers);
        } else {
          onSelect(undefined);
        }
      }
    }

    if (
      g.activePointDrag?.pointerId === event.pointerId ||
      g.activeShapeDrag?.pointerId === event.pointerId
    ) {
      onEndPointDrag();
      g.activePointDrag = undefined;
      g.activeShapeDrag = undefined;
    }
    releasePointerCapture(event);

    if (g.pointers.size === 1) {
      const remaining = Array.from(g.pointers.values())[0];
      g.dragStartX = remaining.x;
      g.dragStartY = remaining.y;
      g.hasMoved = false;
    }
  };

  const onPointerCancel = (event: PointerEvent<Element>) => {
    clearPointerGesture(event.pointerId);
    releasePointerCapture(event);
  };

  const onLostPointerCapture = (event: PointerEvent<Element>) => {
    clearPointerGesture(event.pointerId);
  };

  const onPointerLeave = () => {
    onPointerMoveCoords?.(undefined);
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
    onPointerLeave,
  };
}

function pointerDistance(a: ActivePointer, b: ActivePointer): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointerMidpoint(a: ActivePointer, b: ActivePointer): Point2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function handleConstructionPointerUp({
  policy,
  scene,
  sceneCoords,
  threshold,
  pointerDownItem,
  onSelect,
  onAddPoint,
  onAddIntersection,
}: {
  policy: ConstructionToolGesturePolicy;
  scene: RenderScene;
  sceneCoords: ScenePoint;
  threshold: number;
  pointerDownItem: RenderItem | undefined;
  onSelect: (id: ConstructionId) => void;
  onAddPoint: (sceneCoords: ScenePoint) => void;
  onAddIntersection: (hit: IntersectionHit) => void;
}): void {
  const releaseItem = findItemAtPosition(scene, sceneCoords, threshold);
  const item = releaseItem ?? pointerDownItem;

  for (const target of policy.pointerUpPriority) {
    if (
      handleGestureTarget(target, {
        scene,
        sceneCoords,
        threshold,
        item,
        onSelect,
        onAddPoint,
        onAddIntersection,
      })
    ) {
      return;
    }
  }
}

function handleGestureTarget(
  target: ConstructionGestureTarget,
  {
    scene,
    sceneCoords,
    threshold,
    item,
    onSelect,
    onAddPoint,
    onAddIntersection,
  }: {
    scene: RenderScene;
    sceneCoords: ScenePoint;
    threshold: number;
    item: RenderItem | undefined;
    onSelect: (id: ConstructionId) => void;
    onAddPoint: (sceneCoords: ScenePoint) => void;
    onAddIntersection: (hit: IntersectionHit) => void;
  },
): boolean {
  if (target === "point" && item?.kind === "point") {
    onSelect(item.id);
    return true;
  }

  if (target === "line" && item?.kind === "line") {
    onSelect(item.id);
    return true;
  }

  if (target === "intersection") {
    const intersection = findIntersectionAtPosition(scene, sceneCoords, threshold);
    if (intersection) {
      onAddIntersection(intersection);
      return true;
    }
  }

  if (target === "empty-point") {
    onAddPoint(sceneCoords);
    return true;
  }

  return false;
}

function getHitThreshold(pointerType: string): number {
  return pointerType === "touch" || pointerType === "pen" ? 20 : 8;
}
