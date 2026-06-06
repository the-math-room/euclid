import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { evaluateGoal } from "@euclid/assessment";
import { evaluateConstruction, type ConstructionProgram } from "@euclid/geometry";
import { parseEuclidLesson } from "@euclid/lesson";

describe("lesson examples", () => {
  it("parses and evaluates the basic line intersection lesson fixture", () => {
    const lessonText = readFileSync(
      resolve(process.cwd(), "examples/lessons/basic-line-intersection.lesson.json"),
      "utf8",
    );
    const parsed = parseEuclidLesson(lessonText);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.lesson.policy).toMatchObject({
      allowedTools: ["select", "line"],
      lockedConstructions: ["A", "B", "C", "D"],
      allowDelete: false,
      pointDrag: "none",
      shapeDrag: "none",
    });

    const starterEvaluation = evaluateConstruction(parsed.lesson.document.program);
    const starterResult = evaluateGoal(
      {
        program: parsed.lesson.document.program,
        evaluation: starterEvaluation,
      },
      parsed.lesson.goals[0],
    );

    expect(starterResult.passed).toBe(false);

    const completedProgram: ConstructionProgram = {
      constructions: [
        ...parsed.lesson.document.program.constructions,
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
    const completedEvaluation = evaluateConstruction(completedProgram);
    const completedResult = evaluateGoal(
      {
        program: completedProgram,
        evaluation: completedEvaluation,
      },
      parsed.lesson.goals[0],
    );

    expect(completedEvaluation.diagnostics).toEqual([]);
    expect(completedResult).toMatchObject({
      passed: true,
      code: "construct-line-intersection",
    });
  });
});
