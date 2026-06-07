import type { EuclidDocument } from "./model";
import { toWorldPoint } from "@euclid/geometry";

export const seedDocument: EuclidDocument = {
  schemaVersion: 1,
  title: "Seed construction",
  program: {
    constructions: [
      {
        id: "A",
        kind: "free-point",
        label: "A",
        position: toWorldPoint({ x: -2.4, y: -0.6 }),
      },
      {
        id: "B",
        kind: "free-point",
        label: "B",
        position: toWorldPoint({ x: 2.1, y: -0.2 }),
      },
      {
        id: "C",
        kind: "free-point",
        label: "C",
        position: toWorldPoint({ x: -0.4, y: 2.2 }),
      },
      {
        id: "line-ab",
        kind: "line-through",
        label: "AB",
        points: ["A", "B"],
      },
      {
        id: "circle-a-b",
        kind: "circle-through",
        label: "circle(A, B)",
        center: "A",
        pointOnCircle: "B",
      },
      {
        id: "circle-b-c",
        kind: "circle-through",
        label: "circle(B, C)",
        center: "B",
        pointOnCircle: "C",
      },
    ],
  },
};
