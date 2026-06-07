import type { ActivityTool, DragPolicy } from "@euclid/activity";
import type { AssessmentGoal } from "@euclid/assessment";
import { evaluateConstruction, dependencyIds } from "@euclid/geometry";
import type { ConstructionId, ConstructionProgram } from "@euclid/geometry";
import type { EuclidLesson } from "@euclid/lesson";

/**
 * Compiles the active user program, selected locked items, and selected goals into
 * a standard, serialized EuclidLesson definition.
 */
export function compileEuclidLesson({
  id,
  title,
  description,
  program,
  lockedIds,
  goalIds,
  allowedTools,
  pointDrag,
  shapeDrag,
}: {
  id: string;
  title: string;
  description: string;
  program: ConstructionProgram;
  lockedIds: ReadonlySet<ConstructionId>;
  goalIds: ReadonlySet<ConstructionId>;
  allowedTools: readonly ActivityTool[];
  pointDrag: DragPolicy;
  shapeDrag: DragPolicy;
}): EuclidLesson {
  // 1. Starter constructions are those that are locked
  const starterConstructions = program.constructions.filter((c) => lockedIds.has(c.id));

  // 2. Evaluate the program to extract mathematical meanings/expressions
  const evaluation = evaluateConstruction(program);

  // 3. Compile the goals
  const goals: AssessmentGoal[] = [];
  for (const goalId of goalIds) {
    const construction = program.constructions.find((c) => c.id === goalId);
    if (!construction) continue;

    const meaning = evaluation.meanings.find((m) => m.id === goalId);
    if (!meaning) continue;

    goals.push({
      kind: "meaning",
      id: goalId,
      description: `Construct ${construction.kind === "free-point" ? "point" : construction.kind} ${
        construction.label ?? goalId
      }`,
      expression: meaning.expression,
    });
  }

  return {
    schemaVersion: 1,
    id,
    title,
    description: description.trim() || undefined,
    document: {
      schemaVersion: 1,
      title: `${title} starter`,
      program: {
        constructions: starterConstructions,
      },
    },
    policy: {
      allowedTools,
      lockedConstructions: Array.from(lockedIds),
      allowDelete: true,
      pointDrag,
      shapeDrag,
    },
    goals,
  };
}

/**
 * Auto-detects starter (locked) constructions and target goals based on
 * the dependency tree of the construction program.
 */
export function autoDetectStartersAndGoals(program: ConstructionProgram): {
  lockedIds: Set<ConstructionId>;
  goalIds: Set<ConstructionId>;
} {
  const lockedIds = new Set<ConstructionId>();
  const goalIds = new Set<ConstructionId>();

  // 1. Gather all inputs used in the program
  const allInputs = new Set<ConstructionId>();
  for (const c of program.constructions) {
    for (const depId of dependencyIds(c)) {
      allInputs.add(depId);
    }
  }

  // 2. Classify:
  // - Free points are always locked starters
  // - Any leaf node (not in allInputs) is a target goal
  for (const c of program.constructions) {
    if (c.kind === "free-point") {
      lockedIds.add(c.id);
    } else if (!allInputs.has(c.id)) {
      goalIds.add(c.id);
    }
  }

  return { lockedIds, goalIds };
}
