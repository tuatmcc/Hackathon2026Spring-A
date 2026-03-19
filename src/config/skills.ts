import type { SkillDef } from "../types";

export const SKILL_DATA: SkillDef[] = [
  // ---- 初期解放 ----
  {
    id: "dense_layer",
    name: "全結合層 (Dense)",
    type: "layer",
    cost: 0,
    dependencies: [],
    maxNodes: 128,
    description: "基本的なニューラルネットワークの層です。",
  },
  {
    id: "relu",
    name: "ReLU",
    type: "activation",
    cost: 0,
    dependencies: [],
    description: "負の値を0にする活性化関数。最も一般的に使われます。",
  },
  // ---- 解放が必要 ----
  {
    id: "sigmoid",
    name: "Sigmoid",
    type: "activation",
    cost: 50,
    dependencies: ["relu"],
    description: "出力を0〜1の範囲に変換する活性化関数。",
  },
  {
    id: "dropout",
    name: "Dropout",
    type: "regularization",
    cost: 150,
    dependencies: ["dense_layer"],
    description: "過学習を防ぐために、ランダムにノードを無効化します。",
  },
  {
    id: "adam",
    name: "Adam Optimizer",
    type: "optimizer",
    cost: 200,
    dependencies: [],
    description: "適応的学習率を持つ高性能なオプティマイザ。",
  },
];
