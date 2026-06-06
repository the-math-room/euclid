import type { ActivityPolicy, ActivityTool, DragPolicy } from "@euclid/activity";
import type { AssessmentGoal } from "@euclid/assessment";
import { parseAssessmentGoal } from "@euclid/assessment";
import type { EuclidDocument } from "@euclid/document";
import { parseEuclidDocument } from "@euclid/document";
import type { EuclidLesson } from "./model";

export type LessonParseResult =
  | Readonly<{
      ok: true;
      lesson: EuclidLesson;
    }>
  | Readonly<{
      ok: false;
      diagnostics: readonly string[];
    }>;

export function serializeEuclidLesson(lesson: EuclidLesson): string {
  return JSON.stringify(lesson, null, 2);
}

export function parseEuclidLesson(text: string): LessonParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return invalid("Lesson is not valid JSON.");
  }

  return decodeEuclidLesson(parsed);
}

function decodeEuclidLesson(value: unknown): LessonParseResult {
  if (!isRecord(value)) {
    return invalid("Lesson must be a JSON object.");
  }

  if (value.schemaVersion !== 1) {
    return invalid("Lesson schemaVersion must be 1.");
  }

  if (typeof value.title !== "string") {
    return invalid("Lesson title must be a string.");
  }

  let description: string | undefined = undefined;
  if (value.description !== undefined) {
    if (typeof value.description !== "string") {
      return invalid("Lesson description must be a string.");
    }
    description = value.description;
  }

  const starter = decodeStarterDocument(value.document);
  if (!starter.ok) {
    return invalid(...starter.diagnostics);
  }

  const policy = decodeActivityPolicy(value.policy);
  if (!policy.ok) {
    return invalid(policy.diagnostic);
  }

  const goals = decodeAssessmentGoals(value.goals);
  if (!goals.ok) {
    return invalid(...goals.diagnostics);
  }

  return {
    ok: true,
    lesson: {
      schemaVersion: 1,
      title: value.title,
      description,
      document: starter.starterDocument,
      policy: policy.policy,
      goals: goals.goals,
    },
  };
}

type DocumentDecodeResult =
  | Readonly<{
      ok: true;
      starterDocument: EuclidDocument;
    }>
  | Readonly<{
      ok: false;
      diagnostics: readonly string[];
    }>;

function decodeStarterDocument(value: unknown): DocumentDecodeResult {
  const parsed = parseEuclidDocument(JSON.stringify(value));

  return parsed.ok
    ? {
        ok: true,
        starterDocument: parsed.document,
      }
    : {
        ok: false,
        diagnostics: parsed.diagnostics.map((diagnostic) => `Lesson document: ${diagnostic}`),
      };
}

type PolicyDecodeResult =
  | Readonly<{
      ok: true;
      policy: ActivityPolicy;
    }>
  | Readonly<{
      ok: false;
      diagnostic: string;
    }>;

function decodeActivityPolicy(value: unknown): PolicyDecodeResult {
  if (!isRecord(value)) {
    return policyInvalid("Lesson policy must be a JSON object.");
  }

  const allowedTools = decodeActivityTools(value.allowedTools, "Lesson policy.allowedTools");
  if (!allowedTools.ok) {
    return policyInvalid(allowedTools.diagnostic);
  }

  const lockedConstructions = decodeStringArray(
    value.lockedConstructions,
    "Lesson policy.lockedConstructions",
  );
  if (!lockedConstructions.ok) {
    return policyInvalid(lockedConstructions.diagnostic);
  }

  if (typeof value.allowDelete !== "boolean") {
    return policyInvalid("Lesson policy.allowDelete must be a boolean.");
  }

  if (!isDragPolicy(value.pointDrag)) {
    return policyInvalid("Lesson policy.pointDrag must be a drag policy.");
  }

  if (!isDragPolicy(value.shapeDrag)) {
    return policyInvalid("Lesson policy.shapeDrag must be a drag policy.");
  }

  return {
    ok: true,
    policy: {
      allowedTools: allowedTools.tools,
      lockedConstructions: lockedConstructions.values,
      allowDelete: value.allowDelete,
      pointDrag: value.pointDrag,
      shapeDrag: value.shapeDrag,
    },
  };
}

type ActivityToolsDecodeResult =
  | Readonly<{
      ok: true;
      tools: readonly ActivityTool[];
    }>
  | Readonly<{
      ok: false;
      diagnostic: string;
    }>;

function decodeActivityTools(value: unknown, path: string): ActivityToolsDecodeResult {
  if (!Array.isArray(value)) {
    return activityToolsInvalid(`${path} must be an array.`);
  }

  const tools: ActivityTool[] = [];
  for (const [index, tool] of value.entries()) {
    if (!isActivityTool(tool)) {
      return activityToolsInvalid(`${path}[${index}] must be an activity tool.`);
    }
    tools.push(tool);
  }

  return {
    ok: true,
    tools,
  };
}

type StringArrayDecodeResult =
  | Readonly<{
      ok: true;
      values: readonly string[];
    }>
  | Readonly<{
      ok: false;
      diagnostic: string;
    }>;

function decodeStringArray(value: unknown, path: string): StringArrayDecodeResult {
  if (!Array.isArray(value)) {
    return stringArrayInvalid(`${path} must be an array.`);
  }

  const values: string[] = [];
  for (const [index, item] of value.entries()) {
    if (typeof item !== "string") {
      return stringArrayInvalid(`${path}[${index}] must be a string.`);
    }
    values.push(item);
  }

  return {
    ok: true,
    values,
  };
}

type GoalsDecodeResult =
  | Readonly<{
      ok: true;
      goals: readonly AssessmentGoal[];
    }>
  | Readonly<{
      ok: false;
      diagnostics: readonly string[];
    }>;

function decodeAssessmentGoals(value: unknown): GoalsDecodeResult {
  if (!Array.isArray(value)) {
    return goalsInvalid("Lesson goals must be an array.");
  }

  const goals: AssessmentGoal[] = [];
  for (const [index, goal] of value.entries()) {
    const parsed = parseAssessmentGoal(JSON.stringify(goal));
    if (!parsed.ok) {
      return goalsInvalid(...parsed.diagnostics.map((diagnostic) => `Lesson goals[${index}]: ${diagnostic}`));
    }
    goals.push(parsed.goal);
  }

  return {
    ok: true,
    goals,
  };
}

function isActivityTool(value: unknown): value is ActivityTool {
  return value === "select" || value === "point" || value === "line" || value === "circle";
}

function isDragPolicy(value: unknown): value is DragPolicy {
  return value === "none" || value === "free-points" || value === "all";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(...diagnostics: readonly string[]): LessonParseResult {
  return {
    ok: false,
    diagnostics,
  };
}

function policyInvalid(diagnostic: string): PolicyDecodeResult {
  return {
    ok: false,
    diagnostic,
  };
}

function activityToolsInvalid(diagnostic: string): ActivityToolsDecodeResult {
  return {
    ok: false,
    diagnostic,
  };
}

function stringArrayInvalid(diagnostic: string): StringArrayDecodeResult {
  return {
    ok: false,
    diagnostic,
  };
}

function goalsInvalid(...diagnostics: readonly string[]): GoalsDecodeResult {
  return {
    ok: false,
    diagnostics,
  };
}
