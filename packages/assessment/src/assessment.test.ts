import { describe, expect, it } from "vitest";
import {
  constructionIdsOfKind,
  dependsOn,
  directlyDependsOn,
  hasConstructionKind,
  hasConstructionMeaning,
  isPointOnCircle,
  isPointOnLine,
} from "./assessment";
import { evaluateConstruction, type ConstructionProgram } from "@euclid/geometry";

describe("assessment primitives", () => {
  const program: ConstructionProgram = {
    constructions: [
      { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
      { id: "B", kind: "free-point", label: "B", position: { x: 2, y: 0 } },
      { id: "C", kind: "free-point", label: "C", position: { x: 1, y: 1 } },
      { id: "D", kind: "free-point", label: "D", position: { x: 1, y: -1 } },
      { id: "line-ab", kind: "line-through", label: "AB", points: ["A", "B"] },
      { id: "line-cd", kind: "line-through", label: "CD", points: ["C", "D"] },
      { id: "circle-a-b", kind: "circle-through", label: "Circle(A, B)", center: "A", pointOnCircle: "B" },
      {
        id: "intersection",
        kind: "line-line-intersection",
        label: "X",
        lines: ["line-ab", "line-cd"],
      },
    ],
  };

  it("finds constructions by kind", () => {
    expect(hasConstructionKind(program, "line-through")).toBe(true);
    expect(hasConstructionKind(program, "circle-circle-intersection")).toBe(false);
    expect(constructionIdsOfKind(program, "line-through")).toEqual(["line-ab", "line-cd"]);
  });

  it("checks direct and transitive construction dependencies", () => {
    expect(directlyDependsOn(program, "intersection", "line-ab")).toBe(true);
    expect(directlyDependsOn(program, "intersection", "A")).toBe(false);
    expect(dependsOn(program, "intersection", "A")).toBe(true);
    expect(dependsOn(program, "intersection", "circle-a-b")).toBe(false);
    expect(dependsOn(program, "missing", "A")).toBe(false);
  });

  it("checks exact construction meaning independently of realization", () => {
    const evaluation = evaluateConstruction(program);

    expect(
      hasConstructionMeaning(evaluation, "intersection", {
        kind: "line-line-intersection",
        lines: ["line-ab", "line-cd"],
      }),
    ).toBe(true);
    expect(
      hasConstructionMeaning(evaluation, "intersection", {
        kind: "line-line-intersection",
        lines: ["line-cd", "line-ab"],
      }),
    ).toBe(false);
  });

  it("checks realized point-line and point-circle incidence with tolerance", () => {
    const evaluation = evaluateConstruction(program);

    expect(isPointOnLine(evaluation, "intersection", "line-ab")).toBe(true);
    expect(isPointOnLine(evaluation, "C", "line-ab")).toBe(false);
    expect(isPointOnCircle(evaluation, "B", "circle-a-b")).toBe(true);
    expect(isPointOnCircle(evaluation, "C", "circle-a-b")).toBe(false);
  });

  it("returns false for incidence checks when primitives are not realized", () => {
    const degenerateProgram: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
        { id: "B", kind: "free-point", label: "B", position: { x: 0, y: 0 } },
        { id: "line-ab", kind: "line-through", label: "AB", points: ["A", "B"] },
      ],
    };
    const evaluation = evaluateConstruction(degenerateProgram);

    expect(isPointOnLine(evaluation, "A", "line-ab")).toBe(false);
    expect(isPointOnCircle(evaluation, "A", "missing")).toBe(false);
  });
});
