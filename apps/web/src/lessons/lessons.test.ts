import { describe, expect, it } from "vitest";
import { openActivityPolicy } from "@euclid/activity";
import { lessons } from "./lessons";

describe("lesson examples", () => {
  it("allows deleting user-created work while locking line-intersection starter points", () => {
    const lineIntersection = lessons.find((lesson) => lesson.id === "line-intersection");

    expect(lineIntersection?.policy.lockedConstructions).toEqual(["A", "B", "C", "D"]);
    expect(lineIntersection?.policy.allowDelete).toBe(true);
  });

  it("serves perpendicular bisector with segment AB initialized and locked", () => {
    const perpendicularBisector = lessons.find((lesson) => lesson.id === "perpendicular-bisector");

    expect(perpendicularBisector?.document.program.constructions).toContainEqual({
      id: "line-ab",
      kind: "line-through",
      label: "AB",
      points: ["A", "B"],
    });
    expect(perpendicularBisector?.policy.lockedConstructions).toContain("line-ab");
  });

  it("keeps Free Draw as an unassessed open-tool lesson", () => {
    const freeDraw = lessons.find((lesson) => lesson.title.includes("Free Draw"));

    expect(freeDraw).toBeDefined();
    expect(freeDraw?.goals).toEqual([]);
    expect(freeDraw?.policy).toBe(openActivityPolicy);
    expect(freeDraw?.policy.allowedTools).toEqual(openActivityPolicy.allowedTools);
  });
});
