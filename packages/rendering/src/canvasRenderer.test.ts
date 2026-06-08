import { describe, expect, it, vi } from "vitest";
import { drawSceneToCanvas, type CanvasRenderingContext2DLike } from "./canvasRenderer";
import { circleItem, gridLine, lineItem, pointItem, renderScene, scenePoint } from "./renderTestFixtures";

const mockScene = renderScene({
  size: { width: 400, height: 300 },
  grid: [gridLine("g1", scenePoint(0, 0), scenePoint(400, 0))],
  items: [
    pointItem({
      id: "pt-A",
      x: 100,
      y: 100,
      text: "A",
      labelAnchor: scenePoint(110, 90),
    }),
    lineItem({
      id: "ln-B",
      from: scenePoint(10, 10),
      to: scenePoint(90, 90),
    }),
    circleItem({
      id: "cr-C",
      center: scenePoint(200, 200),
      radius: 50,
    }),
  ],
});

function createMockContext(): CanvasRenderingContext2DLike & { calls: string[]; styleCalls: string[] } {
  const calls: string[] = [];
  const styleCalls: string[] = [];
  let strokeStyle: string | CanvasGradient | CanvasPattern = "";
  let fillStyle: string | CanvasGradient | CanvasPattern = "";
  let lineWidth = 1;
  let globalAlpha = 1;
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
    setLineDash: vi.fn((segments) => styleCalls.push(`lineDash(${segments.join(",")})`)),
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 1,
    globalAlpha: 1,
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
    globalAlpha: {
      get: () => globalAlpha,
      set: (value) => {
        globalAlpha = value;
        styleCalls.push(`alpha(${value})`);
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
    const circleScene = renderScene({
      size: { width: 400, height: 300 },
      items: [circleItem({ id: "cr-C", center: scenePoint(200, 200), radius: 50 })],
    });
    drawSceneToCanvas(ctx, circleScene, { selectedIds: new Set(["cr-C"]) });

    expect(ctx.strokeStyle).toBe("#e3c057"); // THEME.colors.circleActive
    expect(ctx.lineWidth).toBe(4); // active circle stroke width
  });

  it("applies constructed point styles", () => {
    const ctx = createMockContext();
    drawSceneToCanvas(
      ctx,
      renderScene({
        size: { width: 100, height: 100 },
        items: [
          pointItem({
            id: "constructed-point",
            pointRole: "constructed",
            x: 50,
            y: 50,
            text: "D",
            labelAnchor: scenePoint(60, 40),
          }),
        ],
      }),
    );

    expect(ctx.styleCalls).toContain("fillStyle(#fbfaf6)");
    expect(ctx.styleCalls).toContain("strokeStyle(#246a73)");
    expect(ctx.styleCalls).toContain("lineWidth(3)");
    expect(ctx.arc).toHaveBeenCalledWith(50, 50, 5, 0, 2 * Math.PI);
  });

  it("applies auxiliary shape styles", () => {
    const ctx = createMockContext();
    drawSceneToCanvas(
      ctx,
      renderScene({
        size: { width: 100, height: 100 },
        items: [
          lineItem({
            id: "helper-line",
            from: scenePoint(0, 50),
            to: scenePoint(100, 50),
            shapeRole: "auxiliary",
          }),
        ],
      }),
    );

    expect(ctx.styleCalls).toContain("alpha(0.38)");
    expect(ctx.styleCalls).toContain("lineDash(9,7)");
    expect(ctx.styleCalls).toContain("lineDash()");
  });
});
