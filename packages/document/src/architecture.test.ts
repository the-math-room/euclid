import { describe, expect, it } from "vitest";
import { toWorldPoint, type Construction } from "@euclid/geometry";
import { parseEuclidDocument, serializeEuclidDocument } from "./codec";
import type { EuclidDocument } from "./model";
import { seedDocument } from "./seed";

const allConstructionKindsDocument: EuclidDocument = {
  schemaVersion: 1,
  title: "All construction kinds",
  program: {
    constructions: [
      { id: "A", kind: "free-point", label: "A", position: toWorldPoint({ x: 0, y: 0 }) },
      { id: "B", kind: "free-point", label: "B", position: toWorldPoint({ x: 1, y: 0 }) },
      { id: "C", kind: "free-point", label: "C", position: toWorldPoint({ x: 0, y: 1 }) },
      { id: "D", kind: "free-point", label: "D", position: toWorldPoint({ x: 1, y: 1 }) },
      { id: "line-ab", kind: "line-through", label: "AB", points: ["A", "B"] },
      { id: "line-cd", kind: "line-through", label: "CD", points: ["C", "D"] },
      { id: "circle-a-b", kind: "circle-through", label: "circle", center: "A", pointOnCircle: "B" },
      { id: "circle-b-c-d", kind: "circle-three-points", label: "arc", points: ["B", "C", "D"] },
      { id: "intersection", kind: "line-line-intersection", label: "X", lines: ["line-ab", "line-cd"] },
      {
        id: "line-circle-intersection",
        kind: "line-circle-intersection",
        label: "Y",
        line: "line-ab",
        circle: "circle-a-b",
        intersectionIndex: 0,
      },
      {
        id: "circle-circle-intersection",
        kind: "circle-circle-intersection",
        label: "Z",
        firstCircle: "circle-a-b",
        secondCircle: "circle-b-c-d",
        intersectionIndex: 1,
      },
      { id: "parallel", kind: "parallel-line", label: "parallel", line: "line-ab", point: "C" },
      {
        id: "perpendicular",
        kind: "perpendicular-line",
        label: "perpendicular",
        line: "line-ab",
        point: "D",
      },
      { id: "midpoint", kind: "midpoint", label: "M", points: ["A", "B"] },
    ],
  },
};

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

  it("parses every supported construction kind into typed construction records", () => {
    const parsed = parseEuclidDocument(serializeEuclidDocument(allConstructionKindsDocument));

    expect(parsed).toEqual({
      ok: true,
      document: allConstructionKindsDocument,
    });
  });

  it("rejects unsupported construction kinds", () => {
    const invalidConstruction: Construction = {
      id: "line-ab",
      kind: "line-through",
      label: "AB",
      points: ["A", "B"],
    };

    expect(
      parseEuclidDocument(
        JSON.stringify({
          ...seedDocument,
          program: {
            constructions: [
              {
                ...invalidConstruction,
                kind: "ray-through",
              },
            ],
          },
        }),
      ),
    ).toEqual({
      ok: false,
      diagnostics: ["Document program.constructions[0].kind is not a supported construction kind."],
    });
  });

  it("rejects malformed free-point positions", () => {
    expect(
      parseEuclidDocument(
        JSON.stringify({
          ...seedDocument,
          program: {
            constructions: [
              {
                id: "A",
                kind: "free-point",
                label: "A",
              },
            ],
          },
        }),
      ),
    ).toEqual({
      ok: false,
      diagnostics: ["Document program.constructions[0].position must be a Point2 object."],
    });
  });

  it("rejects malformed dependency tuples", () => {
    expect(
      parseEuclidDocument(
        JSON.stringify({
          ...seedDocument,
          program: {
            constructions: [{ id: "line-ab", kind: "line-through", label: "AB", points: ["A"] }],
          },
        }),
      ),
    ).toEqual({
      ok: false,
      diagnostics: ["Document program.constructions[0].points must be an array of 2 strings."],
    });
  });

  it("rejects malformed intersection indexes", () => {
    expect(
      parseEuclidDocument(
        JSON.stringify({
          ...seedDocument,
          program: {
            constructions: [
              {
                id: "intersection",
                kind: "line-circle-intersection",
                label: "X",
                line: "line-ab",
                circle: "circle-a-b",
                intersectionIndex: 2,
              },
            ],
          },
        }),
      ),
    ).toEqual({
      ok: false,
      diagnostics: ["Document program.constructions[0].intersectionIndex must be 0 or 1."],
    });
  });
});
