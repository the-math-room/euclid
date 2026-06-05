import type { EvaluatedPrimitive, Point2 } from "@euclid/geometry";

export type ViewportSize = Readonly<{
  width: number;
  height: number;
}>;

export type Viewport = Readonly<{
  size: ViewportSize;
}>;

export type ViewRotation = Readonly<{
  turns: number;
}>;

export type ViewCamera = Readonly<{
  center: Point2;
  rotation: ViewRotation;
  scale: number;
  screenOffset: Point2;
}>;

export type ScreenView = Readonly<{
  viewport: Viewport;
  camera: ViewCamera;
}>;

export type WorldFrame = Readonly<{
  viewport: Viewport;
  center: Point2;
  scale: number;
  rotation: ViewRotation;
  screenOffset: Point2;
}>;

export function fitCameraFor(primitives: readonly EvaluatedPrimitive[], viewport: Viewport): ViewCamera {
  const points = primitives.flatMap(pointsInPrimitive);
  const bounds = boundsOf(points);
  const center = {
    x: (bounds.min.x + bounds.max.x) / 2,
    y: (bounds.min.y + bounds.max.y) / 2,
  };
  const width = Math.max(bounds.max.x - bounds.min.x, 1);
  const height = Math.max(bounds.max.y - bounds.min.y, 1);
  const scale = Math.min((viewport.size.width * 0.72) / width, (viewport.size.height * 0.72) / height);

  return {
    center,
    rotation: { turns: 0 },
    scale,
    screenOffset: { x: 0, y: 0 },
  };
}

export function worldFrameFor(view: ScreenView): WorldFrame {
  return {
    viewport: view.viewport,
    center: view.camera.center,
    scale: view.camera.scale,
    rotation: view.camera.rotation,
    screenOffset: view.camera.screenOffset,
  };
}

export function rotateCamera(camera: ViewCamera, rotationDelta: ViewRotation): ViewCamera {
  return {
    ...camera,
    rotation: {
      turns: normalizeTurns(camera.rotation.turns + rotationDelta.turns),
    },
  };
}

export function zoomCamera(camera: ViewCamera, factor: number): ViewCamera {
  return {
    ...camera,
    scale: camera.scale * factor,
  };
}

export function moveCameraInScreen(camera: ViewCamera, screenDelta: Point2): ViewCamera {
  return {
    ...camera,
    screenOffset: {
      x: camera.screenOffset.x - screenDelta.x,
      y: camera.screenOffset.y - screenDelta.y,
    },
  };
}

export function projectPoint(frame: WorldFrame, point: Point2): Point2 {
  const rotated = rotatePoint(
    {
      x: point.x - frame.center.x,
      y: point.y - frame.center.y,
    },
    frame.rotation,
  );

  return {
    x: frame.viewport.size.width / 2 + frame.screenOffset.x + rotated.x * frame.scale,
    y: frame.viewport.size.height / 2 + frame.screenOffset.y - rotated.y * frame.scale,
  };
}

export function unprojectPoint(frame: WorldFrame, screenPoint: Point2): Point2 {
  const rotatedX = (screenPoint.x - frame.viewport.size.width / 2 - frame.screenOffset.x) / frame.scale;
  const rotatedY = -(screenPoint.y - frame.viewport.size.height / 2 - frame.screenOffset.y) / frame.scale;

  const unrotated = rotatePoint({ x: rotatedX, y: rotatedY }, { turns: -frame.rotation.turns });

  return {
    x: unrotated.x + frame.center.x,
    y: unrotated.y + frame.center.y,
  };
}

function rotatePoint(point: Point2, rotation: ViewRotation): Point2 {
  const radians = rotation.turns * Math.PI * 2;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
}

function normalizeTurns(turns: number): number {
  const normalized = turns % 1;

  if (normalized > 0.5) {
    return normalized - 1;
  }

  if (normalized < -0.5) {
    return normalized + 1;
  }

  return normalized;
}

function pointsInPrimitive(primitive: EvaluatedPrimitive): readonly Point2[] {
  if (primitive.kind === "point") {
    return [primitive.position];
  }

  if (primitive.kind === "line") {
    return primitive.through;
  }

  return [primitive.center, primitive.pointOnCircle];
}

function boundsOf(points: readonly Point2[]) {
  if (points.length === 0) {
    return {
      min: { x: -1, y: -1 },
      max: { x: 1, y: 1 },
    };
  }

  return points.reduce(
    (bounds, point) => ({
      min: {
        x: Math.min(bounds.min.x, point.x),
        y: Math.min(bounds.min.y, point.y),
      },
      max: {
        x: Math.max(bounds.max.x, point.x),
        y: Math.max(bounds.max.y, point.y),
      },
    }),
    {
      min: points[0],
      max: points[0],
    },
  );
}
