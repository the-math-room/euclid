import { describe, expect, it } from "vitest";
import {
  evaluateConstruction,
  toWorldPoint,
  type Construction,
  type ConstructionProgram,
} from "@euclid/geometry";
import { evaluateGoal, predicateForGoal, type AssessmentGoal } from "./goals";

describe("assessment goals", () => {
  const program: ConstructionProgram = {
    constructions: [
      { id: "A", kind: "free-point", label: "A", position: toWorldPoint({ x: 0, y: 0 }) },
      { id: "B", kind: "free-point", label: "B", position: toWorldPoint({ x: 2, y: 0 }) },
      { id: "C", kind: "free-point", label: "C", position: toWorldPoint({ x: 1, y: 1 }) },
      { id: "D", kind: "free-point", label: "D", position: toWorldPoint({ x: 1, y: -1 }) },
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

  describe("geometric-equivalent goals", () => {
    const starterProgram: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: toWorldPoint({ x: -2.0, y: 0.0 }) },
        { id: "B", kind: "free-point", label: "B", position: toWorldPoint({ x: 2.0, y: 0.0 }) },
        { id: "line-ab", kind: "line-through", label: "AB", points: ["A", "B"] },
      ],
    };

    const targetConstructions: readonly Construction[] = [
      { id: "target-mid", kind: "midpoint", label: "M", points: ["A", "B"] },
      {
        id: "target-bisector",
        kind: "perpendicular-line",
        label: "Perp",
        line: "line-ab",
        point: "target-mid",
      },
    ];

    const goal: AssessmentGoal = {
      kind: "geometric-equivalent",
      targetConstructions,
      targetId: "target-bisector",
    };

    it("passes when user constructs it using the exact same midpoint + perp tools", () => {
      const userProgram: ConstructionProgram = {
        constructions: [
          ...starterProgram.constructions,
          { id: "user-mid", kind: "midpoint", label: "M", points: ["A", "B"] },
          {
            id: "user-bisector",
            kind: "perpendicular-line",
            label: "Perp",
            line: "line-ab",
            point: "user-mid",
          },
        ],
      };
      const userCtx = {
        program: userProgram,
        evaluation: evaluateConstruction(userProgram),
        starterProgram,
      };
      const result = evaluateGoal(userCtx, goal);
      expect(result.passed).toBe(true);
    });

    it("passes when user constructs it using the circles intersection method (alternative path & labels)", () => {
      const userProgram: ConstructionProgram = {
        constructions: [
          ...starterProgram.constructions,
          { id: "circ-a-b", kind: "circle-through", label: "CircA", center: "A", pointOnCircle: "B" },
          { id: "circ-b-a", kind: "circle-through", label: "CircB", center: "B", pointOnCircle: "A" },
          {
            id: "c0",
            kind: "circle-circle-intersection",
            label: "C0",
            firstCircle: "circ-a-b",
            secondCircle: "circ-b-a",
            intersectionIndex: 0,
          },
          {
            id: "c1",
            kind: "circle-circle-intersection",
            label: "C1",
            firstCircle: "circ-a-b",
            secondCircle: "circ-b-a",
            intersectionIndex: 1,
          },
          { id: "user-bisector-circles", kind: "line-through", label: "Bisector", points: ["c0", "c1"] },
        ],
      };
      const userCtx = {
        program: userProgram,
        evaluation: evaluateConstruction(userProgram),
        starterProgram,
      };
      const result = evaluateGoal(userCtx, goal);
      expect(result.passed).toBe(true);
    });

    it("fails when user constructs an incorrect perpendicular line (not bisecting)", () => {
      const userProgram: ConstructionProgram = {
        constructions: [
          ...starterProgram.constructions,
          {
            id: "user-bisector-wrong",
            kind: "perpendicular-line",
            label: "WrongPerp",
            line: "line-ab",
            point: "A",
          },
        ],
      };
      const userCtx = {
        program: userProgram,
        evaluation: evaluateConstruction(userProgram),
        starterProgram,
      };
      const result = evaluateGoal(userCtx, goal);
      expect(result.passed).toBe(false);
    });
  });
});
