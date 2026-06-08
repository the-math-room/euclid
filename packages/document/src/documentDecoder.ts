import {
  measurementSettingsSchema,
  segmentLengthAssertionSchema,
  type Construction,
  type ConstructionProgram,
  type MeasurementSettings,
  type SegmentLengthAssertion,
} from "@euclid/geometry";
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
    measurementSettings: z.unknown().optional(),
    measurements: z.array(z.unknown()).optional(),
  }),
});

type DocumentEnvelope = z.infer<typeof documentEnvelopeSchema>;

type ProgramDecodeResult =
  | Readonly<{ ok: true; program: ConstructionProgram }>
  | Readonly<{ ok: false; diagnostic: string }>;

type ConstructionListDecodeResult =
  | Readonly<{ ok: true; value: readonly Construction[] }>
  | Readonly<{ ok: false; diagnostic: string }>;

type SegmentLengthAssertionListDecodeResult =
  | Readonly<{ ok: true; value: readonly SegmentLengthAssertion[] }>
  | Readonly<{ ok: false; diagnostic: string }>;

type MeasurementSettingsDecodeResult =
  | Readonly<{ ok: true; value: MeasurementSettings | undefined }>
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

  const measurements = decodeSegmentLengthAssertionList(value.measurements ?? []);
  if (!measurements.ok) {
    return {
      ok: false,
      diagnostic: measurements.diagnostic,
    };
  }

  const measurementSettings = decodeMeasurementSettings(value.measurementSettings);
  if (!measurementSettings.ok) {
    return {
      ok: false,
      diagnostic: measurementSettings.diagnostic,
    };
  }

  return {
    ok: true,
    program: {
      constructions: constructions.value,
      ...(measurementSettings.value === undefined ? {} : { measurementSettings: measurementSettings.value }),
      ...(value.measurements === undefined ? {} : { measurements: measurements.value }),
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

function decodeSegmentLengthAssertionList(value: readonly unknown[]): SegmentLengthAssertionListDecodeResult {
  const measurements: SegmentLengthAssertion[] = [];
  for (const [index, measurement] of value.entries()) {
    const decoded = segmentLengthAssertionSchema.safeParse(measurement);
    if (!decoded.success) {
      return measurementListInvalid(
        diagnosticForMeasurementError(decoded.error, `Document program.measurements[${index}]`),
      );
    }
    measurements.push(decoded.data);
  }

  return {
    ok: true,
    value: measurements,
  };
}

function decodeMeasurementSettings(value: unknown): MeasurementSettingsDecodeResult {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  const decoded = measurementSettingsSchema.safeParse(value);
  if (!decoded.success) {
    return {
      ok: false,
      diagnostic: diagnosticForMeasurementSettingsError(decoded.error),
    };
  }

  return {
    ok: true,
    value: decoded.data,
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

  if (firstPath === "program" && secondPath === "measurements") {
    return "Document program.measurements must be an array when present.";
  }

  if (firstPath === "program" && secondPath === "measurementSettings") {
    return "Document program.measurementSettings must be a JSON object when present.";
  }

  if (firstPath === "program") {
    return "Document program must contain a constructions array.";
  }

  return "Document must be a JSON object.";
}

function diagnosticForMeasurementSettingsError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) {
    return "Document program.measurementSettings must be a JSON object when present.";
  }

  const issuePath = pathForIssue("Document program.measurementSettings", issue.path);
  const field = issue.path.at(-1);

  if (field === "unitLength") {
    return `${issuePath} must be a positive finite number.`;
  }

  if (field === "variables") {
    return `${issuePath} must be a JSON object when present.`;
  }

  if (typeof field === "string") {
    return `${issuePath} must be a finite number.`;
  }

  return "Document program.measurementSettings must be a JSON object when present.";
}

function diagnosticForMeasurementError(error: z.ZodError, path: string): string {
  const issue = error.issues[0];
  if (!issue) {
    return `${path} must be a segment length assertion.`;
  }

  const issuePath = pathForIssue(path, issue.path);
  const field = issue.path.at(-1);

  if (field === "kind") {
    return `${issuePath} must be segment-length.`;
  }

  if (field === "length") {
    return `${issuePath} must be a finite number or string expression.`;
  }

  if (field === "label") {
    return `${issuePath} must be a string when present.`;
  }

  if (typeof field === "string") {
    return `${issuePath} must be a string.`;
  }

  return `${path} must be a segment length assertion.`;
}

function pathForIssue(root: string, issuePath: readonly PropertyKey[]): string {
  return issuePath.reduce<string>((current, segment) => {
    return typeof segment === "number" ? `${current}[${segment}]` : `${current}.${String(segment)}`;
  }, root);
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

function measurementListInvalid(diagnostic: string): SegmentLengthAssertionListDecodeResult {
  return {
    ok: false,
    diagnostic,
  };
}
