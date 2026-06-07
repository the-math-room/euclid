import {
  addCircleThroughPoints,
  addLineThroughPoints,
  addParallelLine,
  addPerpendicularLine,
  addMidpoint,
} from "@euclid/geometry";
import type { ConstructionId, ConstructionProgram } from "@euclid/geometry";
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

export type ToolSessionContext = Readonly<{
  program: ConstructionProgram;
  realizedPointIds: ReadonlySet<ConstructionId>;
  realizedLineIds: ReadonlySet<ConstructionId>;
  realizedCircleIds: ReadonlySet<ConstructionId>;
}>;

export type ToolSessionResult = Readonly<{
  program: ConstructionProgram;
  nextDraft: ToolDraft;
  selectedIds: ReadonlySet<ConstructionId>;
  lastSelectedId: ConstructionId;
}>;

export type ToolSessionConfig = Readonly<{
  onPointInput: (
    context: ToolSessionContext,
    draft: ToolDraft,
    pointId: ConstructionId,
    options?: { restartOnSameAnchor?: boolean },
  ) => ToolSessionResult | undefined;

  onSelectShape?: (
    context: ToolSessionContext,
    draft: ToolDraft,
    id: ConstructionId,
  ) => ToolSessionResult | undefined;
}>;

export const toolSessionRegistry: Record<ActiveTool, ToolSessionConfig> = {
  select: {
    onPointInput: () => undefined,
  },
  point: {
    onPointInput: (context, _draft, pointId) => ({
      program: context.program,
      nextDraft: emptyToolDraft,
      selectedIds: new Set([pointId]),
      lastSelectedId: pointId,
    }),
  },
  line: {
    onPointInput: (context, draft, pointId, options) => {
      if (draft.kind !== "line" || (options?.restartOnSameAnchor === true && draft.anchorId === pointId)) {
        return {
          program: context.program,
          nextDraft: { kind: "line", anchorId: pointId },
          selectedIds: new Set([pointId]),
          lastSelectedId: pointId,
        };
      }

      const points: readonly [ConstructionId, ConstructionId] = [draft.anchorId, pointId];
      const result = addLineThroughPoints(context.program, points);
      return {
        program: result.program,
        nextDraft: emptyToolDraft,
        selectedIds: result.id ? new Set([result.id]) : new Set(points),
        lastSelectedId: result.id ?? pointId,
      };
    },
  },
  circle: {
    onPointInput: (context, draft, pointId, options) => {
      if (draft.kind !== "circle" || (options?.restartOnSameAnchor === true && draft.anchorId === pointId)) {
        return {
          program: context.program,
          nextDraft: { kind: "circle", anchorId: pointId },
          selectedIds: new Set([pointId]),
          lastSelectedId: pointId,
        };
      }

      const center = draft.anchorId;
      const result = addCircleThroughPoints(context.program, center, pointId);
      return {
        program: result.program,
        nextDraft: emptyToolDraft,
        selectedIds: result.id ? new Set([result.id]) : new Set([center, pointId]),
        lastSelectedId: result.id ?? pointId,
      };
    },
  },
  midpoint: {
    onPointInput: (context, draft, pointId, options) => {
      if (
        draft.kind !== "midpoint" ||
        (options?.restartOnSameAnchor === true && draft.anchorId === pointId)
      ) {
        return {
          program: context.program,
          nextDraft: { kind: "midpoint", anchorId: pointId },
          selectedIds: new Set([pointId]),
          lastSelectedId: pointId,
        };
      }

      const firstPoint = draft.anchorId;
      const result = addMidpoint(context.program, [firstPoint, pointId]);
      return {
        program: result.program,
        nextDraft: emptyToolDraft,
        selectedIds: result.id ? new Set([result.id]) : new Set([firstPoint, pointId]),
        lastSelectedId: result.id ?? pointId,
      };
    },
  },
  parallel: {
    onSelectShape: (context, draft, id) => {
      if (draft.kind !== "parallel" && context.realizedLineIds.has(id)) {
        return {
          program: context.program,
          nextDraft: { kind: "parallel", lineId: id },
          selectedIds: new Set([id]),
          lastSelectedId: id,
        };
      }
      return undefined;
    },
    onPointInput: (context, draft, pointId) => {
      if (draft.kind !== "parallel") {
        return undefined;
      }
      const result = addParallelLine(context.program, draft.lineId, pointId);
      return {
        program: result.program,
        nextDraft: emptyToolDraft,
        selectedIds: result.id ? new Set([result.id]) : new Set([pointId]),
        lastSelectedId: result.id ?? pointId,
      };
    },
  },
  perpendicular: {
    onSelectShape: (context, draft, id) => {
      if (draft.kind !== "perpendicular" && context.realizedLineIds.has(id)) {
        return {
          program: context.program,
          nextDraft: { kind: "perpendicular", lineId: id },
          selectedIds: new Set([id]),
          lastSelectedId: id,
        };
      }
      return undefined;
    },
    onPointInput: (context, draft, pointId) => {
      if (draft.kind !== "perpendicular") {
        return undefined;
      }
      const result = addPerpendicularLine(context.program, draft.lineId, pointId);
      return {
        program: result.program,
        nextDraft: emptyToolDraft,
        selectedIds: result.id ? new Set([result.id]) : new Set([pointId]),
        lastSelectedId: result.id ?? pointId,
      };
    },
  },
};
