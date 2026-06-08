import type { RenderScene } from "./scene";
import { SVG_THEME_STYLES, THEME } from "./theme";
import { resolveItemStyle } from "./style";

export type SvgRendererOptions = Readonly<{
  selectedId?: string;
  selectedIds?: ReadonlySet<string>;
  embedStyles?: boolean;
}>;

/**
 * Renders a RenderScene to a standalone SVG string.
 */
export function renderSceneToSvgString(scene: RenderScene, options: SvgRendererOptions = {}): string {
  const { selectedId, selectedIds, embedStyles = true } = options;
  const parts: string[] = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" class="workspace-svg" viewBox="0 0 ${scene.size.width} ${scene.size.height}" width="${scene.size.width}" height="${scene.size.height}">`,
  );

  if (embedStyles) {
    parts.push(`  <style>${SVG_THEME_STYLES}</style>`);
  }

  // Draw grid
  parts.push('  <g class="grid">');
  for (const line of scene.grid) {
    parts.push(`    <line x1="${line.from.x}" y1="${line.from.y}" x2="${line.to.x}" y2="${line.to.y}" />`);
  }
  parts.push("  </g>");

  // Draw items
  for (const item of scene.items) {
    if (item.kind === "measurement-label") {
      parts.push(`  <g class="measurement-label ${item.status}" data-id="${escapeXmlAttribute(item.id)}">`);
      parts.push(
        `    <text x="${item.anchor.x}" y="${item.anchor.y}" text-anchor="middle" dominant-baseline="middle">${escapeXmlText(item.text)}</text>`,
      );
      parts.push("  </g>");
      continue;
    }

    const isSelected = selectedIds ? selectedIds.has(item.id) : item.id === selectedId;
    const baseClass =
      item.kind === "point"
        ? `primitive ${item.kind} ${item.pointRole ?? "free"}`
        : `primitive ${item.kind} ${item.shapeRole ?? "primary"}`;
    const className = isSelected ? `${baseClass} selected` : baseClass;
    const id = escapeXmlAttribute(item.id);

    const style = resolveItemStyle(item, { selectedId, selectedIds });

    if (style.kind === "point" && item.kind === "point") {
      parts.push(`  <g class="${className}" data-id="${id}">`);
      parts.push(
        `    <circle cx="${item.mark.x}" cy="${item.mark.y}" r="${style.radius}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.lineWidth}" />`,
      );
      parts.push(
        `    <text x="${item.label.anchor.x}" y="${item.label.anchor.y}" fill="${style.textFill}" font-family="${THEME.typography.fontFamily}" font-size="${THEME.typography.fontSize}" font-weight="${THEME.typography.fontWeight}" stroke="${style.textStroke}" stroke-width="${style.textStrokeWidth}" paint-order="stroke">${escapeXmlText(item.label.text)}</text>`,
      );
      parts.push("  </g>");
    } else if (style.kind === "shape" && item.kind === "line") {
      parts.push(
        `  <line class="${className}" x1="${item.from.x}" y1="${item.from.y}" x2="${item.to.x}" y2="${item.to.y}" stroke="${style.stroke}" stroke-width="${style.lineWidth}" stroke-dasharray="${style.lineDash.join(" ")}" opacity="${style.opacity}" fill="none" data-id="${id}" />`,
      );
    } else if (style.kind === "shape" && item.kind === "circle") {
      parts.push(
        `  <circle class="${className}" cx="${item.center.x}" cy="${item.center.y}" r="${item.radius}" stroke="${style.stroke}" stroke-width="${style.lineWidth}" stroke-dasharray="${style.lineDash.join(" ")}" opacity="${style.opacity}" fill="none" data-id="${id}" />`,
      );
    }
  }

  parts.push("</svg>");
  return parts.join("\n");
}

function escapeXmlText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeXmlAttribute(value: string): string {
  return escapeXmlText(value).replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}
