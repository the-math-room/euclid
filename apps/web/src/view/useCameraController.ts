import type { Point2 } from "@euclid/geometry";
import {
  moveCameraInScreen,
  rotateCamera,
  zoomCamera,
  type ScreenView,
  type ViewCamera,
} from "@euclid/rendering";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    const pressedKeys = new Set<string>();
    let animationFrameId: number | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if focus is in an input or textarea
      const targetTag = document.activeElement?.tagName || "";
      const isEditable =
        ["INPUT", "TEXTAREA", "SELECT"].includes(targetTag) ||
        document.activeElement?.getAttribute("contenteditable") === "true";
      if (isEditable) {
        return;
      }

      const keysOfInterest = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "+",
        "=",
        "-",
        "_",
        "[",
        "]",
      ];
      if (keysOfInterest.includes(e.key)) {
        e.preventDefault();
        pressedKeys.add(e.key);
        if (!animationFrameId) {
          animationFrameId = requestAnimationFrame(tick);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.key);
      if (pressedKeys.size === 0 && animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };

    const tick = () => {
      if (pressedKeys.size === 0) {
        animationFrameId = null;
        return;
      }

      setCamera((currentCamera) => {
        let updated = currentCamera;

        // 1. Pan
        let dx = 0;
        let dy = 0;
        const panSpeed = 6;
        if (pressedKeys.has("ArrowLeft")) dx -= panSpeed;
        if (pressedKeys.has("ArrowRight")) dx += panSpeed;
        if (pressedKeys.has("ArrowUp")) dy -= panSpeed;
        if (pressedKeys.has("ArrowDown")) dy += panSpeed;
        if (dx !== 0 || dy !== 0) {
          updated = moveCameraInScreen(updated, { x: dx, y: dy });
        }

        // 2. Zoom
        const zoomMultiplier = 1.02;
        let scaleFactor = 1.0;
        if (pressedKeys.has("+") || pressedKeys.has("=")) {
          scaleFactor = zoomMultiplier;
        } else if (pressedKeys.has("-") || pressedKeys.has("_")) {
          scaleFactor = 1 / zoomMultiplier;
        }
        if (scaleFactor !== 1.0) {
          const nextScale = updated.scale * scaleFactor;
          const targetZoom = nextScale / defaultView.camera.scale;
          const clampedZoom = Math.min(Math.max(targetZoom, 0.5), 3);
          const allowedFactor = (clampedZoom * defaultView.camera.scale) / updated.scale;
          updated = zoomCamera(updated, allowedFactor);
        }

        // 3. Rotate
        const rotateSpeed = 1.5;
        let rotateTurns = 0;
        if (pressedKeys.has("[")) {
          rotateTurns = -rotateSpeed / 360;
        } else if (pressedKeys.has("]")) {
          rotateTurns = rotateSpeed / 360;
        }
        if (rotateTurns !== 0) {
          updated = rotateCamera(updated, { turns: rotateTurns });
        }

        return updated;
      });

      animationFrameId = requestAnimationFrame(tick);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [defaultView]);

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
