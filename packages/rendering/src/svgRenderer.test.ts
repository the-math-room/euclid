import { describe, expect, it } from "vitest";
import type { RenderScene } from "./scene";
import { renderSceneToSvgString } from "./svgRenderer";

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
    },
    {
      id: "cr-C",
      kind: "circle",
      center: { x: 200, y: 200 },
      radius: 50,
    },
  ],
};

describe("svg renderer", () => {
  it("renders a scene to an SVG string containing all elements", () => {
    const svgStr = renderSceneToSvgString(mockScene);

    expect(svgStr).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svgStr).toContain('viewBox="0 0 400 300"');
    expect(svgStr).toContain('width="400"');
    expect(svgStr).toContain('height="300"');
    expect(svgStr).toContain("<style>");

    // Grid
    expect(svgStr).toContain('<line x1="0" y1="0" x2="400" y2="0" />');

    // Point
    expect(svgStr).toContain('<g class="primitive point" data-id="pt-A">');
    expect(svgStr).toContain('<circle cx="100" cy="100" r="5" />');
    expect(svgStr).toContain('<text x="110" y="90">A</text>');

    // Line
    expect(svgStr).toContain(
      '<line class="primitive line" x1="10" y1="10" x2="90" y2="90" data-id="ln-B" />',
    );

    // Circle
    expect(svgStr).toContain('<circle class="primitive circle" cx="200" cy="200" r="50" data-id="cr-C" />');
  });

  it("handles selected ID", () => {
    const svgStr = renderSceneToSvgString(mockScene, { selectedId: "pt-A" });
    expect(svgStr).toContain('<g class="primitive point selected" data-id="pt-A">');
    expect(svgStr).toContain(
      '<line class="primitive line" x1="10" y1="10" x2="90" y2="90" data-id="ln-B" />',
    );
  });

  it("supports omitting styles", () => {
    const svgStr = renderSceneToSvgString(mockScene, { embedStyles: false });
    expect(svgStr).not.toContain("<style>");
  });

  it("handles selected IDs set", () => {
    const svgStr = renderSceneToSvgString(mockScene, {
      selectedIds: new Set(["pt-A", "cr-C"]),
    });
    expect(svgStr).toContain('<g class="primitive point selected" data-id="pt-A">');
    expect(svgStr).toContain(
      '<line class="primitive line" x1="10" y1="10" x2="90" y2="90" data-id="ln-B" />',
    );
    expect(svgStr).toContain(
      '<circle class="primitive circle selected" cx="200" cy="200" r="50" data-id="cr-C" />',
    );
  });
});
