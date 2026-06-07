import { describe, expect, it } from "vitest";
import { openActivityPolicy } from "@euclid/activity";
import { lessons } from "./lessons";

describe("lesson examples", () => {
  it("allows deleting user-created work while locking line-intersection starter points", () => {
    const lineIntersection = lessons.find((lesson) => lesson.id === "line-intersection");

    expect(lineIntersection?.policy.lockedConstructions).toEqual(["A", "B", "C", "D"]);
    expect(lineIntersection?.policy.allowDelete).toBe(true);
  });

  it("keeps Free Draw as an unassessed open-tool lesson", () => {
    const freeDraw = lessons.find((lesson) => lesson.title.includes("Free Draw"));

    expect(freeDraw).toBeDefined();
    expect(freeDraw?.goals).toEqual([]);
    expect(freeDraw?.policy).toBe(openActivityPolicy);
    expect(freeDraw?.policy.allowedTools).toEqual(openActivityPolicy.allowedTools);
  });
});
