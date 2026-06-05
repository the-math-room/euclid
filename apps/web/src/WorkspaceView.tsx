import type { RenderItem, RenderScene } from "@euclid/rendering";
import type { ConstructionId } from "@euclid/geometry";

export function WorkspaceView({
  scene,
  selectedId,
  onSelect,
}: {
  scene: RenderScene;
  selectedId: ConstructionId | undefined;
  onSelect: (id: ConstructionId | undefined) => void;
}) {
  return (
    <section className="workspace" aria-label="Euclidean construction workspace">
      <svg
        viewBox={`0 0 ${scene.size.width} ${scene.size.height}`}
        role="img"
        aria-label="Seed Euclidean construction"
        onClick={() => onSelect(undefined)}
      >
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
