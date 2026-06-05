import {
  Home,
  MoveDown,
  MoveLeft,
  MoveRight,
  MoveUp,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { CameraController } from "./useCameraController";

export function ViewControls({ camera }: { camera: CameraController }) {
  return (
    <section className="view-panel" aria-label="View controls">
      <h2>View</h2>
      <div className="view-actions">
        <button type="button" className="icon-button" title="Reset view" onClick={camera.reset}>
          <Home size={18} aria-hidden />
        </button>
      </div>
      <div className="rotation-control">
        <button
          type="button"
          className="icon-button"
          title="Rotate counterclockwise"
          onClick={() => camera.rotateByDegrees(-15)}
        >
          <RotateCcw size={18} aria-hidden />
        </button>
        <label>
          <span>Rotation</span>
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={camera.rotationDegrees}
            onChange={(event) => camera.setRotationDegrees(Number(event.currentTarget.value))}
          />
        </label>
        <button
          type="button"
          className="icon-button"
          title="Rotate clockwise"
          onClick={() => camera.rotateByDegrees(15)}
        >
          <RotateCw size={18} aria-hidden />
        </button>
      </div>
      <output className="rotation-value">{camera.rotationDegrees} deg</output>
      <div className="zoom-control">
        <button
          type="button"
          className="icon-button"
          title="Zoom out"
          onClick={() => camera.setZoom(camera.zoom / 1.15)}
        >
          <ZoomOut size={18} aria-hidden />
        </button>
        <label>
          <span>Zoom</span>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.05"
            value={camera.zoom}
            onChange={(event) => camera.setZoom(Number(event.currentTarget.value))}
          />
        </label>
        <button
          type="button"
          className="icon-button"
          title="Zoom in"
          onClick={() => camera.setZoom(camera.zoom * 1.15)}
        >
          <ZoomIn size={18} aria-hidden />
        </button>
      </div>
      <output className="rotation-value">{camera.zoom.toFixed(2)}x</output>
      <div className="pan-control" aria-label="Pan controls">
        <button
          type="button"
          className="icon-button"
          title="Pan up"
          onClick={() => camera.moveCamera({ x: 0, y: -24 })}
        >
          <MoveUp size={18} aria-hidden />
        </button>
        <button
          type="button"
          className="icon-button"
          title="Pan left"
          onClick={() => camera.moveCamera({ x: -24, y: 0 })}
        >
          <MoveLeft size={18} aria-hidden />
        </button>
        <button
          type="button"
          className="icon-button"
          title="Pan right"
          onClick={() => camera.moveCamera({ x: 24, y: 0 })}
        >
          <MoveRight size={18} aria-hidden />
        </button>
        <button
          type="button"
          className="icon-button"
          title="Pan down"
          onClick={() => camera.moveCamera({ x: 0, y: 24 })}
        >
          <MoveDown size={18} aria-hidden />
        </button>
      </div>
    </section>
  );
}
