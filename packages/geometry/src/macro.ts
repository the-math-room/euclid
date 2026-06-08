import { circleCircleIntersections, cross } from "./approx";
import { evaluateConstruction } from "./evaluate";
import type { Construction, ConstructionId, ConstructionProgram, ShapeRole, WorldPoint } from "./model";
import { generateNextPointLabel } from "./names";

export type MacroReference = Readonly<{ input: string }> | Readonly<{ step: string }>;

export type MacroInputDefinition =
  | Readonly<{
      name: string;
      kind: "point";
      distinctFrom?: string;
    }>
  | Readonly<{
      name: string;
      kind: "side-of-line";
      from: MacroReference;
      to: MacroReference;
    }>;

export type MacroIntersectionIndex =
  | 0
  | 1
  | Readonly<{
      kind: "side-of-line";
      from: MacroReference;
      to: MacroReference;
      point: MacroReference;
    }>;

type MacroStepBase = Readonly<{
  bind: string;
  idTemplate: string;
  labelTemplate: string;
}>;

export type MacroStepDefinition =
  | (MacroStepBase &
      Readonly<{
        kind: "line-through";
        points: readonly [MacroReference, MacroReference];
        shapeRole?: ShapeRole;
      }>)
  | (MacroStepBase &
      Readonly<{
        kind: "circle-through";
        center: MacroReference;
        pointOnCircle: MacroReference;
        shapeRole?: ShapeRole;
      }>)
  | (MacroStepBase &
      Readonly<{
        kind: "circle-circle-intersection";
        firstCircle: MacroReference;
        secondCircle: MacroReference;
        intersectionIndex: MacroIntersectionIndex;
      }>);

export type ConstructionMacroDefinition = Readonly<{
  id: string;
  label: string;
  inputs: readonly MacroInputDefinition[];
  steps: readonly MacroStepDefinition[];
  selectedSteps?: readonly string[];
}>;

export type ConstructionMacroInputs = Readonly<{
  pointInputs: Readonly<Record<string, ConstructionId>>;
  sideInputs?: Readonly<Record<string, WorldPoint>>;
}>;

export type ConstructionMacroResult = Readonly<{
  program: ConstructionProgram;
  changed: boolean;
  stepIds: readonly Readonly<{ name: string; id: ConstructionId }>[];
  selectedIds: readonly ConstructionId[];
}>;

type MacroBinding = Readonly<{
  id: ConstructionId;
  label: string;
  position?: WorldPoint;
}>;

export function applyConstructionMacro(
  program: ConstructionProgram,
  definition: ConstructionMacroDefinition,
  inputs: ConstructionMacroInputs,
): ConstructionMacroResult {
  const bindings = initialBindings(program, definition, inputs);
  if (!bindings) {
    return unchanged(program);
  }

  const stepIds: { name: string; id: ConstructionId }[] = [];
  const constructions: Construction[] = [...program.constructions];

  for (const step of definition.steps) {
    const construction = constructionForStep(step, constructions, bindings);
    if (!construction) {
      return unchanged(program);
    }

    constructions.push(construction);
    bindings.set(step.bind, {
      id: construction.id,
      label: construction.label,
    });
    stepIds.push({ name: step.bind, id: construction.id });
  }

  const selectedIds = idsForSelectedSteps(definition, stepIds);

  return {
    program: { constructions },
    changed: stepIds.length > 0,
    stepIds,
    selectedIds,
  };
}

function initialBindings(
  program: ConstructionProgram,
  definition: ConstructionMacroDefinition,
  inputs: ConstructionMacroInputs,
): Map<string, MacroBinding> | undefined {
  const evaluation = evaluateConstruction(program);
  const pointPrimitives = new Map(
    evaluation.primitives
      .filter((primitive) => primitive.kind === "point")
      .map((primitive) => [primitive.id, primitive]),
  );
  const constructionLabels = new Map(
    program.constructions.map((construction) => [construction.id, construction.label]),
  );
  const bindings = new Map<string, MacroBinding>();

  for (const input of definition.inputs) {
    if (input.kind === "point") {
      const id = inputs.pointInputs[input.name];
      const primitive = pointPrimitives.get(id);
      if (!id || !primitive) {
        return undefined;
      }
      if (input.distinctFrom && bindings.get(input.distinctFrom)?.id === id) {
        return undefined;
      }
      bindings.set(input.name, {
        id,
        label: constructionLabels.get(id) ?? id,
        position: primitive.position,
      });
    } else {
      const point = inputs.sideInputs?.[input.name];
      if (!point) {
        return undefined;
      }
      bindings.set(input.name, {
        id: input.name,
        label: input.name,
        position: point,
      });
    }
  }

  return bindings;
}

function constructionForStep(
  step: MacroStepDefinition,
  constructions: readonly Construction[],
  bindings: ReadonlyMap<string, MacroBinding>,
): Construction | undefined {
  const id = uniqueConstructionId(constructions, slugFor(renderTemplate(step.idTemplate, bindings, "id")));
  const label = labelForStep(step, constructions, bindings);

  if (step.kind === "line-through") {
    return {
      id,
      kind: "line-through",
      label,
      ...(step.shapeRole ? { shapeRole: step.shapeRole } : {}),
      points: [idFor(step.points[0], bindings), idFor(step.points[1], bindings)],
    };
  }

  if (step.kind === "circle-through") {
    return {
      id,
      kind: "circle-through",
      label,
      ...(step.shapeRole ? { shapeRole: step.shapeRole } : {}),
      center: idFor(step.center, bindings),
      pointOnCircle: idFor(step.pointOnCircle, bindings),
    };
  }

  const intersectionIndex = resolveIntersectionIndex(step.intersectionIndex, bindings);
  if (intersectionIndex === undefined) {
    return undefined;
  }

  return {
    id,
    kind: "circle-circle-intersection",
    label,
    firstCircle: idFor(step.firstCircle, bindings),
    secondCircle: idFor(step.secondCircle, bindings),
    intersectionIndex,
  };
}

function labelForStep(
  step: MacroStepDefinition,
  constructions: readonly Construction[],
  bindings: ReadonlyMap<string, MacroBinding>,
): string {
  if (step.labelTemplate === "{nextPointLabel}") {
    return generateNextPointLabel(constructions);
  }

  return renderTemplate(step.labelTemplate, bindings, "label");
}

function resolveIntersectionIndex(
  index: MacroIntersectionIndex,
  bindings: ReadonlyMap<string, MacroBinding>,
): 0 | 1 | undefined {
  if (index === 0 || index === 1) {
    return index;
  }

  const from = bindingFor(index.from, bindings);
  const to = bindingFor(index.to, bindings);
  const point = bindingFor(index.point, bindings);
  if (!from?.position || !to?.position || !point?.position) {
    return undefined;
  }

  const direction = {
    x: to.position.x - from.position.x,
    y: to.position.y - from.position.y,
  };
  const side = {
    x: point.position.x - from.position.x,
    y: point.position.y - from.position.y,
  };
  const sideSign = cross(direction, side);
  if (sideSign === 0) {
    return 1;
  }

  const intersections = circleCircleIntersections(from.position, 1, to.position, 1);
  if (intersections.length !== 2) {
    return sideSign > 0 ? 1 : 0;
  }

  const firstSide = cross(direction, {
    x: intersections[0].x - from.position.x,
    y: intersections[0].y - from.position.y,
  });
  return Math.sign(firstSide) === Math.sign(sideSign) ? 0 : 1;
}

function idsForSelectedSteps(
  definition: ConstructionMacroDefinition,
  stepIds: readonly Readonly<{ name: string; id: ConstructionId }>[],
): readonly ConstructionId[] {
  if (!definition.selectedSteps) {
    const lastStep = stepIds.at(-1);
    return lastStep ? [lastStep.id] : [];
  }

  const byName = new Map(stepIds.map((step) => [step.name, step.id]));
  return definition.selectedSteps.flatMap((name) => {
    const id = byName.get(name);
    return id ? [id] : [];
  });
}

function renderTemplate(
  template: string,
  bindings: ReadonlyMap<string, MacroBinding>,
  field: "id" | "label",
): string {
  return template.replaceAll(/\{([a-zA-Z0-9_-]+)\}/g, (_match, name: string) => {
    const binding = bindings.get(name);
    if (!binding) {
      return name;
    }
    return field === "id" ? binding.id : binding.label;
  });
}

function idFor(reference: MacroReference, bindings: ReadonlyMap<string, MacroBinding>): ConstructionId {
  const binding = bindingFor(reference, bindings);
  if (!binding) {
    return referenceKey(reference);
  }
  return binding.id;
}

function bindingFor(
  reference: MacroReference,
  bindings: ReadonlyMap<string, MacroBinding>,
): MacroBinding | undefined {
  return bindings.get(referenceKey(reference));
}

function referenceKey(reference: MacroReference): string {
  if ("input" in reference) {
    return reference.input;
  }
  return reference.step;
}

function uniqueConstructionId(
  constructions: readonly Construction[],
  baseId: ConstructionId,
): ConstructionId {
  const used = new Set(constructions.map((construction) => construction.id));

  if (!used.has(baseId)) {
    return baseId;
  }

  let suffix = 2;
  while (used.has(`${baseId}-${suffix}`)) {
    suffix++;
  }

  return `${baseId}-${suffix}`;
}

function slugFor(id: string): ConstructionId {
  return id
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

function unchanged(program: ConstructionProgram): ConstructionMacroResult {
  return {
    program,
    changed: false,
    stepIds: [],
    selectedIds: [],
  };
}
