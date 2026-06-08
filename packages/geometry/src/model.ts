export type ConstructionId = string;

export type Point2 = Readonly<{
  x: number;
  y: number;
}>;

export type WorldPoint = Point2 & { readonly __brand: "world" };
export type ScenePoint = Point2 & { readonly __brand: "scene" };
export type ShapeRole = "primary" | "auxiliary";

export function toWorldPoint(p: Point2): WorldPoint {
  return p as WorldPoint;
}

export function toScenePoint(p: Point2): ScenePoint {
  return p as ScenePoint;
}

export type ConstructionProgram = Readonly<{
  constructions: readonly Construction[];
}>;

export type Construction =
  | Readonly<{
      id: ConstructionId;
      kind: "free-point";
      label: string;
      position: WorldPoint;
    }>
  | Readonly<{
      id: ConstructionId;
      kind: "line-through";
      label: string;
      shapeRole?: ShapeRole;
      points: readonly [ConstructionId, ConstructionId];
    }>
  | Readonly<{
      id: ConstructionId;
      kind: "circle-through";
      label: string;
      shapeRole?: ShapeRole;
      center: ConstructionId;
      pointOnCircle: ConstructionId;
    }>
  | Readonly<{
      id: ConstructionId;
      kind: "circle-three-points";
      label: string;
      shapeRole?: ShapeRole;
      points: readonly [ConstructionId, ConstructionId, ConstructionId];
    }>
  | Readonly<{
      id: ConstructionId;
      kind: "line-line-intersection";
      label: string;
      lines: readonly [ConstructionId, ConstructionId];
    }>
  | Readonly<{
      id: ConstructionId;
      kind: "line-circle-intersection";
      label: string;
      line: ConstructionId;
      circle: ConstructionId;
      intersectionIndex: 0 | 1;
    }>
  | Readonly<{
      id: ConstructionId;
      kind: "circle-circle-intersection";
      label: string;
      firstCircle: ConstructionId;
      secondCircle: ConstructionId;
      intersectionIndex: 0 | 1;
    }>
  | Readonly<{
      id: ConstructionId;
      kind: "parallel-line";
      label: string;
      shapeRole?: ShapeRole;
      line: ConstructionId;
      point: ConstructionId;
    }>
  | Readonly<{
      id: ConstructionId;
      kind: "perpendicular-line";
      label: string;
      shapeRole?: ShapeRole;
      line: ConstructionId;
      point: ConstructionId;
    }>
  | Readonly<{
      id: ConstructionId;
      kind: "midpoint";
      label: string;
      points: readonly [ConstructionId, ConstructionId];
    }>;

export type EvaluatedPrimitive =
  | Readonly<{
      id: ConstructionId;
      kind: "point";
      label: string;
      position: WorldPoint;
    }>
  | Readonly<{
      id: ConstructionId;
      kind: "line";
      label: string;
      shapeRole: ShapeRole;
      through: readonly [WorldPoint, WorldPoint];
    }>
  | Readonly<{
      id: ConstructionId;
      kind: "circle";
      label: string;
      shapeRole: ShapeRole;
      center: WorldPoint;
      pointOnCircle: WorldPoint;
    }>;

export type ConstructionExpression =
  | Readonly<{
      kind: "free-point";
    }>
  | Readonly<{
      kind: "line-through";
      points: readonly [ConstructionId, ConstructionId];
    }>
  | Readonly<{
      kind: "circle-through";
      center: ConstructionId;
      pointOnCircle: ConstructionId;
    }>
  | Readonly<{
      kind: "circle-three-points";
      points: readonly [ConstructionId, ConstructionId, ConstructionId];
    }>
  | Readonly<{
      kind: "line-line-intersection";
      lines: readonly [ConstructionId, ConstructionId];
    }>
  | Readonly<{
      kind: "line-circle-intersection";
      line: ConstructionId;
      circle: ConstructionId;
      intersectionIndex: 0 | 1;
    }>
  | Readonly<{
      kind: "circle-circle-intersection";
      firstCircle: ConstructionId;
      secondCircle: ConstructionId;
      intersectionIndex: 0 | 1;
    }>
  | Readonly<{
      kind: "parallel-line";
      line: ConstructionId;
      point: ConstructionId;
    }>
  | Readonly<{
      kind: "perpendicular-line";
      line: ConstructionId;
      point: ConstructionId;
    }>
  | Readonly<{
      kind: "midpoint";
      points: readonly [ConstructionId, ConstructionId];
    }>;

export type ConstructionMeaning = Readonly<{
  id: ConstructionId;
  label: string;
  expression: ConstructionExpression;
}>;

export type EvaluationDiagnostic = Readonly<{
  constructionId: ConstructionId;
  message: string;
}>;

export type DependencyNode = Readonly<{
  id: ConstructionId;
  label: string;
  kind: Construction["kind"];
  dependencies: readonly ConstructionId[];
}>;

export type DependencyEdge = Readonly<{
  from: ConstructionId;
  to: ConstructionId;
}>;

export type DependencyGraph = Readonly<{
  nodes: readonly DependencyNode[];
  edges: readonly DependencyEdge[];
}>;

export type Evaluation = Readonly<{
  graph: DependencyGraph;
  meanings: readonly ConstructionMeaning[];
  primitives: readonly EvaluatedPrimitive[];
  diagnostics: readonly EvaluationDiagnostic[];
}>;
