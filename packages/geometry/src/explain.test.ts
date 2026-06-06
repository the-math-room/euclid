import { describe, expect, it } from "vitest";
import { evaluateConstruction } from "./evaluate";
import { explainConstruction, traceDependencies, traceDependents } from "./explain";
import type { ConstructionProgram } from "./model";

describe("construction explanations", () => {
  it("explains a realized construction with parents, dependents, meaning, and primitive", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
        { id: "B", kind: "free-point", label: "B", position: { x: 2, y: 2 } },
        { id: "C", kind: "free-point", label: "C", position: { x: 0, y: 2 } },
        { id: "D", kind: "free-point", label: "D", position: { x: 2, y: 0 } },
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
    const evaluation = evaluateConstruction(program);

    const explanation = explainConstruction(program, evaluation, "intersection");

    expect(explanation).toMatchObject({
      id: "intersection",
      label: "X",
      kind: "line-line-intersection",
      parents: [
        { id: "line-ab", label: "AB", kind: "line-through" },
        { id: "line-cd", label: "CD", kind: "line-through" },
      ],
      dependents: [],
      realized: true,
      diagnostics: [],
      explanation: "X is the intersection of lines line-ab and line-cd.",
    });
    expect(explanation?.meaning).toEqual({
      id: "intersection",
      label: "X",
      expression: {
        kind: "line-line-intersection",
        lines: ["line-ab", "line-cd"],
      },
    });
    expect(explanation?.primitive).toEqual({
      id: "intersection",
      kind: "point",
      label: "X",
      position: { x: 1, y: 1 },
    });
  });

  it("explains a meaningful but currently unrealized construction", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
        { id: "B", kind: "free-point", label: "B", position: { x: 1, y: 0 } },
        { id: "C", kind: "free-point", label: "C", position: { x: 0, y: 1 } },
        { id: "D", kind: "free-point", label: "D", position: { x: 1, y: 1 } },
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
    const evaluation = evaluateConstruction(program);

    const explanation = explainConstruction(program, evaluation, "intersection");

    expect(explanation?.realized).toBe(false);
    expect(explanation?.meaning?.expression).toEqual({
      kind: "line-line-intersection",
      lines: ["line-ab", "line-cd"],
    });
    expect(explanation?.primitive).toBeUndefined();
    expect(explanation?.diagnostics).toEqual([
      {
        constructionId: "intersection",
        message: "Intersection X needs non-parallel line dependencies.",
      },
    ]);
  });

  it("explains graph-invalid constructions without meaning or realization", () => {
    const program: ConstructionProgram = {
      constructions: [
        {
          id: "line-ab",
          kind: "line-through",
          label: "AB",
          points: ["A", "B"],
        },
        { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
      ],
    };
    const evaluation = evaluateConstruction(program);

    const explanation = explainConstruction(program, evaluation, "line-ab");

    expect(explanation).toMatchObject({
      id: "line-ab",
      label: "AB",
      kind: "line-through",
      parents: [{ id: "A", label: "A", kind: "free-point" }],
      realized: false,
      explanation: "AB is the line through A and B.",
    });
    expect(explanation?.meaning).toBeUndefined();
    expect(explanation?.primitive).toBeUndefined();
    expect(explanation?.diagnostics).toEqual([
      {
        constructionId: "line-ab",
        message: "Construction AB depends on missing construction B.",
      },
    ]);
  });

  it("traces transitive dependencies and dependents", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
        { id: "B", kind: "free-point", label: "B", position: { x: 1, y: 0 } },
        { id: "C", kind: "free-point", label: "C", position: { x: 0, y: 1 } },
        { id: "D", kind: "free-point", label: "D", position: { x: 1, y: 1 } },
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

    expect(traceDependencies(program, "intersection").map((reference) => reference.id)).toEqual([
      "line-ab",
      "A",
      "B",
      "line-cd",
      "C",
      "D",
    ]);
    expect(traceDependents(program, "A").map((reference) => reference.id)).toEqual([
      "line-ab",
      "intersection",
    ]);
  });

  it("returns undefined when explaining an unknown construction", () => {
    const program: ConstructionProgram = { constructions: [] };

    expect(explainConstruction(program, evaluateConstruction(program), "missing")).toBeUndefined();
    expect(traceDependencies(program, "missing")).toEqual([]);
    expect(traceDependents(program, "missing")).toEqual([]);
  });
});
