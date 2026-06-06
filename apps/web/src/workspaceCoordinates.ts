import { type ScenePoint, toScenePoint } from "@euclid/geometry";

export function getCanvasProjection(
  layoutWidth: number,
  layoutHeight: number,
  sceneWidth: number,
  sceneHeight: number,
) {
  const scale = Math.min(layoutWidth / sceneWidth, layoutHeight / sceneHeight);
  const dx = (layoutWidth - sceneWidth * scale) / 2;
  const dy = (layoutHeight - sceneHeight * scale) / 2;
  return { scale, dx, dy };
}

export function clientToSceneCoords(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  sceneWidth: number,
  sceneHeight: number,
): ScenePoint {
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const { scale, dx, dy } = getCanvasProjection(rect.width, rect.height, sceneWidth, sceneHeight);
  return toScenePoint({ x: (x - dx) / scale, y: (y - dy) / scale });
}
