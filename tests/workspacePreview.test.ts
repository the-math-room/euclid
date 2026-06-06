import { describe, expect, it, vi } from "vitest";
import { THEME, type RenderScene } from "@euclid/rendering";
import { toScenePoint } from "@euclid/geometry";
import {
  drawWorkspacePreviewsToCanvas,
  previewsForWorkspace,
  type WorkspacePreviewCanvasContext,
  type WorkspacePreview,
} from "../apps/web/src/workspacePreview";

const scene: RenderScene = {
  size: { width: 400, height: 300 },
  grid: [],
  items: [
    {
      id: "point-a",
      kind: "point",
      pointRole: "free",
      mark: toScenePoint({ x: 100, y: 100 }),
      label: {
        text: "A",
        anchor: toScenePoint({ x: 110, y: 90 }),
      },
    },
  ],
};

describe("workspace previews", () => {
  it("builds line draft previews from the anchor point to the pointer", () => {
    const previews = previewsForWorkspace({
      scene,
      pointerCoords: toScenePoint({ x: 180, y: 140 }),
      draftPreview: { kind: "line", anchorId: "point-a" },
      previewPoint: undefined,
      sizeScale: 1,
    });

    expect(previews).toEqual([
      {
        kind: "line",
        from: toScenePoint({ x: 100, y: 100 }),
        to: toScenePoint({ x: 180, y: 140 }),
        style: THEME.preview.draftLine,
      },
    ]);
  });

  it("builds circle draft previews with the pointer distance as radius", () => {
    const previews = previewsForWorkspace({
      scene,
      pointerCoords: toScenePoint({ x: 103, y: 104 }),
      draftPreview: { kind: "circle", anchorId: "point-a" },
      previewPoint: undefined,
      sizeScale: 1,
    });

    expect(previews).toEqual([
      {
        kind: "circle",
        center: toScenePoint({ x: 100, y: 100 }),
        radius: 5,
        style: THEME.preview.draftCircle,
      },
    ]);
  });

  it("skips draft previews when the anchor point is missing", () => {
    const previews = previewsForWorkspace({
      scene,
      pointerCoords: toScenePoint({ x: 180, y: 140 }),
      draftPreview: { kind: "line", anchorId: "missing" },
      previewPoint: undefined,
      sizeScale: 1,
    });

    expect(previews).toEqual([]);
  });

  it("builds scaled point previews from shared theme tokens", () => {
    const previews = previewsForWorkspace({
      scene,
      pointerCoords: undefined,
      draftPreview: undefined,
      previewPoint: { x: 10, y: 20, isSnapped: true },
      sizeScale: 2,
    });

    expect(previews).toEqual([
      {
        kind: "point",
        center: toScenePoint({ x: 10, y: 20 }),
        style: {
          ...THEME.preview.snappedPoint,
          radius: 10,
          lineWidth: 5,
        },
      },
    ]);
  });

  it("draws preview model items to canvas with their model styles", () => {
    const ctx = new MockCanvasContext();
    const previews: readonly WorkspacePreview[] = [
      {
        kind: "line",
        from: toScenePoint({ x: 0, y: 0 }),
        to: toScenePoint({ x: 10, y: 10 }),
        style: THEME.preview.draftLine,
      },
    ];

    drawWorkspacePreviewsToCanvas(ctx, previews);

    expect(ctx.calls).toEqual([
      "save",
      "alpha(0.55)",
      "beginPath",
      "moveTo(0,0)",
      "lineTo(10,10)",
      "strokeStyle(#246a73)",
      "lineWidth(2.5)",
      "stroke",
      "restore",
    ]);
  });
});

class MockCanvasContext implements WorkspacePreviewCanvasContext {
  readonly calls: string[] = [];
  font = "";
  textAlign: CanvasTextAlign = "left";
  textBaseline: CanvasTextBaseline = "alphabetic";
  lineJoin: CanvasLineJoin = "miter";

  private strokeStyleValue: string | CanvasGradient | CanvasPattern = "";
  private fillStyleValue: string | CanvasGradient | CanvasPattern = "";
  private lineWidthValue = 1;
  private globalAlphaValue = 1;

  get strokeStyle(): string | CanvasGradient | CanvasPattern {
    return this.strokeStyleValue;
  }

  set strokeStyle(value: string | CanvasGradient | CanvasPattern) {
    this.strokeStyleValue = value;
    this.calls.push(`strokeStyle(${String(value)})`);
  }

  get fillStyle(): string | CanvasGradient | CanvasPattern {
    return this.fillStyleValue;
  }

  set fillStyle(value: string | CanvasGradient | CanvasPattern) {
    this.fillStyleValue = value;
    this.calls.push(`fillStyle(${String(value)})`);
  }

  get lineWidth(): number {
    return this.lineWidthValue;
  }

  set lineWidth(value: number) {
    this.lineWidthValue = value;
    this.calls.push(`lineWidth(${value})`);
  }

  get globalAlpha(): number {
    return this.globalAlphaValue;
  }

  set globalAlpha(value: number) {
    this.globalAlphaValue = value;
    this.calls.push(`alpha(${value})`);
  }

  clearRect = vi.fn();
  fillRect = vi.fn();
  strokeText = vi.fn();
  fillText = vi.fn();

  beginPath(): void {
    this.calls.push("beginPath");
  }

  moveTo(x: number, y: number): void {
    this.calls.push(`moveTo(${x},${y})`);
  }

  lineTo(x: number, y: number): void {
    this.calls.push(`lineTo(${x},${y})`);
  }

  arc(x: number, y: number, radius: number): void {
    this.calls.push(`arc(${x},${y},${radius})`);
  }

  stroke(): void {
    this.calls.push("stroke");
  }

  fill(): void {
    this.calls.push("fill");
  }

  save(): void {
    this.calls.push("save");
  }

  restore(): void {
    this.calls.push("restore");
  }
}
