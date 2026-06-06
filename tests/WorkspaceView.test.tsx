// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { WorkspaceView } from "../apps/web/src/WorkspaceView";

let resizeCallback: any = null;

class MockResizeObserver {
  constructor(cb: any) {
    resizeCallback = cb;
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

globalThis.ResizeObserver = MockResizeObserver as any;

const mockScene = {
  size: { width: 920, height: 620 },
  grid: [],
  items: [],
};

const defaultProps = {
  scene: mockScene,
  selectedIds: new Set<any>(),
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
    let root: any;
    await act(async () => {
      root = createRoot(container);
      root.render(<WorkspaceView {...defaultProps} />);
    });

    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 920 620");

    await act(async () => {
      root.unmount();
    });
  });

  it("does not crash on resize and calls onResize if provided", async () => {
    const onResizeMock = vi.fn();
    let root: any;
    await act(async () => {
      root = createRoot(container);
      root.render(<WorkspaceView {...defaultProps} onResize={onResizeMock} />);
    });

    expect(resizeCallback).toBeTruthy();

    await act(async () => {
      resizeCallback([{ contentRect: { width: 800, height: 600 } }]);
    });

    expect(onResizeMock).toHaveBeenCalledWith({ width: 800, height: 600 });

    await act(async () => {
      root.unmount();
    });
  });

  it("does not crash on resize if onResize prop is omitted", async () => {
    let root: any;
    await act(async () => {
      root = createRoot(container);
      root.render(<WorkspaceView {...defaultProps} />);
    });

    expect(resizeCallback).toBeTruthy();

    // Should not throw a TypeError: onResize is not a function
    await act(async () => {
      resizeCallback([{ contentRect: { width: 800, height: 600 } }]);
    });

    await act(async () => {
      root.unmount();
    });
  });
});
