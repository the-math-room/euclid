import type {
  Construction,
  ConstructionId,
  ConstructionProgram,
  Evaluation,
  MeasurementExpression,
  MeasurementId,
  MeasurementIntent,
  Point2,
  PointMobility,
  SegmentLengthMeasurement,
  ShapeRole,
  WorldPoint,
} from "./model";
import { circleCircleIntersections, cross } from "./approx";
import { toWorldPoint } from "./model";
import { evaluateMeasurements } from "./measurement";
import type { EvaluatedSegmentLengthMeasurement } from "./measurement";
import { generateNextPointLabel } from "./names";

export type AddConstructionResult = Readonly<{
  program: ConstructionProgram;
  id: ConstructionId | undefined;
  changed: boolean;
}>;

export type UpsertSegmentLengthMeasurementResult = Readonly<{
  program: ConstructionProgram;
  id: MeasurementId | undefined;
  changed: boolean;
}>;

export type MeasurementConstraintBehavior = "calibrate-unit" | "move-free-endpoint";

export type ApplyMeasurementConstraintResult =
  | Readonly<{
      ok: true;
      program: ConstructionProgram;
      changed: boolean;
      message: string;
    }>
  | Readonly<{
      ok: false;
      program: ConstructionProgram;
      code:
        | "measurement:not-found"
        | "measurement:not-constraint"
        | "measurement:not-evaluable"
        | "measurement:no-movable-endpoint"
        | "measurement:ambiguous-movable-endpoint"
        | "measurement:missing-endpoint"
        | "measurement:coincident-endpoints"
        | "measurement:unsolvable-constraint-system"
        | "measurement:unsupported-constraint-system";
      message: string;
    }>;

export type MeasurementConstraintOptions = Readonly<{
  canMoveConstruction?: (construction: Construction) => boolean;
}>;

type MovableEndpointConstraint = Readonly<{
  movingId: ConstructionId;
  fixedId: ConstructionId;
  fixedPoint: WorldPoint;
  movingPoint: WorldPoint;
  targetWorldLength: number;
}>;

export function addFreePoint(program: ConstructionProgram, position: WorldPoint): AddConstructionResult {
  const label = generateNextPointLabel(program.constructions);

  return {
    program: {
      ...program,
      constructions: [
        ...program.constructions,
        {
          id: label,
          kind: "free-point",
          label,
          position,
        },
      ],
    },
    id: label,
    changed: true,
  };
}

export function moveFreePoint(
  program: ConstructionProgram,
  id: ConstructionId,
  position: WorldPoint,
): ConstructionProgram {
  let changed = false;
  const constructions = program.constructions.map((construction): Construction => {
    if (construction.id !== id || construction.kind !== "free-point") {
      return construction;
    }

    if ((construction.mobility ?? "free") === "fixed") {
      return construction;
    }

    if (construction.position.x === position.x && construction.position.y === position.y) {
      return construction;
    }

    changed = true;
    return {
      ...construction,
      position,
    };
  });

  if (!changed) {
    return program;
  }

  return {
    ...program,
    constructions,
  };
}

export function setConstructionShapeRole(
  program: ConstructionProgram,
  id: ConstructionId,
  shapeRole: ShapeRole,
): ConstructionProgram {
  let changed = false;
  const constructions = program.constructions.map((construction): Construction => {
    if (construction.id !== id || !isShapeConstruction(construction)) {
      return construction;
    }

    if ((construction.shapeRole ?? "primary") === shapeRole) {
      return construction;
    }

    changed = true;
    if (shapeRole === "primary") {
      const next = { ...construction };
      delete next.shapeRole;
      return next;
    }

    return {
      ...construction,
      shapeRole,
    };
  });

  if (!changed) {
    return program;
  }

  return {
    ...program,
    constructions,
  };
}

export function setFreePointMobility(
  program: ConstructionProgram,
  id: ConstructionId,
  mobility: PointMobility,
): ConstructionProgram {
  let changed = false;
  const constructions = program.constructions.map((construction): Construction => {
    if (construction.id !== id || construction.kind !== "free-point") {
      return construction;
    }

    if ((construction.mobility ?? "free") === mobility) {
      return construction;
    }

    changed = true;
    if (mobility === "free") {
      const next = { ...construction };
      delete next.mobility;
      return next;
    }

    return {
      ...construction,
      mobility,
    };
  });

  if (!changed) {
    return program;
  }

  return {
    ...program,
    constructions,
  };
}

export function setMeasurementUnitLength(
  program: ConstructionProgram,
  unitLength: number | undefined,
): ConstructionProgram {
  const current = program.measurementSettings?.unitLength ?? 1;
  if (unitLength === undefined || unitLength === 1) {
    if (program.measurementSettings?.unitLength === undefined) {
      return program;
    }
    return withMeasurementSettings(program, {
      ...program.measurementSettings,
      unitLength: undefined,
    });
  }

  if (!Number.isFinite(unitLength) || unitLength <= 0 || current === unitLength) {
    return program;
  }

  return withMeasurementSettings(program, {
    ...program.measurementSettings,
    unitLength,
  });
}

export function setMeasurementVariableValue(
  program: ConstructionProgram,
  variable: string,
  value: number | undefined,
): ConstructionProgram {
  const normalizedVariable = variable.trim();
  if (!isMeasurementVariableName(normalizedVariable)) {
    return program;
  }

  const variables = program.measurementSettings?.variables ?? {};
  if (value === undefined) {
    if (variables[normalizedVariable] === undefined) {
      return program;
    }
    const nextVariables = Object.fromEntries(
      Object.entries(variables).filter(([name]) => name !== normalizedVariable),
    );
    return withMeasurementSettings(program, {
      ...program.measurementSettings,
      variables: Object.keys(nextVariables).length === 0 ? undefined : nextVariables,
    });
  }

  if (!Number.isFinite(value) || variables[normalizedVariable] === value) {
    return program;
  }

  return withMeasurementSettings(program, {
    ...program.measurementSettings,
    variables: {
      ...variables,
      [normalizedVariable]: value,
    },
  });
}

export function upsertSegmentLengthMeasurement(
  program: ConstructionProgram,
  nextMeasurement: SegmentLengthMeasurement,
): UpsertSegmentLengthMeasurementResult {
  if (nextMeasurement.from === nextMeasurement.to) {
    return unchanged(program);
  }

  const existingIndex = (program.measurements ?? []).findIndex(
    (measurement) =>
      measurement.id === nextMeasurement.id ||
      sameIdSet([measurement.from, measurement.to], [nextMeasurement.from, nextMeasurement.to]),
  );
  const measurements =
    existingIndex === -1
      ? [...(program.measurements ?? []), nextMeasurement]
      : (program.measurements ?? []).map((measurement, index) =>
          index === existingIndex ? { ...nextMeasurement, id: measurement.id } : measurement,
        );
  const existing = existingIndex === -1 ? undefined : (program.measurements ?? [])[existingIndex];

  if (existing && sameSegmentLengthMeasurement(existing, measurements[existingIndex])) {
    return unchanged(program, existing.id);
  }

  const id = existing?.id ?? nextMeasurement.id;
  return {
    program: {
      ...program,
      measurements,
    },
    id,
    changed: true,
  };
}

export function removeSegmentLengthMeasurement(
  program: ConstructionProgram,
  id: MeasurementId,
): ConstructionProgram {
  const measurements = program.measurements ?? [];
  const nextMeasurements = measurements.filter((measurement) => measurement.id !== id);
  if (nextMeasurements.length === measurements.length) {
    return program;
  }

  return {
    ...program,
    measurements: nextMeasurements.length === 0 ? undefined : nextMeasurements,
  };
}

export function applyMeasurementConstraint(
  program: ConstructionProgram,
  evaluation: Evaluation,
  id: MeasurementId,
  behavior: MeasurementConstraintBehavior,
  options: MeasurementConstraintOptions = {},
): ApplyMeasurementConstraintResult {
  const measurement = (program.measurements ?? []).find((candidate) => candidate.id === id);
  if (!measurement) {
    return applyMeasurementConstraintFailure(program, "measurement:not-found", "Measurement was not found.");
  }

  if ((measurement.intent ?? "check") !== "constraint") {
    return applyMeasurementConstraintFailure(
      program,
      "measurement:not-constraint",
      "Only constraint measurements can be applied.",
    );
  }

  const measurementEvaluation = evaluateMeasurements(program, evaluation);
  const segment = measurementEvaluation.segments.find((candidate) => candidate.measurement.id === id);
  if (!segment || segment.expressionValue === undefined || segment.expressionValue <= 0) {
    const diagnostic = measurementEvaluation.diagnostics.find((candidate) => candidate.measurementId === id);
    return applyMeasurementConstraintFailure(
      program,
      "measurement:not-evaluable",
      diagnostic?.message ??
        "Measurement must evaluate to a positive target length before it can be applied.",
    );
  }

  if (behavior === "calibrate-unit") {
    const unitLength = segment.actualWorldLength / segment.expressionValue;
    const nextProgram = setMeasurementUnitLength(program, unitLength);
    return {
      ok: true,
      program: nextProgram,
      changed: nextProgram !== program,
      message: `Unit scale calibrated to ${formatAppliedNumber(unitLength)} world units per measurement unit.`,
    };
  }

  return applyMeasurementConstraintByMovingFreeEndpoint(
    program,
    measurementEvaluation.segments,
    segment,
    measurementEvaluation.unitLength,
    options,
  );
}

export function addLineThroughPoints(
  program: ConstructionProgram,
  points: readonly [ConstructionId, ConstructionId],
): AddConstructionResult {
  if (points[0] === points[1]) {
    return unchanged(program);
  }

  const existing = program.constructions.find(
    (construction) => construction.kind === "line-through" && sameIdSet(construction.points, points),
  );

  if (existing) {
    return unchanged(program, existing.id);
  }

  const label = points.join("");
  const id = uniqueConstructionId(program, `line-${slugFor(points[0])}-${slugFor(points[1])}`);

  return {
    program: {
      ...program,
      constructions: [
        ...program.constructions,
        {
          id,
          kind: "line-through",
          label,
          points,
        },
      ],
    },
    id,
    changed: true,
  };
}

export function addLineLineIntersection(
  program: ConstructionProgram,
  lines: readonly [ConstructionId, ConstructionId],
): AddConstructionResult {
  if (lines[0] === lines[1]) {
    return unchanged(program);
  }

  const existing = program.constructions.find(
    (construction) => construction.kind === "line-line-intersection" && sameIdSet(construction.lines, lines),
  );

  if (existing) {
    return unchanged(program, existing.id);
  }

  const id = uniqueConstructionId(program, `intersection-${slugFor(lines[0])}-${slugFor(lines[1])}`);

  return {
    program: {
      ...program,
      constructions: [
        ...program.constructions,
        {
          id,
          kind: "line-line-intersection",
          label: generateNextPointLabel(program.constructions),
          lines,
        },
      ],
    },
    id,
    changed: true,
  };
}

function uniqueConstructionId(program: ConstructionProgram, baseId: ConstructionId): ConstructionId {
  const used = new Set(program.constructions.map((construction) => construction.id));

  if (!used.has(baseId)) {
    return baseId;
  }

  let suffix = 2;
  while (used.has(`${baseId}-${suffix}`)) {
    suffix++;
  }

  return `${baseId}-${suffix}`;
}

export function addCircleThroughPoints(
  program: ConstructionProgram,
  center: ConstructionId,
  pointOnCircle: ConstructionId,
): AddConstructionResult {
  if (center === pointOnCircle) {
    return unchanged(program);
  }

  const existing = program.constructions.find(
    (construction) =>
      construction.kind === "circle-through" &&
      construction.center === center &&
      construction.pointOnCircle === pointOnCircle,
  );

  if (existing) {
    return unchanged(program, existing.id);
  }

  const id = uniqueConstructionId(program, `circle-${slugFor(center)}-${slugFor(pointOnCircle)}`);

  return {
    program: {
      ...program,
      constructions: [
        ...program.constructions,
        {
          id,
          kind: "circle-through",
          label: `Circle(${center}, ${pointOnCircle})`,
          center,
          pointOnCircle,
        },
      ],
    },
    id,
    changed: true,
  };
}

export function addCircleThreePoints(
  program: ConstructionProgram,
  points: readonly [ConstructionId, ConstructionId, ConstructionId],
): AddConstructionResult {
  if (points[0] === points[1] || points[1] === points[2] || points[2] === points[0]) {
    return unchanged(program);
  }

  const existing = program.constructions.find(
    (construction) =>
      construction.kind === "circle-three-points" && sameThreeIdSet(construction.points, points),
  );

  if (existing) {
    return unchanged(program, existing.id);
  }

  const id = uniqueConstructionId(
    program,
    `circle-${slugFor(points[0])}-${slugFor(points[1])}-${slugFor(points[2])}`,
  );

  return {
    program: {
      ...program,
      constructions: [
        ...program.constructions,
        {
          id,
          kind: "circle-three-points",
          label: `Circle(${points[0]}${points[1]}${points[2]})`,
          points,
        },
      ],
    },
    id,
    changed: true,
  };
}

export function addLineCircleIntersection(
  program: ConstructionProgram,
  line: ConstructionId,
  circle: ConstructionId,
  intersectionIndex: 0 | 1,
): AddConstructionResult {
  const existing = program.constructions.find(
    (construction) =>
      construction.kind === "line-circle-intersection" &&
      construction.line === line &&
      construction.circle === circle &&
      construction.intersectionIndex === intersectionIndex,
  );

  if (existing) {
    return unchanged(program, existing.id);
  }

  const id = uniqueConstructionId(
    program,
    `intersection-${slugFor(line)}-${slugFor(circle)}-${intersectionIndex}`,
  );

  return {
    program: {
      ...program,
      constructions: [
        ...program.constructions,
        {
          id,
          kind: "line-circle-intersection",
          label: generateNextPointLabel(program.constructions),
          line,
          circle,
          intersectionIndex,
        },
      ],
    },
    id,
    changed: true,
  };
}

export function addCircleCircleIntersection(
  program: ConstructionProgram,
  firstCircle: ConstructionId,
  secondCircle: ConstructionId,
  intersectionIndex: 0 | 1,
): AddConstructionResult {
  const [c1, c2] = [firstCircle, secondCircle].sort();
  if (c1 === c2) {
    return unchanged(program);
  }

  const existing = program.constructions.find(
    (construction) =>
      construction.kind === "circle-circle-intersection" &&
      construction.firstCircle === c1 &&
      construction.secondCircle === c2 &&
      construction.intersectionIndex === intersectionIndex,
  );

  if (existing) {
    return unchanged(program, existing.id);
  }

  const id = uniqueConstructionId(program, `intersection-${slugFor(c1)}-${slugFor(c2)}-${intersectionIndex}`);

  return {
    program: {
      ...program,
      constructions: [
        ...program.constructions,
        {
          id,
          kind: "circle-circle-intersection",
          label: generateNextPointLabel(program.constructions),
          firstCircle: c1,
          secondCircle: c2,
          intersectionIndex,
        },
      ],
    },
    id,
    changed: true,
  };
}

export function addParallelLine(
  program: ConstructionProgram,
  line: ConstructionId,
  point: ConstructionId,
): AddConstructionResult {
  const existing = program.constructions.find(
    (construction) =>
      construction.kind === "parallel-line" && construction.line === line && construction.point === point,
  );

  if (existing) {
    return unchanged(program, existing.id);
  }

  const id = uniqueConstructionId(program, `parallel-${slugFor(line)}-${slugFor(point)}`);

  return {
    program: {
      ...program,
      constructions: [
        ...program.constructions,
        {
          id,
          kind: "parallel-line",
          label: `Parallel(${line}, ${point})`,
          line,
          point,
        },
      ],
    },
    id,
    changed: true,
  };
}

export function addPerpendicularLine(
  program: ConstructionProgram,
  line: ConstructionId,
  point: ConstructionId,
): AddConstructionResult {
  const existing = program.constructions.find(
    (construction) =>
      construction.kind === "perpendicular-line" &&
      construction.line === line &&
      construction.point === point,
  );

  if (existing) {
    return unchanged(program, existing.id);
  }

  const id = uniqueConstructionId(program, `perpendicular-${slugFor(line)}-${slugFor(point)}`);

  return {
    program: {
      ...program,
      constructions: [
        ...program.constructions,
        {
          id,
          kind: "perpendicular-line",
          label: `Perpendicular(${line}, ${point})`,
          line,
          point,
        },
      ],
    },
    id,
    changed: true,
  };
}

export function addMidpoint(
  program: ConstructionProgram,
  points: readonly [ConstructionId, ConstructionId],
): AddConstructionResult {
  if (points[0] === points[1]) {
    return unchanged(program);
  }

  const existing = program.constructions.find(
    (construction) => construction.kind === "midpoint" && sameIdSet(construction.points, points),
  );

  if (existing) {
    return unchanged(program, existing.id);
  }

  const id = uniqueConstructionId(program, `midpoint-${slugFor(points[0])}-${slugFor(points[1])}`);
  const label = generateNextPointLabel(program.constructions);

  return {
    program: {
      ...program,
      constructions: [
        ...program.constructions,
        {
          id,
          kind: "midpoint",
          label,
          points,
        },
      ],
    },
    id,
    changed: true,
  };
}

function unchanged(program: ConstructionProgram, id?: ConstructionId): AddConstructionResult {
  return {
    program,
    id,
    changed: false,
  };
}

function applyMeasurementConstraintByMovingFreeEndpoint(
  program: ConstructionProgram,
  segments: readonly EvaluatedSegmentLengthMeasurement[],
  segment: EvaluatedSegmentLengthMeasurement,
  unitLength: number,
  options: MeasurementConstraintOptions,
): ApplyMeasurementConstraintResult {
  const selectedConstraint = movableEndpointConstraintFor(program, segment, unitLength, options);
  if (!selectedConstraint.ok) {
    return selectedConstraint.failure;
  }

  const peerConstraints = segments
    .filter((candidate) => candidate.intent === "constraint")
    .map((candidate) => movableEndpointConstraintFor(program, candidate, unitLength, options))
    .filter(
      (
        candidate,
      ): candidate is Readonly<{
        ok: true;
        constraint: MovableEndpointConstraint;
      }> => candidate.ok,
    )
    .map((candidate) => candidate.constraint)
    .filter((candidate) => candidate.movingId === selectedConstraint.constraint.movingId);

  if (peerConstraints.length > 2) {
    return applyMeasurementConstraintFailure(
      program,
      "measurement:unsupported-constraint-system",
      "Constraint solving currently supports at most two distance constraints for one movable point.",
    );
  }

  if (peerConstraints.length === 2) {
    const twoConstraintProgram = applyTwoDistanceConstraintSolve(program, peerConstraints);
    if (!twoConstraintProgram) {
      return applyMeasurementConstraintFailure(
        program,
        "measurement:unsolvable-constraint-system",
        "The two distance constraints do not have a shared point position.",
      );
    }

    return {
      ok: true,
      program: twoConstraintProgram,
      changed: twoConstraintProgram !== program,
      message: `Solved ${selectedConstraint.constraint.movingId} from two distance constraints.`,
    };
  }

  const { movingId, fixedPoint, movingPoint, targetWorldLength } = selectedConstraint.constraint;
  const currentLength = Math.hypot(movingPoint.x - fixedPoint.x, movingPoint.y - fixedPoint.y);
  if (currentLength === 0) {
    return applyMeasurementConstraintFailure(
      program,
      "measurement:coincident-endpoints",
      "Coincident endpoints do not define a direction for moving the free point.",
    );
  }

  const nextPosition = toWorldPoint({
    x: fixedPoint.x + ((movingPoint.x - fixedPoint.x) / currentLength) * targetWorldLength,
    y: fixedPoint.y + ((movingPoint.y - fixedPoint.y) / currentLength) * targetWorldLength,
  });
  const nextProgram = moveFreePoint(program, movingId, nextPosition);

  return {
    ok: true,
    program: nextProgram,
    changed: nextProgram !== program,
    message: `Moved ${movingId} to satisfy the constraint measurement.`,
  };
}

function movableEndpointConstraintFor(
  program: ConstructionProgram,
  segment: EvaluatedSegmentLengthMeasurement,
  unitLength: number,
  options: MeasurementConstraintOptions,
):
  | Readonly<{ ok: true; constraint: MovableEndpointConstraint }>
  | Readonly<{ ok: false; failure: ApplyMeasurementConstraintResult }> {
  const fromConstruction = constructionById(program, segment.measurement.from);
  const toConstruction = constructionById(program, segment.measurement.to);
  if (!fromConstruction || !toConstruction) {
    return {
      ok: false,
      failure: applyMeasurementConstraintFailure(
        program,
        "measurement:missing-endpoint",
        "Measurement endpoint construction was not found.",
      ),
    };
  }

  const fromMovable = canMoveEndpoint(fromConstruction, options);
  const toMovable = canMoveEndpoint(toConstruction, options);
  if (fromMovable && toMovable) {
    return {
      ok: false,
      failure: applyMeasurementConstraintFailure(
        program,
        "measurement:ambiguous-movable-endpoint",
        "Both segment endpoints can move. Select a measurement with exactly one movable free point.",
      ),
    };
  }

  if (!fromMovable && !toMovable) {
    return {
      ok: false,
      failure: applyMeasurementConstraintFailure(
        program,
        "measurement:no-movable-endpoint",
        "Neither segment endpoint can move. A constraint measurement needs exactly one movable free point.",
      ),
    };
  }

  if (segment.expressionValue === undefined || segment.expressionValue <= 0) {
    return {
      ok: false,
      failure: applyMeasurementConstraintFailure(
        program,
        "measurement:not-evaluable",
        "Measurement must evaluate to a positive target length before it can be applied.",
      ),
    };
  }

  return {
    ok: true,
    constraint: {
      movingId: fromMovable ? segment.measurement.from : segment.measurement.to,
      fixedId: fromMovable ? segment.measurement.to : segment.measurement.from,
      fixedPoint: fromMovable ? segment.to : segment.from,
      movingPoint: fromMovable ? segment.from : segment.to,
      targetWorldLength: segment.expressionValue * unitLength,
    },
  };
}

function applyTwoDistanceConstraintSolve(
  program: ConstructionProgram,
  constraints: readonly MovableEndpointConstraint[],
): ConstructionProgram | undefined {
  if (constraints.length !== 2 || constraints[0].fixedId === constraints[1].fixedId) {
    return undefined;
  }

  const [first, second] = constraints;
  const intersections = circleCircleIntersections(
    first.fixedPoint,
    first.targetWorldLength,
    second.fixedPoint,
    second.targetWorldLength,
  );
  const selected = selectIntersectionByOrientation(first, second, intersections);
  if (!selected) {
    return undefined;
  }

  return moveFreePoint(program, first.movingId, toWorldPoint(selected));
}

function selectIntersectionByOrientation(
  first: MovableEndpointConstraint,
  second: MovableEndpointConstraint,
  intersections: readonly Point2[],
): Point2 | undefined {
  if (intersections.length === 0) {
    return undefined;
  }

  const currentOrientation = orientation(first.fixedPoint, second.fixedPoint, first.movingPoint);
  if (currentOrientation !== 0) {
    const sameSide = intersections.find(
      (intersection) => orientation(first.fixedPoint, second.fixedPoint, intersection) === currentOrientation,
    );
    if (sameSide) {
      return sameSide;
    }
  }

  return intersections.reduce((closest, candidate) =>
    distanceSquared(candidate, first.movingPoint) < distanceSquared(closest, first.movingPoint)
      ? candidate
      : closest,
  );
}

function orientation(a: Point2, b: Point2, c: Point2): number {
  return Math.sign(cross({ x: b.x - a.x, y: b.y - a.y }, { x: c.x - a.x, y: c.y - a.y }));
}

function distanceSquared(a: Point2, b: Point2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function canMoveEndpoint(construction: Construction, options: MeasurementConstraintOptions): boolean {
  if (construction.kind !== "free-point") {
    return false;
  }

  if ((construction.mobility ?? "free") === "fixed") {
    return false;
  }

  return options.canMoveConstruction?.(construction) ?? true;
}

function constructionById(program: ConstructionProgram, id: ConstructionId): Construction | undefined {
  return program.constructions.find((construction) => construction.id === id);
}

function applyMeasurementConstraintFailure(
  program: ConstructionProgram,
  code: Extract<ApplyMeasurementConstraintResult, { ok: false }>["code"],
  message: string,
): ApplyMeasurementConstraintResult {
  return {
    ok: false,
    program,
    code,
    message,
  };
}

function formatAppliedNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return Number(value.toFixed(4)).toString();
}

function withMeasurementSettings(
  program: ConstructionProgram,
  settings: ConstructionProgram["measurementSettings"],
): ConstructionProgram {
  const variables = settings?.variables;
  const nextSettings = {
    ...(settings?.unitLength === undefined ? {} : { unitLength: settings.unitLength }),
    ...(variables === undefined || Object.keys(variables).length === 0 ? {} : { variables }),
  };

  if (Object.keys(nextSettings).length === 0) {
    return {
      constructions: program.constructions,
      ...(program.measurements === undefined ? {} : { measurements: program.measurements }),
    };
  }

  return {
    ...program,
    measurementSettings: nextSettings,
  };
}

function isMeasurementVariableName(value: string): boolean {
  return /^[A-Za-z]\w*$/.test(value);
}

function sameSegmentLengthMeasurement(a: SegmentLengthMeasurement, b: SegmentLengthMeasurement): boolean {
  return (
    a.id === b.id &&
    a.kind === b.kind &&
    a.from === b.from &&
    a.to === b.to &&
    a.length === b.length &&
    (a.intent ?? "check") === (b.intent ?? "check") &&
    a.label === b.label
  );
}

export function segmentLengthMeasurementId(from: ConstructionId, to: ConstructionId): MeasurementId {
  return `length-${slugFor(from)}-${slugFor(to)}`;
}

export function segmentLengthMeasurement(
  from: ConstructionId,
  to: ConstructionId,
  length: MeasurementExpression,
  intent: MeasurementIntent = "check",
): SegmentLengthMeasurement {
  return {
    id: segmentLengthMeasurementId(from, to),
    kind: "segment-length",
    from,
    to,
    length,
    ...(intent === "check" ? {} : { intent }),
    label: `${from}${to}`,
  };
}

function sameIdSet(
  a: readonly [ConstructionId, ConstructionId],
  b: readonly [ConstructionId, ConstructionId],
) {
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}

function sameThreeIdSet(
  a: readonly [ConstructionId, ConstructionId, ConstructionId],
  b: readonly [ConstructionId, ConstructionId, ConstructionId],
) {
  const setA = new Set(a);
  return setA.has(b[0]) && setA.has(b[1]) && setA.has(b[2]);
}

function slugFor(id: ConstructionId): string {
  return id
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

export function translateShape(
  program: ConstructionProgram,
  id: ConstructionId,
  delta: Point2,
): ConstructionProgram {
  const construction = program.constructions.find((c) => c.id === id);
  if (!construction) return program;

  const pointsToTranslate = new Set(translatedPointIds(construction));

  if (pointsToTranslate.size === 0) {
    return program;
  }

  let changed = false;
  const constructions = program.constructions.map((c): Construction => {
    if (c.kind === "free-point" && (c.mobility ?? "free") !== "fixed" && pointsToTranslate.has(c.id)) {
      changed = true;
      return {
        ...c,
        position: toWorldPoint({
          x: c.position.x + delta.x,
          y: c.position.y + delta.y,
        }),
      };
    }
    return c;
  });

  if (!changed) {
    return program;
  }

  return {
    ...program,
    constructions,
  };
}

function translatedPointIds(construction: Construction): readonly ConstructionId[] {
  switch (construction.kind) {
    case "free-point":
      return [];
    case "line-through":
      return construction.points;
    case "circle-through":
      return [construction.center, construction.pointOnCircle];
    case "circle-three-points":
      return construction.points;
    case "parallel-line":
    case "perpendicular-line":
      return [construction.point];
    case "midpoint":
      return construction.points;
    case "line-line-intersection":
    case "line-circle-intersection":
    case "circle-circle-intersection":
      return [];
  }
}

function isShapeConstruction(
  construction: Construction,
): construction is Extract<
  Construction,
  { kind: "line-through" | "circle-through" | "circle-three-points" | "parallel-line" | "perpendicular-line" }
> {
  switch (construction.kind) {
    case "line-through":
    case "circle-through":
    case "circle-three-points":
    case "parallel-line":
    case "perpendicular-line":
      return true;
    case "free-point":
    case "line-line-intersection":
    case "line-circle-intersection":
    case "circle-circle-intersection":
    case "midpoint":
      return false;
  }
}
