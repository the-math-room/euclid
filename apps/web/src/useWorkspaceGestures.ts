import { type IntersectionHit, type RenderScene } from "@euclid/rendering";
import type { ConstructionId, Point2, ScenePoint } from "@euclid/geometry";
import { useRef, type PointerEvent } from "react";
import type { ActiveTool } from "./construction/tools";
import { clientToSceneCoords, getCanvasProjection } from "./workspaceCoordinates";
import { GestureController } from "./GestureController";

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
  const controllerRef = useRef<GestureController | null>(null);

  // Lazy initializer to avoid ref access during render
  const getController = () => {
    const freshCallbacks = {
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
    };

    if (!controllerRef.current) {
      controllerRef.current = new GestureController(freshCallbacks);
    } else {
      controllerRef.current.callbacks = freshCallbacks;
    }
    return controllerRef.current;
  };

  const onPointerDown = (event: PointerEvent<Element>) => {
    (event.currentTarget as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture?.(
      event.pointerId,
    );

    const rect = event.currentTarget.getBoundingClientRect();
    const sceneCoords = clientToSceneCoords(
      event.clientX,
      event.clientY,
      rect,
      scene.size.width,
      scene.size.height,
    );

    getController().handlePointerDown({
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      clientX: event.clientX,
      clientY: event.clientY,
      sceneCoords,
      scene,
      activeTool,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      zoom: currentZoom,
    });
  };

  const onPointerMove = (event: PointerEvent<Element>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const sceneCoords = clientToSceneCoords(
      event.clientX,
      event.clientY,
      rect,
      scene.size.width,
      scene.size.height,
    );

    const { scale } = getCanvasProjection(rect.width, rect.height, scene.size.width, scene.size.height);
    const panScale = scale > 0 ? scale : 1;

    getController().handlePointerMove({
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      sceneCoords,
      panScale,
      activeTool,
    });
  };

  const onPointerUp = (event: PointerEvent<Element>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const sceneCoords = clientToSceneCoords(
      event.clientX,
      event.clientY,
      rect,
      scene.size.width,
      scene.size.height,
    );

    getController().handlePointerUp({
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      sceneCoords,
      scene,
      activeTool,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
    });

    const target = event.currentTarget as Element & {
      hasPointerCapture?: (id: number) => boolean;
      releasePointerCapture?: (id: number) => void;
    };
    if (target.hasPointerCapture?.(event.pointerId)) {
      target.releasePointerCapture?.(event.pointerId);
    }
  };

  const onPointerCancel = (event: PointerEvent<Element>) => {
    getController().handlePointerCancel(event.pointerId);
    const target = event.currentTarget as Element & {
      hasPointerCapture?: (id: number) => boolean;
      releasePointerCapture?: (id: number) => void;
    };
    if (target.hasPointerCapture?.(event.pointerId)) {
      target.releasePointerCapture?.(event.pointerId);
    }
  };

  const onLostPointerCapture = (event: PointerEvent<Element>) => {
    getController().handleLostPointerCapture(event.pointerId);
  };

  const onPointerLeave = () => {
    getController().callbacks.onPointerMoveCoords?.(undefined);
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
