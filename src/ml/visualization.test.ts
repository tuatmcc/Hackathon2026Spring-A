/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it } from "vitest";
import * as tf from "@tensorflow/tfjs";
import type { StageDef } from "../types";
import {
  createDigitsPredictionSnapshot,
  createRegressionCurveSnapshot,
  serializeDataset,
} from "./visualization";

const digitsStage: StageDef = {
  id: "stage_digits",
  name: "Handwritten Digits",
  description: "8x8 hand-written digits",
  datasetId: "digits",
  inputShape: [8, 8, 1],
  taskType: "multiclass",
  outputUnits: 10,
  outputActivation: "softmax",
  lossFunction: "categoricalCrossentropy",
  targetAccuracy: 0.85,
  rewardPoints: 200,
};

const regressionStage: StageDef = {
  id: "stage_sin",
  name: "Sine Wave",
  description: "sin approximation",
  datasetId: "sin",
  inputShape: [1],
  taskType: "regression",
  outputUnits: 1,
  outputActivation: "linear",
  lossFunction: "meanSquaredError",
  targetAccuracy: 0,
  targetLoss: 0.05,
  rewardPoints: 150,
};

afterEach(() => {
  tf.disposeVariables();
});

describe("visualization", () => {
  it("serializeDatasetがdigits用のラベルと画像形状を保持する", () => {
    const xs = tf.tensor4d(new Array(2 * 8 * 8).fill(0), [2, 8, 8, 1]);
    const labelTensor = tf.tensor1d([3, 7], "int32");
    const ys = tf.oneHot(labelTensor, 10);

    const serialized = serializeDataset({ xs, ys }, digitsStage);

    expect(serialized.sampleCount).toBe(2);
    expect(serialized.inputShape).toEqual([8, 8, 1]);
    expect(serialized.imageShape).toEqual([8, 8, 1]);
    expect(serialized.labels).toEqual([3, 7]);

    xs.dispose();
    ys.dispose();
    labelTensor.dispose();
  });

  it("createDigitsPredictionSnapshotが予測ラベルと確信度を抽出する", () => {
    const xs = tf.tensor4d(new Array(2 * 8 * 8).fill(0), [2, 8, 8, 1]);
    const labelTensor = tf.tensor1d([1, 2], "int32");
    const ys = tf.oneHot(labelTensor, 10);

    const mockModel = {
      predict: () =>
        tf.tensor2d(
          [
            [0.01, 0.91, 0.02, 0.01, 0.01, 0.01, 0.01, 0.01, 0.0, 0.01],
            [0.76, 0.02, 0.1, 0.02, 0.02, 0.02, 0.02, 0.02, 0.0, 0.02],
          ],
          [2, 10],
        ),
    } as unknown as tf.LayersModel;

    const snapshot = createDigitsPredictionSnapshot(
      mockModel,
      { xs, ys },
      digitsStage,
      { epoch: 5 },
    );

    expect(snapshot).not.toBeNull();
    expect(snapshot?.kind).toBe("digits");
    expect(snapshot?.epoch).toBe(5);
    expect(snapshot?.predictions[0]).toMatchObject({
      sampleIndex: 0,
      predictedLabel: 1,
      isCorrect: true,
    });
    expect(snapshot?.predictions[0]?.confidence ?? 0).toBeCloseTo(0.91, 6);
    expect(snapshot?.predictions[0]?.classConfidences).toHaveLength(10);
    expect(snapshot?.predictions[0]?.classConfidences[1] ?? 0).toBeCloseTo(0.91, 6);
    expect(snapshot?.predictions[1]).toMatchObject({
      sampleIndex: 1,
      predictedLabel: 0,
      isCorrect: false,
    });
    expect(snapshot?.predictions[1]?.confidence ?? 0).toBeCloseTo(0.76, 6);
    expect(snapshot?.predictions[1]?.classConfidences[0] ?? 0).toBeCloseTo(0.76, 6);

    xs.dispose();
    ys.dispose();
    labelTensor.dispose();
  });

  it("createRegressionCurveSnapshotが予測曲線と描画領域を生成する", () => {
    const xs = tf.tensor2d([-1, -0.5, 0, 0.5, 1], [5, 1]);
    const ys = tf.tensor2d([0, -0.8, 0, 0.8, 0], [5, 1]);
    const mockModel = {
      predict: () => tf.tensor2d([-0.1, -0.05, 0, 0.05, 0.1], [5, 1]),
    } as unknown as tf.LayersModel;

    const snapshot = createRegressionCurveSnapshot(
      mockModel,
      { xs, ys },
      regressionStage,
      { epoch: 2, pointCount: 5 },
    );

    expect(snapshot).not.toBeNull();
    expect(snapshot?.kind).toBe("regression");
    expect(snapshot?.epoch).toBe(2);
    expect(snapshot?.predictedPoints).toHaveLength(5);
    expect(snapshot?.predictedPoints[0]?.x).toBe(-1);
    expect(snapshot?.predictedPoints[0]?.y ?? 0).toBeCloseTo(-0.1, 6);
    expect(snapshot?.predictedPoints[4]?.x).toBe(1);
    expect(snapshot?.predictedPoints[4]?.y ?? 0).toBeCloseTo(0.1, 6);
    expect(snapshot?.domain.minX).toBeLessThan(-1);
    expect(snapshot?.domain.maxX).toBeGreaterThan(1);
    expect(snapshot?.domain.minY).toBeLessThan(-0.8);
    expect(snapshot?.domain.maxY).toBeGreaterThan(0.8);

    xs.dispose();
    ys.dispose();
  });
});
