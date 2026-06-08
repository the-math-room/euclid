import type { ActivityTool } from "@euclid/activity";
import type { ConstructionMacroDefinition } from "@euclid/geometry";
import type { ThirdPartyMacroTool } from "../thirdPartyToolRegistry";

export const equilateralTriangleToolId = "third-party/equilateral-triangle" satisfies ActivityTool;

const definition = {
  id: equilateralTriangleToolId,
  label: "Equilateral Triangle",
  inputs: [
    { name: "a", kind: "point" },
    { name: "b", kind: "point", distinctFrom: "a" },
    { name: "side", kind: "side-of-line", from: { input: "a" }, to: { input: "b" } },
  ],
  steps: [
    {
      bind: "circleA",
      kind: "circle-through",
      idTemplate: "equilateral-{a}-{b}-circle-a",
      labelTemplate: "Circle({a}, {b})",
      center: { input: "a" },
      pointOnCircle: { input: "b" },
      shapeRole: "auxiliary",
    },
    {
      bind: "circleB",
      kind: "circle-through",
      idTemplate: "equilateral-{a}-{b}-circle-b",
      labelTemplate: "Circle({b}, {a})",
      center: { input: "b" },
      pointOnCircle: { input: "a" },
      shapeRole: "auxiliary",
    },
    {
      bind: "apex",
      kind: "circle-circle-intersection",
      idTemplate: "equilateral-{a}-{b}-apex",
      labelTemplate: "{nextPointLabel}",
      firstCircle: { step: "circleA" },
      secondCircle: { step: "circleB" },
      intersectionIndex: {
        kind: "side-of-line",
        from: { input: "a" },
        to: { input: "b" },
        point: { input: "side" },
      },
    },
    {
      bind: "base",
      kind: "line-through",
      idTemplate: "equilateral-{a}-{b}-base",
      labelTemplate: "{a}{b}",
      points: [{ input: "a" }, { input: "b" }],
    },
    {
      bind: "sideA",
      kind: "line-through",
      idTemplate: "equilateral-{a}-{b}-side-a",
      labelTemplate: "{a}{apex}",
      points: [{ input: "a" }, { step: "apex" }],
    },
    {
      bind: "sideB",
      kind: "line-through",
      idTemplate: "equilateral-{a}-{b}-side-b",
      labelTemplate: "{b}{apex}",
      points: [{ input: "b" }, { step: "apex" }],
    },
  ],
  selectedSteps: ["base", "sideA", "sideB"],
} satisfies ConstructionMacroDefinition;

const tool = {
  definition,
  descriptor: {
    id: equilateralTriangleToolId,
    label: "Equilateral Triangle",
    icon: "macro",
    gesturePolicy: {
      pointerUpPriority: ["point", "intersection", "empty-point"],
    },
  },
} satisfies ThirdPartyMacroTool;

export default tool;
