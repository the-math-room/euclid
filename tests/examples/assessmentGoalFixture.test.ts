import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { evaluateGoal, parseAssessmentGoal } from "@euclid/assessment";
import { evaluateConstruction, type ConstructionProgram } from "@euclid/geometry";

describe("assessment goal examples", () => {
  it("parses and evaluates the line intersection goal fixture", () => {
    const goalText = readFileSync(
      resolve(process.cwd(), "examples/assessment-goals/line-intersection-goal.json"),
      "utf8",
    );
    const parsed = parseAssessmentGoal(goalText);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

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

    const result = evaluateGoal(
      {
        program,
        evaluation: evaluateConstruction(program),
      },
      parsed.goal,
    );

    expect(result).toMatchObject({
      passed: true,
      code: "construct-line-intersection",
    });
  });
});
