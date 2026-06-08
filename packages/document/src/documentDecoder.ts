import type { Construction, ConstructionProgram } from "@euclid/geometry";
import { decodeConstruction } from "./constructionDecoder";
import {
  decodeArrayField,
  decodeRecord,
  decodeStringField,
  type StringFieldDecodeResult,
} from "./jsonDecoder";
import type { EuclidDocument } from "./model";

export type DocumentDecodeResult =
  | Readonly<{ ok: true; document: EuclidDocument }>
  | Readonly<{ ok: false; diagnostic: string }>;

type DocumentFields = Readonly<{
  title: string;
  program: ConstructionProgram;
}>;

type DocumentFieldsDecodeResult =
  | Readonly<{ ok: true; value: DocumentFields }>
  | Readonly<{ ok: false; diagnostic: string }>;

type ProgramDecodeResult =
  | Readonly<{ ok: true; program: ConstructionProgram }>
  | Readonly<{ ok: false; diagnostic: string }>;

type ConstructionListDecodeResult =
  | Readonly<{ ok: true; value: readonly Construction[] }>
  | Readonly<{ ok: false; diagnostic: string }>;

export function decodeEuclidDocument(value: unknown): DocumentDecodeResult {
  return documentFieldsToDecodeResult(decodeDocumentFields(value));
}

function decodeDocumentFields(value: unknown): DocumentFieldsDecodeResult {
  const record = decodeRecord(value, "Document");
  if (!record.ok) {
    return documentFieldsInvalid("Document must be a JSON object.");
  }

  if (record.value.schemaVersion !== 1) {
    return documentFieldsInvalid("Document schemaVersion must be 1.");
  }

  const title = decodeDocumentTitle(record.value);
  if (!title.ok) {
    return documentFieldsInvalid(title.diagnostic);
  }

  const program = decodeConstructionProgram(record.value.program);
  if (!program.ok) {
    return documentFieldsInvalid(program.diagnostic);
  }

  return {
    ok: true,
    value: {
      title: title.value,
      program: program.program,
    },
  };
}

function documentFieldsToDecodeResult(fields: DocumentFieldsDecodeResult): DocumentDecodeResult {
  if (!fields.ok) {
    return documentInvalid(fields.diagnostic);
  }

  return {
    ok: true,
    document: {
      schemaVersion: 1,
      title: fields.value.title,
      program: fields.value.program,
    },
  };
}

function decodeDocumentTitle(value: Record<string, unknown>): StringFieldDecodeResult {
  const title = decodeStringField(value, "title", "Document");
  if (!title.ok) {
    return {
      ok: false,
      diagnostic: "Document title must be a string.",
    };
  }

  return title;
}

function decodeConstructionProgram(value: unknown): ProgramDecodeResult {
  const constructions = decodeConstructionList(value);
  if (!constructions.ok) {
    return {
      ok: false,
      diagnostic: constructions.diagnostic,
    };
  }

  return {
    ok: true,
    program: {
      constructions: constructions.value,
    },
  };
}

function decodeConstructionList(value: unknown): ConstructionListDecodeResult {
  const record = decodeRecord(value, "Document program");
  if (!record.ok) {
    return constructionListInvalid("Document program must contain a constructions array.");
  }

  const array = decodeArrayField(record.value, "constructions", "Document program");
  if (!array.ok) {
    return constructionListInvalid("Document program must contain a constructions array.");
  }

  const constructions: Construction[] = [];
  for (const [index, construction] of array.value.entries()) {
    const decoded = decodeConstruction(construction, `Document program.constructions[${index}]`);
    if (!decoded.ok) {
      return constructionListInvalid(decoded.diagnostic);
    }
    constructions.push(decoded.construction);
  }

  return {
    ok: true,
    value: constructions,
  };
}

function documentInvalid(diagnostic: string): DocumentDecodeResult {
  return {
    ok: false,
    diagnostic,
  };
}

function documentFieldsInvalid(diagnostic: string): DocumentFieldsDecodeResult {
  return {
    ok: false,
    diagnostic,
  };
}

function constructionListInvalid(diagnostic: string): ConstructionListDecodeResult {
  return {
    ok: false,
    diagnostic,
  };
}
