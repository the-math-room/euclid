import {
  constructionKinds,
  constructionSchema,
  rawConstructionToConstruction,
  type Construction,
} from "@euclid/geometry";
import { z } from "zod";

export type ConstructionDecodeResult =
  | Readonly<{ ok: true; construction: Construction }>
  | Readonly<{ ok: false; diagnostic: string }>;

export function decodeConstruction(value: unknown, path: string): ConstructionDecodeResult {
  const parsed = constructionSchema.safeParse(value);
  if (!parsed.success) {
    return constructionInvalid(diagnosticForConstructionError(parsed.error, value, path));
  }

  return {
    ok: true,
    construction: rawConstructionToConstruction(parsed.data),
  };
}

function diagnosticForConstructionError(error: z.ZodError, value: unknown, path: string): string {
  const issue = error.issues[0];
  if (!issue) {
    return `${path} must be a JSON object.`;
  }

  if (issue.path.length === 0) {
    return `${path} must be a JSON object.`;
  }

  const field = issue.path[0];

  if (field === "kind") {
    return `${path}.kind is not a supported construction kind.`;
  }

  if (field === "position") {
    return `${path}.position must be a Point2 object.`;
  }

  if (field === "points") {
    return `${path}.points must be an array of ${pointsTupleLength(value)} strings.`;
  }

  if (field === "lines") {
    return `${path}.lines must be an array of 2 strings.`;
  }

  if (field === "intersectionIndex") {
    return `${path}.intersectionIndex must be 0 or 1.`;
  }

  if (typeof field === "string") {
    return `${path}.${field} must be a string.`;
  }

  return `${path} must be a JSON object.`;
}

function pointsTupleLength(value: unknown): 2 | 3 {
  return constructionKindOf(value) === "circle-three-points" ? 3 : 2;
}

function constructionKindOf(value: unknown): Construction["kind"] | undefined {
  if (!isRecord(value) || !isConstructionKind(value.kind)) {
    return undefined;
  }

  return value.kind;
}

function constructionInvalid(diagnostic: string): ConstructionDecodeResult {
  return {
    ok: false,
    diagnostic,
  };
}

function isConstructionKind(value: unknown): value is Construction["kind"] {
  return constructionKinds.includes(value as Construction["kind"]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
