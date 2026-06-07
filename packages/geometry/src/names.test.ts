import { describe, expect, it } from "vitest";
import { toWorldPoint, type Construction } from "./model";
import { generateNextPointLabel } from "./names";

describe("generateNextPointLabel", () => {
  it("returns A when constructions are empty", () => {
    expect(generateNextPointLabel([])).toBe("A");
  });

  it("returns B when A already exists", () => {
    const mockConstructions: Construction[] = [
      { id: "A", kind: "free-point", label: "A", position: toWorldPoint({ x: 0, y: 0 }) },
    ];
    expect(generateNextPointLabel(mockConstructions)).toBe("B");
  });

  it("returns A1 when A through Z already exist", () => {
    const mockConstructions: Construction[] = [];
    for (let i = 0; i < 26; i++) {
      const label = String.fromCharCode(65 + i);
      mockConstructions.push({
        id: label,
        kind: "free-point",
        label,
        position: toWorldPoint({ x: 0, y: 0 }),
      });
    }
    expect(generateNextPointLabel(mockConstructions)).toBe("A1");
  });

  it("returns B1 when A through Z and A1 already exist", () => {
    const mockConstructions: Construction[] = [];
    for (let i = 0; i < 26; i++) {
      const label = String.fromCharCode(65 + i);
      mockConstructions.push({
        id: label,
        kind: "free-point",
        label,
        position: toWorldPoint({ x: 0, y: 0 }),
      });
    }
    mockConstructions.push({
      id: "A1",
      kind: "free-point",
      label: "A1",
      position: toWorldPoint({ x: 0, y: 0 }),
    });
    expect(generateNextPointLabel(mockConstructions)).toBe("B1");
  });
});
