import { describe, expect, it } from "vitest";
import { parseEuclidDocument, serializeEuclidDocument } from "./codec";
import { seedDocument } from "./seed";

describe("document architecture", () => {
  it("keeps documents as versioned serializable data", () => {
    const parsed = parseEuclidDocument(serializeEuclidDocument(seedDocument));

    expect(parsed).toEqual({
      ok: true,
      document: seedDocument,
    });
  });

  it("rejects invalid document JSON", () => {
    expect(parseEuclidDocument("{")).toEqual({
      ok: false,
      diagnostics: ["Document is not valid JSON."],
    });
  });

  it("rejects unsupported document schema versions", () => {
    expect(parseEuclidDocument(JSON.stringify({ ...seedDocument, schemaVersion: 2 }))).toEqual({
      ok: false,
      diagnostics: ["Document schemaVersion must be 1."],
    });
  });
});
