import type { Construction } from "./model";

export function generateNextPointLabel(constructions: readonly Construction[]): string {
  const existingLabels = new Set(constructions.map((c) => c.label));
  for (let i = 0; i < 26; i++) {
    const label = String.fromCharCode(65 + i); // 'A' through 'Z'
    if (!existingLabels.has(label)) {
      return label;
    }
  }
  let suffix = 1;
  while (true) {
    for (let i = 0; i < 26; i++) {
      const label = String.fromCharCode(65 + i) + suffix;
      if (!existingLabels.has(label)) {
        return label;
      }
    }
    suffix++;
  }
}
