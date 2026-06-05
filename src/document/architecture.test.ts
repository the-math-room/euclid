import { describe, expect, it } from "vitest";
import { seedDocument } from "./seed";
import type { EuclidDocument } from "./model";

describe("document architecture", () => {
  it("keeps documents as versioned serializable data", () => {
    const serialized = JSON.stringify(seedDocument);
    const parsed = JSON.parse(serialized) as EuclidDocument;

    expect(parsed).toEqual(seedDocument);
    expect(parsed.schemaVersion).toBe(1);
  });
});
