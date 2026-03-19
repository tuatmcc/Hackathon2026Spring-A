import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as tf from "@tensorflow/tfjs";
import { buildModel } from "./buildModel";
import { generateSpiralData } from "./datasets";
import { trainModel } from "./trainer";
import type { LayerNodeData, StageDef } from "../types";

describe("trainer", () => {
  const testStage: StageDef = {
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

  beforeEach(() => {
    tf.disposeVariables();
  });

  afterEach(() => {
    tf.disposeVariables();
  });

  describe("trainModel", () => {
    it("学習が完了して結果を返す", async () => {
      const layers: LayerNodeData[] = [
        { layerType: "dense", units: 8, activation: "relu", regularization: null, regularizationRate: 0 },
      ];
      const model = buildModel(layers, testStage, "sgd", 0.1);
      const dataset = generateSpiralData(100);

      const result = await trainModel(model, dataset, {
        epochs: 3,
        batchSize: 32,
        validationSplit: 0,
      });

      expect(result.finalLoss).toBeTypeOf("number");
      expect(result.finalLoss).toBeGreaterThan(0);

      model.dispose();
      dataset.xs.dispose();
      dataset.ys.dispose();
    });

    it("epochごとにコールバックが呼ばれる", async () => {
      const layers: LayerNodeData[] = [
        { layerType: "dense", units: 8, activation: "relu", regularization: null, regularizationRate: 0 },
      ];
      const model = buildModel(layers, testStage, "sgd", 0.1);
      const dataset = generateSpiralData(100);

      const metrics: number[] = [];
      await trainModel(model, dataset, {
        epochs: 5,
        batchSize: 32,
        validationSplit: 0,
        onEpochEnd: (m) => {
          metrics.push(m.epoch);
        },
      });

      expect(metrics).toEqual([0, 1, 2, 3, 4]);

      model.dispose();
      dataset.xs.dispose();
      dataset.ys.dispose();
    });

    it("accuracy / val_accuracy キーでも最終精度を取得できる", async () => {
      const dataset = generateSpiralData(8);
      const fit = async (_xs: tf.Tensor, _ys: tf.Tensor, config: tf.ModelFitArgs) => {
        const callbacks = config.callbacks as
          | tf.CustomCallbackArgs
          | tf.CustomCallbackArgs[]
          | undefined;
        const firstCallback = Array.isArray(callbacks) ? callbacks[0] : callbacks;

        await firstCallback?.onEpochEnd?.(0, {
          loss: 0.8,
          val_loss: 0.7,
          accuracy: 0.6,
          val_accuracy: 0.65,
        });

        return {
          history: {
            loss: [0.8, 0.5],
            val_loss: [0.7, 0.4],
            accuracy: [0.6, 0.72],
            val_accuracy: [0.65, 0.78],
          },
        } as unknown as tf.History;
      };
      const mockModel = {
        fit,
        stopTraining: false,
      } as unknown as tf.LayersModel;

      const epochs: Array<{ accuracy?: number; valAccuracy?: number }> = [];
      const result = await trainModel(mockModel, dataset, {
        epochs: 2,
        batchSize: 4,
        onEpochEnd: (metrics) => {
          epochs.push({
            accuracy: metrics.accuracy,
            valAccuracy: metrics.valAccuracy,
          });
        },
      });

      expect(epochs[0]).toEqual({
        accuracy: 0.6,
        valAccuracy: 0.65,
      });
      expect(result.finalAccuracy).toBe(0.78);
      expect(result.finalLoss).toBe(0.5);

      dataset.xs.dispose();
      dataset.ys.dispose();
    });
  });

  describe("学習中断", () => {
    it("AbortSignalで学習を中断できる", async () => {
      const layers: LayerNodeData[] = [
        { layerType: "dense", units: 8, activation: "relu", regularization: null, regularizationRate: 0 },
      ];
      const model = buildModel(layers, testStage, "sgd", 0.1);
      const dataset = generateSpiralData(100);

      const controller = new AbortController();

      const epochs: number[] = [];
      const promise = trainModel(model, dataset, {
        epochs: 100,
        batchSize: 32,
        validationSplit: 0,
        signal: controller.signal,
        onEpochEnd: (m) => {
          epochs.push(m.epoch);
          if (m.epoch === 3) {
            controller.abort();
          }
        },
      });

      await expect(promise).rejects.toThrow("Training aborted");

      expect(epochs.length).toBeLessThan(10);
      expect(epochs).toContain(3);

      model.dispose();
      dataset.xs.dispose();
      dataset.ys.dispose();
    });

    it("中断されたモデルは再利用可能", async () => {
      const layers: LayerNodeData[] = [
        { layerType: "dense", units: 8, activation: "relu", regularization: null, regularizationRate: 0 },
      ];
      const model = buildModel(layers, testStage, "sgd", 0.1);
      const dataset = generateSpiralData(100);

      const controller = new AbortController();

      try {
        await trainModel(model, dataset, {
          epochs: 100,
          batchSize: 32,
          validationSplit: 0,
          signal: controller.signal,
          onEpochEnd: (m) => {
            if (m.epoch === 2) {
              controller.abort();
            }
          },
        });
      } catch {
        // expected
      }

      const result = await trainModel(model, dataset, {
        epochs: 3,
        batchSize: 32,
        validationSplit: 0,
      });

      expect(result.finalLoss).toBeTypeOf("number");

      model.dispose();
      dataset.xs.dispose();
      dataset.ys.dispose();
    });
  });
});
