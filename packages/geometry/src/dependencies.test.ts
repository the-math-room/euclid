import { describe, expect, it } from "vitest";
import { toWorldPoint, type Construction } from "./model";
import { transitiveDependentsOf, deleteConstructions } from "./dependencies";

const mockConstructions: readonly Construction[] = [
  { id: "A", kind: "free-point", label: "A", position: toWorldPoint({ x: 0, y: 0 }) },
  { id: "B", kind: "free-point", label: "B", position: toWorldPoint({ x: 1, y: 0 }) },
  { id: "C", kind: "free-point", label: "C", position: toWorldPoint({ x: 0, y: 1 }) },
  { id: "AB", kind: "line-through", label: "AB", points: ["A", "B"] },
  { id: "circleAB", kind: "circle-through", label: "circle(A,B)", center: "A", pointOnCircle: "B" },
  { id: "circleBC", kind: "circle-through", label: "circle(B,C)", center: "B", pointOnCircle: "C" },
  { id: "circleABC", kind: "circle-three-points", label: "circle(A,B,C)", points: ["A", "B", "C"] },
];

describe("transitiveDependentsOf", () => {
  it("returns empty set if there are no dependents", () => {
    expect(transitiveDependentsOf(mockConstructions, new Set(["circleBC", "circleABC"]))).toEqual(new Set());
  });

  it("identifies direct dependents", () => {
    expect(transitiveDependentsOf(mockConstructions, new Set(["C"]))).toEqual(
      new Set(["circleBC", "circleABC"]),
    );
  });

  it("identifies direct and transitive dependents", () => {
    expect(transitiveDependentsOf(mockConstructions, new Set(["B"]))).toEqual(
      new Set(["AB", "circleAB", "circleBC", "circleABC"]),
    );
  });

  it("cascades through multiple levels", () => {
    // If we have a dependency chain A -> B -> C:
    const chainConstructions: readonly Construction[] = [
      { id: "A", kind: "free-point", label: "A", position: toWorldPoint({ x: 0, y: 0 }) },
      { id: "B", kind: "circle-through", label: "B", center: "A", pointOnCircle: "A" },
      { id: "C", kind: "circle-through", label: "C", center: "B", pointOnCircle: "B" },
    ];
    expect(transitiveDependentsOf(chainConstructions, new Set(["A"]))).toEqual(new Set(["B", "C"]));
  });
});

describe("deleteConstructions", () => {
  it("deletes target construction and all of its transitive dependents", () => {
    const result = deleteConstructions(mockConstructions, new Set(["C"]));
    // only C and circleBC should be deleted
    expect(result.map((c) => c.id)).toEqual(["A", "B", "AB", "circleAB"]);
  });

  it("deletes multiple target constructions and their combined transitive dependents", () => {
    const result = deleteConstructions(mockConstructions, new Set(["A", "C"]));
    // A, C, AB, circleAB, circleBC should be deleted
    expect(result.map((c) => c.id)).toEqual(["B"]);
  });

  it("leaves unrelated constructions unaffected", () => {
    const result = deleteConstructions(mockConstructions, new Set(["circleAB"]));
    expect(result.map((c) => c.id)).toEqual(["A", "B", "C", "AB", "circleBC", "circleABC"]);
  });
});
