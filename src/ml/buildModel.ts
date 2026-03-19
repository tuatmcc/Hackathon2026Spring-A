// ============================================================
// buildModel — LayerNodeData[] + StageDef → tf.LayersModel
//
// 【担当者へ】
// この関数は React を import しない。純粋な変換関数。
// 入力: PlayPage がトポロジカルソートした LayerNodeData[]
// 出力: compile 済みの tf.LayersModel
//
// 現在はスタブ実装。TODO を埋めてください。
// ============================================================

import * as tf from "@tensorflow/tfjs";
import type { LayerNodeData, StageDef } from "../types";

/**
 * ノードデータの配列からTF.jsモデルを構築する。
 *
 * @param layers - トポロジカルソート済みの隠れ層データ
 * @param stage  - ステージ定義（最終層・loss を固定するため）
 * @param optimizer - オプティマイザ名 ("sgd" | "adam")
 * @param learningRate - 学習率
 */
export function buildModel(
  layers: LayerNodeData[],
  stage: StageDef,
  optimizer: string,
  learningRate: number,
): tf.LayersModel {
  const model = tf.sequential();

  // --- 隠れ層を積む ---
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const isFirst = i === 0;

    // TODO: layer.layerType に応じた分岐を実装
    //   "dense"   → tf.layers.dense(...)
    //   "conv2d"  → tf.layers.conv2d(...)
    //   "flatten" → tf.layers.flatten(...)
    // TODO: layer.regularization に応じた正則化を適用
    //   "dropout" → 直後に tf.layers.dropout を追加
    //   "l1"/"l2" → kernelRegularizer パラメータ

    switch (layer.layerType) {
      case "dense":
      default:
        model.add(
          tf.layers.dense({
            units: layer.units,
            activation: (layer.activation ?? "linear") as never,
            ...(isFirst ? { inputShape: stage.inputShape } : {}),
          }),
        );
        break;
    }

    // TODO: dropout 等の正則化を追加
    if (layer.regularization === "dropout") {
      model.add(tf.layers.dropout({ rate: layer.regularizationRate }));
    }
  }

  // --- 最終層（ステージが固定）---
  model.add(
    tf.layers.dense({
      units: stage.outputUnits,
      activation: stage.outputActivation as never,
      // 隠れ層が0個の場合の inputShape
      ...(layers.length === 0 ? { inputShape: stage.inputShape } : {}),
    }),
  );

  // --- コンパイル ---
  const opt =
    optimizer === "adam"
      ? tf.train.adam(learningRate)
      : tf.train.sgd(learningRate);

  model.compile({
    optimizer: opt,
    loss: stage.lossFunction,
    metrics: ["accuracy"],
  });

  return model;
}
