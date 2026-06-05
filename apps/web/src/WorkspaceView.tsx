import {
  drawSceneToCanvas,
  findItemAtPosition,
  SVG_THEME_STYLES,
  type RenderItem,
  type RenderScene,
} from "@euclid/rendering";
import type { ConstructionId, Point2 } from "@euclid/geometry";
import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Multi-touch gesture tracking
// ---------------------------------------------------------------------------

type ActivePointer = Readonly<{
  id: number;
  x: number;
  y: number;
}>;

type GestureState = {
  /** All currently active pointers, keyed by pointerId */
  pointers: Map<number, ActivePointer>;
  /** Previous screen position per pointer, for incremental delta computation */
  lastPos: Map<number, Point2>;
  /** Screen position at gesture start — used to detect taps vs. drags */
  dragStartX: number;
  dragStartY: number;
  /** Whether the gesture has moved enough to count as a drag (not a tap) */
  hasMoved: boolean;
  /** Distance between fingers at the start of a pinch gesture */
  pinchStartDistance: number;
  /** Camera zoom at the start of a pinch gesture */
  pinchStartZoom: number;
  /** Last midpoint between fingers, used for pan-during-pinch */
  pinchLastMidpoint: Point2;
};

function pointerDistance(a: ActivePointer, b: ActivePointer): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointerMidpoint(a: ActivePointer, b: ActivePointer): Point2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// ---------------------------------------------------------------------------
// Canvas projection helpers
// ---------------------------------------------------------------------------

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

function clientToSceneCoords(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  sceneWidth: number,
  sceneHeight: number,
): Point2 {
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const { scale, dx, dy } = getCanvasProjection(rect.width, rect.height, sceneWidth, sceneHeight);
  return { x: (x - dx) / scale, y: (y - dy) / scale };
}

// ---------------------------------------------------------------------------
// WorkspaceView component
// ---------------------------------------------------------------------------

export function WorkspaceView({
  scene,
  selectedIds,
  onSelect,
  onPanBy,
  onZoom,
  currentZoom,
  activeTool,
  onAddPoint,
}: {
  scene: RenderScene;
  selectedIds: ReadonlySet<ConstructionId>;
  onSelect: (id: ConstructionId | undefined, modifiers?: { ctrlKey?: boolean; shiftKey?: boolean }) => void;
  onPanBy: (delta: Point2) => void;
  onZoom: (zoom: number) => void;
  currentZoom: number;
  activeTool: "select" | "point" | "line" | "circle";
  onAddPoint: (coords: Point2) => void;
}) {
  const [renderMode, setRenderMode] = useState<"svg" | "canvas">("svg");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [hoveredId, setHoveredId] = useState<ConstructionId | undefined>();

  // All gesture state lives in a ref — never causes re-renders
  const gestureRef = useRef<GestureState>({
    pointers: new Map(),
    lastPos: new Map(),
    dragStartX: 0,
    dragStartY: 0,
    hasMoved: false,
    pinchStartDistance: 0,
    pinchStartZoom: 1,
    pinchLastMidpoint: { x: 0, y: 0 },
  });

  // Keep currentZoom accessible inside event handlers without stale closure
  const currentZoomRef = useRef(currentZoom);
  useEffect(() => {
    currentZoomRef.current = currentZoom;
  }, [currentZoom]);

  // Track size changes of canvas for DPI-correct rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || renderMode !== "canvas") return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [renderMode]);

  // Render scene to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (
      !canvas ||
      !dimensions ||
      dimensions.width === 0 ||
      dimensions.height === 0 ||
      renderMode !== "canvas"
    )
      return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);
    const { scale, dx, dy } = getCanvasProjection(
      dimensions.width,
      dimensions.height,
      scene.size.width,
      scene.size.height,
    );
    ctx.translate(dx, dy);
    ctx.scale(scale, scale);
    drawSceneToCanvas(ctx, scene, { selectedIds, hoveredId });
  }, [scene, selectedIds, hoveredId, dimensions, renderMode]);

  // ---------------------------------------------------------------------------
  // Unified pointer event handlers — shared by SVG and Canvas
  // ---------------------------------------------------------------------------

  const onPointerDown = (event: React.PointerEvent<Element>) => {
    (event.currentTarget as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture?.(
      event.pointerId,
    );

    const g = gestureRef.current;
    const p: ActivePointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    g.pointers.set(event.pointerId, p);
    g.lastPos.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (g.pointers.size === 1) {
      g.dragStartX = event.clientX;
      g.dragStartY = event.clientY;
      g.hasMoved = false;
    } else if (g.pointers.size === 2) {
      const [a, b] = Array.from(g.pointers.values()) as [ActivePointer, ActivePointer];
      g.pinchStartDistance = pointerDistance(a, b);
      g.pinchStartZoom = currentZoomRef.current;
      g.pinchLastMidpoint = pointerMidpoint(a, b);
      g.hasMoved = true; // cancel pending tap from finger 1
    }
  };

  const onPointerMove = (event: React.PointerEvent<Element>) => {
    const g = gestureRef.current;
    if (!g.pointers.has(event.pointerId)) return;

    const prev = g.lastPos.get(event.pointerId);
    g.pointers.set(event.pointerId, { id: event.pointerId, x: event.clientX, y: event.clientY });
    g.lastPos.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (g.pointers.size >= 2) {
      // --- Pinch: zoom + mid-pan ---
      const [a, b] = Array.from(g.pointers.values()) as [ActivePointer, ActivePointer];
      const currentDist = pointerDistance(a, b);
      const midpoint = pointerMidpoint(a, b);

      const panDelta: Point2 = {
        x: midpoint.x - g.pinchLastMidpoint.x,
        y: midpoint.y - g.pinchLastMidpoint.y,
      };
      if (panDelta.x !== 0 || panDelta.y !== 0) onPanBy(panDelta);

      if (g.pinchStartDistance > 0) {
        onZoom(g.pinchStartZoom * (currentDist / g.pinchStartDistance));
      }

      g.pinchLastMidpoint = midpoint;
    } else if (prev) {
      // --- Single-finger drag: pan ---
      const dx = event.clientX - prev.x;
      const dy = event.clientY - prev.y;
      const totalDist = Math.hypot(event.clientX - g.dragStartX, event.clientY - g.dragStartY);
      if (totalDist > 4) g.hasMoved = true;
      if (g.hasMoved && (dx !== 0 || dy !== 0)) onPanBy({ x: dx, y: dy });

      // Mouse-only: update hover highlight on canvas
      if (event.pointerType === "mouse" && renderMode === "canvas") {
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const coords = clientToSceneCoords(
            event.clientX,
            event.clientY,
            rect,
            scene.size.width,
            scene.size.height,
          );
          const item = findItemAtPosition(scene, coords);
          if (activeTool === "point") {
            setHoveredId(undefined);
            canvas.style.cursor = "crosshair";
          } else {
            setHoveredId(item?.id);
            canvas.style.cursor = item ? "pointer" : "grab";
          }
        }
      }
    }
  };

  const onPointerUp = (event: React.PointerEvent<Element>) => {
    const g = gestureRef.current;
    const wasOnlyPointer = g.pointers.size === 1;
    const wasTap = !g.hasMoved;

    g.pointers.delete(event.pointerId);
    g.lastPos.delete(event.pointerId);

    if (wasOnlyPointer && wasTap) {
      // Tap: identify coordinates against the correct coordinate space
      const el = event.currentTarget as Element;
      const rect = el.getBoundingClientRect();
      const coords = clientToSceneCoords(
        event.clientX,
        event.clientY,
        rect,
        scene.size.width,
        scene.size.height,
      );

      if (activeTool === "point") {
        onAddPoint(coords);
      } else {
        const item = findItemAtPosition(scene, coords);
        if (item) {
          onSelect(item.id, { ctrlKey: event.ctrlKey, shiftKey: event.shiftKey });
        } else {
          onSelect(undefined);
        }
      }
    }

    // Transitioning from 2-finger to 1-finger: reset drag origin
    if (g.pointers.size === 1) {
      const remaining = Array.from(g.pointers.values())[0];
      g.dragStartX = remaining.x;
      g.dragStartY = remaining.y;
      g.hasMoved = false;
    }
  };

  const onPointerCancel = (event: React.PointerEvent<Element>) => {
    gestureRef.current.pointers.delete(event.pointerId);
    gestureRef.current.lastPos.delete(event.pointerId);
  };

  const sharedPointerProps = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };

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

      <div className="workspace-viewport">
        {renderMode === "svg" ? (
          <svg
            ref={svgRef}
            className={`workspace-svg ${activeTool === "point" ? "tool-point" : ""}`}
            viewBox={`0 0 ${scene.size.width} ${scene.size.height}`}
            role="img"
            aria-label="Seed Euclidean construction (SVG)"
            {...sharedPointerProps}
          >
            <style dangerouslySetInnerHTML={{ __html: SVG_THEME_STYLES }} />
            <rect className="pan-surface" width={scene.size.width} height={scene.size.height} />
            <Grid lines={scene.grid} />
            {scene.items.map((item) => (
              <RenderItemView
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                onSelect={(modifiers) => {
                  if (activeTool === "select") {
                    onSelect(item.id, modifiers);
                  }
                }}
              />
            ))}
          </svg>
        ) : (
          <canvas ref={canvasRef} aria-label="Seed Euclidean construction (Canvas)" {...sharedPointerProps}>
            <div style={{ display: "none" }}>
              <h3>Geometric Constructions</h3>
              <ul>
                {scene.items.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={(event) =>
                        onSelect(item.id, { ctrlKey: event.ctrlKey, shiftKey: event.shiftKey })
                      }
                    >
                      Select {item.kind} {item.kind === "point" ? item.label.text : item.id}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </canvas>
        )}
      </div>
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
  onSelect: (modifiers?: { ctrlKey?: boolean; shiftKey?: boolean }) => void;
}) {
  const className = selected ? `primitive ${item.kind} selected` : `primitive ${item.kind}`;
  const label = `${item.kind} ${item.kind === "point" ? item.label.text : item.id}`;

  // Stop propagation on pointer events so item taps don't bubble to the SVG/canvas
  // background handler (which would misinterpret them as background taps).
  const stopProp = (e: React.PointerEvent) => e.stopPropagation();
  const handlePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect({ ctrlKey: e.ctrlKey, shiftKey: e.shiftKey });
  };

  const sharedProps = {
    className,
    role: "button" as const,
    tabIndex: 0,
    "aria-pressed": selected,
    "aria-label": label,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect({ ctrlKey: e.ctrlKey, shiftKey: e.shiftKey });
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect();
      }
    },
    onPointerDown: stopProp,
    onPointerUp: handlePointerUp,
  };

  if (item.kind === "point") {
    return (
      <g {...sharedProps}>
        <circle cx={item.mark.x} cy={item.mark.y} r="5" />
        <text x={item.label.anchor.x} y={item.label.anchor.y}>
          {item.label.text}
        </text>
      </g>
    );
  }

  if (item.kind === "line") {
    return <line {...sharedProps} x1={item.from.x} y1={item.from.y} x2={item.to.x} y2={item.to.y} />;
  }

  return <circle {...sharedProps} cx={item.center.x} cy={item.center.y} r={item.radius} />;
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
