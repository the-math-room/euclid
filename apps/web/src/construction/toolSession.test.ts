import { describe, expect, it } from "vitest";
import {
  clearDraftUnlessTool,
  draftPreviewFor,
  emptyToolDraft,
  toolSessionRegistry,
  type ToolDraft,
  type ToolSessionContext,
} from "./toolSession";
import type { ConstructionProgram } from "@euclid/geometry";

function assertDefined<T>(val: T | undefined | null): T {
  if (val === undefined || val === null) {
    throw new Error("Expected value to be defined");
  }
  return val;
}

describe("tool session helpers", () => {
  it("keeps the current draft when the selected tool still owns it", () => {
    const draft: ToolDraft = { kind: "line", anchorId: "A" };
    expect(clearDraftUnlessTool(draft, "line")).toBe(draft);
  });

  it("clears the current draft when the selected tool changes", () => {
    const draft: ToolDraft = { kind: "circle", anchorId: "A" };
    expect(clearDraftUnlessTool(draft, "line")).toBe(emptyToolDraft);
  });

  it("does not expose an empty draft as a preview", () => {
    expect(draftPreviewFor(emptyToolDraft)).toBeUndefined();
  });

  it("exposes active construction drafts as previews", () => {
    const draft: ToolDraft = { kind: "perpendicular", lineId: "line-1" };
    expect(draftPreviewFor(draft)).toEqual(draft);
  });
});

describe("toolSessionRegistry", () => {
  const emptyProgram: ConstructionProgram = { constructions: [] };
  const baseContext: ToolSessionContext = {
    program: emptyProgram,
    realizedPointIds: new Set(["A", "B"]),
    realizedLineIds: new Set(["line-ab"]),
    realizedCircleIds: new Set(),
  };

  it("handles point tool input", () => {
    const session = toolSessionRegistry.point;
    const result = assertDefined(session.onPointInput(baseContext, emptyToolDraft, "A"));
    expect(result.nextDraft).toEqual(emptyToolDraft);
    expect(result.selectedIds).toEqual(new Set(["A"]));
    expect(result.lastSelectedId).toBe("A");
  });

  it("handles line tool drafting flow", () => {
    const session = toolSessionRegistry.line;

    // Step 1: select first point
    const r1 = assertDefined(session.onPointInput(baseContext, emptyToolDraft, "A"));
    expect(r1.nextDraft).toEqual({ kind: "line", anchorId: "A" });
    expect(r1.selectedIds).toEqual(new Set(["A"]));

    // Step 2: select second point to build line
    const r2 = assertDefined(
      session.onPointInput({ ...baseContext, program: r1.program }, r1.nextDraft, "B"),
    );
    expect(r2.nextDraft).toEqual(emptyToolDraft);
    expect(r2.program.constructions).toHaveLength(1);
    expect(r2.program.constructions[0].kind).toBe("line-through");
  });

  it("handles circle tool drafting flow", () => {
    const session = toolSessionRegistry.circle;

    // Step 1: select center point
    const r1 = assertDefined(session.onPointInput(baseContext, emptyToolDraft, "A"));
    expect(r1.nextDraft).toEqual({ kind: "circle", anchorId: "A" });
    expect(r1.selectedIds).toEqual(new Set(["A"]));

    // Step 2: select radius point to build circle
    const r2 = assertDefined(
      session.onPointInput({ ...baseContext, program: r1.program }, r1.nextDraft, "B"),
    );
    expect(r2.nextDraft).toEqual(emptyToolDraft);
    expect(r2.program.constructions).toHaveLength(1);
    expect(r2.program.constructions[0].kind).toBe("circle-through");
  });

  it("handles parallel tool drafting flow", () => {
    const session = toolSessionRegistry.parallel;
    expect(session.onSelectShape).toBeDefined();

    // Step 1: select line
    const onSelectShape = assertDefined(session.onSelectShape);
    const r1 = assertDefined(onSelectShape(baseContext, emptyToolDraft, "line-ab"));
    expect(r1.nextDraft).toEqual({ kind: "parallel", lineId: "line-ab" });
    expect(r1.selectedIds).toEqual(new Set(["line-ab"]));

    // Step 2: select point to build parallel line
    const r2 = assertDefined(
      session.onPointInput({ ...baseContext, program: r1.program }, r1.nextDraft, "A"),
    );
    expect(r2.nextDraft).toEqual(emptyToolDraft);
    expect(r2.program.constructions).toHaveLength(1);
    expect(r2.program.constructions[0].kind).toBe("parallel-line");
  });

  it("handles perpendicular tool drafting flow", () => {
    const session = toolSessionRegistry.perpendicular;
    expect(session.onSelectShape).toBeDefined();

    // Step 1: select line
    const onSelectShape = assertDefined(session.onSelectShape);
    const r1 = assertDefined(onSelectShape(baseContext, emptyToolDraft, "line-ab"));
    expect(r1.nextDraft).toEqual({ kind: "perpendicular", lineId: "line-ab" });
    expect(r1.selectedIds).toEqual(new Set(["line-ab"]));

    // Step 2: select point to build perpendicular line
    const r2 = assertDefined(
      session.onPointInput({ ...baseContext, program: r1.program }, r1.nextDraft, "A"),
    );
    expect(r2.nextDraft).toEqual(emptyToolDraft);
    expect(r2.program.constructions).toHaveLength(1);
    expect(r2.program.constructions[0].kind).toBe("perpendicular-line");
  });

  it("handles midpoint tool drafting flow", () => {
    const session = toolSessionRegistry.midpoint;

    // Step 1: select first point
    const r1 = assertDefined(session.onPointInput(baseContext, emptyToolDraft, "A"));
    expect(r1.nextDraft).toEqual({ kind: "midpoint", anchorId: "A" });
    expect(r1.selectedIds).toEqual(new Set(["A"]));

    // Step 2: select second point to build midpoint
    const r2 = assertDefined(
      session.onPointInput({ ...baseContext, program: r1.program }, r1.nextDraft, "B"),
    );
    expect(r2.nextDraft).toEqual(emptyToolDraft);
    expect(r2.program.constructions).toHaveLength(1);
    expect(r2.program.constructions[0].kind).toBe("midpoint");
  });
});
