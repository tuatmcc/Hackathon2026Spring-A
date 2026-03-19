// ============================================================
// React Flow グラフ → TensorFlow.js モデル 変換 (スタブ)
// 実装担当者: ここにグラフ解析 → tf.LayersModel 構築ロジックを実装
// ============================================================

import * as tf from "@tensorflow/tfjs";
import type { Node, Edge } from "@xyflow/react";

/**
 * React Flow のノード・エッジ情報から TensorFlow.js のモデルを構築する。
 *
 * 現在はスタブ実装として、単純な Dense(1, sigmoid) を返す。
 * 実際には nodes / edges をトポロジカルソートし、
 * 各ノードの種類に応じた tf.layers を積み上げる必要がある。
 */
export function buildModelFromGraph(
  _nodes: Node[],
  _edges: Edge[],
): tf.LayersModel {
  // TODO: ノード・エッジを解析して動的にモデルを構築する
  const model = tf.sequential();
  model.add(
    tf.layers.dense({ units: 8, activation: "relu", inputShape: [2] }),
  );
  model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));
  model.compile({
    optimizer: "sgd",
    loss: "binaryCrossentropy",
    metrics: ["accuracy"],
  });
  return model;
}
