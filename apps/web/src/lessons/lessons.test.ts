import { describe, expect, it } from "vitest";
import { openActivityPolicy } from "@euclid/activity";
import { lessons } from "./lessons";

describe("lesson examples", () => {
  it("keeps Free Draw as an unassessed open-tool lesson", () => {
    const freeDraw = lessons.find((lesson) => lesson.title.includes("Free Draw"));

    expect(freeDraw).toBeDefined();
    expect(freeDraw?.goals).toEqual([]);
    expect(freeDraw?.policy).toBe(openActivityPolicy);
    expect(freeDraw?.policy.allowedTools).toEqual(openActivityPolicy.allowedTools);
  });
});
