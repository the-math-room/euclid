import type { Point2 } from "@euclid/geometry";
import {
  moveCameraInScreen,
  rotateCamera,
  zoomCamera,
  type ScreenView,
  type ViewCamera,
} from "@euclid/rendering";
import { useState } from "react";

export type CameraController = Readonly<{
  camera: ViewCamera;
  rotationDegrees: number;
  zoom: number;
  reset: () => void;
  rotateByDegrees: (degrees: number) => void;
  setRotationDegrees: (degrees: number) => void;
  setZoom: (zoom: number) => void;
  moveCamera: (screenDelta: Point2) => void;
  moveSceneBy: (screenDelta: Point2) => void;
}>;

export function useCameraController(defaultView: ScreenView): CameraController {
  const [camera, setCamera] = useState<ViewCamera>(defaultView.camera);
  const rotationDegrees = Math.round(camera.rotation.turns * 360);
  const zoom = camera.scale / defaultView.camera.scale;

  return {
    camera,
    rotationDegrees,
    zoom,
    reset: () => setCamera(defaultView.camera),
    rotateByDegrees: (degrees) =>
      setCamera((currentCamera) => rotateCamera(currentCamera, { turns: degrees / 360 })),
    setRotationDegrees: (degrees) =>
      setCamera((currentCamera) => ({
        ...currentCamera,
        rotation: { turns: degrees / 360 },
      })),
    setZoom: (nextZoom) =>
      setCamera((currentCamera) => scaleCameraToZoom(currentCamera, defaultView.camera, nextZoom)),
    moveCamera: (screenDelta) => setCamera((currentCamera) => moveCameraInScreen(currentCamera, screenDelta)),
    moveSceneBy: (screenDelta) =>
      setCamera((currentCamera) => moveCameraInScreen(currentCamera, negatePoint(screenDelta))),
  };
}

function scaleCameraToZoom(camera: ViewCamera, defaultCamera: ViewCamera, zoom: number): ViewCamera {
  const currentZoom = camera.scale / defaultCamera.scale;
  return zoomCamera(camera, clampZoom(zoom) / currentZoom);
}

function clampZoom(zoom: number): number {
  return Math.min(Math.max(zoom, 0.5), 3);
}

function negatePoint(point: Point2): Point2 {
  return {
    x: -point.x,
    y: -point.y,
  };
}
