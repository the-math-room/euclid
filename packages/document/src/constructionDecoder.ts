import { toWorldPoint, type Construction } from "@euclid/geometry";
import {
  decodeNumberField,
  decodeRecord,
  decodeStringField,
  decodeStringPairFields,
  decodeStringTuple,
} from "./jsonDecoder";

export type ConstructionDecodeResult =
  | Readonly<{ ok: true; construction: Construction }>
  | Readonly<{ ok: false; diagnostic: string }>;

type ConstructionHeader = Record<string, unknown> &
  Readonly<{
    id: string;
    kind: Construction["kind"];
    label: string;
  }>;

type ConstructionHeaderDecodeResult =
  | Readonly<{ ok: true; value: ConstructionHeader }>
  | Readonly<{ ok: false; diagnostic: string }>;

type ConstructionKindDecodeResult =
  | Readonly<{ ok: true; value: Construction["kind"] }>
  | Readonly<{ ok: false; diagnostic: string }>;

type WorldPointDecodeResult =
  | Readonly<{ ok: true; value: ReturnType<typeof toWorldPoint> }>
  | Readonly<{ ok: false; diagnostic: string }>;

type PointRecordDecodeResult =
  | Readonly<{ ok: true; x: number; y: number }>
  | Readonly<{ ok: false; diagnostic: string }>;

type IdPairDecodeResult =
  | Readonly<{ ok: true; ids: readonly [string, string] }>
  | Readonly<{ ok: false; diagnostic: string }>;

type IdTripleDecodeResult =
  | Readonly<{ ok: true; ids: readonly [string, string, string] }>
  | Readonly<{ ok: false; diagnostic: string }>;

type IntersectionIndexDecodeResult =
  | Readonly<{ ok: true; value: 0 | 1 }>
  | Readonly<{ ok: false; diagnostic: string }>;

type ConstructionVariantDecoder = (value: ConstructionHeader, path: string) => ConstructionDecodeResult;

const constructionKinds = [
  "free-point",
  "line-through",
  "circle-through",
  "circle-three-points",
  "line-line-intersection",
  "line-circle-intersection",
  "circle-circle-intersection",
  "parallel-line",
  "perpendicular-line",
  "midpoint",
] as const satisfies readonly Construction["kind"][];

const constructionDecoders: Readonly<Record<Construction["kind"], ConstructionVariantDecoder>> = {
  "free-point": decodeFreePointConstruction,
  "line-through": decodeLineThroughConstruction,
  "circle-through": decodeCircleThroughConstruction,
  "circle-three-points": decodeCircleThreePointsConstruction,
  "line-line-intersection": decodeLineLineIntersectionConstruction,
  "line-circle-intersection": decodeLineCircleIntersectionConstruction,
  "circle-circle-intersection": decodeCircleCircleIntersectionConstruction,
  "parallel-line": decodeParallelLineConstruction,
  "perpendicular-line": decodePerpendicularLineConstruction,
  midpoint: decodeMidpointConstruction,
};

export function decodeConstruction(value: unknown, path: string): ConstructionDecodeResult {
  const header = decodeConstructionHeader(value, path);
  if (!header.ok) {
    return constructionInvalid(header.diagnostic);
  }

  return constructionDecoders[header.value.kind](header.value, path);
}

function decodeConstructionHeader(value: unknown, path: string): ConstructionHeaderDecodeResult {
  const record = decodeRecord(value, path);
  if (!record.ok) {
    return constructionHeaderInvalid(record.diagnostic);
  }

  const id = decodeStringField(record.value, "id", path);
  if (!id.ok) {
    return constructionHeaderInvalid(id.diagnostic);
  }

  const label = decodeStringField(record.value, "label", path);
  if (!label.ok) {
    return constructionHeaderInvalid(label.diagnostic);
  }

  const kind = decodeConstructionKind(record.value.kind, `${path}.kind`);
  if (!kind.ok) {
    return constructionHeaderInvalid(kind.diagnostic);
  }

  return {
    ok: true,
    value: {
      ...record.value,
      id: id.value,
      kind: kind.value,
      label: label.value,
    },
  };
}

function decodeConstructionKind(value: unknown, path: string): ConstructionKindDecodeResult {
  if (!isConstructionKind(value)) {
    return {
      ok: false,
      diagnostic: `${path} is not a supported construction kind.`,
    };
  }

  return {
    ok: true,
    value,
  };
}

function decodeFreePointConstruction(value: ConstructionHeader, path: string): ConstructionDecodeResult {
  const position = decodeWorldPoint(value.position, `${path}.position`);
  if (!position.ok) {
    return constructionInvalid(position.diagnostic);
  }

  return {
    ok: true,
    construction: {
      id: value.id,
      kind: "free-point",
      label: value.label,
      position: position.value,
    },
  };
}

function decodeWorldPoint(value: unknown, path: string): WorldPointDecodeResult {
  const point = decodePointRecord(value, path);
  if (!point.ok) {
    return {
      ok: false,
      diagnostic: point.diagnostic,
    };
  }

  return {
    ok: true,
    value: toWorldPoint({
      x: point.x,
      y: point.y,
    }),
  };
}

function decodePointRecord(value: unknown, path: string): PointRecordDecodeResult {
  const record = decodeRecord(value, path);
  if (!record.ok) {
    return pointInvalid(`${path} must be a Point2 object.`);
  }

  const x = decodeNumberField(record.value, "x", path);
  if (!x.ok) {
    return pointInvalid(`${path} must be a Point2 object.`);
  }

  const y = decodeNumberField(record.value, "y", path);
  if (!y.ok) {
    return pointInvalid(`${path} must be a Point2 object.`);
  }

  return {
    ok: true,
    x: x.value,
    y: y.value,
  };
}

function decodeLineThroughConstruction(value: ConstructionHeader, path: string): ConstructionDecodeResult {
  const points = decodeIdPair(value.points, `${path}.points`);
  return points.ok
    ? {
        ok: true,
        construction: {
          id: value.id,
          kind: "line-through",
          label: value.label,
          points: points.ids,
        },
      }
    : constructionInvalid(points.diagnostic);
}

function decodeCircleThroughConstruction(value: ConstructionHeader, path: string): ConstructionDecodeResult {
  const fields = decodeStringPairFields(value, "center", "pointOnCircle", path);
  if (!fields.ok) {
    return constructionInvalid(fields.diagnostic);
  }

  return {
    ok: true,
    construction: {
      id: value.id,
      kind: "circle-through",
      label: value.label,
      center: fields.first,
      pointOnCircle: fields.second,
    },
  };
}

function decodeCircleThreePointsConstruction(
  value: ConstructionHeader,
  path: string,
): ConstructionDecodeResult {
  const points = decodeIdTriple(value.points, `${path}.points`);
  return points.ok
    ? {
        ok: true,
        construction: {
          id: value.id,
          kind: "circle-three-points",
          label: value.label,
          points: points.ids,
        },
      }
    : constructionInvalid(points.diagnostic);
}

function decodeLineLineIntersectionConstruction(
  value: ConstructionHeader,
  path: string,
): ConstructionDecodeResult {
  const lines = decodeIdPair(value.lines, `${path}.lines`);
  return lines.ok
    ? {
        ok: true,
        construction: {
          id: value.id,
          kind: "line-line-intersection",
          label: value.label,
          lines: lines.ids,
        },
      }
    : constructionInvalid(lines.diagnostic);
}

function decodeLineCircleIntersectionConstruction(
  value: ConstructionHeader,
  path: string,
): ConstructionDecodeResult {
  const fields = decodeStringPairFields(value, "line", "circle", path);
  if (!fields.ok) {
    return constructionInvalid(fields.diagnostic);
  }

  const intersectionIndex = decodeIntersectionIndex(value.intersectionIndex, `${path}.intersectionIndex`);
  if (!intersectionIndex.ok) {
    return constructionInvalid(intersectionIndex.diagnostic);
  }

  return {
    ok: true,
    construction: {
      id: value.id,
      kind: "line-circle-intersection",
      label: value.label,
      line: fields.first,
      circle: fields.second,
      intersectionIndex: intersectionIndex.value,
    },
  };
}

function decodeCircleCircleIntersectionConstruction(
  value: ConstructionHeader,
  path: string,
): ConstructionDecodeResult {
  const fields = decodeStringPairFields(value, "firstCircle", "secondCircle", path);
  if (!fields.ok) {
    return constructionInvalid(fields.diagnostic);
  }

  const intersectionIndex = decodeIntersectionIndex(value.intersectionIndex, `${path}.intersectionIndex`);
  if (!intersectionIndex.ok) {
    return constructionInvalid(intersectionIndex.diagnostic);
  }

  return {
    ok: true,
    construction: {
      id: value.id,
      kind: "circle-circle-intersection",
      label: value.label,
      firstCircle: fields.first,
      secondCircle: fields.second,
      intersectionIndex: intersectionIndex.value,
    },
  };
}

function decodeParallelLineConstruction(value: ConstructionHeader, path: string): ConstructionDecodeResult {
  const fields = decodeStringPairFields(value, "line", "point", path);
  if (!fields.ok) {
    return constructionInvalid(fields.diagnostic);
  }

  return {
    ok: true,
    construction: {
      id: value.id,
      kind: "parallel-line",
      label: value.label,
      line: fields.first,
      point: fields.second,
    },
  };
}

function decodePerpendicularLineConstruction(
  value: ConstructionHeader,
  path: string,
): ConstructionDecodeResult {
  const fields = decodeStringPairFields(value, "line", "point", path);
  if (!fields.ok) {
    return constructionInvalid(fields.diagnostic);
  }

  return {
    ok: true,
    construction: {
      id: value.id,
      kind: "perpendicular-line",
      label: value.label,
      line: fields.first,
      point: fields.second,
    },
  };
}

function decodeMidpointConstruction(value: ConstructionHeader, path: string): ConstructionDecodeResult {
  const points = decodeIdPair(value.points, `${path}.points`);
  return points.ok
    ? {
        ok: true,
        construction: {
          id: value.id,
          kind: "midpoint",
          label: value.label,
          points: points.ids,
        },
      }
    : constructionInvalid(points.diagnostic);
}

function decodeIdPair(value: unknown, path: string): IdPairDecodeResult {
  const tuple = decodeStringTuple(value, path, 2);
  if (!tuple.ok) {
    return idPairInvalid(tuple.diagnostic);
  }

  return {
    ok: true,
    ids: [tuple.values[0], tuple.values[1]],
  };
}

function decodeIdTriple(value: unknown, path: string): IdTripleDecodeResult {
  const tuple = decodeStringTuple(value, path, 3);
  if (!tuple.ok) {
    return idTripleInvalid(tuple.diagnostic);
  }

  return {
    ok: true,
    ids: [tuple.values[0], tuple.values[1], tuple.values[2]],
  };
}

function decodeIntersectionIndex(value: unknown, path: string): IntersectionIndexDecodeResult {
  if (value === 0 || value === 1) {
    return {
      ok: true,
      value,
    };
  }

  return {
    ok: false,
    diagnostic: `${path} must be 0 or 1.`,
  };
}

function constructionInvalid(diagnostic: string): ConstructionDecodeResult {
  return {
    ok: false,
    diagnostic,
  };
}

function constructionHeaderInvalid(diagnostic: string): ConstructionHeaderDecodeResult {
  return {
    ok: false,
    diagnostic,
  };
}

function pointInvalid(diagnostic: string): PointRecordDecodeResult {
  return {
    ok: false,
    diagnostic,
  };
}

function idPairInvalid(diagnostic: string): IdPairDecodeResult {
  return {
    ok: false,
    diagnostic,
  };
}

function idTripleInvalid(diagnostic: string): IdTripleDecodeResult {
  return {
    ok: false,
    diagnostic,
  };
}

function isConstructionKind(value: unknown): value is Construction["kind"] {
  return constructionKinds.includes(value as Construction["kind"]);
}
