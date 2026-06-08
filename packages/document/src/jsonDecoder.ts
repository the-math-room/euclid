export type StringFieldDecodeResult =
  | Readonly<{ ok: true; value: string }>
  | Readonly<{ ok: false; diagnostic: string }>;

export type RecordDecodeResult =
  | Readonly<{ ok: true; value: Record<string, unknown> }>
  | Readonly<{ ok: false; diagnostic: string }>;

export type ArrayFieldDecodeResult =
  | Readonly<{ ok: true; value: readonly unknown[] }>
  | Readonly<{ ok: false; diagnostic: string }>;

export type StringPairDecodeResult =
  | Readonly<{ ok: true; first: string; second: string }>
  | Readonly<{ ok: false; diagnostic: string }>;

export type NumberFieldDecodeResult =
  | Readonly<{ ok: true; value: number }>
  | Readonly<{ ok: false; diagnostic: string }>;

export type StringTupleDecodeResult =
  | Readonly<{ ok: true; values: readonly string[] }>
  | Readonly<{ ok: false; diagnostic: string }>;

type StringArrayDecodeResult =
  | Readonly<{ ok: true; values: readonly string[] }>
  | Readonly<{ ok: false; diagnostic: string }>;

type FixedArrayDecodeResult =
  | Readonly<{ ok: true; values: readonly unknown[] }>
  | Readonly<{ ok: false; diagnostic: string }>;

type ArrayDecodeResult =
  | Readonly<{ ok: true; values: readonly unknown[] }>
  | Readonly<{ ok: false; diagnostic: string }>;

export function decodeRecord(value: unknown, path: string): RecordDecodeResult {
  if (!isRecord(value)) {
    return {
      ok: false,
      diagnostic: `${path} must be a JSON object.`,
    };
  }

  return {
    ok: true,
    value,
  };
}

export function decodeArrayField(
  value: Record<string, unknown>,
  field: string,
  path: string,
): ArrayFieldDecodeResult {
  const fieldValue = value[field];
  if (!Array.isArray(fieldValue)) {
    return {
      ok: false,
      diagnostic: `${path}.${field} must be an array.`,
    };
  }

  return {
    ok: true,
    value: fieldValue,
  };
}

export function decodeStringField(
  value: Record<string, unknown>,
  field: string,
  path: string,
): StringFieldDecodeResult {
  const fieldValue = value[field];
  if (typeof fieldValue !== "string") {
    return {
      ok: false,
      diagnostic: `${path}.${field} must be a string.`,
    };
  }

  return {
    ok: true,
    value: fieldValue,
  };
}

export function decodeStringPairFields(
  value: Record<string, unknown>,
  firstField: string,
  secondField: string,
  path: string,
): StringPairDecodeResult {
  const first = decodeStringField(value, firstField, path);
  if (!first.ok) {
    return {
      ok: false,
      diagnostic: first.diagnostic,
    };
  }

  const second = decodeStringField(value, secondField, path);
  if (!second.ok) {
    return {
      ok: false,
      diagnostic: second.diagnostic,
    };
  }

  return {
    ok: true,
    first: first.value,
    second: second.value,
  };
}

export function decodeNumberField(
  value: Record<string, unknown>,
  field: string,
  path: string,
): NumberFieldDecodeResult {
  const fieldValue = value[field];
  if (typeof fieldValue !== "number") {
    return {
      ok: false,
      diagnostic: `${path}.${field} must be a number.`,
    };
  }

  return {
    ok: true,
    value: fieldValue,
  };
}

export function decodeStringTuple(value: unknown, path: string, length: number): StringTupleDecodeResult {
  const array = decodeStringArray(value, path, length);
  if (!array.ok) {
    return {
      ok: false,
      diagnostic: array.diagnostic,
    };
  }

  return {
    ok: true,
    values: array.values,
  };
}

function decodeStringArray(value: unknown, path: string, length: number): StringArrayDecodeResult {
  const array = decodeFixedArray(value, path, length);
  if (!array.ok) {
    return {
      ok: false,
      diagnostic: array.diagnostic,
    };
  }

  return decodeStringElements(array.values, path, length);
}

function decodeFixedArray(value: unknown, path: string, length: number): FixedArrayDecodeResult {
  const array = decodeArray(value, path, length);
  if (!array.ok) {
    return {
      ok: false,
      diagnostic: array.diagnostic,
    };
  }

  if (array.values.length !== length) {
    return {
      ok: false,
      diagnostic: `${path} must be an array of ${length} strings.`,
    };
  }

  return {
    ok: true,
    values: array.values,
  };
}

function decodeArray(value: unknown, path: string, length: number): ArrayDecodeResult {
  if (!Array.isArray(value)) {
    return {
      ok: false,
      diagnostic: `${path} must be an array of ${length} strings.`,
    };
  }

  return {
    ok: true,
    values: value,
  };
}

function decodeStringElements(
  values: readonly unknown[],
  path: string,
  length: number,
): StringArrayDecodeResult {
  const strings: string[] = [];
  for (const item of values) {
    if (typeof item !== "string") {
      return {
        ok: false,
        diagnostic: `${path} must be an array of ${length} strings.`,
      };
    }
    strings.push(item);
  }

  return {
    ok: true,
    values: strings,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
