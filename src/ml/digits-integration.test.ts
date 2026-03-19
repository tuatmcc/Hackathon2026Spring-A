/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as tf from "@tensorflow/tfjs";
import { buildModel } from "./buildModel";
import { loadDigitsData } from "./datasets";
import { trainModel } from "./trainer";
import type { LayerNodeData, StageDef } from "../types";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

vi.stubGlobal("fetch", async () => {
  const filePath = join(__dirname, "../../public/data/digits.json");
  const content = readFileSync(filePath, "utf-8");
  return {
    ok: true,
    json: async () => JSON.parse(content),
  };
});

describe("Digits統合テスト", () => {
  const stage: StageDef = {
    id: "stage_digits",
    name: "Handwritten Digits",
    description: "8x8手書き数字分類",
    datasetId: "digits",
    inputShape: [8, 8, 1],
    taskType: "multiclass",
    outputUnits: 10,
    outputActivation: "softmax",
    lossFunction: "categoricalCrossentropy",
    targetAccuracy: 0.85,
    rewardPoints: 200,
  };

  beforeEach(() => {
    tf.disposeVariables();
  });

  afterEach(() => {
    tf.disposeVariables();
  });

  it("Flatten + Denseでdigitsを学習できる", async () => {
    const layers: LayerNodeData[] = [
      { layerType: "flatten", units: 0, activation: null, regularization: null, regularizationRate: 0 },
      { layerType: "dense", units: 64, activation: "relu", regularization: null, regularizationRate: 0 },
      { layerType: "dense", units: 32, activation: "relu", regularization: null, regularizationRate: 0 },
    ];

    const model = buildModel(layers, stage, "adam", 0.001);
    const dataset = await loadDigitsData();

    const result = await trainModel(model, dataset, {
      epochs: 20,
      batchSize: 32,
      validationSplit: 0,
    });

    expect(result.finalAccuracy).toBeGreaterThan(0.7);

    model.dispose();
    dataset.xs.dispose();
    dataset.ys.dispose();
  });

  it("Conv2D + Flatten + Denseでdigitsを学習できる", async () => {
    const layers: LayerNodeData[] = [
      { 
        layerType: "conv2d", 
        units: 8, 
        activation: "relu", 
        regularization: null, 
        regularizationRate: 0,
        filters: 8,
        kernelSize: 3,
      },
      { layerType: "flatten", units: 0, activation: null, regularization: null, regularizationRate: 0 },
      { layerType: "dense", units: 16, activation: "relu", regularization: null, regularizationRate: 0 },
    ];

    const model = buildModel(layers, stage, "adam", 0.01);
    const dataset = await loadDigitsData();

    const result = await trainModel(model, dataset, {
      epochs: 10,
      batchSize: 32,
      validationSplit: 0,
    });

    expect(result.finalAccuracy).toBeGreaterThan(0.3);

    model.dispose();
    dataset.xs.dispose();
    dataset.ys.dispose();
  }, 90000);

  it("Dropoutで正則化できる", async () => {
    const layers: LayerNodeData[] = [
      { layerType: "flatten", units: 0, activation: null, regularization: null, regularizationRate: 0 },
      { layerType: "dense", units: 128, activation: "relu", regularization: "dropout", regularizationRate: 0.3 },
      { layerType: "dense", units: 64, activation: "relu", regularization: "dropout", regularizationRate: 0.3 },
    ];

    const model = buildModel(layers, stage, "adam", 0.001);
    const dataset = await loadDigitsData();

    const result = await trainModel(model, dataset, {
      epochs: 20,
      batchSize: 32,
      validationSplit: 0,
    });

    expect(result.finalAccuracy).toBeGreaterThan(0.5);

    model.dispose();
    dataset.xs.dispose();
    dataset.ys.dispose();
  });
});