import { describe, expect, it } from "vitest";
import { readOnlyActivityPolicy } from "@euclid/activity";
import { seedDocument } from "@euclid/document";
import { parseEuclidLesson, serializeEuclidLesson } from "./codec";
import type { EuclidLesson } from "./model";

const lesson: EuclidLesson = {
  schemaVersion: 1,
  id: "construct-line",
  title: "Construct a line",
  document: seedDocument,
  policy: readOnlyActivityPolicy,
  goals: [
    {
      kind: "construction-kind",
      constructionKind: "line-through",
    },
  ],
};

describe("lesson codec", () => {
  it("round-trips a valid lesson", () => {
    const parsed = parseEuclidLesson(serializeEuclidLesson(lesson));

    expect(parsed).toEqual({
      ok: true,
      lesson,
    });
  });

  it("rejects invalid JSON", () => {
    expect(parseEuclidLesson("{")).toEqual({
      ok: false,
      diagnostics: ["Lesson is not valid JSON."],
    });
  });

  it("rejects unsupported schema versions", () => {
    expect(
      parseEuclidLesson(
        JSON.stringify({
          ...lesson,
          schemaVersion: 2,
        }),
      ),
    ).toEqual({
      ok: false,
      diagnostics: ["Lesson schemaVersion must be 1."],
    });
  });

  it("rejects missing lesson ids", () => {
    const { id: omittedId, ...lessonWithoutId } = lesson;

    expect(omittedId).toBe("construct-line");
    expect(parseEuclidLesson(JSON.stringify(lessonWithoutId))).toEqual({
      ok: false,
      diagnostics: ["Lesson id must be a string."],
    });
  });

  it("accepts every activity tool supported by the activity package", () => {
    const parsed = parseEuclidLesson(
      JSON.stringify({
        ...lesson,
        policy: {
          ...lesson.policy,
          allowedTools: ["select", "point", "line", "circle", "parallel", "perpendicular", "midpoint"],
        },
      }),
    );

    expect(parsed).toMatchObject({
      ok: true,
    });
  });

  it("rejects invalid activity policy tools", () => {
    expect(
      parseEuclidLesson(
        JSON.stringify({
          ...lesson,
          policy: {
            ...lesson.policy,
            allowedTools: ["select", "measure"],
          },
        }),
      ),
    ).toEqual({
      ok: false,
      diagnostics: ["Lesson policy.allowedTools[1] must be an activity tool."],
    });
  });

  it("rejects invalid nested assessment goals", () => {
    expect(
      parseEuclidLesson(
        JSON.stringify({
          ...lesson,
          goals: [
            {
              kind: "dependency",
              targetId: "line-ab",
            },
          ],
        }),
      ),
    ).toEqual({
      ok: false,
      diagnostics: ["Lesson goals[0]: goal.sourceId must be a string."],
    });
  });

  it("rejects invalid nested documents", () => {
    expect(
      parseEuclidLesson(
        JSON.stringify({
          ...lesson,
          document: {
            ...lesson.document,
            program: {},
          },
        }),
      ),
    ).toEqual({
      ok: false,
      diagnostics: ["Lesson document: Document program must contain a constructions array."],
    });
  });
});
