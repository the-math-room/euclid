import {
  findIntersectionAtPosition,
  findItemAtPosition,
  type IntersectionHit,
  type RenderScene,
} from "@euclid/rendering";
import type { ConstructionId, Point2 } from "@euclid/geometry";
import {
  useEffect,
  useRef,
  type Dispatch,
  type PointerEvent,
  type RefObject,
  type SetStateAction,
} from "react";
import type { ActiveTool } from "./construction/tools";
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
  renderMode,
  activeTool,
  currentZoom,
  canvasRef,
  setHoveredId,
  onSelect,
  onPanBy,
  onZoom,
  onAddPoint,
  onBeginPointDrag,
  onMovePoint,
  onEndPointDrag,
  onAddIntersection,
  canDragPoint,
  onPointerMoveCoords,
  onPointerDownStateChange,
}: {
  scene: RenderScene;
  renderMode: "svg" | "canvas";
  activeTool: ActiveTool;
  currentZoom: number;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  setHoveredId: Dispatch<SetStateAction<ConstructionId | undefined>>;
  onSelect: (id: ConstructionId | undefined, modifiers?: { ctrlKey?: boolean; shiftKey?: boolean }) => void;
  onPanBy: (delta: Point2) => void;
  onZoom: (zoom: number) => void;
  onAddPoint: (coords: Point2) => void;
  onBeginPointDrag: (id: ConstructionId) => void;
  onMovePoint: (id: ConstructionId, coords: Point2) => void;
  onEndPointDrag: () => void;
  onAddIntersection: (hit: IntersectionHit) => void;
  canDragPoint: (id: ConstructionId) => boolean;
  onPointerMoveCoords?: (coords: Point2 | undefined) => void;
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
      const coords = clientToSceneCoords(
        event.clientX,
        event.clientY,
        rect,
        scene.size.width,
        scene.size.height,
      );
      onPointerMoveCoords?.(coords);

      if (activeTool === "select" && !event.ctrlKey && !event.shiftKey) {
        const rect = event.currentTarget.getBoundingClientRect();
        const coords = clientToSceneCoords(
          event.clientX,
          event.clientY,
          rect,
          scene.size.width,
          scene.size.height,
        );
        const threshold = getHitThreshold(event.pointerType);
        const item = findItemAtPosition(scene, coords, threshold);

        if (item?.kind === "point" && canDragPoint(item.id)) {
          g.activePointDrag = {
            pointerId: event.pointerId,
            id: item.id,
          };
          onBeginPointDrag(item.id);
        }
      }
    } else if (g.pointers.size === 2) {
      const [a, b] = Array.from(g.pointers.values()) as [ActivePointer, ActivePointer];
      g.pinchStartDistance = pointerDistance(a, b);
      g.pinchStartZoom = currentZoomRef.current;
      g.pinchLastMidpoint = pointerMidpoint(a, b);
      g.hasMoved = true;
      if (g.activePointDrag) {
        onEndPointDrag();
      }
      g.activePointDrag = undefined;
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
    if (g.activePointDrag?.pointerId === pointerId) {
      onEndPointDrag();
      g.activePointDrag = undefined;
    }
    g.pointers.delete(pointerId);
    g.lastPos.delete(pointerId);
    if (g.pointers.size === 0) {
      g.hasMoved = false;
      onPointerDownStateChange?.(false);
    }
  };

  const onPointerMove = (event: PointerEvent<Element>) => {
    const g = gestureRef.current;
    const rect = event.currentTarget.getBoundingClientRect();
    const coords = clientToSceneCoords(
      event.clientX,
      event.clientY,
      rect,
      scene.size.width,
      scene.size.height,
    );
    onPointerMoveCoords?.(coords);

    if (!g.pointers.has(event.pointerId)) {
      updateCanvasHover(event, {
        activeTool,
        canvasRef,
        renderMode,
        scene,
        setHoveredId,
      });
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
        onMovePoint(g.activePointDrag.id, coords);
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
          if (renderMode === "canvas") {
            const canvas = canvasRef.current;
            if (canvas) canvas.style.cursor = "grabbing";
          }
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
      const coords = clientToSceneCoords(
        event.clientX,
        event.clientY,
        rect,
        scene.size.width,
        scene.size.height,
      );

      const threshold = getHitThreshold(event.pointerType);
      const isTouch = event.pointerType === "touch" || event.pointerType === "pen";

      if (activeTool === "point" || activeTool === "line" || activeTool === "circle") {
        const intersection = findIntersectionAtPosition(scene, coords, threshold);
        if (intersection) {
          onAddIntersection(intersection);
        } else {
          const item = findItemAtPosition(scene, coords, threshold);
          if (item?.kind === "point") {
            onSelect(item.id, { ctrlKey: event.ctrlKey || isTouch, shiftKey: event.shiftKey });
          } else {
            onAddPoint(coords);
          }
        }
      } else {
        const item = findItemAtPosition(scene, coords, threshold);
        if (item) {
          onSelect(item.id, { ctrlKey: event.ctrlKey || isTouch, shiftKey: event.shiftKey });
        } else {
          onSelect(undefined);
        }
      }
    }

    if (g.activePointDrag?.pointerId === event.pointerId) {
      onEndPointDrag();
      g.activePointDrag = undefined;
    }
    releasePointerCapture(event);
    updateCanvasCursorAfterRelease(event, { activeTool, canvasRef, renderMode, scene });

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
    setHoveredId(undefined);
    onPointerMoveCoords?.(undefined);
    if (renderMode === "canvas") {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = activeTool === "point" ? "crosshair" : "grab";
      }
    }
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

function updateCanvasHover(
  event: PointerEvent<Element>,
  {
    activeTool,
    canvasRef,
    renderMode,
    scene,
    setHoveredId,
  }: {
    activeTool: ActiveTool;
    canvasRef: RefObject<HTMLCanvasElement | null>;
    renderMode: "svg" | "canvas";
    scene: RenderScene;
    setHoveredId: Dispatch<SetStateAction<ConstructionId | undefined>>;
  },
): void {
  if (event.pointerType !== "mouse" || renderMode !== "canvas") {
    return;
  }

  const canvas = canvasRef.current;
  if (!canvas) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const coords = clientToSceneCoords(event.clientX, event.clientY, rect, scene.size.width, scene.size.height);
  const threshold = getHitThreshold(event.pointerType);
  const item = findItemAtPosition(scene, coords, threshold);
  if (activeTool === "point") {
    setHoveredId(undefined);
    canvas.style.cursor = "crosshair";
  } else {
    setHoveredId(item?.id);
    canvas.style.cursor = item ? "pointer" : "grab";
  }
}

function updateCanvasCursorAfterRelease(
  event: PointerEvent<Element>,
  {
    activeTool,
    canvasRef,
    renderMode,
    scene,
  }: {
    activeTool: ActiveTool;
    canvasRef: RefObject<HTMLCanvasElement | null>;
    renderMode: "svg" | "canvas";
    scene: RenderScene;
  },
): void {
  if (renderMode !== "canvas") {
    return;
  }

  const canvas = canvasRef.current;
  if (!canvas) {
    return;
  }

  if (activeTool === "point") {
    canvas.style.cursor = "crosshair";
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const coords = clientToSceneCoords(event.clientX, event.clientY, rect, scene.size.width, scene.size.height);
  const threshold = getHitThreshold(event.pointerType);
  const item = findItemAtPosition(scene, coords, threshold);
  canvas.style.cursor = item ? "pointer" : "grab";
}

function pointerDistance(a: ActivePointer, b: ActivePointer): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointerMidpoint(a: ActivePointer, b: ActivePointer): Point2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function getHitThreshold(pointerType: string): number {
  return pointerType === "touch" || pointerType === "pen" ? 20 : 8;
}
