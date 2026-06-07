import {
  addCircleCircleIntersection,
  addLineCircleIntersection,
  addLineLineIntersection,
  generateNextPointLabel,
} from "@euclid/geometry";
import type {
  AddConstructionResult,
  Construction,
  ConstructionId,
  ConstructionProgram,
  WorldPoint,
} from "@euclid/geometry";
import type { IntersectionHit } from "@euclid/rendering";

export type PointInput =
  | Readonly<{ kind: "existing-point"; id: ConstructionId }>
  | Readonly<{ kind: "free-point"; position: WorldPoint }>
  | Readonly<{ kind: "intersection"; hit: IntersectionHit }>;

export type ResolvedPointInput = Readonly<{
  program: ConstructionProgram;
  id?: ConstructionId;
  changed: boolean;
}>;

export function resolvePointInput(program: ConstructionProgram, input: PointInput): ResolvedPointInput {
  if (input.kind === "existing-point") {
    return {
      program,
      id: input.id,
      changed: false,
    };
  }

  if (input.kind === "free-point") {
    const label = generateNextPointLabel(program.constructions);
    const point: Construction = {
      id: label,
      kind: "free-point",
      label,
      position: input.position,
    };

    return {
      program: {
        constructions: [...program.constructions, point],
      },
      id: point.id,
      changed: true,
    };
  }

  return resolveIntersectionPointInput(program, input.hit);
}

function resolveIntersectionPointInput(
  program: ConstructionProgram,
  hit: IntersectionHit,
): ResolvedPointInput {
  const result = addIntersection(program, hit);
  return {
    program: result.program,
    id: result.id,
    changed: result.changed,
  };
}

function addIntersection(program: ConstructionProgram, hit: IntersectionHit): AddConstructionResult {
  if (hit.kind === "line-line-intersection") {
    return addLineLineIntersection(program, hit.lines);
  }

  if (hit.kind === "line-circle-intersection") {
    return addLineCircleIntersection(program, hit.line, hit.circle, hit.intersectionIndex);
  }

  if (hit.kind === "circle-circle-intersection") {
    return addCircleCircleIntersection(program, hit.firstCircle, hit.secondCircle, hit.intersectionIndex);
  }

  const _exhaustiveCheck: never = hit;
  return _exhaustiveCheck;
}
