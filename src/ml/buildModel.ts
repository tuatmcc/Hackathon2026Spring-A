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

function createRegularizer(regularization: string | null, rate: number) {
  if (regularization === "l1") {
    return tf.regularizers.l1({ l1: rate });
  }
  if (regularization === "l2") {
    return tf.regularizers.l2({ l2: rate });
  }
  return undefined;
}

function formatShape(shape: Array<number | null>) {
  return `[${shape.map((dim) => (dim == null ? "batch" : String(dim))).join(", ")}]`;
}

function validateOutputShape(model: tf.LayersModel, stage: StageDef) {
  const outputShape = model.outputs[0]?.shape ?? [];
  if (outputShape.length === 2) {
    return;
  }

  model.dispose();
  throw new Error(
    `${stage.name} の出力 shape が不正です。現在は ${formatShape(outputShape)} です。分類/回帰タスクでは [batch, ${stage.outputUnits}] が必要です。画像系の構成では出力前に Flatten を追加してください。`,
  );
}

export function buildModel(
  layers: LayerNodeData[],
  stage: StageDef,
  optimizer: string,
  learningRate: number,
): tf.LayersModel {
  const model = tf.sequential();

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const isFirst = i === 0;
    const kernelRegularizer = createRegularizer(layer.regularization, layer.regularizationRate);

    switch (layer.layerType) {
      case "dense":
        model.add(
          tf.layers.dense({
            units: layer.units,
            activation: (layer.activation ?? "linear") as never,
            kernelRegularizer,
            ...(isFirst ? { inputShape: stage.inputShape } : {}),
          }),
        );
        break;

      case "conv2d":
        model.add(
          tf.layers.conv2d({
            filters: layer.filters ?? layer.units,
            kernelSize: layer.kernelSize ?? 3,
            activation: (layer.activation ?? "relu") as never,
            kernelRegularizer,
            ...(isFirst ? { inputShape: stage.inputShape } : {}),
          }),
        );
        break;

      case "flatten":
        model.add(
          tf.layers.flatten({
            ...(isFirst ? { inputShape: stage.inputShape } : {}),
          }),
        );
        break;

      default:
        model.add(
          tf.layers.dense({
            units: layer.units,
            activation: (layer.activation ?? "linear") as never,
            kernelRegularizer,
            ...(isFirst ? { inputShape: stage.inputShape } : {}),
          }),
        );
    }

    if (layer.regularization === "dropout" && layer.regularizationRate > 0) {
      model.add(tf.layers.dropout({ rate: layer.regularizationRate }));
    }
  }

  model.add(
    tf.layers.dense({
      units: stage.outputUnits,
      activation: stage.outputActivation as never,
      ...(layers.length === 0 ? { inputShape: stage.inputShape } : {}),
    }),
  );

  validateOutputShape(model, stage);

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
