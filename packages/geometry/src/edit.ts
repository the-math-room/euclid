import type { Construction, ConstructionId, ConstructionProgram, Point2 } from "./model";
import { generateNextPointLabel } from "./names";

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
): ConstructionProgram {
  if (points[0] === points[1]) {
    return program;
  }

  const existing = program.constructions.find(
    (construction) => construction.kind === "line-through" && sameIdSet(construction.points, points),
  );

  if (existing) {
    return program;
  }

  const label = points.join("");
  const id = uniqueConstructionId(program, `line-${slugFor(points[0])}-${slugFor(points[1])}`);

  return {
    constructions: [
      ...program.constructions,
      {
        id,
        kind: "line-through",
        label,
        points,
      },
    ],
  };
}

export function addLineLineIntersection(
  program: ConstructionProgram,
  lines: readonly [ConstructionId, ConstructionId],
): ConstructionProgram {
  if (lines[0] === lines[1]) {
    return program;
  }

  const existing = program.constructions.find(
    (construction) => construction.kind === "line-line-intersection" && sameIdSet(construction.lines, lines),
  );

  if (existing) {
    return program;
  }

  const id = uniqueConstructionId(program, `intersection-${slugFor(lines[0])}-${slugFor(lines[1])}`);

  return {
    constructions: [
      ...program.constructions,
      {
        id,
        kind: "line-line-intersection",
        label: generateNextPointLabel(program.constructions),
        lines,
      },
    ],
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
): ConstructionProgram {
  if (center === pointOnCircle) {
    return program;
  }

  const existing = program.constructions.find(
    (construction) =>
      construction.kind === "circle-through" &&
      construction.center === center &&
      construction.pointOnCircle === pointOnCircle,
  );

  if (existing) {
    return program;
  }

  const id = uniqueConstructionId(program, `circle-${slugFor(center)}-${slugFor(pointOnCircle)}`);

  return {
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
  };
}

export function addCircleThreePoints(
  program: ConstructionProgram,
  points: readonly [ConstructionId, ConstructionId, ConstructionId],
): ConstructionProgram {
  if (points[0] === points[1] || points[1] === points[2] || points[2] === points[0]) {
    return program;
  }

  const existing = program.constructions.find(
    (construction) =>
      construction.kind === "circle-three-points" && sameThreeIdSet(construction.points, points),
  );

  if (existing) {
    return program;
  }

  const id = uniqueConstructionId(
    program,
    `circle-${slugFor(points[0])}-${slugFor(points[1])}-${slugFor(points[2])}`,
  );

  return {
    constructions: [
      ...program.constructions,
      {
        id,
        kind: "circle-three-points",
        label: `Circle(${points[0]}${points[1]}${points[2]})`,
        points,
      },
    ],
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
