import type { Point2 } from "@euclid/geometry";
import type { RenderItem, RenderLabel } from "./scene";
import { THEME } from "./theme";
import type { ViewportSize } from "./viewport";

export type LabelCandidateName = "ne" | "e" | "se" | "s" | "sw" | "w" | "nw" | "n";

export type Rect = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type LabelPlacement = RenderLabel &
  Readonly<{
    bounds: Rect;
    candidate: LabelCandidateName;
    score: number;
  }>;

type LabelCandidate = LabelPlacement &
  Readonly<{
    offsetCost: number;
  }>;

type PointLabelTarget = Readonly<{
  id: string;
  text: string;
  mark: Point2;
}>;

export function layoutPointLabels(
  targets: readonly PointLabelTarget[],
  obstacles: readonly RenderItem[],
  size: ViewportSize,
): ReadonlyMap<string, LabelPlacement> {
  const candidateSets = targets.map((target) =>
    candidatesFor(target).map((candidate) => ({
      ...candidate,
      score: scoreCandidate(candidate, target, obstacles, size),
    })),
  );
  const selected = optimizeCandidateSelection(candidateSets);
  const labelsById = new Map<string, LabelPlacement>();

  for (const [index, target] of targets.entries()) {
    labelsById.set(target.id, withoutInternalFields(candidateSets[index][selected[index]]));
  }

  return labelsById;
}

function candidatesFor(target: PointLabelTarget): readonly LabelCandidate[] {
  const metrics = estimatedTextMetrics(target.text);
  const gaps = [10, 28, 46];

  return gaps.flatMap((gap, ringIndex) => {
    const centerY = target.mark.y - metrics.height / 2;
    const left = target.mark.x - gap - metrics.width;
    const centerX = target.mark.x - metrics.width / 2;
    const right = target.mark.x + gap;
    const top = target.mark.y - gap - metrics.height;
    const middleTop = centerY;
    const bottom = target.mark.y + gap;
    const offsetCost = ringIndex * 32;

    return [
      candidate(target.text, "ne", right, top, metrics, offsetCost),
      candidate(target.text, "e", right, middleTop, metrics, offsetCost),
      candidate(target.text, "se", right, bottom, metrics, offsetCost),
      candidate(target.text, "s", centerX, bottom, metrics, offsetCost),
      candidate(target.text, "sw", left, bottom, metrics, offsetCost),
      candidate(target.text, "w", left, middleTop, metrics, offsetCost),
      candidate(target.text, "nw", left, top, metrics, offsetCost),
      candidate(target.text, "n", centerX, top, metrics, offsetCost),
    ];
  });
}

function candidate(
  text: string,
  name: LabelCandidateName,
  x: number,
  y: number,
  metrics: ReturnType<typeof estimatedTextMetrics>,
  offsetCost: number,
): LabelCandidate {
  return {
    text,
    anchor: { x, y: y + metrics.height },
    bounds: {
      x,
      y,
      width: metrics.width,
      height: metrics.height,
    },
    candidate: name,
    score: 0,
    offsetCost,
  };
}

function scoreCandidate(
  candidate: LabelCandidate,
  target: PointLabelTarget,
  obstacles: readonly RenderItem[],
  size: ViewportSize,
): number {
  let score = candidatePreference(candidate.candidate) + candidate.offsetCost;
  score += viewportOverflowArea(candidate.bounds, size) * 20;
  score += rectPointDistance(candidate.bounds, target.mark) * 0.9;

  for (const obstacle of obstacles) {
    if (obstacle.kind === "point") {
      const radius = obstacle.id === target.id ? 5 : 8;
      score += rectIntersectsCircle(candidate.bounds, obstacle.mark, radius) ? 450 : 0;
      if (obstacle.id !== target.id) {
        score += associationAmbiguityPenalty(candidate.bounds, target.mark, obstacle.mark);
      }
    } else if (obstacle.kind === "line") {
      score += segmentIntersectsRect(obstacle.from, obstacle.to, candidate.bounds) ? 120 : 0;
    } else if (obstacle.kind === "circle") {
      score += circlePerimeterIntersectsRect(obstacle.center, obstacle.radius, candidate.bounds) ? 90 : 0;
    }
  }

  return score;
}

function optimizeCandidateSelection(
  candidateSets: readonly (readonly LabelCandidate[])[],
): readonly number[] {
  const selected = candidateSets.map((candidates) => indexOfLowestScore(candidates));
  let currentScore = scoreSelection(candidateSets, selected);
  let improved = true;

  while (improved) {
    improved = false;
    let bestMove:
      | Readonly<{
          targetIndex: number;
          candidateIndex: number;
          score: number;
        }>
      | undefined;

    for (const [targetIndex, candidates] of candidateSets.entries()) {
      for (const [candidateIndex] of candidates.entries()) {
        if (candidateIndex === selected[targetIndex]) {
          continue;
        }

        const next = replaceAt(selected, targetIndex, candidateIndex);
        const nextScore = scoreSelection(candidateSets, next);

        if (nextScore + 1e-9 < (bestMove?.score ?? currentScore)) {
          bestMove = {
            targetIndex,
            candidateIndex,
            score: nextScore,
          };
        }
      }
    }

    if (bestMove) {
      selected[bestMove.targetIndex] = bestMove.candidateIndex;
      currentScore = bestMove.score;
      improved = true;
    }
  }

  return selected;
}

function scoreSelection(
  candidateSets: readonly (readonly LabelCandidate[])[],
  selected: readonly number[],
): number {
  let score = 0;

  for (const [index, candidates] of candidateSets.entries()) {
    score += candidates[selected[index]].score;
  }

  for (let aIndex = 0; aIndex < selected.length; aIndex++) {
    for (let bIndex = aIndex + 1; bIndex < selected.length; bIndex++) {
      const a = candidateSets[aIndex][selected[aIndex]];
      const b = candidateSets[bIndex][selected[bIndex]];
      score += overlapArea(a.bounds, b.bounds) * 18;
    }
  }

  return score;
}

function indexOfLowestScore(candidates: readonly LabelCandidate[]): number {
  return candidates.reduce(
    (bestIndex, candidate, index) => (candidate.score < candidates[bestIndex].score ? index : bestIndex),
    0,
  );
}

function replaceAt(values: readonly number[], index: number, value: number): readonly number[] {
  return values.map((current, currentIndex) => (currentIndex === index ? value : current));
}

function withoutInternalFields(candidate: LabelCandidate): LabelPlacement {
  return {
    text: candidate.text,
    anchor: candidate.anchor,
    bounds: candidate.bounds,
    candidate: candidate.candidate,
    score: candidate.score,
  };
}

function associationAmbiguityPenalty(bounds: Rect, target: Point2, other: Point2): number {
  const targetDistance = rectPointDistance(bounds, target);
  const otherDistance = rectPointDistance(bounds, other);

  if (otherDistance >= targetDistance) {
    return 0;
  }

  return (targetDistance - otherDistance + 12) * 45;
}

function rectPointDistance(rect: Rect, point: Point2): number {
  const closest = {
    x: clamp(point.x, rect.x, rect.x + rect.width),
    y: clamp(point.y, rect.y, rect.y + rect.height),
  };

  return distance(closest, point);
}

function estimatedTextMetrics(text: string): { width: number; height: number } {
  return {
    width: Math.max(1, text.length) * THEME.typography.fontSize * 0.62,
    height: THEME.typography.fontSize,
  };
}

function candidatePreference(candidate: LabelCandidateName): number {
  const preferences: Record<LabelCandidateName, number> = {
    ne: 0,
    e: 8,
    se: 18,
    s: 30,
    sw: 42,
    w: 34,
    nw: 20,
    n: 12,
  };

  return preferences[candidate];
}

function viewportOverflowArea(rect: Rect, size: ViewportSize): number {
  return rect.width * rect.height - overlapArea(rect, { x: 0, y: 0, width: size.width, height: size.height });
}

function overlapArea(a: Rect, b: Rect): number {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return width * height;
}

function rectIntersectsCircle(rect: Rect, center: Point2, radius: number): boolean {
  const closest = {
    x: clamp(center.x, rect.x, rect.x + rect.width),
    y: clamp(center.y, rect.y, rect.y + rect.height),
  };
  return distance(closest, center) <= radius;
}

function circlePerimeterIntersectsRect(center: Point2, radius: number, rect: Rect): boolean {
  const closest = {
    x: clamp(center.x, rect.x, rect.x + rect.width),
    y: clamp(center.y, rect.y, rect.y + rect.height),
  };
  const farthest = farthestRectCornerDistance(center, rect);
  return distance(closest, center) <= radius && radius <= farthest;
}

function segmentIntersectsRect(a: Point2, b: Point2, rect: Rect): boolean {
  if (pointInRect(a, rect) || pointInRect(b, rect)) {
    return true;
  }

  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];

  return corners.some((corner, index) =>
    segmentsIntersect(a, b, corner, corners[(index + 1) % corners.length]),
  );
}

function segmentsIntersect(a: Point2, b: Point2, c: Point2, d: Point2): boolean {
  const denominator = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);

  if (denominator === 0) {
    return false;
  }

  const ua = ((d.x - c.x) * (a.y - c.y) - (d.y - c.y) * (a.x - c.x)) / denominator;
  const ub = ((b.x - a.x) * (a.y - c.y) - (b.y - a.y) * (a.x - c.x)) / denominator;

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

function pointInRect(point: Point2, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function farthestRectCornerDistance(point: Point2, rect: Rect): number {
  return Math.max(
    distance(point, { x: rect.x, y: rect.y }),
    distance(point, { x: rect.x + rect.width, y: rect.y }),
    distance(point, { x: rect.x + rect.width, y: rect.y + rect.height }),
    distance(point, { x: rect.x, y: rect.y + rect.height }),
  );
}

function distance(a: Point2, b: Point2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
