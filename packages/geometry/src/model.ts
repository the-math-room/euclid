export type ConstructionId = string;

export type Point2 = Readonly<{
  x: number;
  y: number;
}>;

export type ConstructionProgram = Readonly<{
  constructions: readonly Construction[];
}>;

export type Construction =
  | Readonly<{
      id: ConstructionId;
      kind: "free-point";
      label: string;
      position: Point2;
    }>
  | Readonly<{
      id: ConstructionId;
      kind: "line-through";
      label: string;
      points: readonly [ConstructionId, ConstructionId];
    }>
  | Readonly<{
      id: ConstructionId;
      kind: "circle-through";
      label: string;
      center: ConstructionId;
      pointOnCircle: ConstructionId;
    }>
  | Readonly<{
      id: ConstructionId;
      kind: "circle-three-points";
      label: string;
      points: readonly [ConstructionId, ConstructionId, ConstructionId];
    }>
  | Readonly<{
      id: ConstructionId;
      kind: "line-line-intersection";
      label: string;
      lines: readonly [ConstructionId, ConstructionId];
    }>;

export type EvaluatedPrimitive =
  | Readonly<{
      id: ConstructionId;
      kind: "point";
      label: string;
      position: Point2;
    }>
  | Readonly<{
      id: ConstructionId;
      kind: "line";
      label: string;
      through: readonly [Point2, Point2];
    }>
  | Readonly<{
      id: ConstructionId;
      kind: "circle";
      label: string;
      center: Point2;
      pointOnCircle: Point2;
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
