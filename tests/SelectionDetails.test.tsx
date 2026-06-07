// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { SelectionDetails } from "../apps/web/src/objects/SelectionDetails";
import type { Construction } from "@euclid/geometry";

const globalWithAct = globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean };
globalWithAct.IS_REACT_ACT_ENVIRONMENT = true;

describe("SelectionDetails Component", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it("renders circle-three-points details without crashing", async () => {
    const constructions: readonly Construction[] = [
      {
        id: "circle-abc",
        kind: "circle-three-points",
        label: "Circle(ABC)",
        points: ["A", "B", "C"],
      },
    ];

    let root: Root | undefined;
    await act(async () => {
      root = createRoot(container);
      root.render(
        <SelectionDetails
          selectedIds={new Set(["circle-abc"])}
          constructions={constructions}
          onDelete={vi.fn()}
          canDelete={true}
        />,
      );
    });

    // Verify correct label and list of points rendered
    expect(container.textContent).toContain("Circle(ABC)");
    expect(container.textContent).toContain("A, B, C");

    await act(async () => {
      root?.unmount();
    });
  });

  it("disables delete when the selected construction cannot be deleted", async () => {
    const constructions: readonly Construction[] = [
      {
        id: "A",
        kind: "free-point",
        label: "A",
        position: { x: 0, y: 0 },
      },
    ];

    let root: Root | undefined;
    await act(async () => {
      root = createRoot(container);
      root.render(
        <SelectionDetails
          selectedIds={new Set(["A"])}
          constructions={constructions}
          onDelete={vi.fn()}
          canDelete={false}
        />,
      );
    });

    expect(container.querySelector<HTMLButtonElement>(".delete-button")?.disabled).toBe(true);

    await act(async () => {
      root?.unmount();
    });
  });
});
