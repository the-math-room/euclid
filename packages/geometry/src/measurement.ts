import type {
  ConstructionId,
  ConstructionProgram,
  Evaluation,
  MeasurementExpression,
  SegmentLengthAssertion,
  WorldPoint,
} from "./model";

const defaultUnitLength = 1;
const defaultMeasurementTolerance = 1e-6;

export type LinearMeasurementExpression = Readonly<{
  variable?: string;
  coefficient: number;
  constant: number;
}>;

export type MeasurementDiagnostic = Readonly<{
  measurementId?: string;
  code:
    | "measurement:invalid-unit-length"
    | "measurement:unrealized-endpoint"
    | "measurement:invalid-expression"
    | "measurement:unassigned-variable"
    | "measurement:length-mismatch"
    | "measurement:non-positive-expression";
  message: string;
}>;

export type EvaluatedSegmentLengthAssertion = Readonly<{
  assertion: SegmentLengthAssertion;
  intent: "asserted" | "driving";
  from: WorldPoint;
  to: WorldPoint;
  actualWorldLength: number;
  actualUnitLength: number;
  expression?: LinearMeasurementExpression;
  expressionValue?: number;
  variable?: string;
  status: "satisfied" | "unresolved" | "invalid" | "mismatch";
  diagnostic?: MeasurementDiagnostic;
}>;

export type MeasurementEvaluation = Readonly<{
  unitLength: number;
  variables: Readonly<Record<string, number>>;
  segments: readonly EvaluatedSegmentLengthAssertion[];
  diagnostics: readonly MeasurementDiagnostic[];
}>;

export function evaluateMeasurements(
  program: ConstructionProgram,
  evaluation: Evaluation,
  options?: { tolerance?: number },
): MeasurementEvaluation {
  const unitLength = resolvedUnitLength(program.measurementSettings?.unitLength);
  const variables = program.measurementSettings?.variables ?? {};
  const diagnostics: MeasurementDiagnostic[] = [];
  const segments: EvaluatedSegmentLengthAssertion[] = [];

  if (unitLength === undefined) {
    diagnostics.push({
      code: "measurement:invalid-unit-length",
      message: "Measurement unit length must be a positive finite number.",
    });
  }

  const points = realizedPointsById(evaluation);
  const effectiveUnitLength = unitLength ?? defaultUnitLength;
  const tolerance = options?.tolerance ?? defaultMeasurementTolerance;

  for (const assertion of program.measurements ?? []) {
    const intent = assertion.intent ?? "asserted";
    const from = points.get(assertion.from);
    const to = points.get(assertion.to);
    if (!from || !to) {
      diagnostics.push({
        measurementId: assertion.id,
        code: "measurement:unrealized-endpoint",
        message: "Measurement endpoints must be realized points.",
      });
      continue;
    }

    const actualWorldLength = distance(from, to);
    const actualUnitLength = actualWorldLength / effectiveUnitLength;
    const expression = parseLinearMeasurementExpression(assertion.length);
    if (!expression) {
      const diagnostic = {
        measurementId: assertion.id,
        code: "measurement:invalid-expression" as const,
        message: "Measurement length must be a finite number or one-variable linear expression.",
      };
      diagnostics.push(diagnostic);
      segments.push({
        assertion,
        intent,
        from,
        to,
        actualWorldLength,
        actualUnitLength,
        status: "invalid",
        diagnostic,
      });
      continue;
    }

    const variableValue = expression.variable === undefined ? 0 : variables[expression.variable];
    if (variableValue === undefined) {
      const diagnostic = {
        measurementId: assertion.id,
        code: "measurement:unassigned-variable" as const,
        message: `Variable ${expression.variable} needs a value before this measurement can be checked.`,
      };
      diagnostics.push(diagnostic);
      segments.push({
        assertion,
        intent,
        from,
        to,
        actualWorldLength,
        actualUnitLength,
        expression,
        variable: expression.variable,
        status: "unresolved",
        diagnostic,
      });
      continue;
    }

    const expressionValue = evaluateLinearMeasurementExpression(expression, variableValue);
    if (expressionValue <= 0) {
      const diagnostic = {
        measurementId: assertion.id,
        code: "measurement:non-positive-expression" as const,
        message: "Measurement expressions must evaluate to a positive length.",
      };
      diagnostics.push(diagnostic);
      segments.push({
        assertion,
        intent,
        from,
        to,
        actualWorldLength,
        actualUnitLength,
        expression,
        expressionValue,
        variable: expression.variable,
        status: "invalid",
        diagnostic,
      });
      continue;
    }

    const delta = Math.abs(actualUnitLength - expressionValue);
    if (delta > tolerance) {
      const diagnostic = {
        measurementId: assertion.id,
        code: "measurement:length-mismatch" as const,
        message: `Measured segment is ${formatMeasurementValue(actualUnitLength)} units, but the expression evaluates to ${formatMeasurementValue(expressionValue)}.`,
      };
      diagnostics.push(diagnostic);
      segments.push({
        assertion,
        intent,
        from,
        to,
        actualWorldLength,
        actualUnitLength,
        expression,
        expressionValue,
        variable: expression.variable,
        status: "mismatch",
        diagnostic,
      });
      continue;
    }

    segments.push({
      assertion,
      intent,
      from,
      to,
      actualWorldLength,
      actualUnitLength,
      expression,
      expressionValue,
      variable: expression.variable,
      status: "satisfied",
    });
  }

  return {
    unitLength: effectiveUnitLength,
    variables,
    segments,
    diagnostics,
  };
}

export function parseLinearMeasurementExpression(
  expression: MeasurementExpression,
): LinearMeasurementExpression | undefined {
  if (typeof expression === "number") {
    return Number.isFinite(expression)
      ? {
          coefficient: 0,
          constant: expression,
        }
      : undefined;
  }

  const normalized = expression.replaceAll(/\s+/g, "");
  if (normalized.length === 0) {
    return undefined;
  }

  const terms = splitTerms(normalized);
  if (terms.length === 0) {
    return undefined;
  }

  let variable: string | undefined;
  let coefficient = 0;
  let constant = 0;

  for (const term of terms) {
    const parsedTerm = parseTerm(term);
    if (!parsedTerm) {
      return undefined;
    }

    if (parsedTerm.variable) {
      if (variable && variable !== parsedTerm.variable) {
        return undefined;
      }
      variable = parsedTerm.variable;
      coefficient += parsedTerm.coefficient;
    } else {
      constant += parsedTerm.constant;
    }
  }

  return {
    ...(variable === undefined ? {} : { variable }),
    coefficient,
    constant,
  };
}

export function evaluateLinearMeasurementExpression(
  expression: LinearMeasurementExpression,
  variableValue = 0,
): number {
  return expression.coefficient * variableValue + expression.constant;
}

export function variablesInMeasurementExpressions(
  expressions: readonly MeasurementExpression[],
): readonly string[] {
  const variables = new Set<string>();

  for (const expression of expressions) {
    const parsed = parseLinearMeasurementExpression(expression);
    if (parsed?.variable) {
      variables.add(parsed.variable);
    }
  }

  return [...variables].sort();
}

export function formatMeasurementExpression(expression: MeasurementExpression): string {
  return typeof expression === "number" ? formatMeasurementValue(expression) : expression;
}

export function formatMeasurementValue(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return Number(value.toFixed(4)).toString();
}

function resolvedUnitLength(unitLength: number | undefined): number | undefined {
  if (unitLength === undefined) {
    return defaultUnitLength;
  }
  return Number.isFinite(unitLength) && unitLength > 0 ? unitLength : undefined;
}

function realizedPointsById(evaluation: Evaluation): ReadonlyMap<ConstructionId, WorldPoint> {
  return new Map(
    evaluation.primitives
      .filter((primitive) => primitive.kind === "point")
      .map((primitive) => [primitive.id, primitive.position]),
  );
}

function distance(a: WorldPoint, b: WorldPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function splitTerms(expression: string): readonly string[] {
  const terms: string[] = [];
  let start = 0;

  for (let index = 1; index < expression.length; index++) {
    const char = expression[index];
    if (char === "+" || char === "-") {
      terms.push(expression.slice(start, index));
      start = index;
    }
  }

  terms.push(expression.slice(start));
  return terms.filter((term) => term.length > 0 && term !== "+");
}

function parseTerm(term: string): LinearMeasurementExpression | undefined {
  const variableMatch = term.match(
    /^([+-]?(?:\d+(?:\.\d+)?|\.\d+)?)\*?([A-Za-z]\w*)(?:\/([+-]?(?:\d+(?:\.\d+)?|\.\d+)))?$/,
  );

  if (variableMatch) {
    const coefficientText = variableMatch[1] ?? "";
    const denominatorText = variableMatch[3];
    const rawCoefficient =
      coefficientText === "" || coefficientText === "+"
        ? 1
        : coefficientText === "-"
          ? -1
          : Number(coefficientText);
    const denominator = denominatorText === undefined ? 1 : Number(denominatorText);

    if (!Number.isFinite(rawCoefficient) || !Number.isFinite(denominator) || denominator === 0) {
      return undefined;
    }

    return {
      variable: variableMatch[2],
      coefficient: rawCoefficient / denominator,
      constant: 0,
    };
  }

  const constant = parseNumberOrFraction(term);
  if (constant === undefined) {
    return undefined;
  }

  return {
    coefficient: 0,
    constant,
  };
}

function parseNumberOrFraction(term: string): number | undefined {
  const fractionMatch = term.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\/([+-]?(?:\d+(?:\.\d+)?|\.\d+))$/);

  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
      return undefined;
    }
    return numerator / denominator;
  }

  const value = Number(term);
  return Number.isFinite(value) ? value : undefined;
}
