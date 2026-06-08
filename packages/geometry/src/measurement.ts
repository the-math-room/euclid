import type { MeasurementExpression } from "./model";

export type LinearMeasurementExpression = Readonly<{
  variable?: string;
  coefficient: number;
  constant: number;
}>;

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
