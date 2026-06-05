import type { ConstructionProgram } from "@euclid/geometry";
import type { EuclidDocument } from "./model";

export type DocumentParseResult =
  | Readonly<{
      ok: true;
      document: EuclidDocument;
    }>
  | Readonly<{
      ok: false;
      diagnostics: readonly string[];
    }>;

export function serializeEuclidDocument(euclidDocument: EuclidDocument): string {
  return JSON.stringify(euclidDocument, null, 2);
}

export function parseEuclidDocument(text: string): DocumentParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      diagnostics: ["Document is not valid JSON."],
    };
  }

  return decodeEuclidDocument(parsed);
}

function decodeEuclidDocument(value: unknown): DocumentParseResult {
  if (!isRecord(value)) {
    return invalid("Document must be a JSON object.");
  }

  if (value.schemaVersion !== 1) {
    return invalid("Document schemaVersion must be 1.");
  }

  if (typeof value.title !== "string") {
    return invalid("Document title must be a string.");
  }

  if (!isConstructionProgram(value.program)) {
    return invalid("Document program must contain a constructions array.");
  }

  return {
    ok: true,
    document: {
      schemaVersion: 1,
      title: value.title,
      program: value.program,
    },
  };
}

function isConstructionProgram(value: unknown): value is ConstructionProgram {
  return isRecord(value) && Array.isArray(value.constructions);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(message: string): DocumentParseResult {
  return {
    ok: false,
    diagnostics: [message],
  };
}
