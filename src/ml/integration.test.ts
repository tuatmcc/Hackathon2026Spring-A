/// <reference types="node" />
/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as tf from "@tensorflow/tfjs";
import { buildModel } from "./buildModel";
import { getDatasetGenerator } from "./datasets";
import { deriveSeed } from "./random";
import { trainModel } from "./trainer";
import type { LayerNodeData, StageDef } from "../types";

function createTrialSeeds(seed: number) {
  return {
    dataset: deriveSeed(seed, 1),
    model: deriveSeed(seed, 2),
    training: deriveSeed(seed, 3),
  };
}

describe("ML統合テスト", () => {
  beforeEach(() => {
    tf.disposeVariables();
  });

  afterEach(() => {
    tf.disposeVariables();
  });

  describe("XOR問題", () => {
    const stage: StageDef = {
      id: "stage_xor",
      name: "XOR",
      description: "XOR分類問題",
      datasetId: "xor",
      inputShape: [2],
      taskType: "binary",
      outputUnits: 1,
      outputActivation: "sigmoid",
      lossFunction: "binaryCrossentropy",
      targetAccuracy: 0.8,
      rewardPoints: 100,
    };

    it("隠れ層1つでXORを学習できる", async () => {
      const seeds = createTrialSeeds(101);
      const layers: LayerNodeData[] = [
        { layerType: "dense", units: 4, activation: "relu", regularization: null, regularizationRate: 0 },
      ];
      const model = buildModel(layers, stage, "adam", 0.1, seeds.model);
      const dataset = getDatasetGenerator("xor")(200, seeds.dataset);

      const result = await trainModel(model, dataset, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0,
        seed: seeds.training,
      });

      expect(result.finalLoss).toBeLessThan(0.5);
      expect(result.finalAccuracy).toBeGreaterThan(0.7);

      model.dispose();
      dataset.xs.dispose();
      dataset.ys.dispose();
    });

    it("隠れ層2つでXORをより良く学習できる", async () => {
      const seeds = createTrialSeeds(102);
      const layers: LayerNodeData[] = [
        { layerType: "dense", units: 16, activation: "relu", regularization: null, regularizationRate: 0 },
        { layerType: "dense", units: 8, activation: "relu", regularization: null, regularizationRate: 0 },
      ];
      const model = buildModel(layers, stage, "adam", 0.01, seeds.model);
      const dataset = getDatasetGenerator("xor")(200, seeds.dataset);

      const result = await trainModel(model, dataset, {
        epochs: 100,
        batchSize: 32,
        validationSplit: 0,
        seed: seeds.training,
      });

      expect(result.finalLoss).toBeLessThan(0.5);
      expect(result.finalAccuracy).toBeGreaterThan(0.8);

      model.dispose();
      dataset.xs.dispose();
      dataset.ys.dispose();
    });
  });

  describe("Circle問題", () => {
    const stage: StageDef = {
      id: "stage_circle",
      name: "Circle",
      description: "円形分類問題",
      datasetId: "circle",
      inputShape: [2],
      taskType: "binary",
      outputUnits: 1,
      outputActivation: "sigmoid",
      lossFunction: "binaryCrossentropy",
      targetAccuracy: 0.85,
      rewardPoints: 100,
    };

    it("円形データを分類できる", async () => {
      const seeds = createTrialSeeds(201);
      const layers: LayerNodeData[] = [
        { layerType: "dense", units: 8, activation: "relu", regularization: null, regularizationRate: 0 },
        { layerType: "dense", units: 4, activation: "relu", regularization: null, regularizationRate: 0 },
      ];
      const model = buildModel(layers, stage, "adam", 0.01, seeds.model);
      const dataset = getDatasetGenerator("circle")(300, seeds.dataset);

      const result = await trainModel(model, dataset, {
        epochs: 100,
        batchSize: 32,
        validationSplit: 0,
        seed: seeds.training,
      });

      expect(result.finalAccuracy).toBeGreaterThan(0.8);

      model.dispose();
      dataset.xs.dispose();
      dataset.ys.dispose();
    });
  });

  describe("Spiral問題", () => {
    const stage: StageDef = {
      id: "stage_spiral",
      name: "Spiral",
      description: "スパイラル分類問題",
      datasetId: "spiral",
      inputShape: [2],
      taskType: "binary",
      outputUnits: 1,
      outputActivation: "sigmoid",
      lossFunction: "binaryCrossentropy",
      targetAccuracy: 0.9,
      rewardPoints: 200,
    };

    it("スパイラルデータを深いネットワークで分類できる", async () => {
      const seeds = createTrialSeeds(301);
      const layers: LayerNodeData[] = [
        { layerType: "dense", units: 64, activation: "relu", regularization: null, regularizationRate: 0 },
        { layerType: "dense", units: 32, activation: "relu", regularization: null, regularizationRate: 0 },
        { layerType: "dense", units: 16, activation: "relu", regularization: null, regularizationRate: 0 },
      ];
      const model = buildModel(layers, stage, "adam", 0.01, seeds.model);
      const dataset = getDatasetGenerator("spiral")(500, seeds.dataset);

      const result = await trainModel(model, dataset, {
        epochs: 100,
        batchSize: 32,
        validationSplit: 0,
        seed: seeds.training,
      });

      expect(result.finalAccuracy).toBeGreaterThan(0.7);

      model.dispose();
      dataset.xs.dispose();
      dataset.ys.dispose();
    });

    it("dropout正則化で過学習を防げる", async () => {
      const seeds = createTrialSeeds(302);
      const layersWithDropout: LayerNodeData[] = [
        { layerType: "dense", units: 64, activation: "relu", regularization: "dropout", regularizationRate: 0.3 },
        { layerType: "dense", units: 32, activation: "relu", regularization: "dropout", regularizationRate: 0.3 },
        { layerType: "dense", units: 16, activation: "relu", regularization: null, regularizationRate: 0 },
      ];

      const model = buildModel(layersWithDropout, stage, "adam", 0.01, seeds.model);
      const dataset = getDatasetGenerator("spiral")(500, seeds.dataset);

      const result = await trainModel(model, dataset, {
        epochs: 100,
        batchSize: 32,
        validationSplit: 0,
        seed: seeds.training,
      });

      expect(result.finalAccuracy).toBeGreaterThan(0.6);

      model.dispose();
      dataset.xs.dispose();
      dataset.ys.dispose();
    });
  });

  describe("正則化の効果", () => {
    const stage: StageDef = {
      id: "test",
      name: "Test",
      description: "Test",
      datasetId: "spiral",
      inputShape: [2],
      taskType: "binary",
      outputUnits: 1,
      outputActivation: "sigmoid",
      lossFunction: "binaryCrossentropy",
      targetAccuracy: 0.9,
      rewardPoints: 100,
    };

    it("L2正則化が適用されたモデルを学習できる", async () => {
      const seeds = createTrialSeeds(401);
      const layers: LayerNodeData[] = [
        { layerType: "dense", units: 32, activation: "relu", regularization: "l2", regularizationRate: 0.01 },
        { layerType: "dense", units: 16, activation: "relu", regularization: "l2", regularizationRate: 0.01 },
      ];

      const model = buildModel(layers, stage, "adam", 0.01, seeds.model);
      const dataset = getDatasetGenerator("spiral")(300, seeds.dataset);

      const result = await trainModel(model, dataset, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0,
        seed: seeds.training,
      });

      expect(result.finalLoss).toBeTypeOf("number");
      expect(result.finalAccuracy).toBeTypeOf("number");

      model.dispose();
      dataset.xs.dispose();
      dataset.ys.dispose();
    });
  });

  describe("学習コールバック", () => {
    const stage: StageDef = {
      id: "test",
      name: "Test",
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

    it("epochごとのメトリクスを取得できる", async () => {
      const seeds = createTrialSeeds(501);
      const layers: LayerNodeData[] = [
        { layerType: "dense", units: 8, activation: "relu", regularization: null, regularizationRate: 0 },
      ];
      const model = buildModel(layers, stage, "adam", 0.1, seeds.model);
      const dataset = getDatasetGenerator("xor")(100, seeds.dataset);

      const metrics: { loss: number; accuracy: number }[] = [];
      await trainModel(model, dataset, {
        epochs: 5,
        batchSize: 32,
        validationSplit: 0,
        seed: seeds.training,
        onEpochEnd: (m) => {
          metrics.push({
            loss: m.loss,
            accuracy: m.accuracy ?? 0,
          });
        },
      });

      expect(metrics.length).toBe(5);
      expect(metrics[0].loss).toBeGreaterThan(0);

      for (let i = 1; i < metrics.length; i++) {
        expect(metrics[i].loss).toBeLessThanOrEqual(metrics[i - 1].loss * 1.5);
      }

      model.dispose();
      dataset.xs.dispose();
      dataset.ys.dispose();
    });
  });

  describe("Sin関数近似（回帰）", () => {
    const stage: StageDef = {
      id: "stage_sin",
      name: "Sine Wave",
      description: "y = sin(πx) の近似",
      datasetId: "sin",
      inputShape: [1],
      taskType: "regression",
      outputUnits: 1,
      outputActivation: "linear",
      lossFunction: "meanSquaredError",
      targetAccuracy: 0,
      targetLoss: 0.1,
      rewardPoints: 150,
    };

    it("Dense層でsin関数を近似できる", async () => {
      const seeds = createTrialSeeds(601);
      const layers: LayerNodeData[] = [
        { layerType: "dense", units: 32, activation: "relu", regularization: null, regularizationRate: 0 },
        { layerType: "dense", units: 32, activation: "relu", regularization: null, regularizationRate: 0 },
        { layerType: "dense", units: 16, activation: "relu", regularization: null, regularizationRate: 0 },
      ];

      const model = buildModel(layers, stage, "adam", 0.01, seeds.model);
      const dataset = getDatasetGenerator("sin")(500, seeds.dataset);

      const result = await trainModel(model, dataset, {
        epochs: 100,
        batchSize: 32,
        validationSplit: 0,
        seed: seeds.training,
      });

      expect(result.finalLoss).toBeLessThan(0.2);

      model.dispose();
      dataset.xs.dispose();
      dataset.ys.dispose();
    });

    it("深いネットワークでより精度よく近似できる", async () => {
      const seeds = createTrialSeeds(602);
      const layers: LayerNodeData[] = [
        { layerType: "dense", units: 64, activation: "relu", regularization: null, regularizationRate: 0 },
        { layerType: "dense", units: 64, activation: "relu", regularization: null, regularizationRate: 0 },
        { layerType: "dense", units: 32, activation: "relu", regularization: null, regularizationRate: 0 },
        { layerType: "dense", units: 16, activation: "relu", regularization: null, regularizationRate: 0 },
      ];

      const model = buildModel(layers, stage, "adam", 0.005, seeds.model);
      const dataset = getDatasetGenerator("sin")(500, seeds.dataset);

      const result = await trainModel(model, dataset, {
        epochs: 150,
        batchSize: 32,
        validationSplit: 0,
        seed: seeds.training,
      });

      expect(result.finalLoss).toBeLessThan(0.1);

      model.dispose();
      dataset.xs.dispose();
      dataset.ys.dispose();
    });
  });
});
