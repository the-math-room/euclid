// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ConstructionId } from "@euclid/geometry";
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
  grid: [],
  items: [],
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
      grid: [],
      items: [
        {
          id: "point-a",
          kind: "point" as const,
          mark: { x: 100, y: 100 },
          label: { text: "A", anchor: { x: 110, y: 90 } },
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
});
