import { describe, expect, it } from "vitest";
import type { LayerNodeData, StageDef } from "../types";
import {
  estimateModelParameterCount,
  getModelParameterCap,
} from "./modelParameterBudget";

const binaryStage: StageDef = {
  id: "test_stage",
  name: "Test Stage",
  description: "Test",
  datasetId: "xor",
  inputShape: [2],
  taskType: "binary",
  outputUnits: 1,
  outputActivation: "sigmoid",
  lossFunction: "binaryCrossentropy",
  targetAccuracy: 0.9,
  rewardPoints: 100,
};

describe("modelParameterBudget", () => {
  it("未解放時はベース上限を返す", () => {
    expect(getModelParameterCap(["dense", "sigmoid", "sgd"])).toBe(32);
  });

  it("解放済みスキルから最大の総パラメータ上限を返す", () => {
    expect(
      getModelParameterCap([
        "dense",
        "sigmoid",
        "sgd",
        "model_params_cap_64",
        "model_params_cap_256",
      ]),
    ).toBe(256);
  });

  it("dense構成の総パラメータ数を見積もれる", () => {
    const layers: LayerNodeData[] = [
      { layerType: "dense", units: 4, activation: "relu", regularization: null, regularizationRate: 0 },
      { layerType: "dense", units: 3, activation: "relu", regularization: null, regularizationRate: 0 },
    ];

    const estimate = estimateModelParameterCount(layers, binaryStage);

    expect(estimate.parameterCount).toBe(31);
    expect(estimate.outputShape).toEqual([1]);
    expect(estimate.isOutputShapeValid).toBe(true);
  });

  it("conv2d + flatten 構成の総パラメータ数を見積もれる", () => {
    const imageStage: StageDef = {
      ...binaryStage,
      inputShape: [8, 8, 1],
      outputUnits: 10,
      outputActivation: "softmax",
      lossFunction: "categoricalCrossentropy",
      taskType: "multiclass",
    };
    const layers: LayerNodeData[] = [
      {
        layerType: "conv2d",
        units: 4,
        filters: 4,
        kernelSize: 3,
        activation: "relu",
        regularization: null,
        regularizationRate: 0,
      },
      { layerType: "flatten", units: 0, activation: null, regularization: null, regularizationRate: 0 },
      { layerType: "dense", units: 8, activation: "relu", regularization: null, regularizationRate: 0 },
    ];

    const estimate = estimateModelParameterCount(layers, imageStage);

    expect(estimate.parameterCount).toBe(1290);
    expect(estimate.outputShape).toEqual([10]);
    expect(estimate.isOutputShapeValid).toBe(true);
  });
});
