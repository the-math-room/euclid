import { describe, expect, it } from "vitest";
import { circleItem, gridLine, lineItem, pointItem, renderScene, scenePoint } from "./renderTestFixtures";
import { renderSceneToSvgString } from "./svgRenderer";

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
    expect(svgStr).toContain('<g class="primitive point free" data-id="pt-A">');
    expect(svgStr).toContain('<circle cx="100" cy="100" r="5"');
    expect(svgStr).toContain('fill="#172026"');
    expect(svgStr).toContain("A</text>");

    // Line
    expect(svgStr).toContain(
      '<line class="primitive line primary" x1="10" y1="10" x2="90" y2="90" stroke="#246a73" stroke-width="2.5" stroke-dasharray="" opacity="1" fill="none" data-id="ln-B" />',
    );

    // Circle
    expect(svgStr).toContain(
      '<circle class="primitive circle primary" cx="200" cy="200" r="50" stroke="#ba4a3a" stroke-width="2.5" stroke-dasharray="" opacity="1" fill="none" data-id="cr-C" />',
    );
  });

  it("handles selected ID", () => {
    const svgStr = renderSceneToSvgString(mockScene, { selectedId: "pt-A" });
    expect(svgStr).toContain('<g class="primitive point free selected" data-id="pt-A">');
    expect(svgStr).toContain(
      '<line class="primitive line primary" x1="10" y1="10" x2="90" y2="90" stroke="#246a73" stroke-width="2.5" stroke-dasharray="" opacity="1" fill="none" data-id="ln-B" />',
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
    expect(svgStr).toContain('<g class="primitive point free selected" data-id="pt-A">');
    expect(svgStr).toContain(
      '<line class="primitive line primary" x1="10" y1="10" x2="90" y2="90" stroke="#246a73" stroke-width="2.5" stroke-dasharray="" opacity="1" fill="none" data-id="ln-B" />',
    );
    expect(svgStr).toContain(
      '<circle class="primitive circle primary selected" cx="200" cy="200" r="50" stroke="#e3c057" stroke-width="4" stroke-dasharray="" opacity="1" fill="none" data-id="cr-C" />',
    );
  });

  it("includes auxiliary shape styling", () => {
    const scene = renderScene({
      size: { width: 100, height: 100 },
      items: [
        lineItem({
          id: "helper-line",
          from: scenePoint(10, 20),
          to: scenePoint(90, 20),
          shapeRole: "auxiliary",
        }),
      ],
    });
    const svgStr = renderSceneToSvgString(scene);

    expect(svgStr).toContain(
      '<line class="primitive line auxiliary" x1="10" y1="20" x2="90" y2="20" stroke="#246a73" stroke-width="2.5" stroke-dasharray="9 7" opacity="0.38" fill="none" data-id="helper-line" />',
    );
  });

  it("escapes XML-special characters in ids and labels", () => {
    const scene = renderScene({
      size: { width: 100, height: 100 },
      items: [
        pointItem({
          id: `pt-"A"&'B'<C>`,
          x: 20,
          y: 30,
          text: `A & B < C > D "quote" 'apostrophe'`,
          labelAnchor: scenePoint(30, 20),
        }),
      ],
    });
    const svgStr = renderSceneToSvgString(scene);

    expect(svgStr).toContain(`data-id="pt-&quot;A&quot;&amp;&apos;B&apos;&lt;C&gt;"`);
    expect(svgStr).toContain(`A &amp; B &lt; C &gt; D "quote" 'apostrophe'</text>`);
  });

  it("includes constructed point role classes", () => {
    const scene = renderScene({
      size: { width: 100, height: 100 },
      items: [
        pointItem({
          id: "constructed-point",
          pointRole: "constructed",
          x: 20,
          y: 30,
          text: "D",
          labelAnchor: scenePoint(30, 20),
        }),
      ],
    });
    const svgStr = renderSceneToSvgString(scene);

    expect(svgStr).toContain('<g class="primitive point constructed" data-id="constructed-point">');
  });
});
