import { describe, expect, it } from "vitest";
import {
  evaluateLinearMeasurementExpression,
  parseLinearMeasurementExpression,
  variablesInMeasurementExpressions,
} from "./measurement";
import { toWorldPoint, type ConstructionProgram } from "./model";

describe("measurement expressions", () => {
  it("parses finite numeric measurements", () => {
    expect(parseLinearMeasurementExpression(3.5)).toEqual({
      coefficient: 0,
      constant: 3.5,
    });
    expect(parseLinearMeasurementExpression(Number.NaN)).toBeUndefined();
  });

  it("parses one-variable linear expressions", () => {
    expect(parseLinearMeasurementExpression("x + 3")).toEqual({
      variable: "x",
      coefficient: 1,
      constant: 3,
    });
    expect(parseLinearMeasurementExpression("2x - 1")).toEqual({
      variable: "x",
      coefficient: 2,
      constant: -1,
    });
    expect(parseLinearMeasurementExpression("x/2 + 4")).toEqual({
      variable: "x",
      coefficient: 0.5,
      constant: 4,
    });
  });

  it("rejects non-linear or multi-variable expressions", () => {
    expect(parseLinearMeasurementExpression("x + y")).toBeUndefined();
    expect(parseLinearMeasurementExpression("x^2")).toBeUndefined();
    expect(parseLinearMeasurementExpression("")).toBeUndefined();
  });

  it("evaluates parsed linear expressions", () => {
    const expression = parseLinearMeasurementExpression("2x - 1");

    expect(expression).toBeDefined();
    if (expression) {
      expect(evaluateLinearMeasurementExpression(expression, 4)).toBe(7);
    }
  });

  it("collects variables from measurement expressions", () => {
    expect(variablesInMeasurementExpressions(["x + 1", 2, "3y - 4"])).toEqual(["x", "y"]);
  });

  it("lets construction programs carry authored segment length assertions", () => {
    const program: ConstructionProgram = {
      constructions: [
        { id: "A", kind: "free-point", label: "A", position: toWorldPoint({ x: 0, y: 0 }) },
        { id: "B", kind: "free-point", label: "B", position: toWorldPoint({ x: 4, y: 0 }) },
        { id: "M", kind: "midpoint", label: "M", points: ["A", "B"] },
      ],
      measurements: [
        { id: "length-am", kind: "segment-length", from: "A", to: "M", length: "x + 3" },
        { id: "length-mb", kind: "segment-length", from: "M", to: "B", length: "2x - 1" },
      ],
    };

    expect(program.measurements?.map((measurement) => measurement.length)).toEqual(["x + 3", "2x - 1"]);
  });
});
