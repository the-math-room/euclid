// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { toWorldPoint, type ConstructionId, type ScenePoint } from "@euclid/geometry";
import type { RenderItem } from "@euclid/rendering";
import { WorkspaceView } from "../apps/web/src/WorkspaceView";

// Configure JSDOM environment for React 19 testing support
const globalWithAct = globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean };
globalWithAct.IS_REACT_ACT_ENVIRONMENT = true;

type ResizeObserverCallback = (
  entries: readonly { readonly contentRect: { readonly width: number; readonly height: number } }[],
) => void;

let resizeCallback: ResizeObserverCallback | null = null;

class MockResizeObserver {
  constructor(cb: ResizeObserverCallback) {
    resizeCallback = cb;
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

const mockScene = {
  size: { width: 920, height: 620 },
  grid: [] as { id: string; from: ScenePoint; to: ScenePoint }[],
  items: [] as RenderItem[],
};

const defaultProps = {
  scene: mockScene,
  selectedIds: new Set<ConstructionId>(),
  onSelect: vi.fn(),
  onPanBy: vi.fn(),
  onZoom: vi.fn(),
  currentZoom: 1,
  activeTool: "select" as const,
  onAddPoint: vi.fn(),
  onBeginPointDrag: vi.fn(),
  onMovePoint: vi.fn(),
  onEndPointDrag: vi.fn(),
  onBeginShapeDrag: vi.fn(),
  onMoveShape: vi.fn(),
  onAddIntersection: vi.fn(),
  canDragPoint: vi.fn(() => false),
};

describe("WorkspaceView Integration", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    resizeCallback = null;
    vi.restoreAllMocks();
  });

  it("renders without crashing in SVG mode", async () => {
    let root: Root | undefined;
    await act(async () => {
      root = createRoot(container);
      root.render(<WorkspaceView {...defaultProps} />);
    });

    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 920 620");

    await act(async () => {
      root?.unmount();
    });
  });

  it("does not crash on resize and calls onResize if provided", async () => {
    const onResizeMock = vi.fn();
    let root: Root | undefined;
    await act(async () => {
      root = createRoot(container);
      root.render(<WorkspaceView {...defaultProps} onResize={onResizeMock} />);
    });

    expect(resizeCallback).toBeTruthy();

    await act(async () => {
      resizeCallback?.([{ contentRect: { width: 800, height: 600 } }]);
    });

    expect(onResizeMock).toHaveBeenCalledWith({ width: 800, height: 600 });

    await act(async () => {
      root?.unmount();
    });
  });

  it("does not crash on resize if onResize prop is omitted", async () => {
    let root: Root | undefined;
    await act(async () => {
      root = createRoot(container);
      root.render(<WorkspaceView {...defaultProps} />);
    });

    expect(resizeCallback).toBeTruthy();

    // Should not throw a TypeError: onResize is not a function
    await act(async () => {
      resizeCallback?.([{ contentRect: { width: 800, height: 600 } }]);
    });

    await act(async () => {
      root?.unmount();
    });
  });

  it("uses touch threshold and passes ctrlKey = true when pointer type is touch", async () => {
    const onSelectMock = vi.fn();
    const sceneWithPoints = {
      size: { width: 920, height: 620 },
      grid: [] as { id: string; from: ScenePoint; to: ScenePoint }[],
      items: [
        {
          id: "point-a",
          kind: "point" as const,
          mark: { x: 100, y: 100 } as ScenePoint,
          label: { text: "A", anchor: { x: 110, y: 90 } as ScenePoint },
        },
      ],
    };

    let root: Root | undefined;
    await act(async () => {
      root = createRoot(container);
      root.render(
        <WorkspaceView
          {...defaultProps}
          scene={sceneWithPoints}
          onSelect={onSelectMock}
          activeTool="select"
        />,
      );
    });

    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();

    if (svg) {
      svg.getBoundingClientRect = () => ({
        width: 920,
        height: 620,
        top: 0,
        left: 0,
        bottom: 620,
        right: 920,
        x: 0,
        y: 0,
        toJSON: vi.fn(),
      });

      // Tap at (112, 112), distance is ~17px from (100, 100)
      // This is larger than mouse threshold (8px) but smaller than touch threshold (20px)
      const downEvent = new PointerEvent("pointerdown", {
        clientX: 112,
        clientY: 112,
        pointerId: 1,
        pointerType: "touch",
        bubbles: true,
      });

      const upEvent = new PointerEvent("pointerup", {
        clientX: 112,
        clientY: 112,
        pointerId: 1,
        pointerType: "touch",
        bubbles: true,
      });

      await act(async () => {
        svg.dispatchEvent(downEvent);
        svg.dispatchEvent(upEvent);
      });

      expect(onSelectMock).toHaveBeenCalledWith("point-a", { ctrlKey: true, shiftKey: false });
    }

    await act(async () => {
      root?.unmount();
    });
  });

  it("applies the sizeScale prop correctly to points and SVG variables", async () => {
    let root: Root | null = null;
    const testScene = {
      size: { width: 900, height: 600 },
      grid: [] as { id: string; from: ScenePoint; to: ScenePoint }[],
      items: [
        {
          id: "point-a",
          kind: "point" as const,
          pointRole: "free" as const,
          mark: { x: 100, y: 100 } as ScenePoint,
          label: { text: "A", anchor: { x: 110, y: 90 } as ScenePoint },
        },
      ],
    };

    await act(async () => {
      root = createRoot(container);
      root.render(<WorkspaceView {...defaultProps} scene={testScene} sizeScale={2.0} />);
    });

    const circle = container.querySelector("circle");
    expect(circle).toBeTruthy();
    expect(circle?.getAttribute("r")).toBe("10"); // 5 * 2.0 = 10

    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.style.getPropertyValue("--size-scale")).toBe("2");

    await act(async () => {
      root?.unmount();
    });
  });

  it("renders the floating HUD overlay when items are selected", async () => {
    let root: Root | null = null;
    const testScene = {
      size: { width: 900, height: 600 },
      grid: [] as { id: string; from: ScenePoint; to: ScenePoint }[],
      items: [
        {
          id: "point-a",
          kind: "point" as const,
          pointRole: "free" as const,
          mark: { x: 100, y: 100 } as ScenePoint,
          label: { text: "A", anchor: { x: 110, y: 90 } as ScenePoint },
        },
      ],
    };

    const mockConstructions = [
      {
        id: "point-a",
        kind: "free-point" as const,
        label: "A",
        position: toWorldPoint({ x: 100, y: 100 }),
      },
    ];

    const selectedIds = new Set<string>(["point-a"]);

    await act(async () => {
      root = createRoot(container);
      root.render(
        <WorkspaceView
          {...defaultProps}
          scene={testScene}
          selectedIds={selectedIds}
          constructions={mockConstructions}
        />,
      );
    });

    const hud = container.querySelector(".workspace-hud-overlay");
    expect(hud).toBeTruthy();
    expect(hud?.textContent).toContain("Selection (1)");
    expect(hud?.textContent).toContain("Label:A");
    expect(hud?.textContent).toContain("Kind:free-point");
    expect(hud?.textContent).toContain("Coords:(100.0, 100.0)");

    await act(async () => {
      root?.unmount();
    });
  });

  it("prioritizes intersection over selecting a defining point in construction tools", async () => {
    const onSelectMock = vi.fn();
    const onAddIntersectionMock = vi.fn();
    const onAddPointMock = vi.fn();

    // Line and circle that intersect at (100, 100).
    // Let's place a point P also at (100, 100).
    const sceneWithIntersection = {
      size: { width: 920, height: 620 },
      grid: [] as { id: string; from: ScenePoint; to: ScenePoint }[],
      items: [
        {
          id: "point-p",
          kind: "point" as const,
          mark: { x: 100, y: 100 } as ScenePoint,
          label: { text: "P", anchor: { x: 110, y: 90 } as ScenePoint },
        },
        {
          id: "line-ab",
          kind: "line" as const,
          from: { x: 0, y: 100 } as ScenePoint,
          to: { x: 200, y: 100 } as ScenePoint,
          supportLine: [{ x: 0, y: 100 } as ScenePoint, { x: 200, y: 100 } as ScenePoint] as const,
        },
        {
          id: "circle-o",
          kind: "circle" as const,
          center: { x: 100, y: 150 } as ScenePoint,
          radius: 50, // center (100, 150), radius 50 means it passes through (100, 100)
        },
      ],
    };

    let root: Root | undefined;
    await act(async () => {
      root = createRoot(container);
      root.render(
        <WorkspaceView
          {...defaultProps}
          scene={sceneWithIntersection}
          onSelect={onSelectMock}
          onAddIntersection={onAddIntersectionMock}
          onAddPoint={onAddPointMock}
          activeTool="point"
        />,
      );
    });

    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();

    if (svg) {
      svg.getBoundingClientRect = () => ({
        width: 920,
        height: 620,
        top: 0,
        left: 0,
        bottom: 620,
        right: 920,
        x: 0,
        y: 0,
        toJSON: vi.fn(),
      });

      // Click exactly at (100, 100) where the point "point-p" and the line-circle intersection coincide
      const downEvent = new PointerEvent("pointerdown", {
        clientX: 100,
        clientY: 100,
        pointerId: 1,
        pointerType: "mouse",
        bubbles: true,
      });

      const upEvent = new PointerEvent("pointerup", {
        clientX: 100,
        clientY: 100,
        pointerId: 1,
        pointerType: "mouse",
        bubbles: true,
      });

      await act(async () => {
        svg.dispatchEvent(downEvent);
        svg.dispatchEvent(upEvent);
      });

      // It should call onAddIntersection instead of selecting the point
      expect(onAddIntersectionMock).toHaveBeenCalled();
      expect(onSelectMock).not.toHaveBeenCalled();
    }

    await act(async () => {
      root?.unmount();
    });
  });

  it("reuses an existing point in circle mode even when pointer release drifts outside the hit radius", async () => {
    const onSelectMock = vi.fn();
    const onAddPointMock = vi.fn();
    const sceneWithPoint = {
      size: { width: 920, height: 620 },
      grid: [] as { id: string; from: ScenePoint; to: ScenePoint }[],
      items: [
        {
          id: "point-a",
          kind: "point" as const,
          pointRole: "free" as const,
          mark: { x: 100, y: 100 } as ScenePoint,
          label: { text: "A", anchor: { x: 110, y: 90 } as ScenePoint },
        },
      ],
    };

    let root: Root | undefined;
    await act(async () => {
      root = createRoot(container);
      root.render(
        <WorkspaceView
          {...defaultProps}
          scene={sceneWithPoint}
          onSelect={onSelectMock}
          onAddPoint={onAddPointMock}
          activeTool="circle"
        />,
      );
    });

    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();

    if (svg) {
      svg.getBoundingClientRect = () => ({
        width: 920,
        height: 620,
        top: 0,
        left: 0,
        bottom: 620,
        right: 920,
        x: 0,
        y: 0,
        toJSON: vi.fn(),
      });

      await act(async () => {
        svg.dispatchEvent(
          new PointerEvent("pointerdown", {
            clientX: 100,
            clientY: 100,
            pointerId: 1,
            pointerType: "mouse",
            bubbles: true,
          }),
        );
        svg.dispatchEvent(
          new PointerEvent("pointermove", {
            clientX: 112,
            clientY: 100,
            pointerId: 1,
            pointerType: "mouse",
            bubbles: true,
          }),
        );
        svg.dispatchEvent(
          new PointerEvent("pointerup", {
            clientX: 112,
            clientY: 100,
            pointerId: 1,
            pointerType: "mouse",
            bubbles: true,
          }),
        );
      });

      expect(onSelectMock).toHaveBeenCalledWith("point-a", { ctrlKey: false, shiftKey: false });
      expect(onAddPointMock).not.toHaveBeenCalled();
    }

    await act(async () => {
      root?.unmount();
    });
  });

  it("reuses an existing point in circle mode when the point is also a curve intersection", async () => {
    const onSelectMock = vi.fn();
    const onAddIntersectionMock = vi.fn();
    const onAddPointMock = vi.fn();
    const sceneWithIntersectionPoint = {
      size: { width: 920, height: 620 },
      grid: [] as { id: string; from: ScenePoint; to: ScenePoint }[],
      items: [
        {
          id: "point-b",
          kind: "point" as const,
          pointRole: "free" as const,
          mark: { x: 100, y: 100 } as ScenePoint,
          label: { text: "B", anchor: { x: 110, y: 90 } as ScenePoint },
        },
        {
          id: "line-ab",
          kind: "line" as const,
          from: { x: 0, y: 100 } as ScenePoint,
          to: { x: 200, y: 100 } as ScenePoint,
          supportLine: [{ x: 0, y: 100 } as ScenePoint, { x: 200, y: 100 } as ScenePoint] as const,
        },
        {
          id: "circle-o",
          kind: "circle" as const,
          center: { x: 100, y: 150 } as ScenePoint,
          radius: 50,
        },
      ],
    };

    let root: Root | undefined;
    await act(async () => {
      root = createRoot(container);
      root.render(
        <WorkspaceView
          {...defaultProps}
          scene={sceneWithIntersectionPoint}
          onSelect={onSelectMock}
          onAddIntersection={onAddIntersectionMock}
          onAddPoint={onAddPointMock}
          activeTool="circle"
        />,
      );
    });

    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();

    if (svg) {
      svg.getBoundingClientRect = () => ({
        width: 920,
        height: 620,
        top: 0,
        left: 0,
        bottom: 620,
        right: 920,
        x: 0,
        y: 0,
        toJSON: vi.fn(),
      });

      await act(async () => {
        svg.dispatchEvent(
          new PointerEvent("pointerdown", {
            clientX: 100,
            clientY: 100,
            pointerId: 1,
            pointerType: "mouse",
            bubbles: true,
          }),
        );
        svg.dispatchEvent(
          new PointerEvent("pointerup", {
            clientX: 100,
            clientY: 100,
            pointerId: 1,
            pointerType: "mouse",
            bubbles: true,
          }),
        );
      });

      expect(onSelectMock).toHaveBeenCalledWith("point-b", { ctrlKey: false, shiftKey: false });
      expect(onAddIntersectionMock).not.toHaveBeenCalled();
      expect(onAddPointMock).not.toHaveBeenCalled();
    }

    await act(async () => {
      root?.unmount();
    });
  });

  it("adds a witness point on empty-space second click for perpendicular lines", async () => {
    const onSelectMock = vi.fn();
    const onAddPointMock = vi.fn();
    const sceneWithLine = {
      size: { width: 920, height: 620 },
      grid: [] as { id: string; from: ScenePoint; to: ScenePoint }[],
      items: [
        {
          id: "line-ab",
          kind: "line" as const,
          from: { x: 50, y: 100 } as ScenePoint,
          to: { x: 250, y: 100 } as ScenePoint,
          supportLine: [{ x: 50, y: 100 } as ScenePoint, { x: 250, y: 100 } as ScenePoint] as const,
        },
      ],
    };

    let root: Root | undefined;
    await act(async () => {
      root = createRoot(container);
      root.render(
        <WorkspaceView
          {...defaultProps}
          scene={sceneWithLine}
          onSelect={onSelectMock}
          onAddPoint={onAddPointMock}
          activeTool="perpendicular"
        />,
      );
    });

    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();

    if (svg) {
      svg.getBoundingClientRect = () => ({
        width: 920,
        height: 620,
        top: 0,
        left: 0,
        bottom: 620,
        right: 920,
        x: 0,
        y: 0,
        toJSON: vi.fn(),
      });

      await act(async () => {
        svg.dispatchEvent(
          new PointerEvent("pointerdown", {
            clientX: 150,
            clientY: 100,
            pointerId: 1,
            pointerType: "mouse",
            bubbles: true,
          }),
        );
        svg.dispatchEvent(
          new PointerEvent("pointerup", {
            clientX: 150,
            clientY: 100,
            pointerId: 1,
            pointerType: "mouse",
            bubbles: true,
          }),
        );
        svg.dispatchEvent(
          new PointerEvent("pointerdown", {
            clientX: 150,
            clientY: 180,
            pointerId: 2,
            pointerType: "mouse",
            bubbles: true,
          }),
        );
        svg.dispatchEvent(
          new PointerEvent("pointerup", {
            clientX: 150,
            clientY: 180,
            pointerId: 2,
            pointerType: "mouse",
            bubbles: true,
          }),
        );
      });

      expect(onSelectMock).toHaveBeenCalledWith("line-ab", { ctrlKey: false, shiftKey: false });
      expect(onAddPointMock).toHaveBeenCalledWith({ x: 150, y: 180 });
    }

    await act(async () => {
      root?.unmount();
    });
  });

  it("clears stale SVG pointers when pointer capture is lost", async () => {
    const onBeginPointDragMock = vi.fn();
    const onMovePointMock = vi.fn();
    const onEndPointDragMock = vi.fn();
    const sceneWithPoints = {
      size: { width: 920, height: 620 },
      grid: [] as { id: string; from: ScenePoint; to: ScenePoint }[],
      items: [
        {
          id: "point-a",
          kind: "point" as const,
          pointRole: "free" as const,
          mark: { x: 100, y: 100 } as ScenePoint,
          label: { text: "A", anchor: { x: 110, y: 90 } as ScenePoint },
        },
        {
          id: "point-b",
          kind: "point" as const,
          pointRole: "free" as const,
          mark: { x: 200, y: 100 } as ScenePoint,
          label: { text: "B", anchor: { x: 210, y: 90 } as ScenePoint },
        },
      ],
    };

    let root: Root | undefined;
    await act(async () => {
      root = createRoot(container);
      root.render(
        <WorkspaceView
          {...defaultProps}
          scene={sceneWithPoints}
          activeTool="select"
          canDragPoint={vi.fn(() => true)}
          onBeginPointDrag={onBeginPointDragMock}
          onMovePoint={onMovePointMock}
          onEndPointDrag={onEndPointDragMock}
        />,
      );
    });

    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();

    if (svg) {
      svg.getBoundingClientRect = () => ({
        width: 920,
        height: 620,
        top: 0,
        left: 0,
        bottom: 620,
        right: 920,
        x: 0,
        y: 0,
        toJSON: vi.fn(),
      });

      const firstDown = new PointerEvent("pointerdown", {
        clientX: 100,
        clientY: 100,
        pointerId: 7,
        pointerType: "mouse",
        bubbles: true,
      });
      const lostCapture = new PointerEvent("lostpointercapture", {
        clientX: 100,
        clientY: 100,
        pointerId: 7,
        pointerType: "mouse",
        bubbles: true,
      });
      const secondDown = new PointerEvent("pointerdown", {
        clientX: 200,
        clientY: 100,
        pointerId: 8,
        pointerType: "mouse",
        bubbles: true,
      });
      const secondMove = new PointerEvent("pointermove", {
        clientX: 208,
        clientY: 100,
        pointerId: 8,
        pointerType: "mouse",
        bubbles: true,
      });

      await act(async () => {
        svg.dispatchEvent(firstDown);
        svg.dispatchEvent(lostCapture);
        svg.dispatchEvent(secondDown);
        svg.dispatchEvent(secondMove);
      });

      expect(onEndPointDragMock).toHaveBeenCalledTimes(1);
      expect(onBeginPointDragMock).toHaveBeenLastCalledWith("point-b");
      expect(onMovePointMock).toHaveBeenCalledWith("point-b", { x: 208, y: 100 });
    }

    await act(async () => {
      root?.unmount();
    });
  });
});
