import {
  findItemAtPosition,
  findSnapTargets,
  type IntersectionHit,
  type RenderItem,
  type RenderScene,
} from "@euclid/rendering";
import type { ConstructionId, Point2, ScenePoint } from "@euclid/geometry";
import {
  gesturePolicyForTool,
  type ActiveTool,
  type ConstructionToolGesturePolicy,
} from "./construction/tools";

export type ActivePointer = Readonly<{
  id: number;
  x: number;
  y: number;
}>;

export type GestureCallbacks = {
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
};

export class GestureController {
  public pointers = new Map<number, ActivePointer>();
  public lastPos = new Map<number, Point2>();
  public dragStartX = 0;
  public dragStartY = 0;
  public hasMoved = false;
  public pinchStartDistance = 0;
  public pinchStartZoom = 1;
  public pinchLastMidpoint: Point2 = { x: 0, y: 0 };
  public activePointDrag?: {
    pointerId: number;
    id: ConstructionId;
  };
  public activeShapeDrag?: {
    pointerId: number;
    id: ConstructionId;
    startSceneCoords: ScenePoint;
  };
  public pointerDownItem?: RenderItem;

  constructor(public callbacks: GestureCallbacks) {}

  public handlePointerDown(args: {
    pointerId: number;
    pointerType: string;
    clientX: number;
    clientY: number;
    sceneCoords: ScenePoint;
    scene: RenderScene;
    activeTool: ActiveTool;
    ctrlKey: boolean;
    shiftKey: boolean;
    zoom: number;
  }) {
    const {
      pointerId,
      pointerType,
      clientX,
      clientY,
      sceneCoords,
      scene,
      activeTool,
      ctrlKey,
      shiftKey,
      zoom,
    } = args;

    const p: ActivePointer = { id: pointerId, x: clientX, y: clientY };
    this.pointers.set(pointerId, p);
    this.lastPos.set(pointerId, { x: clientX, y: clientY });

    if (this.pointers.size === 1) {
      this.dragStartX = clientX;
      this.dragStartY = clientY;
      this.hasMoved = false;
      this.callbacks.onPointerDownStateChange?.(true);
      this.callbacks.onPointerMoveCoords?.(sceneCoords);

      const threshold = getHitThreshold(pointerType);
      const item = findItemAtPosition(scene, sceneCoords, threshold);
      this.pointerDownItem = item;

      if (activeTool === "select" && !ctrlKey && !shiftKey) {
        if (item?.kind === "point" && this.callbacks.canDragPoint(item.id)) {
          this.activePointDrag = {
            pointerId: pointerId,
            id: item.id,
          };
          this.callbacks.onBeginPointDrag(item.id);
        } else if (item?.kind === "line" || item?.kind === "circle") {
          this.activeShapeDrag = {
            pointerId: pointerId,
            id: item.id,
            startSceneCoords: sceneCoords,
          };
          this.callbacks.onBeginShapeDrag(item.id);
        }
      }
    } else if (this.pointers.size === 2) {
      const [a, b] = Array.from(this.pointers.values()) as [ActivePointer, ActivePointer];
      this.pinchStartDistance = pointerDistance(a, b);
      this.pinchStartZoom = zoom;
      this.pinchLastMidpoint = pointerMidpoint(a, b);
      this.hasMoved = true;
      if (this.activePointDrag || this.activeShapeDrag) {
        this.callbacks.onEndPointDrag();
      }
      this.activePointDrag = undefined;
      this.activeShapeDrag = undefined;
    }
  }

  public handlePointerMove(args: {
    pointerId: number;
    clientX: number;
    clientY: number;
    sceneCoords: ScenePoint;
    panScale: number;
    activeTool: ActiveTool;
  }) {
    const { pointerId, clientX, clientY, sceneCoords, panScale, activeTool } = args;
    this.callbacks.onPointerMoveCoords?.(sceneCoords);

    if (!this.pointers.has(pointerId)) {
      return;
    }

    const prev = this.lastPos.get(pointerId);
    this.pointers.set(pointerId, { id: pointerId, x: clientX, y: clientY });
    this.lastPos.set(pointerId, { x: clientX, y: clientY });

    if (this.activePointDrag?.pointerId === pointerId && this.pointers.size === 1) {
      const totalDist = Math.hypot(clientX - this.dragStartX, clientY - this.dragStartY);
      if (totalDist > 4) this.hasMoved = true;

      if (this.hasMoved) {
        this.callbacks.onMovePoint(this.activePointDrag.id, sceneCoords);
      }
    } else if (this.activeShapeDrag?.pointerId === pointerId && this.pointers.size === 1) {
      const totalDist = Math.hypot(clientX - this.dragStartX, clientY - this.dragStartY);
      if (totalDist > 4) this.hasMoved = true;

      if (this.hasMoved) {
        this.callbacks.onMoveShape(
          this.activeShapeDrag.id,
          this.activeShapeDrag.startSceneCoords,
          sceneCoords,
        );
      }
    } else if (this.pointers.size >= 2) {
      const [a, b] = Array.from(this.pointers.values()) as [ActivePointer, ActivePointer];
      const currentDist = pointerDistance(a, b);
      const midpoint = pointerMidpoint(a, b);

      const panDelta: Point2 = {
        x: (midpoint.x - this.pinchLastMidpoint.x) / panScale,
        y: (midpoint.y - this.pinchLastMidpoint.y) / panScale,
      };
      if (panDelta.x !== 0 || panDelta.y !== 0) this.callbacks.onPanBy(panDelta);

      if (this.pinchStartDistance > 0) {
        this.callbacks.onZoom(this.pinchStartZoom * (currentDist / this.pinchStartDistance));
      }

      this.pinchLastMidpoint = midpoint;
    } else if (prev) {
      const dx = clientX - prev.x;
      const dy = clientY - prev.y;
      const totalDist = Math.hypot(clientX - this.dragStartX, clientY - this.dragStartY);
      if (totalDist > 4) this.hasMoved = true;
      if (this.hasMoved && (dx !== 0 || dy !== 0)) {
        if (activeTool === "select") {
          this.callbacks.onPanBy({ x: dx / panScale, y: dy / panScale });
        }
      }
    }
  }

  public handlePointerUp(args: {
    pointerId: number;
    pointerType: string;
    sceneCoords: ScenePoint;
    scene: RenderScene;
    activeTool: ActiveTool;
    ctrlKey: boolean;
    shiftKey: boolean;
  }) {
    const { pointerId, pointerType, sceneCoords, scene, activeTool, ctrlKey, shiftKey } = args;

    const wasOnlyPointer = this.pointers.size === 1;
    const wasTap = !this.hasMoved;
    const isCreationMode = activeTool !== "select";

    this.pointers.delete(pointerId);
    this.lastPos.delete(pointerId);

    if (this.pointers.size === 0) {
      this.callbacks.onPointerDownStateChange?.(false);
    }

    if (wasOnlyPointer && (wasTap || isCreationMode)) {
      const threshold = getHitThreshold(pointerType);
      const isTouch = pointerType === "touch" || pointerType === "pen";
      const modifiers = { ctrlKey: ctrlKey || isTouch, shiftKey };

      const gesturePolicy = gesturePolicyForTool(activeTool);

      if (gesturePolicy) {
        handleConstructionPointerUp({
          policy: gesturePolicy,
          scene,
          sceneCoords,
          threshold,
          pointerDownItem: this.pointerDownItem,
          onSelect: (id) => this.callbacks.onSelect(id, modifiers),
          onAddPoint: this.callbacks.onAddPoint,
          onAddIntersection: this.callbacks.onAddIntersection,
        });
      } else {
        const item = findItemAtPosition(scene, sceneCoords, threshold);
        if (item) {
          this.callbacks.onSelect(item.id, modifiers);
        } else {
          this.callbacks.onSelect(undefined);
        }
      }
    }

    if (this.activePointDrag?.pointerId === pointerId || this.activeShapeDrag?.pointerId === pointerId) {
      this.callbacks.onEndPointDrag();
      this.activePointDrag = undefined;
      this.activeShapeDrag = undefined;
    }

    if (this.pointers.size === 1) {
      const remaining = Array.from(this.pointers.values())[0];
      this.dragStartX = remaining.x;
      this.dragStartY = remaining.y;
      this.hasMoved = false;
    }
  }

  public handlePointerCancel(pointerId: number) {
    this.clearPointerGesture(pointerId);
  }

  public handleLostPointerCapture(pointerId: number) {
    this.clearPointerGesture(pointerId);
  }

  private clearPointerGesture(pointerId: number) {
    if (this.activePointDrag?.pointerId === pointerId || this.activeShapeDrag?.pointerId === pointerId) {
      this.callbacks.onEndPointDrag();
      this.activePointDrag = undefined;
      this.activeShapeDrag = undefined;
    }
    this.pointers.delete(pointerId);
    this.lastPos.delete(pointerId);
    if (this.pointers.size === 0) {
      this.hasMoved = false;
      this.pointerDownItem = undefined;
      this.callbacks.onPointerDownStateChange?.(false);
    }
  }
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
  const targets = findSnapTargets(scene, sceneCoords, threshold);

  for (const target of policy.pointerUpPriority) {
    if (target === "point") {
      const pointTarget = targets.find((t) => t.kind === "point");
      if (pointTarget) {
        onSelect(pointTarget.item.id);
        return;
      }
      if (pointerDownItem?.kind === "point") {
        onSelect(pointerDownItem.id);
        return;
      }
    }

    if (target === "line") {
      const lineTarget = targets.find((t) => t.kind === "line");
      if (lineTarget) {
        onSelect(lineTarget.item.id);
        return;
      }
      if (pointerDownItem?.kind === "line") {
        onSelect(pointerDownItem.id);
        return;
      }
    }

    if (target === "intersection") {
      const intersectionTarget = targets.find((t) => t.kind === "intersection");
      if (intersectionTarget) {
        onAddIntersection(intersectionTarget.hit);
        return;
      }
    }

    if (target === "empty-point") {
      onAddPoint(sceneCoords);
      return;
    }
  }
}

function getHitThreshold(pointerType: string): number {
  return pointerType === "touch" || pointerType === "pen" ? 20 : 8;
}
