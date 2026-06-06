import type { Construction, ConstructionId, ConstructionProgram, Point2 } from "./model";

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
