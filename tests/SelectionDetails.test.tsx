// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { SelectionDetails } from "../apps/web/src/objects/SelectionDetails";
import { toWorldPoint, type Construction } from "@euclid/geometry";

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
          onSetShapeRole={vi.fn()}
          onSetFreePointMobility={vi.fn()}
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
        position: toWorldPoint({ x: 0, y: 0 }),
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
          onSetShapeRole={vi.fn()}
          onSetFreePointMobility={vi.fn()}
        />,
      );
    });

    expect(container.querySelector<HTMLButtonElement>(".delete-button")?.disabled).toBe(true);

    await act(async () => {
      root?.unmount();
    });
  });

  it("lets selected shape constructions change role", async () => {
    const onSetShapeRole = vi.fn();
    const constructions: readonly Construction[] = [
      {
        id: "line-ab",
        kind: "line-through",
        label: "AB",
        points: ["A", "B"],
      },
    ];

    let root: Root | undefined;
    await act(async () => {
      root = createRoot(container);
      root.render(
        <SelectionDetails
          selectedIds={new Set(["line-ab"])}
          constructions={constructions}
          onDelete={vi.fn()}
          canDelete={true}
          onSetShapeRole={onSetShapeRole}
          onSetFreePointMobility={vi.fn()}
        />,
      );
    });

    const select = container.querySelector<HTMLSelectElement>(".shape-role-select");
    expect(select?.value).toBe("primary");

    await act(async () => {
      if (!select) return;
      select.value = "auxiliary";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(onSetShapeRole).toHaveBeenCalledWith("line-ab", "auxiliary");

    await act(async () => {
      root?.unmount();
    });
  });

  it("lets selected free points change mobility", async () => {
    const onSetFreePointMobility = vi.fn();
    const constructions: readonly Construction[] = [
      {
        id: "A",
        kind: "free-point",
        label: "A",
        position: toWorldPoint({ x: 0, y: 0 }),
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
          canDelete={true}
          onSetShapeRole={vi.fn()}
          onSetFreePointMobility={onSetFreePointMobility}
        />,
      );
    });

    const select = container.querySelector<HTMLSelectElement>(".shape-role-select");
    expect(select?.value).toBe("free");

    await act(async () => {
      if (!select) return;
      select.value = "fixed";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(onSetFreePointMobility).toHaveBeenCalledWith("A", "fixed");

    await act(async () => {
      root?.unmount();
    });
  });
});
