import {
  drawSceneToCanvas,
  findItemAtPosition,
  SVG_THEME_STYLES,
  type RenderItem,
  type RenderScene,
} from "@euclid/rendering";
import type { ConstructionId, Point2 } from "@euclid/geometry";
import { useEffect, useRef, useState } from "react";

type PanDrag = Readonly<{
  pointerId: number;
  last: Point2;
  moved: boolean;
}>;

// Helper to compute uniform scale and center offset matching SVG viewBox preserveAspectRatio="xMidYMid meet"
function getCanvasProjection(
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

export function WorkspaceView({
  scene,
  selectedId,
  onSelect,
  onPanBy,
}: {
  scene: RenderScene;
  selectedId: ConstructionId | undefined;
  onSelect: (id: ConstructionId | undefined) => void;
  onPanBy: (delta: Point2) => void;
}) {
  const [renderMode, setRenderMode] = useState<"svg" | "canvas">("svg");
  const [panDrag, setPanDrag] = useState<PanDrag | undefined>();

  // Canvas rendering state & hooks
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [hoveredId, setHoveredId] = useState<ConstructionId | undefined>();

  // Track size changes of the canvas to adjust viewport scale
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || renderMode !== "canvas") return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(canvas);
    return () => observer.disconnect();
  }, [renderMode]);

  // Render the scene onto the canvas context when state/props change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (
      !canvas ||
      !dimensions ||
      dimensions.width === 0 ||
      dimensions.height === 0 ||
      renderMode !== "canvas"
    ) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;

    // Apply high-DPI scaling
    ctx.scale(dpr, dpr);

    // Compute and apply aspect ratio preservation scaling & translation centering
    const { scale, dx, dy } = getCanvasProjection(
      dimensions.width,
      dimensions.height,
      scene.size.width,
      scene.size.height,
    );
    ctx.translate(dx, dy);
    ctx.scale(scale, scale);

    drawSceneToCanvas(ctx, scene, { selectedId, hoveredId });
  }, [scene, selectedId, hoveredId, dimensions, renderMode]);

  // Maps CSS client pixels back to scene space coordinates preserving aspect ratio
  const getSceneCoords = (event: React.PointerEvent<HTMLCanvasElement>): Point2 => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = event.clientX - rect.left;
    const clientY = event.clientY - rect.top;

    const { scale, dx, dy } = getCanvasProjection(
      rect.width,
      rect.height,
      scene.size.width,
      scene.size.height,
    );

    return {
      x: (clientX - dx) / scale,
      y: (clientY - dy) / scale,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(event.pointerId);

    const coords = getSceneCoords(event);
    const item = findItemAtPosition(scene, coords);

    if (item) {
      onSelect(item.id);
      setPanDrag(undefined);
    } else {
      setPanDrag({
        pointerId: event.pointerId,
        last: { x: event.clientX, y: event.clientY },
        moved: false,
      });
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (panDrag && panDrag.pointerId === event.pointerId) {
      const next = { x: event.clientX, y: event.clientY };
      const delta = {
        x: next.x - panDrag.last.x,
        y: next.y - panDrag.last.y,
      };

      if (delta.x !== 0 || delta.y !== 0) {
        onPanBy(delta);
        setPanDrag({
          pointerId: panDrag.pointerId,
          last: next,
          moved: true,
        });
      }
    } else {
      const coords = getSceneCoords(event);
      const item = findItemAtPosition(scene, coords);
      if (item) {
        setHoveredId(item.id);
        canvas.style.cursor = "pointer";
      } else {
        setHoveredId(undefined);
        canvas.style.cursor = "grab";
      }
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (panDrag?.pointerId === event.pointerId) {
      if (!panDrag.moved) {
        onSelect(undefined);
      }
      setPanDrag(undefined);
    }
  };

  const handlePointerCancel = () => {
    setPanDrag(undefined);
  };

  return (
    <section className="workspace" aria-label="Euclidean construction workspace">
      <div className="renderer-toggle" role="group" aria-label="Renderer mode selection">
        <button
          type="button"
          className={renderMode === "svg" ? "active" : ""}
          onClick={() => setRenderMode("svg")}
        >
          SVG View
        </button>
        <button
          type="button"
          className={renderMode === "canvas" ? "active" : ""}
          onClick={() => setRenderMode("canvas")}
        >
          Canvas View
        </button>
      </div>

      {renderMode === "svg" ? (
        <svg
          className="workspace-svg"
          viewBox={`0 0 ${scene.size.width} ${scene.size.height}`}
          role="img"
          aria-label="Seed Euclidean construction (SVG)"
        >
          <style dangerouslySetInnerHTML={{ __html: SVG_THEME_STYLES }} />
          <rect
            className="pan-surface"
            width={scene.size.width}
            height={scene.size.height}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setPanDrag({
                pointerId: event.pointerId,
                last: { x: event.clientX, y: event.clientY },
                moved: false,
              });
            }}
            onPointerMove={(event) => {
              if (!panDrag || panDrag.pointerId !== event.pointerId) {
                return;
              }

              const next = { x: event.clientX, y: event.clientY };
              const delta = {
                x: next.x - panDrag.last.x,
                y: next.y - panDrag.last.y,
              };

              if (delta.x !== 0 || delta.y !== 0) {
                onPanBy(delta);
                setPanDrag({
                  pointerId: panDrag.pointerId,
                  last: next,
                  moved: true,
                });
              }
            }}
            onPointerUp={(event) => {
              if (panDrag?.pointerId === event.pointerId && !panDrag.moved) {
                onSelect(undefined);
              }

              setPanDrag(undefined);
            }}
            onPointerCancel={() => setPanDrag(undefined)}
          />
          <Grid lines={scene.grid} />
          {scene.items.map((item) => (
            <RenderItemView
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              onSelect={() => onSelect(item.id)}
            />
          ))}
        </svg>
      ) : (
        <canvas
          ref={canvasRef}
          aria-label="Seed Euclidean construction (Canvas)"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          <div style={{ display: "none" }}>
            <h3>Geometric Constructions</h3>
            <ul>
              {scene.items.map((item) => (
                <li key={item.id}>
                  <button onClick={() => onSelect(item.id)}>
                    Select {item.kind} {item.kind === "point" ? item.label.text : item.id}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </canvas>
      )}
    </section>
  );
}

function RenderItemView({
  item,
  selected,
  onSelect,
}: {
  item: RenderItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const className = selected ? `primitive ${item.kind} selected` : `primitive ${item.kind}`;
  const label = `${item.kind} ${item.kind === "point" ? item.label.text : item.id}`;

  if (item.kind === "point") {
    return (
      <g
        className={className}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
      >
        <circle cx={item.mark.x} cy={item.mark.y} r="5" />
        <text x={item.label.anchor.x} y={item.label.anchor.y}>
          {item.label.text}
        </text>
      </g>
    );
  }

  if (item.kind === "line") {
    return (
      <line
        className={className}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label={label}
        x1={item.from.x}
        y1={item.from.y}
        x2={item.to.x}
        y2={item.to.y}
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
      />
    );
  }

  return (
    <circle
      className={className}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={label}
      cx={item.center.x}
      cy={item.center.y}
      r={item.radius}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    />
  );
}

function Grid({ lines }: { lines: RenderScene["grid"] }) {
  return (
    <g className="grid" aria-hidden>
      {lines.map((line) => (
        <line key={line.id} x1={line.from.x} y1={line.from.y} x2={line.to.x} y2={line.to.y} />
      ))}
    </g>
  );
}
