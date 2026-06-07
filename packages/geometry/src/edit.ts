import type { Construction, ConstructionId, ConstructionProgram, Point2 } from "./model";
import { generateNextPointLabel } from "./names";

export type AddConstructionResult = Readonly<{
  program: ConstructionProgram;
  id: ConstructionId | undefined;
  changed: boolean;
}>;

export function moveFreePoint(
  program: ConstructionProgram,
  id: ConstructionId,
  position: Point2,
): ConstructionProgram {
  let changed = false;
  const constructions = program.constructions.map((construction): Construction => {
    if (construction.id !== id || construction.kind !== "free-point") {
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
    constructions,
  };
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

  return {
    program: {
      constructions: [
        ...program.constructions,
        {
          id,
          kind: "midpoint",
          label: `Midpoint(${points[0]}, ${points[1]})`,
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

  const pointsToTranslate = new Set<ConstructionId>();

  if (construction.kind === "line-through") {
    pointsToTranslate.add(construction.points[0]);
    pointsToTranslate.add(construction.points[1]);
  } else if (construction.kind === "circle-through") {
    pointsToTranslate.add(construction.center);
    pointsToTranslate.add(construction.pointOnCircle);
  } else if (construction.kind === "circle-three-points") {
    pointsToTranslate.add(construction.points[0]);
    pointsToTranslate.add(construction.points[1]);
    pointsToTranslate.add(construction.points[2]);
  } else if (construction.kind === "parallel-line" || construction.kind === "perpendicular-line") {
    pointsToTranslate.add(construction.point);
  } else if (construction.kind === "midpoint") {
    pointsToTranslate.add(construction.points[0]);
    pointsToTranslate.add(construction.points[1]);
  }

  if (pointsToTranslate.size === 0) {
    return program;
  }

  let changed = false;
  const constructions = program.constructions.map((c): Construction => {
    if (c.kind === "free-point" && pointsToTranslate.has(c.id)) {
      changed = true;
      return {
        ...c,
        position: {
          x: c.position.x + delta.x,
          y: c.position.y + delta.y,
        },
      };
    }
    return c;
  });

  if (!changed) {
    return program;
  }

  return {
    constructions,
  };
}
