import type { RenderItem, RenderScene } from "@euclid/rendering";

export function WorkspaceView({ scene }: { scene: RenderScene }) {
  return (
    <section className="workspace" aria-label="Euclidean construction workspace">
      <svg
        viewBox={`0 0 ${scene.size.width} ${scene.size.height}`}
        role="img"
        aria-label="Seed Euclidean construction"
      >
        <Grid width={scene.size.width} height={scene.size.height} />
        {scene.items.map((item) => (
          <RenderItemView key={item.id} item={item} />
        ))}
      </svg>
    </section>
  );
}

function RenderItemView({ item }: { item: RenderItem }) {
  if (item.kind === "point") {
    return (
      <g className="primitive point">
        <circle cx={item.position.x} cy={item.position.y} r="5" />
        <text x={item.position.x + 10} y={item.position.y - 10}>
          {item.label}
        </text>
      </g>
    );
  }

  if (item.kind === "line") {
    return (
      <line className="primitive line" x1={item.from.x} y1={item.from.y} x2={item.to.x} y2={item.to.y} />
    );
  }

  return <circle className="primitive circle" cx={item.center.x} cy={item.center.y} r={item.radius} />;
}

function Grid({ width, height }: { width: number; height: number }) {
  const xLines = gridLinesFor(width);
  const yLines = gridLinesFor(height);

  return (
    <g className="grid" aria-hidden>
      {xLines.map((x) => (
        <line key={`x-${x}`} x1={x} y1="0" x2={x} y2={height} />
      ))}
      {yLines.map((y) => (
        <line key={`y-${y}`} x1="0" y1={y} x2={width} y2={y} />
      ))}
    </g>
  );
}

function gridLinesFor(length: number): readonly number[] {
  return Array.from({ length: Math.ceil(length / 40) + 1 }, (_, index) => index * 40);
}
