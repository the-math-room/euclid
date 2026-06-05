import type { ConstructionProgram } from "@euclid/geometry";

export type EuclidDocument = Readonly<{
  schemaVersion: 1;
  title: string;
  program: ConstructionProgram;
}>;
