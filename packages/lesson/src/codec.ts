import { isActivityTool } from "@euclid/activity";
import type { AssessmentGoal } from "@euclid/assessment";
import { parseAssessmentGoal } from "@euclid/assessment";
import type { EuclidDocument } from "@euclid/document";
import { parseEuclidDocument } from "@euclid/document";
import { z } from "zod";
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

const dragPolicySchema = z.union([z.literal("none"), z.literal("free-points"), z.literal("all")]);
const activityToolSchema = z.string().refine((value) => isActivityTool(value));
const activityPolicySchema = z.object({
  allowedTools: z.array(activityToolSchema),
  lockedConstructions: z.array(z.string()),
  allowDelete: z.boolean(),
  pointDrag: dragPolicySchema,
  shapeDrag: dragPolicySchema,
});
const lessonEnvelopeSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  document: z.unknown(),
  policy: activityPolicySchema,
  goals: z.array(z.unknown()),
});

type LessonEnvelope = z.infer<typeof lessonEnvelopeSchema>;

function decodeEuclidLesson(value: unknown): LessonParseResult {
  const parsed = lessonEnvelopeSchema.safeParse(value);
  if (!parsed.success) {
    return invalid(diagnosticForLessonError(parsed.error));
  }

  return lessonEnvelopeToParseResult(parsed.data);
}

function lessonEnvelopeToParseResult(envelope: LessonEnvelope): LessonParseResult {
  const starter = decodeStarterDocument(envelope.document);
  if (!starter.ok) {
    return invalid(...starter.diagnostics);
  }

  const goals = decodeAssessmentGoals(envelope.goals);
  if (!goals.ok) {
    return invalid(...goals.diagnostics);
  }

  return {
    ok: true,
    lesson: {
      schemaVersion: 1,
      id: envelope.id,
      title: envelope.title,
      ...(envelope.description === undefined ? {} : { description: envelope.description }),
      document: starter.starterDocument,
      policy: envelope.policy,
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

function invalid(...diagnostics: readonly string[]): LessonParseResult {
  return {
    ok: false,
    diagnostics,
  };
}

function goalsInvalid(...diagnostics: readonly string[]): GoalsDecodeResult {
  return {
    ok: false,
    diagnostics,
  };
}

function diagnosticForLessonError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue || issue.path.length === 0) {
    return "Lesson must be a JSON object.";
  }

  const [first, second] = issue.path;

  if (first === "schemaVersion") {
    return "Lesson schemaVersion must be 1.";
  }

  if (first === "id") {
    return "Lesson id must be a string.";
  }

  if (first === "title") {
    return "Lesson title must be a string.";
  }

  if (first === "description") {
    return "Lesson description must be a string.";
  }

  if (first === "policy") {
    return diagnosticForPolicyError(second, issue.path);
  }

  if (first === "goals") {
    return "Lesson goals must be an array.";
  }

  return "Lesson must be a JSON object.";
}

function diagnosticForPolicyError(field: PropertyKey | undefined, path: readonly PropertyKey[]): string {
  if (field === undefined) {
    return "Lesson policy must be a JSON object.";
  }

  if (field === "allowedTools") {
    const index = path[2];
    return typeof index === "number"
      ? `Lesson policy.allowedTools[${index}] must be a non-empty tool id.`
      : "Lesson policy.allowedTools must be an array.";
  }

  if (field === "lockedConstructions") {
    const index = path[2];
    return typeof index === "number"
      ? `Lesson policy.lockedConstructions[${index}] must be a string.`
      : "Lesson policy.lockedConstructions must be an array.";
  }

  if (field === "allowDelete") {
    return "Lesson policy.allowDelete must be a boolean.";
  }

  if (field === "pointDrag") {
    return "Lesson policy.pointDrag must be a drag policy.";
  }

  if (field === "shapeDrag") {
    return "Lesson policy.shapeDrag must be a drag policy.";
  }

  return "Lesson policy must be a JSON object.";
}

export function compressLessonToUrlPayload(lesson: EuclidLesson): string {
  const jsonStr = JSON.stringify(lesson);
  // Using standard base64 url-safe encoding
  const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decompressLessonFromUrlPayload(payload: string): EuclidLesson {
  // Pad with '=' to make valid base64
  let base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const jsonStr = decodeURIComponent(escape(atob(base64)));
  const result = decodeEuclidLesson(JSON.parse(jsonStr));
  if (!result.ok) {
    throw new Error(`Invalid decompressed lesson: ${result.diagnostics.join(", ")}`);
  }
  return result.lesson;
}
