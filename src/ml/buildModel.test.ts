import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as tf from "@tensorflow/tfjs-node";
import { buildModel } from "./buildModel";
import type { LayerNodeData, StageDef } from "../types";

describe("buildModel", () => {
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

  describe("dense層", () => {
    it("空の隠れ層でモデルを構築できる", () => {
      const layers: LayerNodeData[] = [];
      const model = buildModel(layers, testStage, "sgd", 0.1);

      expect(model).toBeDefined();
      expect(model.layers.length).toBe(1);
      model.dispose();
    });

    it("単一のdense層でモデルを構築できる", () => {
      const layers: LayerNodeData[] = [
        { layerType: "dense", units: 4, activation: "relu", regularization: null, regularizationRate: 0 },
      ];
      const model = buildModel(layers, testStage, "sgd", 0.1);

      expect(model.layers.length).toBe(2);
      expect(model.layers[0].getConfig().units).toBe(4);
      model.dispose();
    });

    it("複数のdense層でモデルを構築できる", () => {
      const layers: LayerNodeData[] = [
        { layerType: "dense", units: 8, activation: "relu", regularization: null, regularizationRate: 0 },
        { layerType: "dense", units: 4, activation: "relu", regularization: null, regularizationRate: 0 },
      ];
      const model = buildModel(layers, testStage, "adam", 0.01);

      expect(model.layers.length).toBe(3);
      model.dispose();
    });

    it("activationがnullの場合linearになる", () => {
      const layers: LayerNodeData[] = [
        { layerType: "dense", units: 4, activation: null, regularization: null, regularizationRate: 0 },
      ];
      const model = buildModel(layers, testStage, "sgd", 0.1);

      expect(model.layers[0].getConfig().activation).toBe("linear");
      model.dispose();
    });

    it("様々なactivationを設定できる", () => {
      const activations = ["relu", "sigmoid", "tanh"];

      for (const act of activations) {
        const layers: LayerNodeData[] = [
          { layerType: "dense", units: 4, activation: act, regularization: null, regularizationRate: 0 },
        ];
        const model = buildModel(layers, testStage, "sgd", 0.1);
        expect(model.layers[0].getConfig().activation).toBe(act);
        model.dispose();
      }
    });

    it("同じseedなら同じ初期重みになる", () => {
      const layers: LayerNodeData[] = [
        { layerType: "dense", units: 4, activation: "relu", regularization: null, regularizationRate: 0 },
      ];

      const first = buildModel(layers, testStage, "sgd", 0.1, 4242);
      const second = buildModel(layers, testStage, "sgd", 0.1, 4242);

      expect(Array.from(first.getWeights()[0]?.dataSync() ?? [])).toEqual(
        Array.from(second.getWeights()[0]?.dataSync() ?? []),
      );

      first.dispose();
      second.dispose();
    });
  });

  describe("conv2d層", () => {
    const imageStage: StageDef = {
      ...testStage,
      id: "image_stage",
      inputShape: [28, 28, 1],
      outputUnits: 10,
      outputActivation: "softmax",
      lossFunction: "categoricalCrossentropy",
    };

    it("flattenなしの画像モデルは構築を拒否する", () => {
      const layers: LayerNodeData[] = [
        {
          layerType: "conv2d",
          units: 32,
          activation: "relu",
          regularization: null,
          regularizationRate: 0,
          filters: 32,
          kernelSize: 3,
        },
      ];
      expect(() => buildModel(layers, imageStage, "adam", 0.001)).toThrow(
        "Flatten",
      );
    });
  });

  describe("flatten層", () => {
    const imageStage: StageDef = {
      ...testStage,
      id: "image_stage",
      inputShape: [28, 28, 1],
      outputUnits: 10,
      outputActivation: "softmax",
      lossFunction: "categoricalCrossentropy",
    };

    it("flatten層を追加できる", () => {
      const layers: LayerNodeData[] = [
        {
          layerType: "conv2d",
          units: 32,
          activation: "relu",
          regularization: null,
          regularizationRate: 0,
          filters: 32,
          kernelSize: 3,
        },
        { layerType: "flatten", units: 0, activation: null, regularization: null, regularizationRate: 0 },
        { layerType: "dense", units: 64, activation: "relu", regularization: null, regularizationRate: 0 },
      ];
      const model = buildModel(layers, imageStage, "adam", 0.001);

      expect(model.layers.length).toBe(4);
      model.dispose();
    });

    it("画像ステージでflattenなしのdense構成は構築を拒否する", () => {
      const layers: LayerNodeData[] = [
        {
          layerType: "dense",
          units: 64,
          activation: "relu",
          regularization: null,
          regularizationRate: 0,
        },
      ];

      expect(() => buildModel(layers, imageStage, "adam", 0.001)).toThrow(
        "Flatten",
      );
    });
  });

  describe("正則化", () => {
    it("dropoutを追加できる", () => {
      const layers: LayerNodeData[] = [
        { layerType: "dense", units: 8, activation: "relu", regularization: "dropout", regularizationRate: 0.5 },
      ];
      const model = buildModel(layers, testStage, "sgd", 0.1);

      expect(model.layers.length).toBe(3);
      model.dispose();
    });

    it("L2正則化を適用できる", () => {
      const layers: LayerNodeData[] = [
        { layerType: "dense", units: 8, activation: "relu", regularization: "l2", regularizationRate: 0.01 },
      ];
      const model = buildModel(layers, testStage, "sgd", 0.1);

      expect(model.layers.length).toBe(2);
      const denseLayer = model.layers[0];
      const config = denseLayer.getConfig() as { kernelRegularizer?: { className: string; config: { l1: number; l2: number } } };
      expect(config.kernelRegularizer?.className).toBe("L1L2");
      expect(config.kernelRegularizer?.config.l2).toBe(0.01);
      model.dispose();
    });

    it("L1正則化を適用できる", () => {
      const layers: LayerNodeData[] = [
        { layerType: "dense", units: 8, activation: "relu", regularization: "l1", regularizationRate: 0.01 },
      ];
      const model = buildModel(layers, testStage, "sgd", 0.1);

      expect(model.layers.length).toBe(2);
      const denseLayer = model.layers[0];
      const config = denseLayer.getConfig() as { kernelRegularizer?: { className: string; config: { l1: number; l2: number } } };
      expect(config.kernelRegularizer?.className).toBe("L1L2");
      expect(config.kernelRegularizer?.config.l1).toBe(0.01);
      model.dispose();
    });
  });

  describe("optimizer", () => {
    it("sgdオプティマイザを設定できる", () => {
      const layers: LayerNodeData[] = [
        { layerType: "dense", units: 4, activation: "relu", regularization: null, regularizationRate: 0 },
      ];
      const model = buildModel(layers, testStage, "sgd", 0.1);

      expect(model.optimizer.getConfig().learningRate).toBe(0.1);
      model.dispose();
    });

    it("adamオプティマイザを設定できる", () => {
      const layers: LayerNodeData[] = [
        { layerType: "dense", units: 4, activation: "relu", regularization: null, regularizationRate: 0 },
      ];
      const model = buildModel(layers, testStage, "adam", 0.001);

      expect(model.optimizer.getConfig().learningRate).toBe(0.001);
      model.dispose();
    });
  });
});
