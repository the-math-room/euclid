import { describe, expect, it } from "vitest";
import { parseAssessmentGoal, serializeAssessmentGoal } from "./goalCodec";
import type { AssessmentGoal } from "./goals";

describe("assessment goal codec", () => {
  it("round-trips valid serializable goals", () => {
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
          transitive: true,
        },
        {
          kind: "point-on-line",
          pointId: "intersection",
          lineId: "line-ab",
          tolerance: {
            epsilon: 0.001,
          },
        },
      ],
    };

    expect(parseAssessmentGoal(serializeAssessmentGoal(goal))).toEqual({
      ok: true,
      goal,
    });
  });

  it("rejects invalid JSON", () => {
    expect(parseAssessmentGoal("{")).toEqual({
      ok: false,
      diagnostics: ["Assessment goal is not valid JSON."],
    });
  });

  it("rejects unsupported goal kinds", () => {
    expect(parseAssessmentGoal(JSON.stringify({ kind: "near-pixel" }))).toEqual({
      ok: false,
      diagnostics: ["goal.kind is not a supported assessment goal kind."],
    });
  });

  it("rejects invalid nested goals with path diagnostics", () => {
    expect(
      parseAssessmentGoal(
        JSON.stringify({
          kind: "all",
          goals: [
            {
              kind: "dependency",
              targetId: "intersection",
              sourceId: 123,
            },
          ],
        }),
      ),
    ).toEqual({
      ok: false,
      diagnostics: ["goal.goals[0].sourceId must be a string."],
    });
  });

  it("rejects malformed construction expressions", () => {
    expect(
      parseAssessmentGoal(
        JSON.stringify({
          kind: "meaning",
          id: "intersection",
          expression: {
            kind: "line-line-intersection",
            lines: ["line-ab"],
          },
        }),
      ),
    ).toEqual({
      ok: false,
      diagnostics: ["goal.expression.lines must be an array of 2 strings."],
    });
  });

  it("rejects invalid incidence tolerance", () => {
    expect(
      parseAssessmentGoal(
        JSON.stringify({
          kind: "point-on-circle",
          pointId: "P",
          circleId: "circle",
          tolerance: {
            epsilon: -1,
          },
        }),
      ),
    ).toEqual({
      ok: false,
      diagnostics: ["goal.tolerance.epsilon must be a non-negative finite number."],
    });
  });
});
