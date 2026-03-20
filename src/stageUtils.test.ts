import { describe, expect, it } from "vitest";
import type { StageDef } from "./types";
import {
  didStageClear,
  formatStageTarget,
  formatStageTargetValue,
  getStageTargetLabel,
} from "./stageUtils";

const classificationStage: StageDef = {
  id: "stage_xor",
  name: "XOR",
  description: "xor",
  datasetId: "xor",
  inputShape: [2],
  taskType: "binary",
  outputUnits: 1,
  outputActivation: "sigmoid",
  lossFunction: "binaryCrossentropy",
  targetAccuracy: 0.9,
  rewardPoints: 100,
};

const regressionStage: StageDef = {
  id: "stage_sin",
  name: "Sin",
  description: "sin",
  datasetId: "sin",
  inputShape: [1],
  taskType: "regression",
  outputUnits: 1,
  outputActivation: "linear",
  lossFunction: "meanSquaredError",
  targetAccuracy: 0,
  targetLoss: 0.05,
  rewardPoints: 100,
};

describe("stageUtils", () => {
  it("分類タスクは accuracy でクリア判定する", () => {
    expect(
      didStageClear(classificationStage, { finalLoss: 0.2, finalAccuracy: 0.91 }),
    ).toBe(true);
    expect(
      didStageClear(classificationStage, { finalLoss: 0.1, finalAccuracy: 0.89 }),
    ).toBe(false);
  });

  it("回帰タスクは loss でクリア判定する", () => {
    expect(
      didStageClear(regressionStage, { finalLoss: 0.049, finalAccuracy: 1 }),
    ).toBe(true);
    expect(
      didStageClear(regressionStage, { finalLoss: 0.051, finalAccuracy: 1 }),
    ).toBe(false);
  });

  it("回帰と分類で目標表示を切り替える", () => {
    expect(getStageTargetLabel(classificationStage)).toBe("Target Accuracy");
    expect(formatStageTargetValue(classificationStage)).toBe("90%");
    expect(formatStageTarget(classificationStage)).toBe("Target Accuracy: 90%");

    expect(getStageTargetLabel(regressionStage)).toBe("Target Loss");
    expect(formatStageTargetValue(regressionStage)).toBe("0.0500");
    expect(formatStageTarget(regressionStage)).toBe("Target Loss: 0.0500");
  });
});
