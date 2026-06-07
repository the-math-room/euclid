import { describe, expect, it } from "vitest";
import { evaluateConstruction } from "./evaluate";
import { toWorldPoint, type ConstructionProgram } from "./model";

const program: ConstructionProgram = {
  constructions: [
    {
      id: "A",
      kind: "free-point",
      label: "A",
      position: toWorldPoint({ x: 0, y: 0 }),
    },
    {
      id: "B",
      kind: "free-point",
      label: "B",
      position: toWorldPoint({ x: 1, y: 0 }),
    },
    {
      id: "line-ab",
      kind: "line-through",
      label: "AB",
      points: ["A", "B"],
    },
  ],
};

describe("geometry architecture", () => {
  it("keeps construction programs as serializable plain data", () => {
    const serialized = JSON.stringify(program);
    const parsed = JSON.parse(serialized) as ConstructionProgram;

    expect(parsed).toEqual(program);
  });

  it("evaluates deterministically", () => {
    const first = evaluateConstruction(program);
    const second = evaluateConstruction(program);

    expect(second).toEqual(first);
  });

  it("does not mutate the input construction program", () => {
    const unorderedProgram: ConstructionProgram = {
      constructions: [
        {
          id: "line-ab",
          kind: "line-through",
          label: "AB",
          points: ["A", "B"],
        },
        {
          id: "A",
          kind: "free-point",
          label: "A",
          position: toWorldPoint({ x: 0, y: 0 }),
        },
        {
          id: "B",
          kind: "free-point",
          label: "B",
          position: toWorldPoint({ x: 1, y: 0 }),
        },
      ],
    };
    const before = JSON.stringify(unorderedProgram);

    evaluateConstruction(unorderedProgram);

    expect(JSON.stringify(unorderedProgram)).toBe(before);
  });
});
