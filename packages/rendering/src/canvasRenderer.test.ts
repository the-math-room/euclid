import { describe, expect, it, vi } from "vitest";
import type { RenderScene } from "./scene";
import { drawSceneToCanvas, type CanvasRenderingContext2DLike } from "./canvasRenderer";

const mockScene: RenderScene = {
  size: { width: 400, height: 300 },
  grid: [{ id: "g1", from: { x: 0, y: 0 }, to: { x: 400, y: 0 } }],
  items: [
    {
      id: "pt-A",
      kind: "point",
      mark: { x: 100, y: 100 },
      label: { text: "A", anchor: { x: 110, y: 90 } },
    },
    {
      id: "ln-B",
      kind: "line",
      from: { x: 10, y: 10 },
      to: { x: 90, y: 90 },
      supportLine: [
        { x: 10, y: 10 },
        { x: 90, y: 90 },
      ],
    },
    {
      id: "cr-C",
      kind: "circle",
      center: { x: 200, y: 200 },
      radius: 50,
    },
  ],
};

function createMockContext(): CanvasRenderingContext2DLike & { calls: string[]; styleCalls: string[] } {
  const calls: string[] = [];
  const styleCalls: string[] = [];
  let strokeStyle: string | CanvasGradient | CanvasPattern = "";
  let fillStyle: string | CanvasGradient | CanvasPattern = "";
  let lineWidth = 1;
  const context: CanvasRenderingContext2DLike & { calls: string[]; styleCalls: string[] } = {
    calls,
    styleCalls,
    clearRect: vi.fn(() => calls.push("clearRect")),
    fillRect: vi.fn(() => calls.push("fillRect")),
    beginPath: vi.fn(() => calls.push("beginPath")),
    moveTo: vi.fn((x, y) => calls.push(`moveTo(${x},${y})`)),
    lineTo: vi.fn((x, y) => calls.push(`lineTo(${x},${y})`)),
    arc: vi.fn((x, y, r) => calls.push(`arc(${x},${y},${r})`)),
    stroke: vi.fn(() => calls.push("stroke")),
    fill: vi.fn(() => calls.push("fill")),
    strokeText: vi.fn((t, x, y) => calls.push(`strokeText(${t},${x},${y})`)),
    fillText: vi.fn((t, x, y) => calls.push(`fillText(${t},${x},${y})`)),
    save: vi.fn(() => calls.push("save")),
    restore: vi.fn(() => calls.push("restore")),
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 1,
    font: "",
    textAlign: "left",
    textBaseline: "middle",
    lineJoin: "round",
  };
  Object.defineProperties(context, {
    strokeStyle: {
      get: () => strokeStyle,
      set: (value) => {
        strokeStyle = value;
        styleCalls.push(`strokeStyle(${String(value)})`);
      },
    },
    fillStyle: {
      get: () => fillStyle,
      set: (value) => {
        fillStyle = value;
        styleCalls.push(`fillStyle(${String(value)})`);
      },
    },
    lineWidth: {
      get: () => lineWidth,
      set: (value) => {
        lineWidth = value;
        styleCalls.push(`lineWidth(${value})`);
      },
    },
  });
  return context;
}

describe("canvas renderer", () => {
  it("executes correct canvas API calls to render scene", () => {
    const ctx = createMockContext();
    drawSceneToCanvas(ctx, mockScene);

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 400, 300); // Background fill
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0); // Grid line start
    expect(ctx.lineTo).toHaveBeenCalledWith(400, 0); // Grid line end
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalledWith(200, 200, 50, 0, 2 * Math.PI); // Circle item
    expect(ctx.arc).toHaveBeenCalledWith(100, 100, 5, 0, 2 * Math.PI); // Point circle mark
    expect(ctx.fillText).toHaveBeenCalledWith("A", 110, 90); // Label draw
    expect(ctx.restore).toHaveBeenCalled();
  });

  it("applies active styles when items are multi-selected", () => {
    const ctx = createMockContext();
    const circleScene: RenderScene = {
      size: { width: 400, height: 300 },
      grid: [],
      items: [
        {
          id: "cr-C",
          kind: "circle",
          center: { x: 200, y: 200 },
          radius: 50,
        },
      ],
    };
    drawSceneToCanvas(ctx, circleScene, { selectedIds: new Set(["cr-C"]) });

    expect(ctx.strokeStyle).toBe("#e3c057"); // THEME.colors.circleActive
    expect(ctx.lineWidth).toBe(4); // active circle stroke width
  });

  it("applies constructed point styles", () => {
    const ctx = createMockContext();
    drawSceneToCanvas(ctx, {
      size: { width: 100, height: 100 },
      grid: [],
      items: [
        {
          id: "constructed-point",
          kind: "point",
          pointRole: "constructed",
          mark: { x: 50, y: 50 },
          label: { text: "D", anchor: { x: 60, y: 40 } },
        },
      ],
    });

    expect(ctx.styleCalls).toContain("fillStyle(#fbfaf6)");
    expect(ctx.styleCalls).toContain("strokeStyle(#246a73)");
    expect(ctx.styleCalls).toContain("lineWidth(3)");
    expect(ctx.arc).toHaveBeenCalledWith(50, 50, 5, 0, 2 * Math.PI);
  });
});
