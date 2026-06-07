import { describe, expect, it } from "vitest";
import { clearDraftUnlessTool, draftPreviewFor, emptyToolDraft, type ToolDraft } from "./toolSession";

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
