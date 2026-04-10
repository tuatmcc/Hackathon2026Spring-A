import { describe, expect, it } from "vitest";
import { createLayerNode } from "./layerNodeFactory";

describe("createLayerNode", () => {
  it("クリック追加時の初期位置が右方向へ流れ続けない", () => {
    const created = Array.from({ length: 6 }, () => createLayerNode("dense"));
    const xs = created.map((node) => node.position.x);
    const ys = created.map((node) => node.position.y);

    expect(Math.max(...xs)).toBeLessThanOrEqual(500);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(180);
    expect(Math.max(...ys)).toBeLessThanOrEqual(400);
    expect(new Set(xs).size).toBeLessThanOrEqual(3);
    expect(xs.some((x, index) => index > 0 && x < xs[index - 1]!)).toBe(true);
  });
});
