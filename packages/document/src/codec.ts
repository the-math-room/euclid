import { toWorldPoint, type Construction, type ConstructionProgram } from "@euclid/geometry";
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

  const program = decodeConstructionProgram(value.program);
  if (!program.ok) {
    return invalid(program.diagnostic);
  }

  return {
    ok: true,
    document: {
      schemaVersion: 1,
      title: value.title,
      program: program.program,
    },
  };
}

type ProgramDecodeResult =
  | Readonly<{ ok: true; program: ConstructionProgram }>
  | Readonly<{ ok: false; diagnostic: string }>;

function decodeConstructionProgram(value: unknown): ProgramDecodeResult {
  if (!isRecord(value) || !Array.isArray(value.constructions)) {
    return { ok: false, diagnostic: "Document program must contain a constructions array." };
  }

  const constructions: Construction[] = [];
  for (const [index, construction] of value.constructions.entries()) {
    if (isRecord(construction) && construction.kind === "free-point" && isRecord(construction.position)) {
      if (typeof construction.position.x !== "number" || typeof construction.position.y !== "number") {
        return {
          ok: false,
          diagnostic: `Document program.constructions[${index}].position must be a Point2 object.`,
        };
      }

      constructions.push({
        ...construction,
        position: toWorldPoint({
          x: construction.position.x,
          y: construction.position.y,
        }),
      } as Construction);
      continue;
    }

    constructions.push(construction as Construction);
  }

  return {
    ok: true,
    program: {
      constructions,
    },
  };
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
