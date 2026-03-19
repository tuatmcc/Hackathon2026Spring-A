import type { StageDef } from "../types";

export const STAGE_DATA: StageDef[] = [
  {
    id: "stage_1_linear",
    name: "線形分離",
    description: "直線で2つのデータを分類しよう",
    datasetId: "linear",
    targetLoss: 0.05,
    rewardPoints: 100,
  },
  {
    id: "stage_2_xor",
    name: "XOR問題",
    description: "非線形なデータを分類しよう。隠れ層が必要になるかも？",
    datasetId: "xor",
    targetLoss: 0.01,
    rewardPoints: 250,
  },
  {
    id: "stage_3_circle",
    name: "円形分離",
    description: "円形に分布するデータを分類しよう",
    datasetId: "circle",
    targetLoss: 0.02,
    rewardPoints: 300,
  },
];
