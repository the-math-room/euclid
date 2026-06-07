import { describe, expect, it, vi, beforeEach } from "vitest";
import { GestureController, type GestureCallbacks } from "./GestureController";
import type { RenderScene } from "@euclid/rendering";
import type { ScenePoint } from "@euclid/geometry";

const mockPoint = {
  id: "pt-A",
  kind: "point" as const,
  pointRole: "free" as const,
  mark: { x: 100, y: 100 } as ScenePoint,
  label: { text: "A", anchor: { x: 110, y: 90 } as ScenePoint },
};

const mockLine = {
  id: "ln-B",
  kind: "line" as const,
  from: { x: 10, y: 10 } as ScenePoint,
  to: { x: 90, y: 90 } as ScenePoint,
  supportLine: [{ x: 10, y: 10 } as ScenePoint, { x: 90, y: 90 } as ScenePoint] as const,
};

const mockScene: RenderScene = {
  size: { width: 920, height: 620 },
  grid: [],
  items: [mockPoint, mockLine],
};

describe("GestureController", () => {
  let callbacks: GestureCallbacks;
  let controller: GestureController;

  beforeEach(() => {
    callbacks = {
      onSelect: vi.fn(),
      onPanBy: vi.fn(),
      onZoom: vi.fn(),
      onAddPoint: vi.fn(),
      onBeginPointDrag: vi.fn(),
      onMovePoint: vi.fn(),
      onEndPointDrag: vi.fn(),
      onBeginShapeDrag: vi.fn(),
      onMoveShape: vi.fn(),
      onAddIntersection: vi.fn(),
      canDragPoint: vi.fn(() => true),
      onPointerMoveCoords: vi.fn(),
      onPointerDownStateChange: vi.fn(),
    } as unknown as GestureCallbacks;

    controller = new GestureController(callbacks);
  });

  it("handles basic tap to select point", () => {
    controller.handlePointerDown({
      pointerId: 1,
      pointerType: "mouse",
      clientX: 100,
      clientY: 100,
      sceneCoords: { x: 100, y: 100 } as ScenePoint,
      scene: mockScene,
      activeTool: "select",
      ctrlKey: false,
      shiftKey: false,
      zoom: 1,
    });

    expect(callbacks.onPointerDownStateChange).toHaveBeenCalledWith(true);
    expect(callbacks.onPointerMoveCoords).toHaveBeenCalledWith({ x: 100, y: 100 });

    controller.handlePointerUp({
      pointerId: 1,
      pointerType: "mouse",
      sceneCoords: { x: 100, y: 100 } as ScenePoint,
      scene: mockScene,
      activeTool: "select",
      ctrlKey: false,
      shiftKey: false,
    });

    expect(callbacks.onSelect).toHaveBeenCalledWith("pt-A", { ctrlKey: false, shiftKey: false });
    expect(callbacks.onPointerDownStateChange).toHaveBeenLastCalledWith(false);
  });

  it("handles tap to select nothing (empty canvas)", () => {
    controller.handlePointerDown({
      pointerId: 1,
      pointerType: "mouse",
      clientX: 500,
      clientY: 500,
      sceneCoords: { x: 500, y: 500 } as ScenePoint,
      scene: mockScene,
      activeTool: "select",
      ctrlKey: false,
      shiftKey: false,
      zoom: 1,
    });

    controller.handlePointerUp({
      pointerId: 1,
      pointerType: "mouse",
      sceneCoords: { x: 500, y: 500 } as ScenePoint,
      scene: mockScene,
      activeTool: "select",
      ctrlKey: false,
      shiftKey: false,
    });

    expect(callbacks.onSelect).toHaveBeenCalledWith(undefined);
  });

  it("handles panning via mouse dragging on select tool", () => {
    controller.handlePointerDown({
      pointerId: 1,
      pointerType: "mouse",
      clientX: 500,
      clientY: 500,
      sceneCoords: { x: 500, y: 500 } as ScenePoint,
      scene: mockScene,
      activeTool: "select",
      ctrlKey: false,
      shiftKey: false,
      zoom: 1,
    });

    // Move sufficiently far to cross the 4px threshold
    controller.handlePointerMove({
      pointerId: 1,
      clientX: 510,
      clientY: 510,
      sceneCoords: { x: 510, y: 510 } as ScenePoint,
      panScale: 1,
      activeTool: "select",
    });

    expect(callbacks.onPanBy).toHaveBeenCalledWith({ x: 10, y: 10 });
    expect(controller.hasMoved).toBe(true);

    controller.handlePointerUp({
      pointerId: 1,
      pointerType: "mouse",
      sceneCoords: { x: 510, y: 510 } as ScenePoint,
      scene: mockScene,
      activeTool: "select",
      ctrlKey: false,
      shiftKey: false,
    });

    // Pointer up after drag should not trigger selection because it was a pan gesture (hasMoved is true)
    expect(callbacks.onSelect).not.toHaveBeenCalled();
  });

  it("handles dragging point when allowed", () => {
    controller.handlePointerDown({
      pointerId: 1,
      pointerType: "mouse",
      clientX: 100,
      clientY: 100,
      sceneCoords: { x: 100, y: 100 } as ScenePoint,
      scene: mockScene,
      activeTool: "select",
      ctrlKey: false,
      shiftKey: false,
      zoom: 1,
    });

    expect(callbacks.onBeginPointDrag).toHaveBeenCalledWith("pt-A");

    controller.handlePointerMove({
      pointerId: 1,
      clientX: 110,
      clientY: 110,
      sceneCoords: { x: 110, y: 110 } as ScenePoint,
      panScale: 1,
      activeTool: "select",
    });

    expect(callbacks.onMovePoint).toHaveBeenCalledWith("pt-A", { x: 110, y: 110 });

    controller.handlePointerUp({
      pointerId: 1,
      pointerType: "mouse",
      sceneCoords: { x: 110, y: 110 } as ScenePoint,
      scene: mockScene,
      activeTool: "select",
      ctrlKey: false,
      shiftKey: false,
    });

    expect(callbacks.onEndPointDrag).toHaveBeenCalled();
  });

  it("handles dragging shape when selected", () => {
    controller.handlePointerDown({
      pointerId: 1,
      pointerType: "mouse",
      clientX: 50,
      clientY: 50,
      sceneCoords: { x: 50, y: 50 } as ScenePoint,
      scene: mockScene,
      activeTool: "select",
      ctrlKey: false,
      shiftKey: false,
      zoom: 1,
    });

    expect(callbacks.onBeginShapeDrag).toHaveBeenCalledWith("ln-B");

    controller.handlePointerMove({
      pointerId: 1,
      clientX: 60,
      clientY: 60,
      sceneCoords: { x: 60, y: 60 } as ScenePoint,
      panScale: 1,
      activeTool: "select",
    });

    expect(callbacks.onMoveShape).toHaveBeenCalledWith("ln-B", { x: 50, y: 50 }, { x: 60, y: 60 });

    controller.handlePointerUp({
      pointerId: 1,
      pointerType: "mouse",
      sceneCoords: { x: 60, y: 60 } as ScenePoint,
      scene: mockScene,
      activeTool: "select",
      ctrlKey: false,
      shiftKey: false,
    });

    expect(callbacks.onEndPointDrag).toHaveBeenCalled();
  });

  it("handles two pointer pinch-to-zoom and pan", () => {
    // Pointer 1 Down
    controller.handlePointerDown({
      pointerId: 1,
      pointerType: "touch",
      clientX: 100,
      clientY: 100,
      sceneCoords: { x: 100, y: 100 } as ScenePoint,
      scene: mockScene,
      activeTool: "select",
      ctrlKey: false,
      shiftKey: false,
      zoom: 1,
    });

    // Pointer 2 Down
    controller.handlePointerDown({
      pointerId: 2,
      pointerType: "touch",
      clientX: 200,
      clientY: 100,
      sceneCoords: { x: 200, y: 100 } as ScenePoint,
      scene: mockScene,
      activeTool: "select",
      ctrlKey: false,
      shiftKey: false,
      zoom: 1,
    });

    // Distance is 100px, midpoint is x: 150, y: 100

    // Move pointer 2 to make distance 200px (zoom factor should be 2x) and pan midpoint to x: 200, y: 100 (pan delta of x: 50)
    controller.handlePointerMove({
      pointerId: 2,
      clientX: 300,
      clientY: 100,
      sceneCoords: { x: 300, y: 100 } as ScenePoint,
      panScale: 1,
      activeTool: "select",
    });

    expect(callbacks.onZoom).toHaveBeenCalledWith(2);
    expect(callbacks.onPanBy).toHaveBeenCalledWith({ x: 50, y: 0 });
  });

  it("handles pointer cancellation cleanly", () => {
    controller.handlePointerDown({
      pointerId: 1,
      pointerType: "mouse",
      clientX: 100,
      clientY: 100,
      sceneCoords: { x: 100, y: 100 } as ScenePoint,
      scene: mockScene,
      activeTool: "select",
      ctrlKey: false,
      shiftKey: false,
      zoom: 1,
    });

    expect(callbacks.onBeginPointDrag).toHaveBeenCalledWith("pt-A");

    controller.handlePointerCancel(1);

    expect(callbacks.onEndPointDrag).toHaveBeenCalled();
    expect(controller.pointers.has(1)).toBe(false);
  });
});
