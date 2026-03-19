import type { SkillDef } from "../types";

/**
 * スキルマスターデータ。
 * treeId でスキルツリー画面上の4本のツリーに振り分けられる。
 * id は LayerNodeData.layerType / activation / regularization や
 * playStore.selectedOptimizer と直接対応する。
 */
export const SKILL_DATA: SkillDef[] = [
  // ============ 隠れ層ツリー ============
  {
    id: "dense",
    treeId: "layer",
    name: "全結合層 (Dense)",
    description: "基本的なニューラルネットワークの層。",
    detail: "Denseの詳細をここに書く",
    cost: 0,
    dependencies: [],
  },
  {
    id: "conv2d",
    treeId: "layer",
    name: "畳み込み層 (Conv2D)",
    description: "空間的な特徴を抽出する層。画像系タスクに有効。",
    detail: "Conv2dの詳細をここに書く",
    cost: 300,
    dependencies: ["dense"],
  },
  {
    id: "flatten",
    treeId: "layer",
    name: "Flatten",
    description: "多次元テンソルを1次元に変換する層。",
    detail: "Flattenの詳細をここに書く",
    cost: 100,
    dependencies: ["conv2d"],
  },

  // ============ 活性化関数ツリー ============
  {
    id: "relu",
    treeId: "activation",
    name: "ReLU",
    description: "負の値を0にする活性化関数。最も一般的。",
    detail: "Reluの詳細をここに書く",
    cost: 0,
    dependencies: [],
  },
  {
    id: "sigmoid",
    treeId: "activation",
    name: "Sigmoid",
    description: "出力を0〜1の範囲に変換する活性化関数。",
    detail: "Sigmoidの詳細をここに書く",
    cost: 50,
    dependencies: ["relu"],
  },
  {
    id: "gelu",
    treeId: "activation",
    name: "GELU",
    description: "Transformerで使われる滑らかな活性化関数。",
    detail: "GELUの詳細をここに書く",
    cost: 200,
    dependencies: ["relu"],
  },

  // ============ 学習手法ツリー ============
  {
    id: "sgd",
    treeId: "optimizer",
    name: "SGD",
    description: "確率的勾配降下法。基本のオプティマイザ。",
    detail: "SGDの詳細をここに書く",
    cost: 0,
    dependencies: [],
  },
  {
    id: "adam",
    treeId: "optimizer",
    name: "Adam",
    description: "適応的学習率を持つ高性能オプティマイザ。",
    detail: "Adamの詳細をここに書く",
    cost: 200,
    dependencies: ["sgd"],
  },

  // ============ 正則化ツリー ============
  {
    id: "dropout",
    treeId: "regularization",
    name: "Dropout",
    description: "ランダムにノードを無効化して過学習を防ぐ。",
    detail: "Dropoutの詳細をここに書く",
    cost: 150,
    dependencies: [],
  },
  {
    id: "l2",
    treeId: "regularization",
    name: "L2正則化",
    description: "重みの大きさにペナルティを課して過学習を防ぐ。",
    detail: "L2正則化の詳細をここに書く",
    cost: 100,
    dependencies: [],
  },
  {
    id: "l1",
    treeId: "regularization",
    name: "L1正則化",
    description: "重みをスパースにして特徴選択効果を持つ。",
    detail: "L1正則化の詳細をここに書く",
    cost: 100,
    dependencies: [],
  },
];
