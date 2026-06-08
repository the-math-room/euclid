import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import {
  ambientEffectViolationsIn,
  layerRoots,
  moduleMutableStateViolationsIn,
  packageProductionSourceFiles,
} from "./sourceAnalysis";

const pureAppAdapterFiles = [
  resolve(layerRoots.app, "GestureController.ts"),
  resolve(layerRoots.app, "workspacePreview.ts"),
  resolve(layerRoots.app, "workspaceCoordinates.ts"),
  resolve(layerRoots.app, "construction/deleteSelection.ts"),
  resolve(layerRoots.app, "construction/pointInput.ts"),
  resolve(layerRoots.app, "construction/tools.ts"),
  resolve(layerRoots.app, "construction/toolSession.ts"),
  resolve(layerRoots.app, "lessons/authoring.ts"),
] as const;

describe("architecture pure core", () => {
  it("keeps package production code free of ambient effects", () => {
    const violations = packageProductionSourceFiles().flatMap(ambientEffectViolationsIn);

    expect(violations).toEqual([]);
  });

  it("keeps package production code free of module-level mutable state", () => {
    const violations = packageProductionSourceFiles().flatMap(moduleMutableStateViolationsIn);

    expect(violations).toEqual([]);
  });

  it("keeps pure app adapter modules free of ambient effects and module-level mutable state", () => {
    const violations = pureAppAdapterFiles.flatMap((file) => [
      ...ambientEffectViolationsIn(file),
      ...moduleMutableStateViolationsIn(file),
    ]);

    expect(violations).toEqual([]);
  });
});
