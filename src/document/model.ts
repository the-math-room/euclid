import type { ConstructionProgram } from "../geometry/model";

export type EuclidDocument = Readonly<{
  schemaVersion: 1;
  title: string;
  program: ConstructionProgram;
}>;
