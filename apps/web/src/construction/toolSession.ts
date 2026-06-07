import type { ConstructionId } from "@euclid/geometry";
import type { ActiveTool } from "./tools";

export type ToolDraft =
  | Readonly<{ kind: "none" }>
  | Readonly<{ kind: "line"; anchorId: ConstructionId }>
  | Readonly<{ kind: "circle"; anchorId: ConstructionId }>
  | Readonly<{ kind: "parallel"; lineId: ConstructionId }>
  | Readonly<{ kind: "perpendicular"; lineId: ConstructionId }>
  | Readonly<{ kind: "midpoint"; anchorId: ConstructionId }>;

export type DraftPreview = Exclude<ToolDraft, Readonly<{ kind: "none" }>>;

export const emptyToolDraft: ToolDraft = { kind: "none" };

export function clearDraftUnlessTool(draft: ToolDraft, tool: ActiveTool): ToolDraft {
  if (draft.kind === tool) {
    return draft;
  }

  return emptyToolDraft;
}

export function draftPreviewFor(draft: ToolDraft): DraftPreview | undefined {
  if (draft.kind === "none") {
    return undefined;
  }

  return draft;
}
