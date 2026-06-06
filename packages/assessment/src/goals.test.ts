import { describe, expect, it } from "vitest";
import { evaluateConstruction, type ConstructionProgram } from "@euclid/geometry";
import { evaluateGoal, predicateForGoal, type AssessmentGoal } from "./goals";

describe("assessment goals", () => {
  const program: ConstructionProgram = {
    constructions: [
      { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
      { id: "B", kind: "free-point", label: "B", position: { x: 2, y: 0 } },
      { id: "C", kind: "free-point", label: "C", position: { x: 1, y: 1 } },
      { id: "D", kind: "free-point", label: "D", position: { x: 1, y: -1 } },
      { id: "line-ab", kind: "line-through", label: "AB", points: ["A", "B"] },
      { id: "line-cd", kind: "line-through", label: "CD", points: ["C", "D"] },
      {
        id: "intersection",
        kind: "line-line-intersection",
        label: "X",
        lines: ["line-ab", "line-cd"],
      },
    ],
  };
  const context = {
    program,
    evaluation: evaluateConstruction(program),
  };

  it("evaluates a serializable all goal", () => {
    const goal: AssessmentGoal = {
      kind: "all",
      id: "construct-x",
      goals: [
        {
          kind: "meaning",
          id: "intersection",
          expression: {
            kind: "line-line-intersection",
            lines: ["line-ab", "line-cd"],
          },
        },
        {
          kind: "dependency",
          targetId: "intersection",
          sourceId: "A",
        },
        {
          kind: "point-on-line",
          pointId: "intersection",
          lineId: "line-ab",
        },
      ],
    };

    expect(evaluateGoal(context, goal)).toMatchObject({
      passed: true,
      code: "construct-x",
    });
  });

  it("evaluates a serializable any goal", () => {
    const goal: AssessmentGoal = {
      kind: "any",
      goals: [
        {
          kind: "construction-kind",
          constructionKind: "circle-circle-intersection",
        },
        {
          kind: "construction-kind",
          constructionKind: "line-line-intersection",
        },
      ],
    };

    expect(evaluateGoal(context, goal)).toMatchObject({
      passed: true,
      code: "goal:any",
    });
  });

  it("compiles a goal into a reusable predicate", () => {
    const goal: AssessmentGoal = {
      kind: "dependency",
      targetId: "intersection",
      sourceId: "A",
      transitive: false,
    };

    expect(predicateForGoal(goal)(context)).toMatchObject({
      passed: false,
      code: "dependency:direct",
    });
  });
});
