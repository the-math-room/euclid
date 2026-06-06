import {
  drawSceneToCanvas,
  SVG_THEME_STYLES,
  type IntersectionHit,
  type RenderItem,
  type RenderScene,
  findIntersectionAtPosition,
  findItemAtPosition,
} from "@euclid/rendering";
import type { Construction, ConstructionId, Point2, ScenePoint } from "@euclid/geometry";
import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import type { ActiveTool } from "./construction/tools";
import { useWorkspaceGestures } from "./useWorkspaceGestures";
import { getCanvasProjection } from "./workspaceCoordinates";

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
  onBeginPointDrag,
  onMovePoint,
  onEndPointDrag,
  onBeginShapeDrag,
  onMoveShape,
  onAddIntersection,
  canDragPoint,
  onResize,
  sizeScale = 1.0,
  constructions = [],
  onDeleteSelected,
  draftPreview,
}: {
  scene: RenderScene;
  selectedIds: ReadonlySet<ConstructionId>;
  onSelect: (id: ConstructionId | undefined, modifiers?: { ctrlKey?: boolean; shiftKey?: boolean }) => void;
  onPanBy: (delta: Point2) => void;
  onZoom: (zoom: number) => void;
  currentZoom: number;
  activeTool: ActiveTool;
  onAddPoint: (sceneCoords: ScenePoint) => void;
  onBeginPointDrag: (id: ConstructionId) => void;
  onMovePoint: (id: ConstructionId, sceneCoords: ScenePoint) => void;
  onEndPointDrag: () => void;
  onBeginShapeDrag: (id: ConstructionId) => void;
  onMoveShape: (id: ConstructionId, startSceneCoords: ScenePoint, currentSceneCoords: ScenePoint) => void;
  onAddIntersection: (hit: IntersectionHit) => void;
  canDragPoint: (id: ConstructionId) => boolean;
  onResize?: (size: { width: number; height: number }) => void;
  sizeScale?: number;
  constructions?: readonly Construction[];
  onDeleteSelected?: () => void;
  draftPreview?: Readonly<{
    kind: "line" | "circle";
    anchorId: ConstructionId;
  }>;
}) {
  const [renderMode, setRenderMode] = useState<"svg" | "canvas">("svg");
  const selectedConstructions = constructions.filter((c) => selectedIds.has(c.id));

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [pointerCoords, setPointerCoords] = useState<ScenePoint | undefined>();
  const [isPointerDown, setIsPointerDown] = useState(false);

  const hoveredId = useMemo(() => {
    if (renderMode !== "canvas" || !pointerCoords || isPointerDown) {
      return undefined;
    }
    const threshold = 8;
    const item = findItemAtPosition(scene, pointerCoords, threshold);
    return item?.id;
  }, [renderMode, pointerCoords, isPointerDown, scene]);

  const cursor = useMemo(() => {
    if (renderMode !== "canvas") return undefined;
    if (activeTool === "point") return "crosshair";
    if (activeTool === "select") {
      if (isPointerDown) return "grabbing";
      return hoveredId ? "pointer" : "grab";
    }
    return hoveredId ? "pointer" : "crosshair";
  }, [renderMode, activeTool, isPointerDown, hoveredId]);

  const previewPoint = useMemo(() => {
    if (!pointerCoords || !isPointerDown || activeTool === "select") {
      return undefined;
    }
    const threshold = 8;
    const intersection = findIntersectionAtPosition(scene, pointerCoords, threshold);
    if (intersection) {
      return {
        x: intersection.position.x,
        y: intersection.position.y,
        isSnapped: true,
      };
    }
    return {
      x: pointerCoords.x,
      y: pointerCoords.y,
      isSnapped: false,
    };
  }, [pointerCoords, isPointerDown, activeTool, scene]);

  // Track size changes of viewport container for dynamic layout and DPI-correct rendering
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
          onResize?.({ width, height });
        }
      }
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [onResize]);

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
    drawSceneToCanvas(ctx, scene, { selectedIds, hoveredId, sizeScale });

    // Draw generic preview draft if active and pointer is over the workspace
    if (pointerCoords && draftPreview) {
      const anchorItem = scene.items.find(
        (item) => item.id === draftPreview.anchorId && item.kind === "point",
      );
      if (anchorItem && anchorItem.kind === "point") {
        if (draftPreview.kind === "circle") {
          const dx = pointerCoords.x - anchorItem.mark.x;
          const dy = pointerCoords.y - anchorItem.mark.y;
          const radius = Math.hypot(dx, dy);

          ctx.beginPath();
          ctx.arc(anchorItem.mark.x, anchorItem.mark.y, radius, 0, 2 * Math.PI);
          ctx.strokeStyle = "#ba4a3a";
          ctx.lineWidth = 2.5;
          ctx.globalAlpha = 0.55;
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        } else if (draftPreview.kind === "line") {
          ctx.beginPath();
          ctx.moveTo(anchorItem.mark.x, anchorItem.mark.y);
          ctx.lineTo(pointerCoords.x, pointerCoords.y);
          ctx.strokeStyle = "#246a73";
          ctx.lineWidth = 2.5;
          ctx.globalAlpha = 0.55;
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }
      }
    }

    // Draw preview point if mouse click is down in creation mode
    if (previewPoint) {
      ctx.beginPath();
      ctx.arc(previewPoint.x, previewPoint.y, 5 * sizeScale, 0, 2 * Math.PI);
      if (previewPoint.isSnapped) {
        ctx.fillStyle = "#ba4a3a";
        ctx.strokeStyle = "#e3c057";
        ctx.globalAlpha = 0.8;
      } else {
        ctx.fillStyle = "#172026";
        ctx.strokeStyle = "#e3c057";
        ctx.globalAlpha = 0.5;
      }
      ctx.lineWidth = 2.5 * sizeScale;
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
  }, [
    scene,
    selectedIds,
    hoveredId,
    dimensions,
    renderMode,
    sizeScale,
    pointerCoords,
    draftPreview,
    previewPoint,
  ]);

  const sharedPointerProps = useWorkspaceGestures({
    scene,
    activeTool,
    currentZoom,
    onSelect,
    onPanBy,
    onZoom,
    onAddPoint,
    onBeginPointDrag,
    onMovePoint,
    onEndPointDrag,
    onBeginShapeDrag,
    onMoveShape,
    onAddIntersection,
    canDragPoint,
    onPointerMoveCoords: setPointerCoords,
    onPointerDownStateChange: setIsPointerDown,
  });

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

      <div ref={viewportRef} className="workspace-viewport">
        {renderMode === "svg" ? (
          <svg
            ref={svgRef}
            className={`workspace-svg ${activeTool === "point" ? "tool-point" : ""}`}
            viewBox={`0 0 ${scene.size.width} ${scene.size.height}`}
            style={{ "--size-scale": sizeScale } as React.CSSProperties}
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
                sizeScale={sizeScale}
                onSelect={(modifiers) => {
                  if (activeTool === "select") {
                    onSelect(item.id, modifiers);
                  }
                }}
              />
            ))}
            {/* Render preview draft */}
            {pointerCoords &&
              draftPreview &&
              (() => {
                const anchorItem = scene.items.find(
                  (item) => item.id === draftPreview.anchorId && item.kind === "point",
                );
                if (anchorItem && anchorItem.kind === "point") {
                  if (draftPreview.kind === "circle") {
                    const radius = Math.hypot(
                      pointerCoords.x - anchorItem.mark.x,
                      pointerCoords.y - anchorItem.mark.y,
                    );
                    return (
                      <circle
                        cx={anchorItem.mark.x}
                        cy={anchorItem.mark.y}
                        r={radius}
                        fill="none"
                        stroke="#ba4a3a"
                        strokeWidth="2.5"
                        opacity="0.55"
                        style={{ pointerEvents: "none" }}
                      />
                    );
                  } else if (draftPreview.kind === "line") {
                    return (
                      <line
                        x1={anchorItem.mark.x}
                        y1={anchorItem.mark.y}
                        x2={pointerCoords.x}
                        y2={pointerCoords.y}
                        stroke="#246a73"
                        strokeWidth="2.5"
                        opacity="0.55"
                        style={{ pointerEvents: "none" }}
                      />
                    );
                  }
                }
                return null;
              })()}
            {/* Render preview point when mouseclick is down */}
            {previewPoint && (
              <circle
                cx={previewPoint.x}
                cy={previewPoint.y}
                r={5 * sizeScale}
                fill={previewPoint.isSnapped ? "#ba4a3a" : "#172026"}
                stroke="#e3c057"
                strokeWidth={2.5 * sizeScale}
                opacity={previewPoint.isSnapped ? 0.8 : 0.5}
                style={{ pointerEvents: "none" }}
              />
            )}
          </svg>
        ) : (
          <canvas
            ref={canvasRef}
            aria-label="Seed Euclidean construction (Canvas)"
            style={
              {
                "--size-scale": sizeScale,
                cursor,
              } as React.CSSProperties
            }
            {...sharedPointerProps}
          >
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

        {/* Floating Mobile HUD */}
        {selectedConstructions.length > 0 && (
          <div className="workspace-hud-overlay">
            <div className="hud-header">
              <h3>Selection ({selectedConstructions.length})</h3>
              {onDeleteSelected && (
                <button
                  type="button"
                  className="hud-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSelected();
                  }}
                  title="Delete selection"
                  aria-label="Delete selection"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="hud-content">
              {selectedConstructions.length === 1 ? (
                <div className="hud-details">
                  <div className="hud-row">
                    <span className="hud-label">Label:</span>
                    <span className="hud-value">{selectedConstructions[0].label}</span>
                  </div>
                  <div className="hud-row">
                    <span className="hud-label">Kind:</span>
                    <span className="hud-value">{selectedConstructions[0].kind}</span>
                  </div>
                  <CompactSpecificDetails construction={selectedConstructions[0]} />
                </div>
              ) : (
                <div className="hud-multi-list">
                  {selectedConstructions.map((c) => (
                    <div key={c.id} className="hud-multi-item">
                      <span>{c.label}</span>
                      <code>{c.kind}</code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function CompactSpecificDetails({ construction }: { construction: Construction }) {
  if (construction.kind === "free-point") {
    return (
      <div className="hud-row">
        <span className="hud-label">Coords:</span>
        <span className="hud-value">
          ({construction.position.x.toFixed(1)}, {construction.position.y.toFixed(1)})
        </span>
      </div>
    );
  }
  if (construction.kind === "line-through") {
    return (
      <div className="hud-row">
        <span className="hud-label">Through:</span>
        <span className="hud-value">{construction.points.join(", ")}</span>
      </div>
    );
  }
  if (construction.kind === "circle-through") {
    return (
      <div className="hud-row">
        <span className="hud-label">Center:</span>
        <span className="hud-value">{construction.center}</span>
      </div>
    );
  }
  if (construction.kind === "circle-three-points") {
    return (
      <div className="hud-row">
        <span className="hud-label">Points:</span>
        <span className="hud-value">{construction.points.join(", ")}</span>
      </div>
    );
  }
  if (construction.kind === "line-line-intersection") {
    return (
      <div className="hud-row">
        <span className="hud-label">Lines:</span>
        <span className="hud-value">{construction.lines.join(", ")}</span>
      </div>
    );
  }
  return null;
}

function RenderItemView({
  item,
  selected,
  onSelect,
  sizeScale,
}: {
  item: RenderItem;
  selected: boolean;
  onSelect: (modifiers?: { ctrlKey?: boolean; shiftKey?: boolean }) => void;
  sizeScale: number;
}) {
  const roleClass = item.kind === "point" ? ` ${item.pointRole ?? "free"}` : "";
  const className = selected
    ? `primitive ${item.kind}${roleClass} selected`
    : `primitive ${item.kind}${roleClass}`;
  const label = `${item.kind} ${item.kind === "point" ? item.label.text : item.id}`;

  const sharedProps = {
    className,
    role: "button" as const,
    tabIndex: 0,
    "aria-pressed": selected,
    "aria-label": label,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect();
      }
    },
  };

  if (item.kind === "point") {
    const radius = 5 * sizeScale;
    return (
      <g {...sharedProps}>
        <circle cx={item.mark.x} cy={item.mark.y} r={radius} />
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
