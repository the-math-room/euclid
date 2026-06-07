import { describe, expect, it } from "vitest";
import {
  addCircleCircleIntersection,
  addCircleThroughPoints,
  addLineThroughPoints,
  evaluateConstruction,
  type ConstructionProgram,
} from "@euclid/geometry";
import { evaluateGoal, mapGoalIds, resolveGoalMapping, type AssessmentGoal } from "@euclid/assessment";
import { lessons } from "./lessons";

describe("assessmentResolver", () => {
  it("resolves user-drawn dynamic IDs to static curriculum IDs", () => {
    // 1. Define starter program (e.g. 4 points)
    const starterProgram: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
        { id: "B", kind: "free-point", label: "B", position: { x: 2, y: 0 } },
        { id: "C", kind: "free-point", label: "C", position: { x: 1, y: 1 } },
        { id: "D", kind: "free-point", label: "D", position: { x: 1, y: -1 } },
      ],
    };

    // 2. Define curriculum static goals
    const goals: readonly AssessmentGoal[] = [
      {
        kind: "meaning",
        id: "line-ab",
        expression: {
          kind: "line-through",
          points: ["A", "B"],
        },
      },
      {
        kind: "meaning",
        id: "line-cd",
        expression: {
          kind: "line-through",
          points: ["C", "D"],
        },
      },
      {
        kind: "meaning",
        id: "intersection",
        expression: {
          kind: "line-line-intersection",
          lines: ["line-ab", "line-cd"],
        },
      },
    ];

    // 3. User constructs line AB (drawn as line-a-b), line CD (drawn as line-c-d), and intersection (drawn dynamically)
    const userProgram: ConstructionProgram = {
      constructions: [
        ...starterProgram.constructions,
        { id: "line-a-b", kind: "line-through", label: "AB", points: ["A", "B"] },
        { id: "line-c-d", kind: "line-through", label: "CD", points: ["C", "D"] },
        {
          id: "intersection-line-a-b-line-c-d",
          kind: "line-line-intersection",
          label: "X",
          lines: ["line-a-b", "line-c-d"],
        },
      ],
    };

    const evaluation = evaluateConstruction(userProgram);

    // 4. Run mapping resolver
    const mapping = resolveGoalMapping(evaluation, goals, starterProgram);

    // Verify mapping has correct mappings
    expect(mapping.get("A")).toBe("A");
    expect(mapping.get("B")).toBe("B");
    expect(mapping.get("C")).toBe("C");
    expect(mapping.get("D")).toBe("D");
    expect(mapping.get("line-ab")).toBe("line-a-b");
    expect(mapping.get("line-cd")).toBe("line-c-d");
    expect(mapping.get("intersection")).toBe("intersection-line-a-b-line-c-d");

    // Verify mapping goal IDs translates correctly
    const mappedG3 = mapGoalIds(goals[2], mapping);
    expect(mappedG3).toEqual({
      kind: "meaning",
      id: "intersection-line-a-b-line-c-d",
      expression: {
        kind: "line-line-intersection",
        lines: ["line-a-b", "line-c-d"],
      },
    });
  });

  it("resolves nested goals correctly", () => {
    const starterProgram: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
        { id: "B", kind: "free-point", label: "B", position: { x: 2, y: 0 } },
      ],
    };

    const goals: readonly AssessmentGoal[] = [
      {
        kind: "all",
        goals: [
          {
            kind: "meaning",
            id: "line-ab",
            expression: {
              kind: "line-through",
              points: ["A", "B"],
            },
          },
        ],
      },
    ];

    const userProgram: ConstructionProgram = {
      constructions: [
        ...starterProgram.constructions,
        { id: "line-a-b", kind: "line-through", label: "AB", points: ["A", "B"] },
      ],
    };

    const evaluation = evaluateConstruction(userProgram);
    const mapping = resolveGoalMapping(evaluation, goals, starterProgram);

    expect(mapping.get("line-ab")).toBe("line-a-b");
  });

  it("accepts a user-drawn line with reversed endpoint order for curriculum line goals", () => {
    const starterProgram: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
        { id: "B", kind: "free-point", label: "B", position: { x: 2, y: 0 } },
      ],
    };
    const goals: readonly AssessmentGoal[] = [
      {
        kind: "meaning",
        id: "line-ab",
        expression: {
          kind: "line-through",
          points: ["A", "B"],
        },
      },
    ];
    const userProgram: ConstructionProgram = {
      constructions: [
        ...starterProgram.constructions,
        { id: "line-b-a", kind: "line-through", label: "BA", points: ["B", "A"] },
      ],
    };

    const evaluation = evaluateConstruction(userProgram);
    const mapping = resolveGoalMapping(evaluation, goals, starterProgram);
    const mappedGoal = mapGoalIds(goals[0], mapping);
    const result = evaluateGoal({ program: userProgram, evaluation }, mappedGoal);

    expect(mapping.get("line-ab")).toBe("line-b-a");
    expect(result.passed).toBe(true);
  });

  it("evaluates Lesson 2 (Perpendicular Bisector) with solutions and non-solutions", () => {
    const lesson = lessons[1];
    expect(lesson.title).toContain("Perpendicular Bisector");

    // 1. Starter / non-solution (empty/incomplete)
    {
      const evaluation = evaluateConstruction(lesson.document.program);
      const mapping = resolveGoalMapping(evaluation, lesson.goals, lesson.document.program);
      const results = lesson.goals.map((g) => {
        const context = {
          program: lesson.document.program,
          evaluation,
          starterProgram: lesson.document.program,
        };
        return evaluateGoal(context, mapGoalIds(g, mapping));
      });
      // All goals should be false
      expect(results.every((r) => !r.passed)).toBe(true);
    }

    // 2. Successful solution (with dynamically generated/custom IDs)
    {
      const solutionProgram: ConstructionProgram = {
        constructions: [
          ...lesson.document.program.constructions,
          // circle centered at A through B
          {
            id: "user-circle-a",
            kind: "circle-through",
            label: "Circle A",
            center: "A",
            pointOnCircle: "B",
          },
          // circle centered at B through A
          {
            id: "user-circle-b",
            kind: "circle-through",
            label: "Circle B",
            center: "B",
            pointOnCircle: "A",
          },
          // intersection 0
          {
            id: "user-int-0",
            kind: "circle-circle-intersection",
            label: "C",
            firstCircle: "user-circle-a",
            secondCircle: "user-circle-b",
            intersectionIndex: 0,
          },
          // intersection 1
          {
            id: "user-int-1",
            kind: "circle-circle-intersection",
            label: "D",
            firstCircle: "user-circle-a",
            secondCircle: "user-circle-b",
            intersectionIndex: 1,
          },
          // perpendicular bisector line
          {
            id: "user-bisector-line",
            kind: "line-through",
            label: "CD",
            points: ["user-int-0", "user-int-1"],
          },
        ],
      };

      const evaluation = evaluateConstruction(solutionProgram);
      const mapping = resolveGoalMapping(evaluation, lesson.goals, lesson.document.program);

      const results = lesson.goals.map((g) => {
        const context = {
          program: solutionProgram,
          evaluation,
          starterProgram: lesson.document.program,
        };
        return evaluateGoal(context, mapGoalIds(g, mapping));
      });

      // All goals should now pass successfully!
      expect(results.every((r) => r.passed)).toBe(true);
    }

    // 3. Non-solution / partially complete (only drawn circles, but centers/points are wrong)
    {
      const wrongProgram: ConstructionProgram = {
        constructions: [
          ...lesson.document.program.constructions,
          // circle centered at A through A (invalid radius/degenerate, but let's say center A through some random coords)
          // Let's create a new point first
          {
            id: "C",
            kind: "free-point",
            label: "C",
            position: { x: 5, y: 5 },
          },
          {
            id: "user-circle-wrong",
            kind: "circle-through",
            label: "Circle A",
            center: "A",
            pointOnCircle: "C",
          },
        ],
      };

      const evaluation = evaluateConstruction(wrongProgram);
      const mapping = resolveGoalMapping(evaluation, lesson.goals, lesson.document.program);

      const results = lesson.goals.map((g) => {
        const context = {
          program: wrongProgram,
          evaluation,
          starterProgram: lesson.document.program,
        };
        return evaluateGoal(context, mapGoalIds(g, mapping));
      });

      // No goals should pass
      expect(results.every((r) => !r.passed)).toBe(true);
    }
  });

  it("evaluates the served perpendicular-bisector lesson using point-tool intersections", () => {
    const lesson = lessons.find((candidate) => candidate.id === "perpendicular-bisector");
    expect(lesson).toBeDefined();
    if (!lesson) {
      return;
    }

    expect(lesson.policy.allowedTools).toContain("point");

    const circleA = addCircleThroughPoints(lesson.document.program, "A", "B");
    expect(circleA.id).toBeDefined();
    const circleB = addCircleThroughPoints(circleA.program, "B", "A");
    expect(circleB.id).toBeDefined();
    if (!circleA.id || !circleB.id) {
      return;
    }

    const intersection0 = addCircleCircleIntersection(circleB.program, circleA.id, circleB.id, 0);
    expect(intersection0.id).toBeDefined();
    const intersection1 = addCircleCircleIntersection(intersection0.program, circleA.id, circleB.id, 1);
    expect(intersection1.id).toBeDefined();
    if (!intersection0.id || !intersection1.id) {
      return;
    }

    const bisector = addLineThroughPoints(intersection1.program, [intersection0.id, intersection1.id]);
    const evaluation = evaluateConstruction(bisector.program);
    const mapping = resolveGoalMapping(evaluation, lesson.goals, lesson.document.program);
    const results = lesson.goals.map((goal) =>
      evaluateGoal(
        {
          program: bisector.program,
          evaluation,
          starterProgram: lesson.document.program,
        },
        mapGoalIds(goal, mapping),
      ),
    );

    expect(bisector.id).toBeDefined();
    expect(results.every((result) => result.passed)).toBe(true);
  });
});
