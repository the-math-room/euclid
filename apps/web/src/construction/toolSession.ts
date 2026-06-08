import {
  addCircleThroughPoints,
  addLineThroughPoints,
  addParallelLine,
  addPerpendicularLine,
  addMidpoint,
  applyConstructionMacro,
} from "@euclid/geometry";
import type {
  ConstructionId,
  ConstructionMacroDefinition,
  ConstructionProgram,
  WorldPoint,
} from "@euclid/geometry";
import type { BuiltInActivityTool } from "@euclid/activity";
import type { ActiveTool } from "./tools";
import { thirdPartyMacroDefinitions } from "./thirdPartyToolRegistry";

export type ToolDraft =
  | Readonly<{ kind: "none" }>
  | Readonly<{ kind: "line"; anchorId: ConstructionId }>
  | Readonly<{ kind: "circle"; anchorId: ConstructionId }>
  | Readonly<{ kind: "parallel"; lineId: ConstructionId }>
  | Readonly<{ kind: "perpendicular"; lineId: ConstructionId }>
  | Readonly<{ kind: "midpoint"; anchorId: ConstructionId }>
  | Readonly<{ kind: "macro"; toolId: ActiveTool; pointInputIds: readonly ConstructionId[] }>;

export type DraftPreview = Extract<
  ToolDraft,
  | Readonly<{ kind: "line" }>
  | Readonly<{ kind: "circle" }>
  | Readonly<{ kind: "parallel" }>
  | Readonly<{ kind: "perpendicular" }>
  | Readonly<{ kind: "midpoint" }>
>;

export const emptyToolDraft: ToolDraft = { kind: "none" };

export function clearDraftUnlessTool(draft: ToolDraft, tool: ActiveTool): ToolDraft {
  if (draft.kind === "macro") {
    return draft.toolId === tool ? draft : emptyToolDraft;
  }

  if (draft.kind === tool) {
    return draft;
  }
  return emptyToolDraft;
}

export function draftPreviewFor(draft: ToolDraft): DraftPreview | undefined {
  switch (draft.kind) {
    case "line":
    case "circle":
    case "parallel":
    case "perpendicular":
    case "midpoint":
      return draft;
    case "none":
    case "macro":
      return undefined;
  }
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

  onWorldPointInput?: (
    context: ToolSessionContext,
    draft: ToolDraft,
    point: WorldPoint,
  ) => ToolSessionResult | undefined;
}>;

const builtInToolSessionRegistry: Record<BuiltInActivityTool, ToolSessionConfig> = {
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

export const toolSessionRegistry: Readonly<Record<string, ToolSessionConfig>> = {
  ...builtInToolSessionRegistry,
  ...Object.fromEntries(
    thirdPartyMacroDefinitions.map((definition) => [definition.id, toolSessionForMacro(definition)]),
  ),
};

function toolSessionForMacro(definition: ConstructionMacroDefinition): ToolSessionConfig {
  const pointInputs = definition.inputs.filter((input) => input.kind === "point");
  const sideInputs = definition.inputs.filter((input) => input.kind === "side-of-line");

  return {
    onPointInput: (context, draft, pointId) => {
      const currentPointIds =
        draft.kind === "macro" && draft.toolId === definition.id ? draft.pointInputIds : [];

      if (currentPointIds.length >= pointInputs.length) {
        return {
          program: context.program,
          nextDraft: draft,
          selectedIds: new Set(currentPointIds),
          lastSelectedId: currentPointIds.at(-1) ?? pointId,
        };
      }

      const input = pointInputs[currentPointIds.length];
      if (input.distinctFrom) {
        const distinctInputIndex = pointInputs.findIndex(({ name }) => name === input.distinctFrom);
        if (distinctInputIndex !== -1 && currentPointIds[distinctInputIndex] === pointId) {
          return {
            program: context.program,
            nextDraft: { kind: "macro", toolId: definition.id, pointInputIds: [pointId] },
            selectedIds: new Set([pointId]),
            lastSelectedId: pointId,
          };
        }
      }

      const nextPointIds = [...currentPointIds, pointId];
      return {
        program: context.program,
        nextDraft: { kind: "macro", toolId: definition.id, pointInputIds: nextPointIds },
        selectedIds: new Set(nextPointIds),
        lastSelectedId: pointId,
      };
    },
    onWorldPointInput: (context, draft, point) => {
      if (draft.kind !== "macro" || draft.toolId !== definition.id) {
        return undefined;
      }

      if (draft.pointInputIds.length < pointInputs.length) {
        return undefined;
      }

      const pointInputsByName = Object.fromEntries(
        pointInputs.map((input, index) => [input.name, draft.pointInputIds[index]]),
      );
      const sideInputsByName = Object.fromEntries(sideInputs.map((input) => [input.name, point]));
      const result = applyConstructionMacro(context.program, definition, {
        pointInputs: pointInputsByName,
        sideInputs: sideInputsByName,
      });

      if (!result.changed) {
        return {
          program: context.program,
          nextDraft: emptyToolDraft,
          selectedIds: new Set(draft.pointInputIds),
          lastSelectedId: draft.pointInputIds.at(-1) ?? "",
        };
      }

      const selectedIds =
        result.selectedIds.length > 0 ? result.selectedIds : result.stepIds.map(({ id }) => id);
      return {
        program: result.program,
        nextDraft: emptyToolDraft,
        selectedIds: new Set(selectedIds),
        lastSelectedId: selectedIds.at(-1) ?? result.stepIds.at(-1)?.id ?? "",
      };
    },
  };
}
