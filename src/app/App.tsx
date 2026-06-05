import { Circle, MousePointer2, Ruler, Waypoints } from "lucide-react";
import { evaluateConstruction } from "../geometry/evaluate";
import { seedConstruction } from "../geometry/seed";
import type { ConstructionProgram, EvaluatedPrimitive, Point2 } from "../geometry/model";
import { projectPoint, worldFrameFor } from "../geometry/viewport";

const program: ConstructionProgram = seedConstruction;
const evaluated = evaluateConstruction(program);
const frame = worldFrameFor(evaluated.primitives, { width: 920, height: 620 });

export function App() {
  return (
    <main className="app-shell">
      <aside className="tool-panel" aria-label="Construction tools">
        <div className="brand">
          <Waypoints size={24} aria-hidden />
          <div>
            <h1>Euclid</h1>
            <p>Denotational construction studio</p>
          </div>
        </div>

        <nav className="tool-grid" aria-label="Tools">
          <button type="button" className="tool-button active" title="Select">
            <MousePointer2 size={19} aria-hidden />
          </button>
          <button type="button" className="tool-button" title="Point">
            <Waypoints size={19} aria-hidden />
          </button>
          <button type="button" className="tool-button" title="Line">
            <Ruler size={19} aria-hidden />
          </button>
          <button type="button" className="tool-button" title="Circle">
            <Circle size={19} aria-hidden />
          </button>
        </nav>

        <section className="inspector" aria-label="Construction objects">
          <h2>Objects</h2>
          <ol>
            {program.constructions.map((construction) => (
              <li key={construction.id}>
                <span>{construction.label}</span>
                <code>{construction.kind}</code>
              </li>
            ))}
          </ol>
        </section>
      </aside>

      <section className="workspace" aria-label="Euclidean construction workspace">
        <svg viewBox="0 0 920 620" role="img" aria-label="Seed Euclidean construction">
          <Grid />
          {evaluated.primitives.map((primitive) => (
            <PrimitiveView key={primitive.id} primitive={primitive} />
          ))}
        </svg>
      </section>
    </main>
  );
}

function PrimitiveView({ primitive }: { primitive: EvaluatedPrimitive }) {
  if (primitive.kind === "point") {
    const p = projectPoint(frame, primitive.position);

    return (
      <g className="primitive point">
        <circle cx={p.x} cy={p.y} r="5" />
        <text x={p.x + 10} y={p.y - 10}>
          {primitive.label}
        </text>
      </g>
    );
  }

  if (primitive.kind === "line") {
    const a = projectPoint(frame, primitive.through[0]);
    const b = projectPoint(frame, primitive.through[1]);
    const endpoints = extendLineToViewport(a, b, { width: 920, height: 620 });

    return (
      <line
        className="primitive line"
        x1={endpoints[0].x}
        y1={endpoints[0].y}
        x2={endpoints[1].x}
        y2={endpoints[1].y}
      />
    );
  }

  const center = projectPoint(frame, primitive.center);
  const edge = projectPoint(frame, primitive.pointOnCircle);
  const radius = distance(center, edge);

  return <circle className="primitive circle" cx={center.x} cy={center.y} r={radius} />;
}

function Grid() {
  const lines = Array.from({ length: 24 }, (_, index) => index * 40);

  return (
    <g className="grid" aria-hidden>
      {lines.map((x) => (
        <line key={`x-${x}`} x1={x} y1="0" x2={x} y2="620" />
      ))}
      {lines.map((y) => (
        <line key={`y-${y}`} x1="0" y1={y} x2="920" y2={y} />
      ))}
    </g>
  );
}

function extendLineToViewport(
  a: Point2,
  b: Point2,
  size: { width: number; height: number },
): [Point2, Point2] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const span = Math.hypot(size.width, size.height);

  return [
    { x: a.x - ux * span, y: a.y - uy * span },
    { x: a.x + ux * span, y: a.y + uy * span },
  ];
}

function distance(a: Point2, b: Point2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
