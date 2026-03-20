import { describe, expect, it } from "vitest";
import {
  clampDenseUnits,
  getDefaultLayerSize,
  getDenseUnitCap,
  getDenseUnitOptions,
  getLayerSizeOptions,
  isLayerNodeSkill,
  sanitizeLayerNodeData,
} from "./layerSizeOptions";

function denseOptions(maxUnits: number) {
  return Array.from({ length: maxUnits }, (_, index) => index + 1);
}

describe("layerSizeOptions", () => {
  it("Dense は初期状態で 1 と 2 を使える", () => {
    expect(getDenseUnitCap([])).toBe(2);
    expect(getDenseUnitOptions([])).toEqual([1, 2]);
  });

  it("幅拡張スキルで Dense の選択肢が 4, 6, 8, 10, 12 まで広がる", () => {
    expect(getDenseUnitCap(["dense_width_cap_4"])).toBe(4);
    expect(getDenseUnitOptions(["dense_width_cap_4"])).toEqual(denseOptions(4));
    expect(getDenseUnitCap(["dense_width_cap_6"])).toBe(6);
    expect(getDenseUnitOptions(["dense_width_cap_6"])).toEqual(denseOptions(6));
    expect(getDenseUnitCap(["dense_width_cap_8"])).toBe(8);
    expect(getDenseUnitOptions(["dense_width_cap_8"])).toEqual(denseOptions(8));
    expect(getDenseUnitCap(["dense_width_cap_10"])).toBe(10);
    expect(getDenseUnitOptions(["dense_width_cap_10"])).toEqual(denseOptions(10));
    expect(getDenseUnitCap(["dense_width_cap_12"])).toBe(12);
    expect(getDenseUnitOptions(["dense_width_cap_12"])).toEqual(denseOptions(12));
  });

  it("旧セーブの幅スキルは数値を現在の上限 12 に丸めて読み替える", () => {
    expect(getDenseUnitCap(["dense_width_8"])).toBe(8);
    expect(getDenseUnitOptions(["dense_width_24"])).toEqual(denseOptions(12));
    expect(getDenseUnitOptions(["dense_width_64"])).toEqual(denseOptions(12));
  });

  it("Conv2D は別の小さめフィルタ帯を使う", () => {
    expect(getLayerSizeOptions("conv2d", [])).toEqual([4, 8, 12, 16, 24, 32]);
  });

  it("スキルIDを実レイヤーと幅拡張で区別できる", () => {
    expect(isLayerNodeSkill("dense")).toBe(true);
    expect(isLayerNodeSkill("conv2d")).toBe(true);
    expect(isLayerNodeSkill("dense_width_64")).toBe(false);
  });

  it("新規ノードの初期幅をレイヤー種別ごとに変える", () => {
    expect(getDefaultLayerSize("dense")).toBe(2);
    expect(getDefaultLayerSize("conv2d")).toBe(8);
  });

  it("Dense の幅は clamp で 12 を超えない", () => {
    expect(clampDenseUnits(99)).toBe(12);
    expect(clampDenseUnits(11.6)).toBe(12);
    expect(clampDenseUnits(Number.NaN)).toBe(2);
    expect(clampDenseUnits(99, 4)).toBe(4);
  });

  it("Dense ノードの data は sanitize 時に現在の上限へ補正する", () => {
    expect(
      sanitizeLayerNodeData({
        layerType: "dense",
        units: 32,
        activation: "relu",
        regularization: null,
        regularizationRate: 0,
      }, ["dense", "dense_width_cap_4"]),
    ).toMatchObject({ units: 4 });

    expect(
      sanitizeLayerNodeData({
        layerType: "dense",
        units: 32,
        activation: "relu",
        regularization: null,
        regularizationRate: 0,
      }),
    ).toMatchObject({ units: 12 });

    expect(
      sanitizeLayerNodeData({
        layerType: "conv2d",
        units: 32,
        filters: 32,
        kernelSize: 3,
        activation: "relu",
        regularization: null,
        regularizationRate: 0,
      }),
    ).toMatchObject({ units: 32, filters: 32 });
  });
});
