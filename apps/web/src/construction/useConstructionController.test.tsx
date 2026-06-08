// @vitest-environment jsdom
import { describe, expect, it, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { openActivityPolicy } from "@euclid/activity";
import { toWorldPoint, type ConstructionProgram } from "@euclid/geometry";
import type { ViewCamera } from "@euclid/rendering";
import { useConstructionController, type ConstructionController } from "./useConstructionController";

const globalWithAct = globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean };
globalWithAct.IS_REACT_ACT_ENVIRONMENT = true;

const program: ConstructionProgram = {
  constructions: [
    { id: "A", kind: "free-point", label: "A", position: toWorldPoint({ x: 0, y: 0 }) },
    { id: "B", kind: "free-point", label: "B", position: toWorldPoint({ x: 1, y: 0 }) },
    { id: "line-ab", kind: "line-through", label: "AB", points: ["A", "B"] },
  ],
};

const camera: ViewCamera = {
  center: toWorldPoint({ x: 0, y: 0 }),
  rotation: { turns: 0 },
  scale: 1,
  screenOffset: { x: 0, y: 0 },
};

function ControllerProbe({ onController }: { onController: (controller: ConstructionController) => void }) {
  const controller = useConstructionController({
    initialProgram: program,
    camera,
    sceneSize: { width: 920, height: 620 },
    policy: openActivityPolicy,
  });
  onController(controller);
  return null;
}

describe("useConstructionController", () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  it("uses select mode for ordinary selection instead of construction sessions", async () => {
    let latest: ConstructionController | undefined;
    const testContainer = document.createElement("div");
    container = testContainer;
    document.body.appendChild(testContainer);

    await act(async () => {
      root = createRoot(testContainer);
      root.render(<ControllerProbe onController={(controller) => (latest = controller)} />);
    });

    expect(latest?.activeTool).toBe("select");

    await act(async () => {
      latest?.handleSelect("A");
    });
    expect(latest?.selectedIds).toEqual(new Set(["A"]));

    await act(async () => {
      latest?.handleSelect("line-ab");
    });
    expect(latest?.selectedIds).toEqual(new Set(["line-ab"]));

    await act(async () => {
      latest?.handleSelect(undefined);
    });
    expect(latest?.selectedIds).toEqual(new Set());
  });
});
