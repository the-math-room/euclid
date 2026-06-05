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
  primitives: readonly EvaluatedPrimitive[];
  diagnostics: readonly EvaluationDiagnostic[];
}>;
