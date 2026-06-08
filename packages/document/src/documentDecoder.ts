import type { Construction, ConstructionProgram } from "@euclid/geometry";
import { z } from "zod";
import { decodeConstruction } from "./constructionDecoder";
import type { EuclidDocument } from "./model";

export type DocumentDecodeResult =
  | Readonly<{ ok: true; document: EuclidDocument }>
  | Readonly<{ ok: false; diagnostic: string }>;

const documentEnvelopeSchema = z.object({
  schemaVersion: z.literal(1),
  title: z.string(),
  program: z.object({
    constructions: z.array(z.unknown()),
  }),
});

type DocumentEnvelope = z.infer<typeof documentEnvelopeSchema>;

type ProgramDecodeResult =
  | Readonly<{ ok: true; program: ConstructionProgram }>
  | Readonly<{ ok: false; diagnostic: string }>;

type ConstructionListDecodeResult =
  | Readonly<{ ok: true; value: readonly Construction[] }>
  | Readonly<{ ok: false; diagnostic: string }>;

export function decodeEuclidDocument(value: unknown): DocumentDecodeResult {
  const parsed = documentEnvelopeSchema.safeParse(value);
  if (!parsed.success) {
    return documentInvalid(diagnosticForDocumentError(parsed.error));
  }

  return documentEnvelopeToDecodeResult(parsed.data);
}

function documentEnvelopeToDecodeResult(envelope: DocumentEnvelope): DocumentDecodeResult {
  const program = decodeConstructionProgram(envelope.program);
  if (!program.ok) {
    return documentInvalid(program.diagnostic);
  }

  return {
    ok: true,
    document: {
      schemaVersion: 1,
      title: envelope.title,
      program: program.program,
    },
  };
}

function decodeConstructionProgram(value: DocumentEnvelope["program"]): ProgramDecodeResult {
  const constructions = decodeConstructionList(value.constructions);
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

function decodeConstructionList(value: readonly unknown[]): ConstructionListDecodeResult {
  const constructions: Construction[] = [];
  for (const [index, construction] of value.entries()) {
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

function diagnosticForDocumentError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue || issue.path.length === 0) {
    return "Document must be a JSON object.";
  }

  const firstPath = issue.path[0];
  const secondPath = issue.path[1];

  if (firstPath === "schemaVersion") {
    return "Document schemaVersion must be 1.";
  }

  if (firstPath === "title") {
    return "Document title must be a string.";
  }

  if (firstPath === "program" && secondPath === "constructions") {
    return "Document program must contain a constructions array.";
  }

  if (firstPath === "program") {
    return "Document program must contain a constructions array.";
  }

  return "Document must be a JSON object.";
}

function documentInvalid(diagnostic: string): DocumentDecodeResult {
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
