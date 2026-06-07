import { describe, expect, it } from "vitest";
import {
  assessAll,
  assessAny,
  constructionIdsOfKind,
  dependsOn,
  directlyDependsOn,
  hasConstructionKind,
  hasConstructionMeaning,
  isPointOnCircle,
  isPointOnLine,
  requiresConstructionKind,
  requiresDependency,
  requiresMeaning,
  requiresPointOnCircle,
  requiresPointOnLine,
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
      {
        id: "parallel",
        kind: "parallel-line",
        label: "Parallel",
        line: "line-ab",
        point: "C",
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
    expect(
      hasConstructionMeaning(evaluation, "parallel", {
        kind: "parallel-line",
        line: "line-ab",
        point: "C",
      }),
    ).toBe(true);
    expect(
      hasConstructionMeaning(evaluation, "parallel", {
        kind: "parallel-line",
        line: "line-ab",
        point: "D",
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

  it("builds predicate-shaped assessment results for semantic checks", () => {
    const context = {
      program,
      evaluation: evaluateConstruction(program),
    };

    expect(requiresConstructionKind("line-through")(context)).toMatchObject({
      passed: true,
      code: "construction-kind:line-through",
    });
    expect(requiresConstructionKind("circle-circle-intersection")(context)).toMatchObject({
      passed: false,
      code: "construction-kind:circle-circle-intersection",
    });
    expect(requiresDependency("intersection", "A")(context)).toMatchObject({
      passed: true,
      code: "dependency:transitive",
    });
    expect(requiresDependency("intersection", "A", { transitive: false })(context)).toMatchObject({
      passed: false,
      code: "dependency:direct",
    });
    expect(
      requiresMeaning("intersection", {
        kind: "line-line-intersection",
        lines: ["line-ab", "line-cd"],
      })(context),
    ).toMatchObject({
      passed: true,
      code: "meaning",
    });
  });

  it("builds predicate-shaped assessment results for realized incidence checks", () => {
    const context = {
      program,
      evaluation: evaluateConstruction(program),
    };

    expect(requiresPointOnLine("intersection", "line-ab")(context)).toMatchObject({
      passed: true,
      code: "incidence:point-line",
    });
    expect(requiresPointOnLine("C", "line-ab")(context)).toMatchObject({
      passed: false,
      code: "incidence:point-line",
    });
    expect(requiresPointOnCircle("B", "circle-a-b")(context)).toMatchObject({
      passed: true,
      code: "incidence:point-circle",
    });
  });

  it("composes assessment predicates with all/any helpers", () => {
    const context = {
      program,
      evaluation: evaluateConstruction(program),
    };
    const passing = requiresConstructionKind("line-through");
    const failing = requiresConstructionKind("circle-circle-intersection");

    expect(assessAll([passing, requiresDependency("intersection", "A")], "goal")(context)).toMatchObject({
      passed: true,
      code: "goal",
    });
    expect(assessAll([passing, failing], "goal")(context)).toMatchObject({
      passed: false,
      code: "goal",
    });
    expect(assessAny([failing, passing], "alternate-goal")(context)).toMatchObject({
      passed: true,
      code: "alternate-goal",
    });
    expect(assessAny([failing], "alternate-goal")(context)).toMatchObject({
      passed: false,
      code: "alternate-goal",
    });
  });
});
