import { describe, expect, it } from "vitest";
import { toWorldPoint, type EvaluatedPrimitive } from "@euclid/geometry";
import {
  fitCameraFor,
  moveCameraInScreen,
  rotateCamera,
  zoomCamera,
  projectPoint,
  unprojectPoint,
  worldFrameFor,
  type ViewCamera,
} from "./viewport";

const camera: ViewCamera = {
  center: toWorldPoint({ x: 1, y: 2 }),
  rotation: { turns: 0 },
  scale: 10,
  screenOffset: { x: 3, y: 4 },
};

describe("camera operations", () => {
  it("moves the camera in screen coordinates, so the scene moves oppositely", () => {
    expect(moveCameraInScreen(camera, { x: -5, y: -7 })).toEqual({
      ...camera,
      center: { x: 0.5, y: 2.7 },
      screenOffset: { x: 0, y: 0 },
    });
  });

  it("keeps the visible scene center as the rotation pivot after panning", () => {
    const viewport = { size: { width: 100, height: 100 } };
    const initial: ViewCamera = {
      center: toWorldPoint({ x: 0, y: 0 }),
      rotation: { turns: 0 },
      scale: 10,
      screenOffset: { x: 0, y: 0 },
    };
    const panned = moveCameraInScreen(initial, { x: 10, y: 0 });
    const rotated = rotateCamera(panned, { turns: 0.25 });
    const visibleCenter = panned.center;

    expect(projectPoint(worldFrameFor({ viewport, camera: panned }), visibleCenter)).toEqual({
      x: 50,
      y: 50,
    });
    expect(projectPoint(worldFrameFor({ viewport, camera: rotated }), visibleCenter)).toEqual({
      x: 50,
      y: 50,
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
        position: toWorldPoint({ x: 0, y: 0 }),
      },
      {
        id: "B",
        kind: "point",
        label: "B",
        position: toWorldPoint({ x: 4, y: 2 }),
      },
    ];

    expect(fitCameraFor(primitives, { size: { width: 100, height: 100 } })).toEqual({
      center: toWorldPoint({ x: 2, y: 1 }),
      rotation: { turns: 0 },
      scale: 18,
      screenOffset: { x: 0, y: 0 },
    });
  });

  it("projects and unprojects points correctly (round-trips)", () => {
    const frame = worldFrameFor({
      viewport: { size: { width: 100, height: 100 } },
      camera: {
        center: toWorldPoint({ x: 5, y: 10 }),
        rotation: { turns: 0.125 }, // 45 degrees
        scale: 4,
        screenOffset: { x: 2, y: -3 },
      },
    });

    const originalPoint = toWorldPoint({ x: 12, y: -4 });
    const projected = projectPoint(frame, originalPoint);
    const unprojected = unprojectPoint(frame, projected);

    expect(unprojected.x).toBeCloseTo(originalPoint.x);
    expect(unprojected.y).toBeCloseTo(originalPoint.y);
  });
});
