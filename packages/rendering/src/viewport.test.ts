import { describe, expect, it } from "vitest";
import type { EvaluatedPrimitive } from "@euclid/geometry";
import { fitCameraFor, moveCameraInScreen, rotateCamera, zoomCamera, type ViewCamera } from "./viewport";

const camera: ViewCamera = {
  center: { x: 1, y: 2 },
  rotation: { turns: 0 },
  scale: 10,
  screenOffset: { x: 3, y: 4 },
};

describe("camera operations", () => {
  it("moves the camera in screen coordinates, so the scene moves oppositely", () => {
    expect(moveCameraInScreen(camera, { x: -5, y: -7 })).toEqual({
      ...camera,
      screenOffset: { x: 8, y: 11 },
    });
  });

  it("zooms by scaling the camera", () => {
    expect(zoomCamera(camera, 2)).toEqual({
      ...camera,
      scale: 20,
    });
  });

  it("rotates modulo one turn", () => {
    expect(rotateCamera({ ...camera, rotation: { turns: 0.45 } }, { turns: 0.2 })).toEqual({
      ...camera,
      rotation: { turns: -0.35 },
    });
  });

  it("fits a camera to evaluated primitives", () => {
    const primitives: readonly EvaluatedPrimitive[] = [
      {
        id: "A",
        kind: "point",
        label: "A",
        position: { x: 0, y: 0 },
      },
      {
        id: "B",
        kind: "point",
        label: "B",
        position: { x: 4, y: 2 },
      },
    ];

    expect(fitCameraFor(primitives, { size: { width: 100, height: 100 } })).toEqual({
      center: { x: 2, y: 1 },
      rotation: { turns: 0 },
      scale: 18,
      screenOffset: { x: 0, y: 0 },
    });
  });
});
