import type { ActivityTool } from "@euclid/activity";
import type { ConstructionMacroDefinition } from "@euclid/geometry";
import type { ConstructionToolDescriptor } from "./toolTypes";

export type ThirdPartyMacroTool = Readonly<{
  definition: ConstructionMacroDefinition;
  descriptor: ConstructionToolDescriptor;
}>;

type ThirdPartyMacroToolModule = Readonly<{
  default?: ThirdPartyMacroTool;
  tool?: ThirdPartyMacroTool;
}>;

const modules = import.meta.glob<ThirdPartyMacroToolModule>("./third-party-tools/*.ts", {
  eager: true,
});

export const thirdPartyMacroTools: readonly ThirdPartyMacroTool[] = Object.entries(modules)
  .sort(([a], [b]) => a.localeCompare(b))
  .flatMap((entry) => {
    const module = entry[1];
    return module.default ?? module.tool ?? [];
  });

export const thirdPartyMacroDefinitions = thirdPartyMacroTools.map((tool) => tool.definition);

export const thirdPartyMacroToolDescriptors = thirdPartyMacroTools.map((tool) => tool.descriptor);

export const thirdPartyMacroToolIds = thirdPartyMacroTools.map(
  (tool) => tool.descriptor.id,
) satisfies readonly ActivityTool[];
