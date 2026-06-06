import { describe, expect, it } from "vitest";
import { evaluateConstruction, type ConstructionProgram } from "@euclid/geometry";
import type { AssessmentGoal } from "@euclid/assessment";
import { resolveGoalMapping, mapGoalIds } from "./assessmentResolver";

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
});
