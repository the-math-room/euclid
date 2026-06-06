# Headless Kernel Example

This example shows the SDK story without React, SVG, Canvas, or browser APIs.

It uses:

- `@euclid/geometry` to evaluate and explain a construction program.
- `@euclid/assessment` to parse and evaluate a curriculum-authored goal.

## Program

```ts
import { evaluateConstruction, explainConstruction, type ConstructionProgram } from "@euclid/geometry";

const program: ConstructionProgram = {
  constructions: [
    { id: "A", kind: "free-point", label: "A", position: { x: 0, y: 0 } },
    { id: "B", kind: "free-point", label: "B", position: { x: 2, y: 0 } },
    { id: "C", kind: "free-point", label: "C", position: { x: 1, y: 1 } },
    { id: "D", kind: "free-point", label: "D", position: { x: 1, y: -1 } },
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

console.log(evaluation.diagnostics);
console.log(explanation?.realized);
console.log(explanation?.parents);
```

## Assessment Goal

Curriculum content can store a goal as JSON-like data:

```ts
import { evaluateGoal, parseAssessmentGoal } from "@euclid/assessment";

const parsed = parseAssessmentGoal(goalJsonText);

if (!parsed.ok) {
  throw new Error(parsed.diagnostics.join("\n"));
}

const result = evaluateGoal(
  {
    program,
    evaluation,
  },
  parsed.goal,
);

console.log(result.passed);
console.log(result.evidence);
```

See [`../assessment-goals/line-intersection-goal.json`](../assessment-goals/line-intersection-goal.json) for the goal fixture used by tests.
