import { decodeEuclidDocument } from "./documentDecoder";
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
    return invalid("Document is not valid JSON.");
  }

  const decoded = decodeEuclidDocument(parsed);
  return decoded.ok
    ? {
        ok: true,
        document: decoded.document,
      }
    : invalid(decoded.diagnostic);
}

function invalid(message: string): DocumentParseResult {
  return {
    ok: false,
    diagnostics: [message],
  };
}
