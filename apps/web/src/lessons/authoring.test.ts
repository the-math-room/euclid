import { describe, expect, it } from "vitest";
import { compileEuclidLesson, autoDetectStartersAndGoals } from "./authoring";
import type { ConstructionProgram } from "@euclid/geometry";
import { parseEuclidLesson } from "@euclid/lesson";

describe("compileEuclidLesson", () => {
  it("compiles a valid EuclidLesson that passes lesson validation", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
        { id: "B", kind: "free-point", label: "B", position: { x: 1, y: 1 } },
        { id: "line-ab", kind: "line-through", label: "AB", points: ["A", "B"] },
      ],
    };

    const lesson = compileEuclidLesson({
      id: "test-compile",
      title: "Test Compile",
      description: "Draw a line through A and B",
      program,
      lockedIds: new Set(["A", "B"]),
      goalIds: new Set(["line-ab"]),
      allowedTools: ["select", "point", "line"],
      pointDrag: "free-points",
      shapeDrag: "none",
    });

    expect(lesson.id).toBe("test-compile");
    expect(lesson.document.program.constructions).toHaveLength(2); // A, B
    expect(lesson.policy.lockedConstructions).toEqual(["A", "B"]);
    expect(lesson.goals).toHaveLength(1);
    expect(lesson.goals[0]).toEqual({
      kind: "meaning",
      id: "line-ab",
      description: "Construct line-through AB",
      expression: {
        kind: "line-through",
        points: ["A", "B"],
      },
    });

    // Verify roundtrip validation passes
    const validated = parseEuclidLesson(JSON.stringify(lesson));
    expect(validated.ok).toBe(true);
  });
});

describe("autoDetectStartersAndGoals", () => {
  it("auto-detects free points as locked and terminal nodes as goals", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
        { id: "B", kind: "free-point", label: "B", position: { x: 2, y: 2 } },
        { id: "line-ab", kind: "line-through", label: "AB", points: ["A", "B"] },
        { id: "C", kind: "free-point", label: "C", position: { x: 4, y: 4 } },
        { id: "perp", kind: "perpendicular-line", label: "perp", line: "line-ab", point: "C" },
      ],
    };

    const { lockedIds, goalIds } = autoDetectStartersAndGoals(program);

    // Free points (A, B, C) should be starters (lockedIds)
    expect(lockedIds).toEqual(new Set(["A", "B", "C"]));

    // Terminal leaf nodes (perp) should be goals (goalIds)
    // Note: line-ab is NOT a terminal node since perp depends on it.
    expect(goalIds).toEqual(new Set(["perp"]));
  });
});
