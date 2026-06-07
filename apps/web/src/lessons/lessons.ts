import type { EuclidLesson } from "@euclid/lesson";

export const lessons: readonly EuclidLesson[] = [
  {
    schemaVersion: 1,
    title: "1. Line Intersection",
    description:
      "Construct a line through points A and B, then a line through C and D. Finally, use the Point tool to create a point at the intersection of these two lines.",
    document: {
      schemaVersion: 1,
      title: "Line intersection starter",
      program: {
        constructions: [
          { id: "A", kind: "free-point", label: "A", position: { x: -2.0, y: -1.0 } },
          { id: "B", kind: "free-point", label: "B", position: { x: 2.0, y: 1.0 } },
          { id: "C", kind: "free-point", label: "C", position: { x: -1.0, y: 1.5 } },
          { id: "D", kind: "free-point", label: "D", position: { x: 1.0, y: -1.5 } },
        ],
      },
    },
    policy: {
      allowedTools: ["select", "point", "line"],
      lockedConstructions: ["A", "B", "C", "D"],
      allowDelete: false,
      pointDrag: "none",
      shapeDrag: "none",
    },
    goals: [
      {
        kind: "meaning",
        id: "line-ab",
        description: "Construct line AB",
        expression: {
          kind: "line-through",
          points: ["A", "B"],
        },
      },
      {
        kind: "meaning",
        id: "line-cd",
        description: "Construct line CD",
        expression: {
          kind: "line-through",
          points: ["C", "D"],
        },
      },
      {
        kind: "meaning",
        id: "intersection",
        description: "Construct intersection point",
        expression: {
          kind: "line-line-intersection",
          lines: ["line-ab", "line-cd"],
        },
      },
    ],
  },
  {
    schemaVersion: 1,
    title: "2. Perpendicular Bisector",
    description:
      "Construct the perpendicular bisector of segment AB by first drawing two circles (center A through B, and center B through A), intersecting them, and drawing a line through those intersection points.",
    document: {
      schemaVersion: 1,
      title: "Perpendicular bisector starter",
      program: {
        constructions: [
          { id: "A", kind: "free-point", label: "A", position: { x: -2.0, y: 0.0 } },
          { id: "B", kind: "free-point", label: "B", position: { x: 2.0, y: 0.0 } },
        ],
      },
    },
    policy: {
      allowedTools: ["select", "line", "circle"],
      lockedConstructions: ["A", "B"],
      allowDelete: true,
      pointDrag: "free-points",
      shapeDrag: "none",
    },
    goals: [
      {
        kind: "meaning",
        id: "circle-ab",
        description: "Construct circle centered at A through B",
        expression: {
          kind: "circle-through",
          center: "A",
          pointOnCircle: "B",
        },
      },
      {
        kind: "meaning",
        id: "circle-ba",
        description: "Construct circle centered at B through A",
        expression: {
          kind: "circle-through",
          center: "B",
          pointOnCircle: "A",
        },
      },
      {
        kind: "meaning",
        id: "c",
        description: "Construct first intersection point C",
        expression: {
          kind: "circle-circle-intersection",
          firstCircle: "circle-ab",
          secondCircle: "circle-ba",
          intersectionIndex: 0,
        },
      },
      {
        kind: "meaning",
        id: "d",
        description: "Construct second intersection point D",
        expression: {
          kind: "circle-circle-intersection",
          firstCircle: "circle-ab",
          secondCircle: "circle-ba",
          intersectionIndex: 1,
        },
      },
      {
        kind: "meaning",
        id: "bisector",
        description: "Construct line through C and D",
        expression: {
          kind: "line-through",
          points: ["c", "d"],
        },
      },
    ],
  },
  {
    schemaVersion: 1,
    title: "3. Free Draw",
    description:
      "Explore construction tools freely! Create lines, circles, and drag points to see how geometric relations are preserved.",
    document: {
      schemaVersion: 1,
      title: "Free draw starter",
      program: {
        constructions: [
          { id: "A", kind: "free-point", label: "A", position: { x: -1.5, y: -1.0 } },
          { id: "B", kind: "free-point", label: "B", position: { x: 1.5, y: -1.0 } },
          { id: "C", kind: "free-point", label: "C", position: { x: 0.0, y: 1.5 } },
        ],
      },
    },
    policy: {
      allowedTools: ["select", "point", "line", "circle", "parallel"],
      lockedConstructions: [],
      allowDelete: true,
      pointDrag: "free-points",
      shapeDrag: "all",
    },
    goals: [],
  },
  {
    schemaVersion: 1,
    title: "4. Parallel Line",
    description:
      "Construct a line parallel to line AB that passes through point C using the Parallel Line tool.",
    document: {
      schemaVersion: 1,
      title: "Parallel line starter",
      program: {
        constructions: [
          { id: "A", kind: "free-point", label: "A", position: { x: -2.0, y: -0.5 } },
          { id: "B", kind: "free-point", label: "B", position: { x: 2.0, y: -0.5 } },
          { id: "line-ab", kind: "line-through", label: "AB", points: ["A", "B"] },
          { id: "C", kind: "free-point", label: "C", position: { x: 0.0, y: 1.0 } },
        ],
      },
    },
    policy: {
      allowedTools: ["select", "point", "line", "circle", "parallel"],
      lockedConstructions: ["A", "B", "line-ab"],
      allowDelete: true,
      pointDrag: "free-points",
      shapeDrag: "all",
    },
    goals: [
      {
        kind: "meaning",
        id: "parallel-line",
        description: "Construct the line parallel to AB passing through C",
        expression: {
          kind: "parallel-line",
          line: "line-ab",
          point: "C",
        },
      },
    ],
  },
];
