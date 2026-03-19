import type { StageDef } from "../types";

/**
 * ステージマスターデータ。
 * 最終層の activation と lossFunction はステージが固定する。
 * プレイヤーが編集するのは「隠れ層」のみ。
 */
export const STAGE_DATA: StageDef[] = [
  {
    id: "stage_linear",
    name: "線形分離",
    description: "直線で2つのデータを分類しよう",
    datasetId: "linear",
    inputShape: [2],
    taskType: "binary",
    outputUnits: 1,
    outputActivation: "sigmoid",
    lossFunction: "binaryCrossentropy",
    targetAccuracy: 0.95,
    rewardPoints: 100,
  },
  {
    id: "stage_xor",
    name: "XOR問題",
    description: "非線形なデータを分類しよう。隠れ層が必要になるかも？",
    datasetId: "xor",
    inputShape: [2],
    taskType: "binary",
    outputUnits: 1,
    outputActivation: "sigmoid",
    lossFunction: "binaryCrossentropy",
    targetAccuracy: 0.9,
    rewardPoints: 250,
  },
  {
    id: "stage_circle",
    name: "円形分離",
    description: "円形に分布するデータを分類しよう",
    datasetId: "circle",
    inputShape: [2],
    taskType: "binary",
    outputUnits: 1,
    outputActivation: "sigmoid",
    lossFunction: "binaryCrossentropy",
    targetAccuracy: 0.9,
    rewardPoints: 300,
  },
  {
    id: "stage_spiral",
    name: "スパイラル",
    description: "渦巻き状のデータを分類しよう。深いネットワークが必要。",
    datasetId: "spiral",
    inputShape: [2],
    taskType: "binary",
    outputUnits: 1,
    outputActivation: "sigmoid",
    lossFunction: "binaryCrossentropy",
    targetAccuracy: 0.85,
    rewardPoints: 500,
  },
];
